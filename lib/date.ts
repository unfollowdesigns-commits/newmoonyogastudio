export function dayKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// The studio is in Tunis: always show studio time, whatever the phone's timezone.
export const STUDIO_TZ = "Africa/Tunis";
const tzParts = new Intl.DateTimeFormat("en-GB", { timeZone: STUDIO_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function studioHM(iso: string | Date): { h: number; m: number } {
  const parts = tzParts.formatToParts(new Date(iso));
  return { h: Number(parts.find((p) => p.type === "hour")!.value), m: Number(parts.find((p) => p.type === "minute")!.value) };
}

// Tunisia is UTC+1 all year (no daylight saving)
export function studioDate(y: number, month: number, day: number, h: number, m: number): Date {
  return new Date(Date.UTC(y, month, day, h - 1, m));
}

// French 24-hour style, as on the studio's posters: 8h30, 19h45
export function formatTime(iso: string | Date): string {
  const { h, m } = studioHM(iso);
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function formatDayLong(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export function formatDayShort(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function relativeDay(d: Date | string): string {
  const key = dayKey(d);
  const today = startOfDay(new Date());
  if (key === dayKey(today)) return "Today";
  if (key === dayKey(addDays(today, 1))) return "Tomorrow";
  return formatDayShort(d);
}

export function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 36e5;
}

export function endOf(iso: string, durationMin: number): Date {
  return new Date(new Date(iso).getTime() + durationMin * 60000);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
