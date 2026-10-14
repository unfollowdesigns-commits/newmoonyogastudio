export type Style = "Anti-stress" | "Back care" | "Beginner+" | "Restorative" | "Aerial" | "Women's yoga";
export type Level = "All Levels" | "Beginner" | "Intermediate" | "Advanced";

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

export interface Member {
  id: string;
  name: string;
  plan: string; // i18n key (plan.<key>)
  since: string;
}

export interface Settings {
  lateCancelHours: number;
  lateCancelFee: number;
  autoPromote: boolean;
}

export interface StudioState {
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
