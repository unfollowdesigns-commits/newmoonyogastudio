// class family key, defined per studio in clients/<id>/studio.ts
export type Style = string;
import type { Level } from "@/clients/types";
export type { Level };

export type BookingStatus = "booked" | "checked-in" | "no-show" | "cancelled" | "late-cancel";

export interface Instructor {
  id: string;
  name: string;
  role: "teacher" | "front-desk";
  bio: string;
  tone: string; // avatar background
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  cols: number; // spot grid columns, row 1 is the front of the room
  unit: "mat" | "hammock";
}

export interface Booking {
  id: string;
  memberId: string;
  name: string;
  spot: number | null;
  status: BookingStatus;
  guest?: boolean;
  guestOf?: string;
  createdAt: string;
  cancelledAt?: string;
  feeWaived?: boolean;
}

export interface WaitlistEntry {
  id: string;
  memberId: string;
  name: string;
  joinedAt: string;
}

export interface Session {
  id: string;
  title: string;
  style: Style;
  level: Level;
  instructorId: string;
  roomId: string;
  start: string; // ISO
  durationMin: number;
  capacity: number;
  description: string; // i18n key (desc.<key>)
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  // public counts from the database (live mode: clients only see their own bookings)
  stats?: { booked: number; waiting: number; myPos: number | null };
}

export interface InventoryItem {
  id: string;
  roomId: string;
  name: string;
  total: number;
  inRepair: number;
  minimum: number;
}

export interface Shift {
  id: string;
  staffId: string;
  start: string;
  end?: string;
}

export interface ActivityEntry {
  id: string;
  at: string;
  key: string; // i18n key (log.<key>)
  vars?: Record<string, string | number>;
}

export type Role = "client" | "teacher" | "desk" | "owner";

export interface Member {
  id: string;
  name: string;
  plan: string; // i18n key (plan.<key>), empty in live mode
  since: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  teacherId?: string | null;
  attended?: number; // live mode: all-time count from the database
}

// "anon" = not signed in, "incomplete" = signed in but name/WhatsApp/consent missing
export type AuthStatus = "anon" | "incomplete" | "ready";

export interface MemberRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: Role;
  createdAt: string;
  attended: number;
  noShows: number;
  lateCancels: number;
  upcoming: number;
  blocked?: boolean;
}

export interface Settings {
  lateCancelHours: number;
  bookingCutoffHours: number; // bookings close this many hours before class
  lateCancelFee: number;
  autoPromote: boolean;
}

export interface StudioState {
  mode: "demo" | "live";
  auth: AuthStatus;
  staff?: Instructor[]; // people who clock hours (live mode); demo uses instructors
  blockedIds?: string[]; // demo only: excluded clients
  version: number;
  seededAt: string;
  me: Member;
  instructors: Instructor[];
  rooms: Room[];
  sessions: Session[];
  inventory: InventoryItem[];
  shifts: Shift[];
  settings: Settings;
  activity: ActivityEntry[];
}
