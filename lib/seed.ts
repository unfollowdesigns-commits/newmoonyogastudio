import { addDays, startOfDay } from "./date";
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

export const STATE_VERSION = 3;
export const SCHEDULE_DAYS = 14;

export const STYLES: Style[] = ["Vinyasa", "Yin", "Hatha", "Sound Bath", "Restorative", "Power"];
export const LEVELS: Level[] = ["All Levels", "Beginner", "Intermediate", "Advanced"];

export const STYLE_META: Record<Style, { hue: string; soft: string; blurb: string }> = {
  Vinyasa: { hue: "#B7835F", soft: "#F1E4D8", blurb: "Breath-linked flow that builds gentle heat." },
  Yin: { hue: "#6E7F86", soft: "#E3E8E8", blurb: "Long, quiet holds for deep connective release." },
  Hatha: { hue: "#8A9A7B", soft: "#E6EADF", blurb: "Grounded, steady postures with mindful alignment." },
  "Sound Bath": { hue: "#9C8AA5", soft: "#ECE6EE", blurb: "Lie back and rest in waves of crystal & Tibetan bowls." },
  Restorative: { hue: "#A79C7E", soft: "#EEEADF", blurb: "Fully supported shapes to calm the nervous system." },
  Power: { hue: "#A86A55", soft: "#F1DFD7", blurb: "Strong, athletic sequencing to build heat and focus." },
};

const instructors: Instructor[] = [
  { id: "leilani", name: "Leilani Moreau", role: "teacher", tone: "#D9C6B0", bio: "E-RYT 500. Teaches slow, intelligent flow rooted in breath and play." },
  { id: "sora", name: "Sora Nakamura", role: "teacher", tone: "#C9D1C0", bio: "Yin & meditation teacher who loves the quiet spaces between poses." },
  { id: "imani", name: "Imani Brooks", role: "teacher", tone: "#E2CDBF", bio: "Former dancer bringing strength, rhythm and joy to every class." },
  { id: "theo", name: "Theo Alvarez", role: "teacher", tone: "#CFC8D6", bio: "Sound practitioner trained in Nepal; holds space with bowls and gong." },
  { id: "priya", name: "Priya Raman", role: "teacher", tone: "#D8D2BF", bio: "Hatha and restorative specialist with a therapeutic lens." },
  { id: "jordan", name: "Jordan Lee", role: "front-desk", tone: "#D6D6CF", bio: "Studio manager and front desk lead." },
];

const rooms: Room[] = [
  { id: "moon", name: "Moon Room", capacity: 20, cols: 5 },
  { id: "sun", name: "Sun Room", capacity: 12, cols: 4 },
  { id: "garden", name: "Garden Loft", capacity: 8, cols: 4 },
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

const DESCRIPTIONS: Record<Style, string> = {
  Vinyasa:
    "A fluid, creative sequence moving with the breath. Expect sun salutations, standing balances and a long, grounded savasana.",
  Yin: "Long-held floor postures that invite stillness and soften the fascia. Bolsters and blankets provided.",
  Hatha: "Classic postures held with care and clear alignment cues. A steady practice for building awareness and strength.",
  "Sound Bath":
    "A deeply restful immersion in crystal and Himalayan singing bowls. No yoga experience needed — just arrive and lie down.",
  Restorative: "Fully supported, passive shapes held for several minutes each. Leave feeling unhurried and renewed.",
  Power: "Dynamic, strength-forward flow with inversions and arm balance options. Bring water and your curiosity.",
};

// Weekly timetable — index 0 = Sunday
const WEEK: Slot[][] = [
  [
    s(8, 30, "Slow Sunday Flow", "Vinyasa", "All Levels", "leilani", "moon", 75),
    s(10, 30, "Gentle Hatha", "Hatha", "Beginner", "priya", "sun", 60),
    s(16, 0, "New Moon Sound Bath", "Sound Bath", "All Levels", "theo", "garden", 60),
    s(18, 0, "Yin & Yoga Nidra", "Yin", "All Levels", "sora", "moon", 75),
  ],
  [
    s(6, 30, "Sunrise Flow", "Vinyasa", "Intermediate", "imani", "moon", 60),
    s(9, 0, "Hatha Foundations", "Hatha", "Beginner", "priya", "sun", 60),
    s(12, 15, "Lunch Break Power", "Power", "Intermediate", "imani", "moon", 45),
    s(17, 30, "Evening Vinyasa", "Vinyasa", "All Levels", "leilani", "moon", 60),
    s(19, 15, "Deep Yin", "Yin", "All Levels", "sora", "sun", 75),
  ],
  [
    s(6, 30, "Power Rise", "Power", "Advanced", "imani", "moon", 60),
    s(9, 30, "Restore & Release", "Restorative", "All Levels", "priya", "garden", 60),
    s(12, 15, "Midday Hatha", "Hatha", "All Levels", "priya", "sun", 45),
    s(18, 0, "Moonlit Vinyasa", "Vinyasa", "Intermediate", "leilani", "moon", 75),
    s(20, 0, "Crystal Bowl Bath", "Sound Bath", "All Levels", "theo", "garden", 60),
  ],
  [
    s(6, 30, "Sunrise Flow", "Vinyasa", "All Levels", "leilani", "moon", 60),
    s(9, 0, "Yin for Beginners", "Yin", "Beginner", "sora", "sun", 60),
    s(12, 15, "Lunch Break Power", "Power", "Intermediate", "imani", "moon", 45),
    s(17, 30, "Alignment Hatha", "Hatha", "Intermediate", "priya", "sun", 60),
    s(19, 15, "Restorative Candlelight", "Restorative", "All Levels", "priya", "garden", 75),
  ],
  [
    s(6, 30, "Power Rise", "Power", "Intermediate", "imani", "moon", 60),
    s(9, 30, "Gentle Hatha", "Hatha", "Beginner", "priya", "sun", 60),
    s(12, 15, "Express Vinyasa", "Vinyasa", "All Levels", "leilani", "moon", 45),
    s(18, 0, "Flow & Arm Balances", "Vinyasa", "Advanced", "imani", "moon", 75),
    s(20, 0, "Deep Yin", "Yin", "All Levels", "sora", "sun", 60),
  ],
  [
    s(7, 0, "Sunrise Flow", "Vinyasa", "All Levels", "leilani", "moon", 60),
    s(12, 15, "Midday Restore", "Restorative", "All Levels", "priya", "garden", 45),
    s(17, 30, "Friday Power Hour", "Power", "Intermediate", "imani", "moon", 60),
    s(19, 30, "Gong & Bowl Bath", "Sound Bath", "All Levels", "theo", "moon", 75),
  ],
  [
    s(8, 0, "Weekend Warrior Flow", "Vinyasa", "Intermediate", "imani", "moon", 75),
    s(10, 0, "Hatha Foundations", "Hatha", "Beginner", "priya", "sun", 60),
    s(12, 0, "Yin & Meditation", "Yin", "All Levels", "sora", "sun", 75),
    s(17, 0, "Sunset Sound Bath", "Sound Bath", "All Levels", "theo", "garden", 60),
  ],
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
): Slot {
  return { hour, minute, title, style, level, instructorId, roomId, durationMin };
}

const MEMBERS = [
  "Ava Chen", "Noah Patel", "Isla Romero", "Mateo Silva", "Zara Ahmed", "Eli Novak", "Luna Park", "Kai Okafor",
  "Maren Holt", "Ravi Desai", "Nora Quinn", "Jonah Weiss", "Amara Diallo", "Felix Grant", "Hana Sato", "Owen Ruiz",
  "Celeste Byrne", "Dev Kapoor", "Freya Lund", "Malik Owens", "Tessa Moore", "Yuki Tanaka", "Iris Vale", "Leo Marchetti",
  "Sienna Cole", "Arjun Mehta", "Wren Talbot", "Elena Petrova",
];

// deterministic pseudo-random so every visitor sees the same studio
function rng(seed: number) {
  let x = seed % 2147483647;
  if (x <= 0) x += 2147483646;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}

export const ME = { id: "me", name: "Maya Laurent", plan: "Unlimited Monthly", since: "2024-03-02" };

export function createSeed(now = new Date()): StudioState {
  const today = startOfDay(now);
  const sessions: Session[] = [];
  const firstDay = addDays(today, -1); // include yesterday for staff history

  for (let d = 0; d <= SCHEDULE_DAYS; d++) {
    const day = addDays(firstDay, d);
    const slots = WEEK[day.getDay()];
    slots.forEach((slot, i) => {
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), slot.hour, slot.minute);
      const room = rooms.find((r) => r.id === slot.roomId)!;
      const rand = rng(day.getDate() * 97 + day.getMonth() * 31 + i * 13 + 7);
      const fillPattern = [0.55, 0.8, 1, 0.65, 1, 0.4, 0.9, 0.7];
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
        description: DESCRIPTIONS[slot.style],
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
    item("moon", "Yoga mats", 24, 1, 20),
    item("moon", "Cork blocks", 44, 0, 40),
    item("moon", "Straps", 22, 0, 20),
    item("moon", "Bolsters", 20, 2, 20),
    item("moon", "Gong (32\")", 1, 0, 1),
    item("sun", "Yoga mats", 14, 0, 12),
    item("sun", "Cork blocks", 24, 0, 24),
    item("sun", "Bolsters", 12, 1, 12),
    item("sun", "Blankets", 14, 0, 12),
    item("garden", "Yoga mats", 10, 0, 8),
    item("garden", "Bolsters", 16, 0, 16),
    item("garden", "Eye pillows", 10, 1, 8),
    item("garden", "Crystal singing bowls", 7, 0, 7),
    item("garden", "Tibetan singing bowls", 5, 1, 5),
  ];

  const shifts: Shift[] = [];
  for (let d = 1; d <= 4; d++) {
    const day = addDays(today, -d);
    shifts.push(shift("jordan", day, 7, 0, 15, 0));
    shifts.push(shift("priya", day, 8, 45, 13, 15));
    if (d % 2 === 0) shifts.push(shift("imani", day, 6, 0, 13, 0));
    if (d % 2 === 1) shifts.push(shift("leilani", day, 17, 0, 19, 30));
  }

  return {
    version: STATE_VERSION,
    seededAt: now.toISOString(),
    me: ME,
    instructors,
    rooms,
    sessions,
    inventory,
    shifts,
    settings: { lateCancelHours: 12, lateCancelFee: 15, autoPromote: true },
    activity: [],
  };
}

function item(roomId: string, name: string, total: number, inRepair: number, minimum: number): InventoryItem {
  return { id: `${roomId}-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`, roomId, name, total, inRepair, minimum };
}

function shift(staffId: string, day: Date, h1: number, m1: number, h2: number, m2: number): Shift {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h1, m1);
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h2, m2);
  return { id: `${staffId}-${start.getTime()}`, staffId, start: start.toISOString(), end: end.toISOString() };
}

function dayKeyCompact(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
