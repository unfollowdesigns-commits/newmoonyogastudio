"use client";

// Live mode: everything is read from / written to Supabase.
// Writes go through database functions (see supabase/migrations) that enforce capacity,
// late-cancel rules and waitlist promotion, so two people can never take the same last spot.

import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { STATE_VERSION } from "./seed";
import type { Result } from "./store";
import type {
  ActivityEntry,
  AuthStatus,
  Booking,
  Instructor,
  InventoryItem,
  Level,
  Member,
  MemberRow,
  Role,
  Room,
  Session,
  Settings,
  Shift,
  StudioState,
  Style,
  WaitlistEntry,
} from "./types";

const db = () => supabase!;

let state: StudioState | null = null;
let loading: Promise<void> | null = null;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const STAFF_ROLES: Role[] = ["teacher", "desk", "owner"];
export const isStaffRole = (r?: Role) => !!r && STAFF_ROLES.includes(r);

function emptyMe(): Member {
  return { id: "", name: "", plan: "", since: "", role: "client" };
}

// ——— loading ———

type Row = Record<string, unknown>;
const name = (p: Row | null | undefined) => (p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "");

async function fetchAll(): Promise<StudioState> {
  const c = db();
  const { data: auth } = await c.auth.getUser();
  const user = auth.user;

  let me = emptyMe();
  let status: AuthStatus = "anon";
  if (user) {
    const { data: p } = await c.from("profiles").select("*").eq("id", user.id).maybeSingle();
    me = {
      id: user.id,
      name: name(p) || (user.email ?? ""),
      plan: "",
      since: (p?.created_at as string) ?? user.created_at,
      email: (p?.email as string) ?? user.email ?? "",
      phone: (p?.phone as string) ?? "",
      firstName: (p?.first_name as string) ?? "",
      lastName: (p?.last_name as string) ?? "",
      role: ((p?.role as Role) ?? "client") as Role,
      teacherId: (p?.teacher_id as string | null) ?? null,
    };
    status = p && p.first_name && p.phone && p.consent_at ? "ready" : "incomplete";
    const { count } = await c.from("bookings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "checked-in");
    me.attended = count ?? 0;
  }
  const staff = isStaffRole(me.role);

  // keep the calendar filled 14 days ahead (idempotent, cheap)
  await c.rpc("ensure_sessions", { p_days: 14 });

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - 1);
  const to = new Date(from);
  to.setDate(to.getDate() + 17);

  const [teachersQ, roomsQ, sessionsQ, statsQ, settingsQ] = await Promise.all([
    c.from("teachers").select("*").order("sort"),
    c.from("rooms").select("*"),
    c.from("sessions").select("*").gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).eq("cancelled", false).order("starts_at"),
    c.rpc("session_stats", { p_from: from.toISOString(), p_to: to.toISOString() }),
    c.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const sessionRows = (sessionsQ.data ?? []) as Row[];
  const ids = sessionRows.map((s) => s.id as string);

  // RLS: clients get only their own rows, staff get everything
  const [bookingsQ, waitQ] = user && ids.length
    ? await Promise.all([
        c.from("bookings").select("*, profiles(first_name,last_name)").in("session_id", ids),
        c.from("waitlist").select("*, profiles(first_name,last_name)").in("session_id", ids).order("created_at"),
      ])
    : [{ data: [] }, { data: [] }];

  const stats = new Map<string, { booked: number; waiting: number; myPos: number | null }>();
  for (const r of (statsQ.data ?? []) as Row[]) {
    stats.set(r.session_id as string, { booked: r.booked as number, waiting: r.waiting as number, myPos: (r.my_position as number | null) ?? null });
  }

  const bookingsBy = new Map<string, Booking[]>();
  for (const b of (bookingsQ.data ?? []) as Row[]) {
    const list = bookingsBy.get(b.session_id as string) ?? [];
    list.push({
      id: b.id as string,
      memberId: (b.user_id as string) ?? `guest-${b.id}`,
      name: (b.guest_name as string) ?? (name(b.profiles as Row) || "—"),
      spot: null,
      status: b.status as Booking["status"],
      guest: !!b.guest_name,
      guestOf: (b.guest_of as string) ?? undefined,
      createdAt: b.created_at as string,
      cancelledAt: (b.cancelled_at as string) ?? undefined,
      feeWaived: b.fee_waived as boolean,
    });
    bookingsBy.set(b.session_id as string, list);
  }
  const waitBy = new Map<string, WaitlistEntry[]>();
  for (const w of (waitQ.data ?? []) as Row[]) {
    const list = waitBy.get(w.session_id as string) ?? [];
    list.push({ id: w.id as string, memberId: w.user_id as string, name: name(w.profiles as Row), joinedAt: w.created_at as string });
    waitBy.set(w.session_id as string, list);
  }

  const rooms: Room[] = ((roomsQ.data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    name: r.id as string,
    capacity: r.capacity as number,
    cols: r.cols as number,
    unit: r.unit as Room["unit"],
  }));

  const instructors: Instructor[] = ((teachersQ.data ?? []) as Row[]).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    role: "teacher",
    bio: "",
    tone: t.tone as string,
  }));

  const sessions: Session[] = sessionRows.map((s) => ({
    id: s.id as string,
    title: s.title as string,
    style: s.style as Style,
    level: s.level as Level,
    instructorId: s.teacher_id as string,
    roomId: s.room_id as string,
    start: s.starts_at as string,
    durationMin: s.duration_min as number,
    capacity: s.capacity as number,
    description: s.desc_key as string,
    bookings: bookingsBy.get(s.id as string) ?? [],
    waitlist: waitBy.get(s.id as string) ?? [],
    stats: stats.get(s.id as string) ?? { booked: 0, waiting: 0, myPos: null },
  }));

  const st = settingsQ.data as Row | null;
  const settings: Settings = {
    lateCancelHours: (st?.late_cancel_hours as number) ?? 2,
    bookingCutoffHours: (st?.booking_cutoff_hours as number) ?? 8,
    lateCancelFee: (st?.late_cancel_fee as number) ?? 10,
    autoPromote: (st?.auto_promote as boolean) ?? true,
  };

  let inventory: InventoryItem[] = [];
  let shifts: Shift[] = [];
  let activity: ActivityEntry[] = [];
  let staffPeople: Instructor[] = [];
  if (staff) {
    const weekAgo = new Date(Date.now() - 8 * 864e5).toISOString();
    const [invQ, shiftQ, actQ, peopleQ] = await Promise.all([
      c.from("inventory").select("*").order("id"),
      c.from("shifts").select("*").gte("start_at", weekAgo).order("start_at", { ascending: false }),
      c.from("activity").select("*").order("at", { ascending: false }).limit(30),
      c.from("profiles").select("id, first_name, last_name, email, role, teacher_id").in("role", STAFF_ROLES),
    ]);
    inventory = ((invQ.data ?? []) as Row[]).map((i) => ({
      id: i.id as string,
      roomId: i.room_id as string,
      name: i.name as string,
      total: i.total as number,
      inRepair: i.in_repair as number,
      minimum: i.minimum as number,
    }));
    shifts = ((shiftQ.data ?? []) as Row[]).map((x) => ({
      id: x.id as string,
      staffId: x.staff_id as string,
      start: x.start_at as string,
      end: (x.end_at as string) ?? undefined,
    }));
    activity = ((actQ.data ?? []) as Row[]).map((a) => ({ id: String(a.id), at: a.at as string, key: a.key as string, vars: a.vars as ActivityEntry["vars"] }));
    staffPeople = ((peopleQ.data ?? []) as Row[]).map((p) => ({
      id: p.id as string,
      name: name(p) || (p.email as string),
      role: p.role === "teacher" ? "teacher" : "front-desk",
      bio: "",
      tone: "#e4dbd8",
      teacherId: p.teacher_id,
    })) as Instructor[];
  }

  return {
    mode: "live",
    auth: status,
    version: STATE_VERSION,
    seededAt: new Date().toISOString(),
    me,
    instructors,
    staff: staffPeople,
    rooms,
    sessions,
    inventory,
    shifts,
    settings,
    activity,
  };
}

export function refresh(): Promise<void> {
  if (loading) return loading;
  loading = fetchAll()
    .then((s) => {
      state = s;
      emit();
    })
    .catch((e) => console.error("New Moon: could not load data", e))
    .finally(() => {
      loading = null;
    });
  return loading;
}

let timer: ReturnType<typeof setTimeout> | null = null;
function refreshSoon() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void refresh(), 400);
}

function start() {
  if (started) return;
  started = true;
  const c = db();
  void refresh();
  c.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") refreshSoon();
  });
  // staff see rosters change live; everyone refreshes when the app comes back to the foreground
  c.channel("studio-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, refreshSoon)
    .on("postgres_changes", { event: "*", schema: "public", table: "waitlist" }, refreshSoon)
    .subscribe();
  window.addEventListener("focus", refreshSoon);
  setInterval(() => document.visibilityState === "visible" && refreshSoon(), 60_000);
}

function subscribe(l: () => void) {
  listeners.add(l);
  start();
  return () => listeners.delete(l);
}

export function useRemoteStudio(): StudioState | null {
  return useSyncExternalStore(subscribe, () => state, () => null);
}

// ——— actions ———

async function call(fn: string, args: Record<string, unknown> = {}): Promise<Result> {
  const { data, error } = await db().rpc(fn, args);
  if (error) {
    console.error(fn, error);
    return { ok: false, message: "msg.network" };
  }
  await refresh();
  const r = data as { ok: boolean; message: string; vars?: Record<string, string | number> };
  return { ok: r.ok, message: r.message, vars: r.vars };
}

export const remote = {
  book: (session: string) => call("book_class", { p_session: session }),
  cancelMine: (session: string) => call("cancel_booking", { p_session: session }),
  joinWaitlist: (session: string) => call("join_waitlist", { p_session: session }),
  leaveWaitlist: (session: string) => call("leave_waitlist", { p_session: session }),
  setStatus: (booking: string, status: "booked" | "checked-in" | "no-show") => call("staff_set_status", { p_booking: booking, p_status: status }),
  staffCancel: (booking: string, late: boolean) => call("staff_cancel", { p_booking: booking, p_late: late }),
  promote: (wait: string) => call("staff_promote", { p_wait: wait }),
  removeFromWaitlist: (wait: string) => call("staff_remove_wait", { p_wait: wait }),
  addGuest: (session: string, guest: string, guestOf: string) => call("staff_add_guest", { p_session: session, p_name: guest, p_guest_of: guestOf }),
  waiveFee: (booking: string) => call("staff_waive_fee", { p_booking: booking }),
  adjustInventory: (item: string, field: "total" | "inRepair", delta: number) => call("staff_adjust_inventory", { p_item: item, p_field: field, p_delta: delta }),
  clockToggle: () => call("staff_clock_toggle"),
  updateSettings: (s: Settings) => call("owner_update_settings", { p_hours: s.lateCancelHours, p_fee: s.lateCancelFee, p_auto: s.autoPromote, p_cutoff: s.bookingCutoffHours }),
  setBlocked: (user: string, blocked: boolean) => call("staff_set_blocked", { p_user: user, p_blocked: blocked }),
  setRole: (email: string, role: Role, teacher: string | null) => call("owner_set_role", { p_email: email, p_role: role, p_teacher: teacher }),

  async members(): Promise<MemberRow[]> {
    const { data } = await db().rpc("staff_members");
    return ((data ?? []) as Row[]).map((m) => ({
      id: m.id as string,
      firstName: m.first_name as string,
      lastName: m.last_name as string,
      phone: m.phone as string,
      email: (m.email as string) ?? "",
      role: m.role as Role,
      createdAt: m.created_at as string,
      attended: m.attended as number,
      noShows: m.no_shows as number,
      lateCancels: m.late_cancels as number,
      upcoming: m.upcoming as number,
      blocked: !!m.blocked,
    }));
  },

  async invites(): Promise<{ email: string; role: Role }[]> {
    const { data } = await db().from("staff_invites").select("email, role").order("created_at");
    return (data ?? []) as { email: string; role: Role }[];
  },

  // every booking in a date range, for the Excel export
  async bookingsExport(fromIso: string, toIso: string) {
    const { data } = await db()
      .from("bookings")
      .select("status, fee_waived, created_at, cancelled_at, guest_name, guest_of, profiles(first_name,last_name,phone,email), sessions!inner(title, starts_at)")
      .gte("sessions.starts_at", fromIso)
      .lt("sessions.starts_at", toIso)
      .order("created_at");
    return (data ?? []) as Row[];
  },

  // ——— auth ———
  async sendCode(email: string): Promise<Result> {
    const { error } = await db().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.href.split("#")[0] },
    });
    if (error) return { ok: false, message: error.status === 429 ? "auth.tooMany" : "auth.sendFailed" };
    return { ok: true, message: "auth.codeSent", vars: { email: email.trim() } };
  },
  async verifyCode(email: string, token: string): Promise<Result> {
    const { error } = await db().auth.verifyOtp({ email: email.trim(), token: token.trim(), type: "email" });
    if (error) return { ok: false, message: "auth.badCode" };
    await refresh();
    return { ok: true, message: "" };
  },
  async google() {
    await db().auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href.split("#")[0] } });
  },
  async saveProfile(p: { firstName: string; lastName: string; phone: string; consent: boolean; lang: string }): Promise<Result> {
    const { data: auth } = await db().auth.getUser();
    if (!auth.user) return { ok: false, message: "msg.loginRequired" };
    const { error } = await db()
      .from("profiles")
      .update({
        first_name: p.firstName.trim(),
        last_name: p.lastName.trim(),
        phone: p.phone.trim(),
        lang: p.lang,
        ...(p.consent ? { consent_at: new Date().toISOString() } : {}),
      })
      .eq("id", auth.user.id);
    if (error) return { ok: false, message: "msg.network" };
    await refresh();
    return { ok: true, message: "auth.saved" };
  },
  async signOut() {
    await db().auth.signOut();
    await refresh();
  },
};
