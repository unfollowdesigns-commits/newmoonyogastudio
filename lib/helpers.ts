import { studio } from "@/clients";
import type { Booking, Session } from "./types";

export const HOLDS_SPOT = (b: Booking) => b.status === "booked" || b.status === "checked-in" || b.status === "no-show";

export function activeBookings(s: Session) {
  return s.bookings.filter(HOLDS_SPOT);
}

// In live mode a client only receives their own bookings, so counts come from `stats`.
export function bookedCount(s: Session) {
  return s.stats ? s.stats.booked : activeBookings(s).length;
}

export function waitCount(s: Session) {
  return s.stats ? s.stats.waiting : s.waitlist.length;
}

export function spotsLeft(s: Session) {
  return Math.max(0, s.capacity - bookedCount(s));
}

export function takenSpots(s: Session): Set<number> {
  return new Set(activeBookings(s).map((b) => b.spot).filter((x): x is number => x !== null));
}

export function myBooking(s: Session, memberId: string) {
  return s.bookings.find((b) => b.memberId === memberId && HOLDS_SPOT(b));
}

export function myWaitlistPosition(s: Session, memberId: string) {
  if (s.stats) return s.stats.myPos;
  const i = s.waitlist.findIndex((w) => w.memberId === memberId);
  return i === -1 ? null : i + 1;
}

// studio rule: bookings close N hours before the class starts
export function bookingClosed(s: Session, cutoffHours: number) {
  return new Date(s.start).getTime() - Date.now() < cutoffHours * 36e5;
}

export function isPast(s: Session) {
  return new Date(s.start).getTime() < Date.now();
}

// local numbers (8 digits in Tunisia) get the studio's country code for WhatsApp
export function whatsappLink(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.length === 8) d = studio.phonePrefix + d;
  return d ? `https://wa.me/${d}` : "";
}
