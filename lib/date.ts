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

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatTimeParts(iso: string): { time: string; period: string } {
  const d = new Date(iso);
  let h = d.getHours();
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return { time: `${h}:${String(d.getMinutes()).padStart(2, "0")}`, period };
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
