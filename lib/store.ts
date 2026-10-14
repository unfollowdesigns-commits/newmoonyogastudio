"use client";

import { useSyncExternalStore } from "react";
import { createSeed, STATE_VERSION } from "./seed";
import { hoursUntil } from "./date";
import type { Booking, Session, Settings, StudioState } from "./types";

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

export function useStudio(): StudioState | null {
  return useSyncExternalStore(subscribe, get, () => null);
}

type Result = { ok: true; message: string } | { ok: false; message: string };

function update(fn: (draft: StudioState) => Result | void, log?: string): Result {
  const draft = structuredClone(get());
  const res = fn(draft) ?? { ok: true as const, message: "" };
  if (!res.ok) return res;
  if (log) {
    draft.activity.unshift({ id: uid(), at: new Date().toISOString(), text: log });
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

// ——— derived helpers ———

export const HOLDS_SPOT = (b: Booking) => b.status === "booked" || b.status === "checked-in" || b.status === "no-show";

export function activeBookings(s: Session) {
  return s.bookings.filter(HOLDS_SPOT);
}

export function spotsLeft(s: Session) {
  return Math.max(0, s.capacity - activeBookings(s).length);
}

export function takenSpots(s: Session): Set<number> {
  return new Set(activeBookings(s).map((b) => b.spot).filter((x): x is number => x !== null));
}

export function myBooking(s: Session, memberId: string) {
  return s.bookings.find((b) => b.memberId === memberId && HOLDS_SPOT(b));
}

export function myWaitlistPosition(s: Session, memberId: string) {
  const i = s.waitlist.findIndex((w) => w.memberId === memberId);
  return i === -1 ? null : i + 1;
}

export function isPast(s: Session) {
  return new Date(s.start).getTime() < Date.now();
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

function freeAndPromote(draft: StudioState, s: Session): string {
  if (!draft.settings.autoPromote) return "";
  const promoted = promoteNext(s);
  return promoted ? ` ${promoted} was promoted from the waitlist.` : "";
}

// ——— client actions ———

export function book(sessionId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    if (isPast(s)) return { ok: false, message: "This class has already started." };
    if (myBooking(s, d.me.id)) return { ok: false, message: "You're already booked." };
    if (spotsLeft(s) <= 0) return { ok: false, message: "This class just filled up — join the waitlist instead." };
    const chosen = firstFreeSpot(s);
    s.waitlist = s.waitlist.filter((w) => w.memberId !== d.me.id);
    s.bookings.push({ id: uid(), memberId: d.me.id, name: d.me.name, spot: chosen, status: "booked", createdAt: new Date().toISOString() });
    return { ok: true, message: "You're in — see you on the mat." };
  }, `${get().me.name} booked a class`);
}

export function cancelMine(sessionId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    const b = myBooking(s, d.me.id);
    if (!b) return { ok: false, message: "No booking found." };
    const late = hoursUntil(s.start) < d.settings.lateCancelHours;
    b.status = late ? "late-cancel" : "cancelled";
    b.cancelledAt = new Date().toISOString();
    b.spot = null;
    freeAndPromote(d, s);
    return {
      ok: true,
      message: late ? `Cancelled. A ${d.settings.lateCancelFee} DT late-cancel fee applies.` : "Cancelled — no fee. See you soon.",
    };
  }, `${get().me.name} cancelled a booking`);
}

export function joinWaitlist(sessionId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    if (myWaitlistPosition(s, d.me.id)) return { ok: false, message: "You're already on the waitlist." };
    s.waitlist.push({ id: uid(), memberId: d.me.id, name: d.me.name, joinedAt: new Date().toISOString() });
    return { ok: true, message: `You're #${s.waitlist.length} on the waitlist. We'll book you automatically if a spot opens.` };
  }, `${get().me.name} joined a waitlist`);
}

export function leaveWaitlist(sessionId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    s.waitlist = s.waitlist.filter((w) => w.memberId !== d.me.id);
    return { ok: true, message: "Removed from the waitlist." };
  });
}

// ——— staff actions ———

export function toggleCheckIn(sessionId: string, bookingId: string): Result {
  return update((d) => {
    const b = find(d, sessionId).bookings.find((x) => x.id === bookingId)!;
    b.status = b.status === "checked-in" ? "booked" : "checked-in";
    return { ok: true, message: b.status === "checked-in" ? `${b.name} checked in` : `${b.name} un-checked` };
  });
}

export function markNoShow(sessionId: string, bookingId: string): Result {
  return update((d) => {
    const b = find(d, sessionId).bookings.find((x) => x.id === bookingId)!;
    b.status = b.status === "no-show" ? "booked" : "no-show";
    return { ok: true, message: b.status === "no-show" ? `${b.name} marked no-show` : `${b.name} restored` };
  });
}

export function staffCancel(sessionId: string, bookingId: string, late: boolean): Result {
  return update((d) => {
    const s = find(d, sessionId);
    const b = s.bookings.find((x) => x.id === bookingId)!;
    b.status = late ? "late-cancel" : "cancelled";
    b.cancelledAt = new Date().toISOString();
    b.spot = null;
    const extra = freeAndPromote(d, s);
    return { ok: true, message: `${b.name} ${late ? "late-cancelled" : "cancelled"}.${extra}` };
  }, "Staff cancelled a booking");
}

export function promote(sessionId: string, waitId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    if (spotsLeft(s) <= 0) return { ok: false, message: "No open spots. Cancel or move someone first." };
    const i = s.waitlist.findIndex((w) => w.id === waitId);
    const [w] = s.waitlist.splice(i, 1);
    s.bookings.push({ id: uid(), memberId: w.memberId, name: w.name, spot: firstFreeSpot(s), status: "booked", createdAt: new Date().toISOString() });
    return { ok: true, message: `${w.name} promoted from waitlist.` };
  }, "Staff promoted from waitlist");
}

export function removeFromWaitlist(sessionId: string, waitId: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    s.waitlist = s.waitlist.filter((w) => w.id !== waitId);
    return { ok: true, message: "Removed from waitlist." };
  });
}

export function addGuest(sessionId: string, name: string, guestOf: string): Result {
  return update((d) => {
    const s = find(d, sessionId);
    if (!name.trim()) return { ok: false, message: "Add the guest's name." };
    if (spotsLeft(s) <= 0) return { ok: false, message: "Class is full." };
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
    return { ok: true, message: `${name.trim()} added as a guest.` };
  }, "Guest reservation added");
}

export function waiveFee(sessionId: string, bookingId: string): Result {
  return update((d) => {
    const b = find(d, sessionId).bookings.find((x) => x.id === bookingId)!;
    b.feeWaived = !b.feeWaived;
    return { ok: true, message: b.feeWaived ? "Fee waived" : "Fee reinstated" };
  });
}

export function adjustInventory(itemId: string, field: "total" | "inRepair", delta: number): Result {
  return update((d) => {
    const it = d.inventory.find((x) => x.id === itemId)!;
    const next = it[field] + delta;
    if (next < 0 || (field === "inRepair" && next > it.total) || (field === "total" && next < it.inRepair)) {
      return { ok: false, message: "That count isn't possible." };
    }
    it[field] = next;
    return { ok: true, message: "" };
  });
}

export function clockToggle(staffId: string): Result {
  return update((d) => {
    const open = d.shifts.find((x) => x.staffId === staffId && !x.end);
    if (open) {
      open.end = new Date().toISOString();
      return { ok: true, message: "Clocked out. Rest well." };
    }
    d.shifts.push({ id: uid(), staffId, start: new Date().toISOString() });
    return { ok: true, message: "Clocked in." };
  });
}

export function updateSettings(patch: Partial<Settings>): Result {
  return update((d) => {
    d.settings = { ...d.settings, ...patch };
    return { ok: true, message: "Settings saved" };
  });
}

export function resetDemo() {
  state = createSeed();
  persist();
  emit();
}
