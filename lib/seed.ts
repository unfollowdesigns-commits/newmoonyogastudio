import { studio, type StudioConfig } from "@/clients";
import { addDays, startOfDay, studioDate } from "./date";
import type {
  Booking,
  Instructor,
  InventoryItem,
  Level,
  Room,
  Session,
  Shift,
  StudioState,
  Style,
  WaitlistEntry,
} from "./types";

export const STATE_VERSION = 8;
export const SCHEDULE_DAYS = 14;

export const STUDIO = { ...studio.contact, name: studio.name, currency: studio.currency };
export const PHONE_PREFIX = studio.phonePrefix;
export const FEATURES = studio.features;

export type Price = StudioConfig["prices"][number];
export const PRICES: Price[] = studio.prices;

export const STYLES: Style[] = Object.keys(studio.styles);
export const LEVELS: Level[] = ["All Levels", "Beginner"];

export const STYLE_META: Record<Style, { hue: string; soft: string }> = studio.styles;

const instructors: Instructor[] = [
  ...studio.teachers.map((t) => ({ id: t.id, name: t.name, role: "teacher" as const, tone: t.tone, bio: t.bio.en })),
  { id: "desk", name: "Front Desk", role: "front-desk", tone: "#dcd6d2", bio: "Reservations & studio management." },
];

const rooms: Room[] = studio.rooms.map(({ id, capacity, cols, unit }) => ({ id, name: id, capacity, cols, unit }));

interface Slot {
  hour: number;
  minute: number;
  title: string;
  style: Style;
  level: Level;
  instructorId: string;
  roomId: string;
  durationMin: number;
  desc: string;
}

// Weekly timetable from the studio file — index 0 = Sunday.
const WEEK: Slot[][] = Array.from({ length: 7 }, (_, day) =>
  studio.timetable
    .filter((c) => c.day === day)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((c) => {
      const [hour, minute] = c.time.split(":").map(Number);
      return { hour, minute, title: c.title, style: c.style, level: c.level, instructorId: c.teacher, roomId: c.room, durationMin: c.minutes, desc: c.desc };
    }),
);

const MEMBERS = [
  "Amira Ben Salah", "Yasmine Trabelsi", "Salma Gharbi", "Ines Jaziri", "Meriem Ayari", "Nour Hammami", "Sarra Mejri",
  "Rim Bouazizi", "Hela Chaabane", "Leila Mansour", "Asma Karoui", "Olfa Ben Romdhane", "Emna Khelifi", "Dorra Sassi",
  "Ons Mzoughi", "Khadija Riahi", "Sonia Dridi", "Wafa Zouari", "Molka Feki", "Aziza Baccouche", "Lina Belhadj",
  "Mariem Kallel", "Sana Ferchichi", "Nadia Ouertani",
];

// deterministic pseudo-random so every visitor sees the same studio
function rng(seed: number) {
  let x = seed % 2147483647;
  if (x <= 0) x += 2147483646;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}

export const ME = { id: "me", name: "Yasmine Ben Ali", plan: "monthly", since: "2025-09-01", role: "owner" as const, phone: "22 000 000", email: "yasmine@example.com" };

export function createSeed(now = new Date()): StudioState {
  const today = startOfDay(now);
  const sessions: Session[] = [];
  const firstDay = addDays(today, -1); // include yesterday for staff history

  for (let d = 0; d <= SCHEDULE_DAYS; d++) {
    const day = addDays(firstDay, d);
    const slots = WEEK[day.getDay()];
    slots.forEach((slot, i) => {
      const start = studioDate(day.getFullYear(), day.getMonth(), day.getDate(), slot.hour, slot.minute);
      const room = rooms.find((r) => r.id === slot.roomId)!;
      const rand = rng(day.getDate() * 97 + day.getMonth() * 31 + i * 13 + 7);
      const fillPattern = [0.75, 1, 0.6, 0.9, 0.5, 1, 0.7];
      // further-out classes are emptier
      const decay = Math.max(0.25, 1 - Math.max(0, d - 2) * 0.07);
      let ratio = fillPattern[(i + day.getDay()) % fillPattern.length] * decay;
      if (d <= 3 && ratio >= 0.9) ratio = 1;
      const count = Math.min(room.capacity, Math.round(room.capacity * ratio));
      const id = `${dayKeyCompact(start)}-${i}`;
      const isPast = start.getTime() + slot.durationMin * 60000 < now.getTime();

      const shuffled = [...MEMBERS].sort(() => rand() - 0.5);
      const spots = Array.from({ length: room.capacity }, (_, k) => k + 1).sort(() => rand() - 0.5);
      const bookings: Booking[] = shuffled.slice(0, count).map((name, k) => ({
        id: `${id}-b${k}`,
        memberId: `m-${name.toLowerCase().replace(/\s+/g, "-")}`,
        name,
        spot: spots[k],
        status: isPast ? (rand() > 0.12 ? "checked-in" : "no-show") : "booked",
        createdAt: addDays(start, -3).toISOString(),
      }));

      const waitlist: WaitlistEntry[] =
        count >= room.capacity && !isPast
          ? shuffled.slice(count, count + 1 + Math.floor(rand() * 3)).map((name, k) => ({
              id: `${id}-w${k}`,
              memberId: `m-${name.toLowerCase().replace(/\s+/g, "-")}`,
              name,
              joinedAt: addDays(start, -1).toISOString(),
            }))
          : [];

      sessions.push({
        id,
        title: slot.title,
        style: slot.style,
        level: slot.level,
        instructorId: slot.instructorId,
        roomId: slot.roomId,
        start: start.toISOString(),
        durationMin: slot.durationMin,
        capacity: room.capacity,
        description: slot.desc, // i18n key → desc.<key>
        bookings,
        waitlist,
      });
    });
  }

  // a late cancellation so the staff queue isn't empty
  const lateTarget = sessions.find((x) => new Date(x.start) > now && x.bookings.length > 4);
  if (lateTarget) {
    const b = lateTarget.bookings[0];
    b.status = "late-cancel";
    b.cancelledAt = new Date(now.getTime() - 3600e3).toISOString();
    b.spot = null;
  }

  const inventory: InventoryItem[] = studio.inventory.map((i) => ({ id: i.id, roomId: i.room, name: i.name, total: i.total, inRepair: 0, minimum: i.minimum }));

  const shifts: Shift[] = [];
  for (let d = 1; d <= 6; d++) {
    const day = addDays(today, -d);
    shifts.push(shift("desk", day, 8, 0, 12, 0));
    // each teacher clocks in 30 min before their class and out 15 min after
    for (const c of WEEK[day.getDay()]) {
      const end = c.hour * 60 + c.minute + c.durationMin + 15;
      const start = c.hour * 60 + c.minute - 30;
      shifts.push(shift(c.instructorId, day, Math.floor(start / 60), start % 60, Math.floor(end / 60), end % 60));
    }
  }

  return {
    mode: "demo",
    auth: "ready",
    version: STATE_VERSION,
    seededAt: now.toISOString(),
    me: ME,
    instructors,
    rooms,
    sessions,
    inventory,
    shifts,
    settings: { ...studio.rules },
    activity: [],
  };
}

function shift(staffId: string, day: Date, h1: number, m1: number, h2: number, m2: number): Shift {
  const start = studioDate(day.getFullYear(), day.getMonth(), day.getDate(), h1, m1);
  const end = studioDate(day.getFullYear(), day.getMonth(), day.getDate(), h2, m2);
  return { id: `${staffId}-${start.getTime()}`, staffId, start: start.toISOString(), end: end.toISOString() };
}

function dayKeyCompact(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
