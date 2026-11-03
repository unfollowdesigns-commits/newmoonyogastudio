// Studio-level numbers for the owner's overview. Pure: same input, same output, no I/O.
import type { MemberRow } from "./types";

export interface DashSession {
  id: string;
  title: string;
  start: string;
  capacity: number;
}
export interface DashBooking {
  sessionId: string;
  userId: string | null; // null = guest added by staff
  status: string;
}

export interface StudioStats {
  members: number;
  newMembers: number; // joined in the window
  visitedOnce: number; // came at least once (all time)
  avgClasses: number; // classes attended per member who came at least once
  returnRate: number | null; // share of those who came back for a 2nd class (0–1)
  activeMembers: number; // checked in at least once in the window
  fillRate: number | null; // spots taken / spots offered, past classes in the window (0–1)
  noShowRate: number | null; // no-shows / (check-ins + no-shows), in the window (0–1)
  lateCancels: number;
  unmarked: number; // past bookings nobody checked in or marked absent
  classes: number; // past classes in the window
  byClass: { title: string; sessions: number; taken: number; capacity: number; rate: number }[];
  visits: { label: string; count: number }[]; // members by number of classes attended
  signupsByWeek: { week: string; count: number }[]; // last 8 weeks, oldest first, week = Monday yyyy-mm-dd
  lapsed: MemberRow[]; // came before, no visit in the window and nothing booked
}

const HOLDS = new Set(["booked", "checked-in", "no-show"]);

function mondayKey(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function computeStats(rows: MemberRow[], sessions: DashSession[], bookings: DashBooking[], now: Date, windowDays: number): StudioStats {
  const from = now.getTime() - windowDays * 864e5;
  const clients = rows.filter((m) => m.role === "client");
  const past = sessions.filter((s) => {
    const t = new Date(s.start).getTime();
    return t >= from && t < now.getTime();
  });
  const pastIds = new Set(past.map((s) => s.id));
  const inWindow = bookings.filter((b) => pastIds.has(b.sessionId));

  const came = clients.filter((m) => m.attended > 0);
  const totalAttended = came.reduce((n, m) => n + m.attended, 0);

  const taken = new Map<string, number>();
  for (const b of inWindow) if (HOLDS.has(b.status)) taken.set(b.sessionId, (taken.get(b.sessionId) ?? 0) + 1);

  const groups = new Map<string, { sessions: number; taken: number; capacity: number }>();
  for (const s of past) {
    const g = groups.get(s.title) ?? { sessions: 0, taken: 0, capacity: 0 };
    g.sessions++;
    g.taken += Math.min(taken.get(s.id) ?? 0, s.capacity);
    g.capacity += s.capacity;
    groups.set(s.title, g);
  }
  const byClass = [...groups.entries()]
    .map(([title, g]) => ({ title, ...g, rate: g.capacity ? g.taken / g.capacity : 0 }))
    .sort((a, b) => b.rate - a.rate || a.title.localeCompare(b.title));
  const offered = byClass.reduce((n, c) => n + c.capacity, 0);
  const filled = byClass.reduce((n, c) => n + c.taken, 0);

  const checkIns = inWindow.filter((b) => b.status === "checked-in").length;
  const noShows = inWindow.filter((b) => b.status === "no-show").length;
  const activeIds = new Set(inWindow.filter((b) => b.status === "checked-in" && b.userId).map((b) => b.userId));
  const seenIds = new Set(inWindow.filter((b) => b.userId && (b.status === "checked-in" || b.status === "booked")).map((b) => b.userId));

  const buckets: [string, (n: number) => boolean][] = [
    ["0", (n) => n === 0],
    ["1", (n) => n === 1],
    ["2–4", (n) => n >= 2 && n <= 4],
    ["5–9", (n) => n >= 5 && n <= 9],
    ["10+", (n) => n >= 10],
  ];

  const weeks: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) weeks.push({ week: mondayKey(new Date(now.getTime() - i * 7 * 864e5)), count: 0 });
  for (const m of clients) {
    const w = weeks.find((x) => x.week === mondayKey(new Date(m.createdAt)));
    if (w) w.count++;
  }

  return {
    members: clients.length,
    newMembers: clients.filter((m) => new Date(m.createdAt).getTime() >= from).length,
    visitedOnce: came.length,
    avgClasses: came.length ? totalAttended / came.length : 0,
    returnRate: came.length ? came.filter((m) => m.attended >= 2).length / came.length : null,
    activeMembers: activeIds.size,
    fillRate: offered ? filled / offered : null,
    noShowRate: checkIns + noShows ? noShows / (checkIns + noShows) : null,
    lateCancels: inWindow.filter((b) => b.status === "late-cancel").length,
    unmarked: inWindow.filter((b) => b.status === "booked").length,
    classes: past.length,
    byClass,
    visits: buckets.map(([label, test]) => ({ label, count: clients.filter((m) => test(m.attended)).length })),
    signupsByWeek: weeks,
    lapsed: came.filter((m) => m.upcoming === 0 && !m.blocked && !seenIds.has(m.id)).sort((a, b) => b.attended - a.attended),
  };
}
