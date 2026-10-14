"use client";

import { useSyncExternalStore } from "react";
import { createSeed, STATE_VERSION } from "./seed";
import { hoursUntil } from "./date";
import type { MemberRow, Session, Settings, StudioState } from "./types";
import type { Result } from "./store";
import { activeBookings, isPast, myBooking, myWaitlistPosition, spotsLeft, takenSpots } from "./helpers";

const KEY = "newmoon-studio-v" + STATE_VERSION;
const STALE_MS = 3 * 24 * 3600e3;

let state: StudioState | null = null;
const listeners = new Set<() => void>();

function load(): StudioState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StudioState;
      // keep the demo calendar rolling forward
      if (parsed.version === STATE_VERSION && Date.now() - new Date(parsed.seededAt).getTime() < STALE_MS) {
        return parsed;
      }
    }
  } catch {}
  return createSeed();
}

function persist() {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function get(): StudioState {
  if (!state) {
    state = load();
    persist();
  }
  return state;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    // sync between the client app and staff portal open in other tabs
    if (e.key === KEY && e.newValue) {
      state = JSON.parse(e.newValue);
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDemoStudio(): StudioState | null {
  return useSyncExternalStore(subscribe, get, () => null);
}

type Log = { key: string; vars?: Record<string, string | number> };

function update(fn: (draft: StudioState) => Result | void, log?: Log): Result {
  const draft = structuredClone(get());
  const res = fn(draft) ?? { ok: true as const, message: "" };
  if (!res.ok) return res;
  if (log) {
    draft.activity.unshift({ id: uid(), at: new Date().toISOString(), ...log });
    draft.activity = draft.activity.slice(0, 50);
  }
  state = draft;
  persist();
  emit();
  return res;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function firstFreeSpot(s: Session): number | null {
  const taken = takenSpots(s);
  for (let i = 1; i <= s.capacity; i++) if (!taken.has(i)) return i;
  return null;
}

function find(draft: StudioState, sessionId: string) {
  const s = draft.sessions.find((x) => x.id === sessionId);
  if (!s) throw new Error("Unknown class");
  return s;
}

function promoteNext(s: Session): string | null {
  if (spotsLeft(s) <= 0 || s.waitlist.length === 0) return null;
  const next = s.waitlist.shift()!;
  s.bookings.push({
    id: uid(),
    memberId: next.memberId,
    name: next.name,
    spot: firstFreeSpot(s),
    status: "booked",
    createdAt: new Date().toISOString(),
  });
  return next.name;
}

function freeAndPromote(draft: StudioState, s: Session): string | null {
  if (!draft.settings.autoPromote) return null;
  return promoteNext(s);
}

// ——— client actions ———

export function book(sessionId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    if (isPast(s)) return { ok: false, message: "msg.started" };
    if (d.blockedIds?.includes(d.me.id)) return { ok: false, message: "msg.blocked" };
    if (myBooking(s, d.me.id)) return { ok: false, message: "msg.alreadyBooked" };
    if (spotsLeft(s) <= 0) return { ok: false, message: "msg.justFull" };
    const chosen = firstFreeSpot(s);
    s.waitlist = s.waitlist.filter((w) => w.memberId !== d.me.id);
    s.bookings.push({ id: uid(), memberId: d.me.id, name: d.me.name, spot: chosen, status: "booked", createdAt: new Date().toISOString() });
    return { ok: true, message: "msg.booked" };
  }, { key: "log.booked", vars: { name: get().me.name } });
}

export function cancelMine(sessionId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    const b = myBooking(s, d.me.id);
    if (!b) return { ok: false, message: "msg.noBooking" };
    const late = hoursUntil(s.start) < d.settings.lateCancelHours;
    b.status = late ? "late-cancel" : "cancelled";
    b.cancelledAt = new Date().toISOString();
    b.spot = null;
    freeAndPromote(d, s);
    return { ok: true, message: late ? "msg.cancelLate" : "msg.cancelFree", vars: { fee: d.settings.lateCancelFee } };
  }, { key: "log.cancelled", vars: { name: get().me.name } });
}

export function joinWaitlist(sessionId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    if (myWaitlistPosition(s, d.me.id)) return { ok: false, message: "msg.alreadyWaiting" };
    s.waitlist.push({ id: uid(), memberId: d.me.id, name: d.me.name, joinedAt: new Date().toISOString() });
    return { ok: true, message: "msg.waitJoined", vars: { n: s.waitlist.length } };
  }, { key: "log.waitlist", vars: { name: get().me.name } });
}

export function leaveWaitlist(sessionId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    s.waitlist = s.waitlist.filter((w) => w.memberId !== d.me.id);
    return { ok: true, message: "msg.waitLeft" };
  });
}

// ——— staff actions ———

export function toggleCheckIn(sessionId: string, bookingId: string): Result {
  return update((d) => {
    const b = find(d, sessionId).bookings.find((x) => x.id === bookingId)!;
    b.status = b.status === "checked-in" ? "booked" : "checked-in";
    return { ok: true, message: b.status === "checked-in" ? "msg.checkedIn" : "msg.unchecked", vars: { name: b.name } };
  });
}

export function markNoShow(sessionId: string, bookingId: string): Result {
  return update((d) => {
    const b = find(d, sessionId).bookings.find((x) => x.id === bookingId)!;
    b.status = b.status === "no-show" ? "booked" : "no-show";
    return { ok: true, message: b.status === "no-show" ? "msg.noShow" : "msg.restored", vars: { name: b.name } };
  });
}

export function staffCancel(sessionId: string, bookingId: string, late: boolean): Result {
  return update((d) => {
    const s = find(d, sessionId);
    const b = s.bookings.find((x) => x.id === bookingId)!;
    b.status = late ? "late-cancel" : "cancelled";
    b.cancelledAt = new Date().toISOString();
    b.spot = null;
    const promoted = freeAndPromote(d, s);
    return { ok: true, message: late ? "msg.cancelledLate" : "msg.cancelled", vars: { name: b.name, promoted: promoted ?? "" } };
  }, { key: "log.staffCancel" });
}

export function promote(sessionId: string, waitId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    if (spotsLeft(s) <= 0) return { ok: false, message: "msg.noSpots" };
    const i = s.waitlist.findIndex((w) => w.id === waitId);
    const [w] = s.waitlist.splice(i, 1);
    s.bookings.push({ id: uid(), memberId: w.memberId, name: w.name, spot: firstFreeSpot(s), status: "booked", createdAt: new Date().toISOString() });
    return { ok: true, message: "msg.promoted", vars: { name: w.name } };
  }, { key: "log.promoted" });
}

export function removeFromWaitlist(sessionId: string, waitId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    s.waitlist = s.waitlist.filter((w) => w.id !== waitId);
    return { ok: true, message: "msg.removedWait" };
  });
}

export function addGuest(sessionId: string, name: string, guestOf: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    if (!name.trim()) return { ok: false, message: "msg.guestName" };
    if (spotsLeft(s) <= 0) return { ok: false, message: "msg.classFull" };
    s.bookings.push({
      id: uid(),
      memberId: "guest-" + uid(),
      name: name.trim(),
      spot: firstFreeSpot(s),
      status: "booked",
      guest: true,
      guestOf: guestOf.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    return { ok: true, message: "msg.guestAdded", vars: { name: name.trim() } };
  }, { key: "log.guest" });
}

export function waiveFee(sessionId: string, bookingId: string): Result {
  return update((d) => {
    const b = find(d, sessionId).bookings.find((x) => x.id === bookingId)!;
    b.feeWaived = !b.feeWaived;
    return { ok: true, message: b.feeWaived ? "msg.feeWaived" : "msg.feeBack" };
  });
}

export function adjustInventory(itemId: string, field: "total" | "inRepair", delta: number): Result {
  return update((d) => {
    const it = d.inventory.find((x) => x.id === itemId)!;
    const next = it[field] + delta;
    if (next < 0 || (field === "inRepair" && next > it.total) || (field === "total" && next < it.inRepair)) {
      return { ok: false, message: "msg.badCount" };
    }
    it[field] = next;
    return { ok: true, message: "" };
  });
}

export function clockToggle(staffId = "me"): Result {
  return update((d) => {
    const open = d.shifts.find((x) => x.staffId === staffId && !x.end);
    if (open) {
      open.end = new Date().toISOString();
      return { ok: true, message: "msg.clockOut" };
    }
    d.shifts.push({ id: uid(), staffId, start: new Date().toISOString() });
    return { ok: true, message: "msg.clockIn" };
  });
}

export function updateSettings(patch: Partial<Settings>): Result {
  return update((d) => {
    d.settings = { ...d.settings, ...patch };
    return { ok: true, message: "msg.saved" };
  });
}

export function setBlocked(memberId: string, blocked: boolean): Result {
  return update(
    (d) => {
      const set = new Set(d.blockedIds ?? []);
      if (blocked) set.add(memberId);
      else set.delete(memberId);
      d.blockedIds = [...set];
      let name = "";
      for (const s of d.sessions) {
        if (blocked) s.waitlist = s.waitlist.filter((w) => w.memberId !== memberId);
        for (const b of s.bookings) {
          if (b.memberId !== memberId) continue;
          name = b.name;
          if (blocked && b.status === "booked" && !isPast(s)) {
            b.status = "cancelled";
            b.cancelledAt = new Date().toISOString();
            b.spot = null;
          }
        }
      }
      return { ok: true, message: blocked ? "msg.blocked.done" : "msg.unblocked", vars: { name } };
    },
    { key: blocked ? "log.blocked" : "log.unblocked" },
  );
}

export function resetDemo() {
  state = createSeed();
  persist();
  emit();
}

// members list for the staff portal, derived from the demo rosters
export function demoMembers(): MemberRow[] {
  const map = new Map<string, MemberRow>();
  for (const s of get().sessions) {
    for (const b of s.bookings) {
      if (b.guest) continue;
      const [firstName, ...rest] = b.name.split(" ");
      const m =
        map.get(b.memberId) ??
        ({ id: b.memberId, firstName, lastName: rest.join(" "), phone: "", email: "", role: "client", createdAt: b.createdAt, attended: 0, noShows: 0, lateCancels: 0, upcoming: 0, blocked: get().blockedIds?.includes(b.memberId) } as MemberRow);
      if (b.status === "checked-in") m.attended++;
      if (b.status === "no-show") m.noShows++;
      if (b.status === "late-cancel") m.lateCancels++;
      if (b.status === "booked" && !isPast(s)) m.upcoming++;
      if (b.createdAt < m.createdAt) m.createdAt = b.createdAt;
      if (m.createdAt > new Date().toISOString()) m.createdAt = new Date(Date.now() - 864e5).toISOString();
      map.set(b.memberId, m);
    }
  }
  return [...map.values()].sort((a, b) => a.firstName.localeCompare(b.firstName));
}
