"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LEVELS, SCHEDULE_DAYS, STUDIO, STYLES, STYLE_META } from "@/lib/seed";
import { addDays, dayKey, formatDayLong, formatTimeParts, fromDayKey, greeting, relativeDay, startOfDay } from "@/lib/date";
import { isPast, myBooking, myWaitlistPosition, spotsLeft, useStudio } from "@/lib/store";
import type { Level, Session, Style, StudioState } from "@/lib/types";
import { Avatar, CapacityBar, Chip, Icon, Loading, Sheet, Toast, Wordmark, useToast } from "../ui";
import { ClassSheet } from "./ClassSheet";

type Tab = "schedule" | "bookings" | "profile";
type TimeOfDay = "any" | "morning" | "midday" | "evening";
interface Filters {
  style: Style | "All";
  instructor: string;
  level: Level | "any";
  room: string;
  time: TimeOfDay;
}
const NO_FILTERS: Filters = { style: "All", instructor: "any", level: "any", room: "any", time: "any" };

export default function ClientApp() {
  const studio = useStudio();
  const [tab, setTab] = useState<Tab>("schedule");
  const [openId, setOpenId] = useState<string | null>(null);
  const { toast, show } = useToast();

  if (!studio) return <Loading />;
  const open = studio.sessions.find((s) => s.id === openId) ?? null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[460px] flex-col bg-sand sm:my-0 sm:shadow-lift">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sand/90 px-5 pt-[max(env(safe-area-inset-top),14px)] pb-3 backdrop-blur-md">
        <Wordmark />
        <button onClick={() => setTab("profile")} aria-label="Profile">
          <Avatar name={studio.me.name} size={36} tone="#d9c6b0" />
        </button>
      </header>

      <main className="flex-1 pb-28">
        {tab === "schedule" && <Schedule studio={studio} onOpen={setOpenId} />}
        {tab === "bookings" && <Bookings studio={studio} onOpen={setOpenId} goSchedule={() => setTab("schedule")} />}
        {tab === "profile" && <Profile studio={studio} />}
      </main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[460px] -translate-x-1/2 border-t border-stone/80 bg-linen/95 px-6 pt-2 pb-safe backdrop-blur-md">
        <ul className="flex justify-around">
          {(
            [
              ["schedule", "calendar", "Schedule"],
              ["bookings", "list", "My classes"],
              ["profile", "user", "Profile"],
            ] as const
          ).map(([key, icon, label]) => (
            <li key={key}>
              <button
                onClick={() => setTab(key)}
                className={`flex flex-col items-center gap-1 px-4 py-1 text-[11px] tracking-wide transition-colors ${tab === key ? "text-plum" : "text-muted"}`}
                aria-current={tab === key ? "page" : undefined}
              >
                <Icon name={icon} size={22} />
                {label}
                <span className={`h-1 w-1 rounded-full transition-opacity ${tab === key ? "bg-plum opacity-100" : "opacity-0"}`} />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <ClassSheet studio={studio} session={open} onClose={() => setOpenId(null)} notify={show} />
      <Toast toast={toast} />
    </div>
  );
}

/* ——————————————— Schedule ——————————————— */

function Schedule({ studio, onOpen }: { studio: StudioState; onOpen: (id: string) => void }) {
  const today = startOfDay(new Date());
  const days = useMemo(() => Array.from({ length: SCHEDULE_DAYS }, (_, i) => addDays(today, i)), [today.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selected, setSelected] = useState(dayKey(today));
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stripRef.current?.querySelector(`[data-day="${selected}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  const matches = (s: Session) =>
    (filters.style === "All" || s.style === filters.style) &&
    (filters.instructor === "any" || s.instructorId === filters.instructor) &&
    (filters.level === "any" || s.level === filters.level) &&
    (filters.room === "any" || s.roomId === filters.room) &&
    (filters.time === "any" || timeOfDay(s) === filters.time);

  const byDay = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of studio.sessions) {
      const k = dayKey(s.start);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [studio.sessions]);

  const list = (byDay.get(selected) ?? [])
    .filter(matches)
    .filter((s) => new Date(s.start).getTime() + s.durationMin * 60000 > Date.now())
    .sort((a, b) => a.start.localeCompare(b.start));

  const extraFilters = [filters.instructor !== "any", filters.level !== "any", filters.room !== "any", filters.time !== "any"].filter(Boolean).length;
  const nextUp = studio.sessions
    .filter((s) => myBooking(s, studio.me.id) && !isPast(s))
    .sort((a, b) => a.start.localeCompare(b.start))[0];

  return (
    <div className="animate-fade">
      <section className="px-5 pt-3">
        <p className="text-[13px] text-muted">{greeting()}, {studio.me.name.split(" ")[0]}</p>
        <h1 className="mt-1 font-display text-[38px] leading-[1.02] font-medium">
          Find your <em className="text-plum">practice</em>
        </h1>
      </section>

      {nextUp && (
        <button
          onClick={() => onOpen(nextUp.id)}
          className="mx-5 mt-5 flex w-[calc(100%-2.5rem)] items-center gap-4 rounded-3xl bg-plum px-5 py-4 text-left text-linen shadow-soft"
        >
          <div className="flex-1">
            <div className="text-[10.5px] uppercase tracking-[0.25em] opacity-70">Up next</div>
            <div className="mt-1 font-display text-[22px] leading-tight">{nextUp.title}</div>
            <div className="text-[12.5px] opacity-80">
              {relativeDay(nextUp.start)} · {formatTimeParts(nextUp.start).time} {formatTimeParts(nextUp.start).period}
              {myBooking(nextUp, studio.me.id)?.spot ? ` · Spot ${myBooking(nextUp, studio.me.id)!.spot}` : ""}
            </div>
          </div>
          <Icon name="arrow" />
        </button>
      )}

      {/* date strip */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-[13px] font-medium tracking-wide">{formatDayLong(fromDayKey(selected))}</h2>
          <button onClick={() => setMonthOpen(true)} className="flex items-center gap-1.5 text-[12.5px] text-plum">
            <Icon name="calendar" size={16} /> Calendar
          </button>
        </div>
        <div ref={stripRef} className="no-scrollbar mt-3 flex snap-x gap-2 overflow-x-auto px-5 pb-1">
          {days.map((d) => {
            const k = dayKey(d);
            const active = k === selected;
            const count = (byDay.get(k) ?? []).filter(matches).length;
            return (
              <button
                key={k}
                data-day={k}
                onClick={() => setSelected(k)}
                className={`flex w-[54px] shrink-0 snap-center flex-col items-center rounded-2xl py-2.5 transition-all duration-300 ${
                  active ? "bg-ink text-linen shadow-soft" : "bg-linen text-ink"
                }`}
              >
                <span className={`text-[10.5px] uppercase tracking-[0.15em] ${active ? "opacity-70" : "text-muted"}`}>
                  {d.toLocaleDateString([], { weekday: "short" })}
                </span>
                <span className="mt-0.5 font-display text-[22px] leading-none">{d.getDate()}</span>
                <span className="mt-1.5 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                    <span key={i} className={`h-1 w-1 rounded-full ${active ? "bg-linen/70" : "bg-mauve"}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* filters */}
      <section className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5">
        <button
          onClick={() => setFilterOpen(true)}
          className="relative flex shrink-0 items-center gap-1.5 rounded-full border border-stone-deep/70 bg-linen px-3.5 py-2 text-[13px]"
          aria-label="More filters"
        >
          <Icon name="filter" size={16} /> Filter
          {extraFilters > 0 && (
            <span className="ml-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-clay px-1 text-[10px] text-linen">{extraFilters}</span>
          )}
        </button>
        {(["All", ...STYLES] as const).map((s) => (
          <Chip key={s} active={filters.style === s} onClick={() => setFilters({ ...filters, style: s })}>
            {s}
          </Chip>
        ))}
      </section>

      {/* list */}
      <section className="mt-5 space-y-3 px-5">
        {list.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-deep px-6 py-12 text-center">
            <p className="font-display text-[22px]">A quiet day</p>
            <p className="mt-1 text-[13px] text-muted">No classes match. Try another day or clear filters.</p>
            {(filters.style !== "All" || extraFilters > 0) && (
              <button onClick={() => setFilters(NO_FILTERS)} className="mt-4 text-[13px] text-plum underline underline-offset-4">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          list.map((s, i) => <ClassCard key={s.id} studio={studio} s={s} onOpen={onOpen} index={i} />)
        )}
      </section>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} studio={studio} filters={filters} setFilters={setFilters} />
      <MonthSheet
        open={monthOpen}
        onClose={() => setMonthOpen(false)}
        selected={selected}
        available={days.map(dayKey)}
        counts={byDay}
        onPick={(k) => {
          setSelected(k);
          setMonthOpen(false);
        }}
      />
    </div>
  );
}

function timeOfDay(s: Session): TimeOfDay {
  const h = new Date(s.start).getHours();
  return h < 11 ? "morning" : h < 16 ? "midday" : "evening";
}

function ClassCard({ studio, s, onOpen, index }: { studio: StudioState; s: Session; onOpen: (id: string) => void; index: number }) {
  const teacher = studio.instructors.find((i) => i.id === s.instructorId)!;
  const room = studio.rooms.find((r) => r.id === s.roomId)!;
  const left = spotsLeft(s);
  const mine = myBooking(s, studio.me.id);
  const wait = myWaitlistPosition(s, studio.me.id);
  const { time, period } = formatTimeParts(s.start);
  const meta = STYLE_META[s.style];
  const started = isPast(s);

  return (
    <button
      onClick={() => onOpen(s.id)}
      style={{ animationDelay: `${index * 45}ms` }}
      className="group flex w-full animate-rise items-stretch gap-4 rounded-3xl bg-linen p-4 text-left shadow-soft transition duration-300 hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl" style={{ background: meta.soft }}>
        <span className="font-display text-[22px] leading-none">{time}</span>
        <span className="mt-1 text-[10px] tracking-[0.2em] text-ink/60">{period}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em]" style={{ color: meta.hue }}>
          {s.style} <span className="text-muted">· {s.durationMin}m</span>
        </div>
        <div className="mt-0.5 truncate font-display text-[20px] leading-tight font-medium">{s.title}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
          <Avatar person={teacher} size={18} />
          <span className="truncate">
            {teacher.name} · {room.name}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <CapacityBar used={s.capacity - left} total={s.capacity} waitlist={s.waitlist.length} />
          </div>
          <Status mine={!!mine} wait={wait} left={left} waitCount={s.waitlist.length} started={started} />
        </div>
      </div>
    </button>
  );
}

function Status({ mine, wait, left, waitCount, started }: { mine: boolean; wait: number | null; left: number; waitCount: number; started: boolean }) {
  if (mine)
    return (
      <span className="flex items-center gap-1 rounded-full bg-blush px-2.5 py-1 text-[11.5px] text-plum">
        <Icon name="check" size={13} /> Booked
      </span>
    );
  if (wait) return <span className="rounded-full bg-clay-soft px-2.5 py-1 text-[11.5px] text-clay">Waitlist #{wait}</span>;
  if (started) return <span className="text-[11.5px] text-muted">In session</span>;
  if (left === 0) return <span className="text-[11.5px] text-rose">Full · {waitCount} waiting</span>;
  if (left <= 3) return <span className="text-[11.5px] text-clay">{left} left</span>;
  return <span className="text-[11.5px] text-muted">{left} open</span>;
}

function FilterSheet({
  open,
  onClose,
  studio,
  filters,
  setFilters,
}: {
  open: boolean;
  onClose: () => void;
  studio: StudioState;
  filters: Filters;
  setFilters: (f: Filters) => void;
}) {
  const teachers = studio.instructors.filter((i) => i.role === "teacher");
  return (
    <Sheet open={open} onClose={onClose} label="Filters">
      <div className="space-y-6 px-6 pb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[28px]">Refine</h2>
          <button onClick={() => setFilters({ ...NO_FILTERS, style: filters.style })} className="text-[13px] text-muted underline underline-offset-4">
            Reset
          </button>
        </div>
        <Group label="Time of day">
          {(["any", "morning", "midday", "evening"] as const).map((t) => (
            <Chip key={t} active={filters.time === t} onClick={() => setFilters({ ...filters, time: t })}>
              {t === "any" ? "Any time" : t[0].toUpperCase() + t.slice(1)}
            </Chip>
          ))}
        </Group>
        <Group label="Instructor">
          <Chip active={filters.instructor === "any"} onClick={() => setFilters({ ...filters, instructor: "any" })}>
            Anyone
          </Chip>
          {teachers.map((t) => (
            <Chip key={t.id} active={filters.instructor === t.id} onClick={() => setFilters({ ...filters, instructor: t.id })}>
              {t.name}
            </Chip>
          ))}
        </Group>
        <Group label="Level">
          <Chip active={filters.level === "any"} onClick={() => setFilters({ ...filters, level: "any" })}>
            Any level
          </Chip>
          {LEVELS.map((l) => (
            <Chip key={l} active={filters.level === l} onClick={() => setFilters({ ...filters, level: l })}>
              {l}
            </Chip>
          ))}
        </Group>
        <Group label="Room">
          <Chip active={filters.room === "any"} onClick={() => setFilters({ ...filters, room: "any" })}>
            Any room
          </Chip>
          {studio.rooms.map((r) => (
            <Chip key={r.id} active={filters.room === r.id} onClick={() => setFilters({ ...filters, room: r.id })}>
              {r.name}
            </Chip>
          ))}
        </Group>
      </div>
      <div className="sticky bottom-0 border-t border-stone/70 bg-linen/95 px-6 pt-4 pb-safe">
        <button onClick={onClose} className="w-full rounded-full bg-ink py-4 text-[15px] text-linen">
          Show classes
        </button>
      </div>
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 text-[11px] uppercase tracking-[0.22em] text-muted">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function MonthSheet({
  open,
  onClose,
  selected,
  available,
  counts,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  selected: string;
  available: string[];
  counts: Map<string, Session[]>;
  onPick: (k: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const base = new Date();
  const month = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const lastAvail = fromDayKey(available[available.length - 1]);
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= lastAvail;
  const lead = month.getDay();
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const availSet = new Set(available);

  return (
    <Sheet open={open} onClose={onClose} label="Calendar">
      <div className="px-6 pb-8">
        <div className="flex items-center justify-between">
          <button disabled={offset === 0} onClick={() => setOffset(offset - 1)} className="rounded-full p-2 disabled:opacity-25" aria-label="Previous month">
            <Icon name="chevronL" />
          </button>
          <h2 className="font-display text-[26px]">{month.toLocaleDateString([], { month: "long", year: "numeric" })}</h2>
          <button disabled={!canNext} onClick={() => setOffset(offset + 1)} className="rounded-full p-2 disabled:opacity-25" aria-label="Next month">
            <Icon name="chevronR" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-7 text-center text-[10.5px] uppercase tracking-[0.15em] text-muted">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = dayKey(d);
            const ok = availSet.has(k);
            const sel = k === selected;
            const n = counts.get(k)?.length ?? 0;
            return (
              <button
                key={i}
                disabled={!ok}
                onClick={() => onPick(k)}
                className={`flex aspect-square flex-col items-center justify-center rounded-2xl text-[15px] transition ${
                  sel ? "bg-ink text-linen" : ok ? "hover:bg-blush" : "text-stone-deep"
                }`}
              >
                {d.getDate()}
                {ok && <span className={`mt-0.5 text-[9px] ${sel ? "text-linen/70" : "text-plum"}`}>{n} cls</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-5 text-center text-[12px] text-muted">Booking opens {SCHEDULE_DAYS} days ahead.</p>
      </div>
    </Sheet>
  );
}

/* ——————————————— My classes ——————————————— */

function Bookings({ studio, onOpen, goSchedule }: { studio: StudioState; onOpen: (id: string) => void; goSchedule: () => void }) {
  const upcoming = studio.sessions
    .filter((s) => !isPast(s) && (myBooking(s, studio.me.id) || myWaitlistPosition(s, studio.me.id)))
    .sort((a, b) => a.start.localeCompare(b.start));
  const lateCancels = studio.sessions.flatMap((s) =>
    s.bookings.filter((b) => b.memberId === studio.me.id && b.status === "late-cancel").map((b) => ({ s, b })),
  );

  return (
    <div className="animate-fade px-5 pt-3">
      <h1 className="font-display text-[36px] leading-tight font-medium">My classes</h1>
      <p className="text-[13px] text-muted">Your bookings and waitlist spots.</p>

      <div className="mt-6 space-y-3">
        {upcoming.length === 0 && (
          <div className="rounded-3xl border border-dashed border-stone-deep px-6 py-12 text-center">
            <p className="font-display text-[22px]">Nothing on the mat yet</p>
            <p className="mt-1 text-[13px] text-muted">Your next class is two taps away.</p>
            <button onClick={goSchedule} className="mt-5 rounded-full bg-plum px-6 py-3 text-[14px] text-linen">
              Browse schedule
            </button>
          </div>
        )}
        {upcoming.map((s) => {
          const b = myBooking(s, studio.me.id);
          const w = myWaitlistPosition(s, studio.me.id);
          const teacher = studio.instructors.find((i) => i.id === s.instructorId)!;
          const { time, period } = formatTimeParts(s.start);
          return (
            <button key={s.id} onClick={() => onOpen(s.id)} className="flex w-full items-center gap-4 rounded-3xl bg-linen p-4 text-left shadow-soft">
              <div className="w-16 text-center">
                <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted">{relativeDay(s.start)}</div>
                <div className="font-display text-[22px] leading-tight">{time}</div>
                <div className="text-[10px] tracking-[0.2em] text-muted">{period}</div>
              </div>
              <div className="min-w-0 flex-1 border-l border-stone pl-4">
                <div className="truncate font-display text-[19px] font-medium">{s.title}</div>
                <div className="text-[12.5px] text-muted">with {teacher.name}</div>
                <div className="mt-2">
                  {b ? (
                    <span className="rounded-full bg-blush px-2.5 py-1 text-[11.5px] text-plum">Booked{b.spot ? ` · Spot ${b.spot}` : ""}</span>
                  ) : (
                    <span className="rounded-full bg-clay-soft px-2.5 py-1 text-[11.5px] text-clay">Waitlist #{w}</span>
                  )}
                </div>
              </div>
              <Icon name="chevronR" className="text-muted" />
            </button>
          );
        })}
      </div>

      {lateCancels.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted">Late cancellations</h2>
          <ul className="mt-3 divide-y divide-stone rounded-3xl bg-linen px-4">
            {lateCancels.map(({ s, b }) => (
              <li key={b.id} className="flex items-center justify-between py-3 text-[13.5px]">
                <span>
                  {s.title} · {relativeDay(s.start)}
                </span>
                <span className={b.feeWaived ? "text-plum" : "text-rose"}>{b.feeWaived ? "Waived" : `${studio.settings.lateCancelFee} DT`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ——————————————— Profile ——————————————— */

function Profile({ studio }: { studio: StudioState }) {
  const attended = studio.sessions.filter((s) => s.bookings.some((b) => b.memberId === studio.me.id && b.status === "checked-in")).length;
  const booked = studio.sessions.filter((s) => myBooking(s, studio.me.id) && !isPast(s)).length;
  const since = new Date(studio.me.since).toLocaleDateString([], { month: "long", year: "numeric" });

  return (
    <div className="animate-fade px-5 pt-3">
      <div className="relative overflow-hidden rounded-[28px] bg-ink p-6 text-linen shadow-lift">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-512.png" alt="" className="absolute -top-6 -right-6 h-36 w-36 rounded-full opacity-90" />
        <div className="text-[10.5px] uppercase tracking-[0.3em] opacity-60">Member</div>
        <div className="mt-2 font-display text-[30px]">{studio.me.name}</div>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <div className="text-[11px] opacity-60">Plan</div>
            <div className="text-[15px]">{studio.me.plan}</div>
          </div>
          <div className="text-right text-[11px] opacity-60">Since {since}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Upcoming" value={booked} />
        <Stat label="Attended" value={attended} />
      </div>

      <div className="mt-6 rounded-3xl bg-linen p-5 text-[13.5px] leading-relaxed text-ink/80">
        <h3 className="mb-2 font-display text-[20px] text-ink">Studio policies</h3>
        <ul className="space-y-2">
          <li>• Cancel at least {studio.settings.lateCancelHours} hours before class to avoid a {studio.settings.lateCancelFee} DT late-cancel fee.</li>
          <li>• Waitlists promote automatically — you&apos;ll be booked and notified if a spot opens.</li>
          <li>• Doors open 15 minutes before class. Mats, blocks and bolsters are provided.</li>
        </ul>
      </div>

      <div className="mt-6 rounded-3xl bg-linen p-5">
        <h3 className="font-display text-[20px]">Visit & contact</h3>
        <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-muted">
          <Icon name="pin" size={16} /> {STUDIO.location}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href={STUDIO.whatsapp} target="_blank" rel="noreferrer" className="rounded-full bg-plum py-3 text-center text-[14px] text-linen">
            WhatsApp {STUDIO.phoneDisplay}
          </a>
          <a href={STUDIO.instagram} target="_blank" rel="noreferrer" className="rounded-full border border-stone-deep py-3 text-center text-[14px]">
            Instagram
          </a>
        </div>
      </div>

      <Link href="/staff" className="mt-6 flex items-center justify-between rounded-3xl border border-stone-deep/60 px-5 py-4 text-[14px]">
        <span>
          <span className="block">Staff portal</span>
          <span className="text-[12px] text-muted">For teachers & front desk</span>
        </span>
        <Icon name="arrow" />
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-linen p-5">
      <div className="font-display text-[36px] leading-none">{value}</div>
      <div className="mt-1 text-[12px] text-muted">{label}</div>
    </div>
  );
}
