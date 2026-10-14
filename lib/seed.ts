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

export const STUDIO = {
  name: "New Moon Yoga Studio",
  location: "Les Jardins de Carthage, Tunis",
  phoneDisplay: "56 775 096",
  whatsapp: "https://wa.me/21656775096",
  instagram: "https://www.instagram.com/new_moon_yoga_studio/",
  currency: "DT",
};

// From the studio's price list (validity: how long the pass lasts)
export type Price = { kind: "trial" | "pack" | "unlimited"; n?: number; price: number; validity?: ["days" | "month" | "months" | "year", number] };
export const PRICES: Price[] = [
  { kind: "trial", price: 40 },
  { kind: "pack", n: 5, price: 150, validity: ["days", 20] },
  { kind: "pack", n: 10, price: 280, validity: ["month", 1] },
  { kind: "pack", n: 15, price: 360, validity: ["months", 2] },
  { kind: "pack", n: 20, price: 440, validity: ["months", 3] },
  { kind: "pack", n: 30, price: 670, validity: ["months", 4] },
  { kind: "pack", n: 50, price: 990, validity: ["months", 6] },
  { kind: "unlimited", price: 1540, validity: ["year", 1] },
];

export const STYLES: Style[] = ["Women's yoga", "Anti-stress", "Back care", "Beginner+", "Restorative", "Aerial"];
export const LEVELS: Level[] = ["All Levels", "Beginner"];

export const STYLE_META: Record<Style, { hue: string; soft: string }> = {
  "Women's yoga": { hue: "#a0667a", soft: "#f3e3e6" },
  "Anti-stress": { hue: "#7d8a9a", soft: "#e6e9ee" },
  "Back care": { hue: "#8a9a7b", soft: "#e8ebe1" },
  "Beginner+": { hue: "#b98366", soft: "#f3e6dc" },
  Restorative: { hue: "#9a8d74", soft: "#efeadf" },
  Aerial: { hue: "#8f7aa0", soft: "#ebe5f0" },
};

// Teachers for classes other than Rania Sam's aren't published yet — "team" is a placeholder.
const instructors: Instructor[] = [
  { id: "rania", name: "Rania Sam", role: "teacher", tone: "#ead3c6", bio: "Professeure certifiée en yoga féminin. Guides the hormonal balance series." },
  { id: "team", name: "New Moon Team", role: "teacher", tone: "#e4dbd8", bio: "Taught by the New Moon Yoga Studio teaching team." },
  { id: "desk", name: "Front Desk", role: "front-desk", tone: "#dcd6d2", bio: "Reservations & studio management." },
];

// Capacities are placeholders — adjust to the studio's real numbers.
const rooms: Room[] = [
  { id: "studio", name: "Main Studio", capacity: 10, cols: 5, unit: "mat" },
  { id: "aerial", name: "Aerial Studio", capacity: 4, cols: 4, unit: "hammock" },
];

interface Slot {
  hour: number;
  minute: number;
  title: string;
  style: Style;
  level: Level;
  instructorId: string;
  roomId: string;
  durationMin: number;
}

// Weekly timetable — index 0 = Sunday. Regular classes 1h30, therapeutic (women) 2h, aerial 1h.
const HORMONAL = () => s(8, 30, "Yoga pour l'équilibre hormonal", "Women's yoga", "All Levels", "rania", "studio", 120, "hormonal");
const WEEK: (Slot & { desc: string })[][] = [
  [s(10, 0, "Yoga air", "Aerial", "All Levels", "team", "aerial", 60, "air")],
  [s(19, 30, "Yoga anti stress", "Anti-stress", "All Levels", "team", "studio", 90, "stress")],
  [s(19, 30, "Yoga pour le dos", "Back care", "All Levels", "team", "studio", 90, "dos")],
  [HORMONAL(), s(19, 30, "Yoga débutant +", "Beginner+", "Beginner", "team", "studio", 90, "debutant")],
  [HORMONAL(), s(19, 30, "Yoga santé colonne vertébrale", "Back care", "All Levels", "team", "studio", 90, "colonne")],
  [HORMONAL(), s(19, 30, "Yoga restoratif", "Restorative", "All Levels", "team", "studio", 90, "restoratif")],
  [s(9, 0, "Yoga air", "Aerial", "All Levels", "team", "aerial", 60, "air")],
];

function s(
  hour: number,
  minute: number,
  title: string,
  style: Style,
  level: Level,
  instructorId: string,
  roomId: string,
  durationMin: number,
  desc: string,
): Slot & { desc: string } {
  return { hour, minute, title, style, level, instructorId, roomId, durationMin, desc };
}

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

  const inventory: InventoryItem[] = [
    item("studio", "Yoga mats", 12, 1, 10),
    item("studio", "Cork blocks", 20, 0, 20),
    item("studio", "Straps", 10, 0, 10),
    item("studio", "Bolsters", 10, 1, 10),
    item("studio", "Blankets", 12, 0, 10),
    item("studio", "Singing bowls", 3, 0, 2),
    item("aerial", "Aerial hammocks", 4, 0, 4),
    item("aerial", "Rigging sets (carabiners, daisy chains)", 4, 0, 4),
    item("aerial", "Crash mats", 4, 0, 4),
  ];

  const shifts: Shift[] = [];
  for (let d = 1; d <= 6; d++) {
    const day = addDays(today, -d);
    shifts.push(shift("desk", day, 8, 0, 12, 0));
    if ([3, 4, 5].includes(day.getDay())) shifts.push(shift("rania", day, 8, 0, 9, 45));
    shifts.push(shift("team", day, 18, 30, 21, 0));
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
    settings: { lateCancelHours: 2, lateCancelFee: 0, autoPromote: true, bookingCutoffHours: 8 },
    activity: [],
  };
}

function item(roomId: string, name: string, total: number, inRepair: number, minimum: number): InventoryItem {
  return { id: `${roomId}-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`, roomId, name, total, inRepair, minimum };
}

function shift(staffId: string, day: Date, h1: number, m1: number, h2: number, m2: number): Shift {
  const start = studioDate(day.getFullYear(), day.getMonth(), day.getDate(), h1, m1);
  const end = studioDate(day.getFullYear(), day.getMonth(), day.getDate(), h2, m2);
  return { id: `${staffId}-${start.getTime()}`, staffId, start: start.toISOString(), end: end.toISOString() };
}

function dayKeyCompact(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
