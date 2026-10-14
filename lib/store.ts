"use client";

// One API for the screens. With Supabase keys configured the app is "live"
// (real accounts, shared data); without them it runs the on-device demo.

import * as demo from "./demo";
import { remote } from "./remote";
import { useRemoteStudio } from "./remote";
import { LIVE } from "./supabase";
import type { MemberRow, Role, Settings, StudioState } from "./types";

export * from "./helpers";
export { LIVE };

// `message` is an i18n key; components translate it with `vars`.
export type Result = { ok: boolean; message: string; vars?: Record<string, string | number> };

export const useStudio: () => StudioState | null = LIVE ? useRemoteStudio : demo.useDemoStudio;

const ok = (r: Result) => Promise.resolve(r);

// ——— client ———
export const book = (sessionId: string) => (LIVE ? remote.book(sessionId) : ok(demo.book(sessionId)));
export const cancelMine = (sessionId: string) => (LIVE ? remote.cancelMine(sessionId) : ok(demo.cancelMine(sessionId)));
export const joinWaitlist = (sessionId: string) => (LIVE ? remote.joinWaitlist(sessionId) : ok(demo.joinWaitlist(sessionId)));
export const leaveWaitlist = (sessionId: string) => (LIVE ? remote.leaveWaitlist(sessionId) : ok(demo.leaveWaitlist(sessionId)));

// ——— staff ———
export const toggleCheckIn = (sessionId: string, bookingId: string, current: string) =>
  LIVE ? remote.setStatus(bookingId, current === "checked-in" ? "booked" : "checked-in") : ok(demo.toggleCheckIn(sessionId, bookingId));
export const markNoShow = (sessionId: string, bookingId: string, current: string) =>
  LIVE ? remote.setStatus(bookingId, current === "no-show" ? "booked" : "no-show") : ok(demo.markNoShow(sessionId, bookingId));
export const staffCancel = (sessionId: string, bookingId: string, late: boolean) =>
  LIVE ? remote.staffCancel(bookingId, late) : ok(demo.staffCancel(sessionId, bookingId, late));
export const promote = (sessionId: string, waitId: string) => (LIVE ? remote.promote(waitId) : ok(demo.promote(sessionId, waitId)));
export const removeFromWaitlist = (sessionId: string, waitId: string) =>
  LIVE ? remote.removeFromWaitlist(waitId) : ok(demo.removeFromWaitlist(sessionId, waitId));
export const addGuest = (sessionId: string, name: string, guestOf: string) =>
  LIVE ? remote.addGuest(sessionId, name, guestOf) : ok(demo.addGuest(sessionId, name, guestOf));
export const waiveFee = (sessionId: string, bookingId: string) => (LIVE ? remote.waiveFee(bookingId) : ok(demo.waiveFee(sessionId, bookingId)));
export const adjustInventory = (itemId: string, field: "total" | "inRepair", delta: number) =>
  LIVE ? remote.adjustInventory(itemId, field, delta) : ok(demo.adjustInventory(itemId, field, delta));
export const clockToggle = (staffId: string) => (LIVE ? remote.clockToggle() : ok(demo.clockToggle(staffId)));
export const updateSettings = (current: Settings, patch: Partial<Settings>) =>
  LIVE ? remote.updateSettings({ ...current, ...patch }) : ok(demo.updateSettings(patch));
export const resetDemo = demo.resetDemo;

// ——— owner ———
export const loadMembers = (): Promise<MemberRow[]> => (LIVE ? remote.members() : Promise.resolve(demo.demoMembers()));
export const setBlocked = (memberId: string, blocked: boolean) =>
  LIVE ? remote.setBlocked(memberId, blocked) : ok(demo.setBlocked(memberId, blocked));
export const setRole = (email: string, role: Role, teacher: string | null) =>
  LIVE ? remote.setRole(email, role, teacher) : ok({ ok: false, message: "msg.demoOnly" });
export const loadInvites = () => (LIVE ? remote.invites() : Promise.resolve([]));

// ——— account ———
export const auth = remote;
