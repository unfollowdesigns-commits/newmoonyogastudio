"use client";

import Link from "next/link";
import { useState } from "react";
import { STYLE_META } from "@/lib/seed";
import { addDays, dayKey, formatDayShort, formatTime, relativeDay, startOfDay } from "@/lib/date";
import {
  activeBookings,
  addGuest,
  adjustInventory,
  clockToggle,
  markNoShow,
  promote,
  removeFromWaitlist,
  resetDemo,
  spotsLeft,
  staffCancel,
  toggleCheckIn,
  updateSettings,
  useStudio,
  waiveFee,
} from "@/lib/store";
import type { Booking, Session, StudioState } from "@/lib/types";
import { Avatar, CapacityBar, Icon, Loading, Sheet, Toast, Wordmark, useToast } from "../ui";

type View = "classes" | "inventory" | "hours" | "settings";
type Notify = (r: { ok: boolean; message: string }) => void;

export default function StaffApp() {
  const studio = useStudio();
  const [view, setView] = useState<View>("classes");
  const [staffId, setStaffId] = useState("desk");
  const { toast, show } = useToast();
  const notify: Notify = (r) => show(r.message, r.ok ? "ok" : "warn");

  if (!studio) return <Loading />;
  const me = studio.instructors.find((i) => i.id === staffId)!;
  const onShift = studio.shifts.some((s) => s.staffId === staffId && !s.end);

  const nav: [View, string, string][] = [
    ["classes", "users", "Classes & rosters"],
    ["inventory", "box", "Rooms & equipment"],
    ["hours", "clock", "Hours"],
    ["settings", "settings", "Policies"],
  ];

  return (
    <div className="min-h-dvh bg-sand lg:flex">
      {/* sidebar / topbar */}
      <aside className="sticky top-0 z-30 border-b border-stone bg-linen/95 backdrop-blur lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),14px)] pb-3 lg:block lg:pt-7">
          <Wordmark sub="Staff Portal" />
          <Link href="/" className="text-[12.5px] text-plum lg:hidden">
            Client app →
          </Link>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 lg:mt-6 lg:flex-col lg:px-3">
          {nav.map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px] transition ${
                view === key ? "bg-plum text-linen" : "text-ink/75 hover:bg-stone/60"
              }`}
            >
              <Icon name={icon} size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="hidden px-5 lg:absolute lg:bottom-6 lg:block lg:w-64">
          <StaffSwitcher studio={studio} staffId={staffId} setStaffId={setStaffId} onShift={onShift} />
          <Link href="/" className="mt-4 block text-[12.5px] text-plum">
            ← Open client app
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <div className="mb-5 lg:hidden">
          <StaffSwitcher studio={studio} staffId={staffId} setStaffId={setStaffId} onShift={onShift} />
        </div>
        {view === "classes" && <Classes studio={studio} staffId={staffId} notify={notify} />}
        {view === "inventory" && <Inventory studio={studio} notify={notify} />}
        {view === "hours" && <Hours studio={studio} me={me.id} notify={notify} />}
        {view === "settings" && <Policies studio={studio} notify={notify} />}
      </main>
      <Toast toast={toast} />
    </div>
  );
}

function StaffSwitcher({ studio, staffId, setStaffId, onShift }: { studio: StudioState; staffId: string; setStaffId: (s: string) => void; onShift: boolean }) {
  const me = studio.instructors.find((i) => i.id === staffId)!;
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-linen p-3 shadow-soft lg:shadow-none">
      <Avatar person={me} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-muted">Signed in as</span>
        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-full truncate bg-transparent text-[14px] outline-none">
          {studio.instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} — {i.role === "teacher" ? "Teacher" : "Front desk"}
            </option>
          ))}
        </select>
      </span>
      <span className={`h-2.5 w-2.5 rounded-full ${onShift ? "bg-mauve" : "bg-stone-deep"}`} title={onShift ? "On shift" : "Off shift"} />
    </label>
  );
}

function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[34px] leading-tight font-medium">{title}</h1>
        {sub && <p className="text-[13px] text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ——————————————— Classes & roster ——————————————— */

function Classes({ studio, staffId, notify }: { studio: StudioState; staffId: string; notify: Notify }) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i - 1));
  const [day, setDay] = useState(dayKey(today));
  const [mineOnly, setMineOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const isTeacher = studio.instructors.find((i) => i.id === staffId)?.role === "teacher";

  const sessions = studio.sessions
    .filter((s) => dayKey(s.start) === day && (!mineOnly || s.instructorId === staffId))
    .sort((a, b) => a.start.localeCompare(b.start));
  const open = studio.sessions.find((s) => s.id === openId) ?? null;

  const lateQueue = studio.sessions
    .flatMap((s) => s.bookings.filter((b) => b.status === "late-cancel").map((b) => ({ s, b })))
    .sort((a, b) => (b.b.cancelledAt ?? "").localeCompare(a.b.cancelledAt ?? ""));

  const dayStats = sessions.reduce(
    (acc, s) => {
      acc.booked += activeBookings(s).length;
      acc.cap += s.capacity;
      acc.wait += s.waitlist.length;
      acc.checked += s.bookings.filter((b) => b.status === "checked-in").length;
      return acc;
    },
    { booked: 0, cap: 0, wait: 0, checked: 0 },
  );

  return (
    <div className="animate-fade">
      <PageTitle
        title="Classes & rosters"
        sub={relativeDay(day + "T12:00:00")}
        right={
          isTeacher && (
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} className="accent-plum" /> My classes only
            </label>
          )
        }
      />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {days.map((d) => {
          const k = dayKey(d);
          return (
            <button
              key={k}
              onClick={() => setDay(k)}
              className={`shrink-0 rounded-xl px-4 py-2 text-[13px] transition ${k === day ? "bg-ink text-linen" : "bg-linen text-ink/75"}`}
            >
              {relativeDay(d) === formatDayShort(d) ? d.toLocaleDateString([], { weekday: "short", day: "numeric" }) : relativeDay(d)}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Booked" value={`${dayStats.booked}/${dayStats.cap}`} />
        <Kpi label="Fill rate" value={dayStats.cap ? `${Math.round((dayStats.booked / dayStats.cap) * 100)}%` : "—"} />
        <Kpi label="Checked in" value={dayStats.checked} />
        <Kpi label="Waitlisted" value={dayStats.wait} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-3xl bg-linen shadow-soft">
          {sessions.length === 0 && <p className="p-8 text-center text-[14px] text-muted">No classes this day.</p>}
          <ul className="divide-y divide-stone">
            {sessions.map((s) => {
              const t = studio.instructors.find((i) => i.id === s.instructorId)!;
              const room = studio.rooms.find((r) => r.id === s.roomId)!;
              const booked = activeBookings(s).length;
              const checked = s.bookings.filter((b) => b.status === "checked-in").length;
              return (
                <li key={s.id}>
                  <button onClick={() => setOpenId(s.id)} className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-sand/60">
                    <div>
                      <div className="text-[15px]">{formatTime(s.start)}</div>
                      <div className="text-[11px] text-muted">{s.durationMin} min</div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STYLE_META[s.style].hue }} />
                        <span className="truncate text-[15px] font-medium">{s.title}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[12.5px] text-muted">
                        {t.name} · {room.name}
                      </div>
                      <div className="mt-2 max-w-[260px]">
                        <CapacityBar used={booked} total={s.capacity} waitlist={s.waitlist.length} />
                      </div>
                    </div>
                    <div className="text-right text-[12.5px]">
                      <div>
                        {booked}/{s.capacity}
                      </div>
                      <div className="text-muted">{checked} in</div>
                      {s.waitlist.length > 0 && <div className="text-rose">+{s.waitlist.length} wait</div>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-3xl bg-linen p-5 shadow-soft">
          <h2 className="font-display text-[22px]">Late cancellations</h2>
          <p className="text-[12.5px] text-muted">
            Within {studio.settings.lateCancelHours}h · {studio.settings.lateCancelFee} DT fee
          </p>
          {lateQueue.length === 0 && <p className="mt-4 text-[13px] text-muted">None — lovely.</p>}
          <ul className="mt-3 divide-y divide-stone">
            {lateQueue.slice(0, 8).map(({ s, b }) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px]">{b.name}</div>
                  <div className="truncate text-[12px] text-muted">
                    {s.title} · {relativeDay(s.start)}
                  </div>
                </div>
                <button
                  onClick={() => notify(waiveFee(s.id, b.id))}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] ${b.feeWaived ? "bg-blush text-plum" : "border border-rose/40 text-rose"}`}
                >
                  {b.feeWaived ? "Waived ✓" : "Waive fee"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <RosterSheet studio={studio} session={open} onClose={() => setOpenId(null)} notify={notify} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-linen px-4 py-3.5 shadow-soft">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-1 font-display text-[28px] leading-none">{value}</div>
    </div>
  );
}

const STATUS_STYLE: Record<Booking["status"], string> = {
  booked: "bg-stone text-ink/70",
  "checked-in": "bg-blush text-plum",
  "no-show": "bg-rose-soft text-rose",
  cancelled: "bg-stone text-muted",
  "late-cancel": "bg-rose-soft text-rose",
};

function RosterSheet({ studio, session, onClose, notify }: { studio: StudioState; session: Session | null; onClose: () => void; notify: Notify }) {
  return (
    <Sheet open={!!session} onClose={onClose} label="Roster">
      {session && <Roster key={session.id} studio={studio} s={session} notify={notify} />}
    </Sheet>
  );
}

function Roster({ studio, s, notify }: { studio: StudioState; s: Session; notify: Notify }) {
  const [q, setQ] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestOf, setGuestOf] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const room = studio.rooms.find((r) => r.id === s.roomId)!;
  const teacher = studio.instructors.find((i) => i.id === s.instructorId)!;
  const active = activeBookings(s).sort((a, b) => a.name.localeCompare(b.name));
  const shown = active.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));
  const cancelled = s.bookings.filter((b) => b.status === "cancelled" || b.status === "late-cancel");
  const left = spotsLeft(s);
  const mats = studio.inventory.find((i) => i.roomId === s.roomId && /^(Yoga mats|Aerial hammocks)$/.test(i.name));
  const matsReady = mats ? mats.total - mats.inRepair : 0;

  return (
    <div className="px-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: STYLE_META[s.style].hue }}>
            {s.style} · {formatDayShort(s.start)} · {formatTime(s.start)}
          </div>
          <h2 className="mt-1 font-display text-[28px] leading-tight">{s.title}</h2>
          <p className="text-[13px] text-muted">
            {teacher.name} · {room.name}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-[28px] leading-none">
            {active.length}/{s.capacity}
          </div>
          <div className="text-[11px] text-muted">{left} open</div>
        </div>
      </div>

      {mats && matsReady < active.length && (
        <p className="mt-3 rounded-xl bg-rose-soft px-3 py-2 text-[12.5px] text-rose">
          Only {matsReady} usable {room.unit}s in {room.name} for {active.length} students — pull spares.
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-stone bg-sand/60 px-3">
        <Icon name="search" size={16} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roster" className="w-full bg-transparent py-2.5 text-[14px] outline-none" />
      </div>

      <ul className="mt-3 divide-y divide-stone">
        {shown.map((b) => (
          <li key={b.id} className="py-2.5">
            <div className="flex items-center gap-3">
              <Avatar name={b.name} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate text-[14px]">
                  {b.name}
                  {b.guest && <span className="rounded bg-clay-soft px-1.5 text-[10px] text-clay">GUEST</span>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] ${STATUS_STYLE[b.status]}`}>
                  {b.status.replace("-", " ")}
                  {b.guestOf ? ` · of ${b.guestOf}` : ""}
                </span>
              </div>
              <button
                onClick={() => notify(toggleCheckIn(s.id, b.id))}
                aria-label={b.status === "checked-in" ? `Undo check-in for ${b.name}` : `Check in ${b.name}`}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  b.status === "checked-in" ? "bg-plum text-linen" : "border border-stone-deep text-muted hover:border-mauve"
                }`}
              >
                <Icon name="check" size={18} />
              </button>
              <button onClick={() => setMenu(menu === b.id ? null : b.id)} className="h-10 w-8 text-[18px] text-muted" aria-label="More actions">
                ⋯
              </button>
            </div>
            {menu === b.id && (
              <div className="mt-2 ml-[44px] flex animate-rise flex-wrap gap-2">
                <SmallBtn onClick={() => (notify(markNoShow(s.id, b.id)), setMenu(null))}>{b.status === "no-show" ? "Undo no-show" : "No-show"}</SmallBtn>
                <SmallBtn onClick={() => (notify(staffCancel(s.id, b.id, true)), setMenu(null))} danger>
                  Late cancel
                </SmallBtn>
                <SmallBtn onClick={() => (notify(staffCancel(s.id, b.id, false)), setMenu(null))}>Cancel (no fee)</SmallBtn>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* waitlist */}
      <section className="mt-6">
        <h3 className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted">
          Waitlist <span>{studio.settings.autoPromote ? "Auto-promote on" : "Manual promote"}</span>
        </h3>
        {s.waitlist.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">No one waiting.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {s.waitlist.map((w, i) => (
              <li key={w.id} className="flex items-center gap-3 rounded-xl bg-sand/70 px-3 py-2">
                <span className="w-5 text-[12px] text-muted">#{i + 1}</span>
                <span className="flex-1 text-[14px]">{w.name}</span>
                <SmallBtn onClick={() => notify(promote(s.id, w.id))} disabled={left === 0}>
                  Promote
                </SmallBtn>
                <button onClick={() => notify(removeFromWaitlist(s.id, w.id))} className="p-1 text-muted" aria-label={`Remove ${w.name}`}>
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* guest */}
      <section className="mt-6 rounded-2xl border border-stone p-4">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-muted">Guest reservation</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" className="rounded-xl border border-stone bg-linen px-3 py-2.5 text-[14px] outline-none focus:border-mauve" />
          <input value={guestOf} onChange={(e) => setGuestOf(e.target.value)} placeholder="Guest of (optional)" className="rounded-xl border border-stone bg-linen px-3 py-2.5 text-[14px] outline-none focus:border-mauve" />
          <button
            disabled={left === 0}
            onClick={() => {
              const r = addGuest(s.id, guestName, guestOf);
              notify(r);
              if (r.ok) {
                setGuestName("");
                setGuestOf("");
              }
            }}
            className="flex items-center justify-center gap-1 rounded-xl bg-plum px-4 py-2.5 text-[14px] text-linen disabled:opacity-40"
          >
            <Icon name="plus" size={16} /> Add
          </button>
        </div>
      </section>

      {cancelled.length > 0 && (
        <section className="mt-6">
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-muted">Cancelled</h3>
          <ul className="mt-2 space-y-1 text-[13px]">
            {cancelled.map((b) => (
              <li key={b.id} className="flex justify-between text-muted">
                <span>{b.name}</span>
                <span className={b.status === "late-cancel" ? "text-rose" : ""}>
                  {b.status === "late-cancel" ? (b.feeWaived ? "late · waived" : `late · ${studio.settings.lateCancelFee} DT`) : "cancelled"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}

function SmallBtn({ children, onClick, danger, disabled }: { children: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] transition disabled:opacity-35 ${
        danger ? "border-rose/40 text-rose" : "border-stone-deep text-ink/80 hover:border-mauve"
      }`}
    >
      {children}
    </button>
  );
}

/* ——————————————— Inventory ——————————————— */

function Inventory({ studio, notify }: { studio: StudioState; notify: Notify }) {
  const today = dayKey(new Date());
  return (
    <div className="animate-fade">
      <PageTitle title="Rooms & equipment" sub="Track mats, props, hammocks and instruments per room." />
      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {studio.rooms.map((room) => {
          const items = studio.inventory.filter((i) => i.roomId === room.id);
          const todays = studio.sessions.filter((s) => s.roomId === room.id && dayKey(s.start) === today);
          const peak = Math.max(0, ...todays.map((s) => activeBookings(s).length));
          return (
            <section key={room.id} className="rounded-3xl bg-linen p-5 shadow-soft">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-[24px]">{room.name}</h2>
                <span className="text-[12px] text-muted">
                  Cap. {room.capacity} · peak today {peak}
                </span>
              </div>
              <ul className="mt-3 divide-y divide-stone">
                {items.map((it) => {
                  const usable = it.total - it.inRepair;
                  const low = usable < it.minimum;
                  return (
                    <li key={it.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px]">{it.name}</span>
                        <span className={`text-[12px] ${low ? "text-rose" : "text-muted"}`}>
                          {usable} usable{low ? ` · need ${it.minimum}` : ""}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-[12px] text-muted">
                        <Stepper label="Total" value={it.total} onDec={() => notify(adjustInventory(it.id, "total", -1))} onInc={() => notify(adjustInventory(it.id, "total", 1))} />
                        <Stepper label="In repair" value={it.inRepair} onDec={() => notify(adjustInventory(it.id, "inRepair", -1))} onInc={() => notify(adjustInventory(it.id, "inRepair", 1))} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Stepper({ label, value, onDec, onInc }: { label: string; value: number; onDec: () => void; onInc: () => void }) {
  return (
    <span className="flex items-center gap-2">
      {label}
      <span className="flex items-center rounded-full border border-stone">
        <button onClick={onDec} className="p-1.5" aria-label={`Decrease ${label}`}>
          <Icon name="minus" size={13} />
        </button>
        <span className="w-6 text-center text-[13px] text-ink">{value}</span>
        <button onClick={onInc} className="p-1.5" aria-label={`Increase ${label}`}>
          <Icon name="plus" size={13} />
        </button>
      </span>
    </span>
  );
}

/* ——————————————— Hours ——————————————— */

function Hours({ studio, me, notify }: { studio: StudioState; me: string; notify: Notify }) {
  const weekStart = addDays(startOfDay(new Date()), -6);
  const open = studio.shifts.find((s) => s.staffId === me && !s.end);
  const hrs = (start: string, end?: string) => ((end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()) / 36e5;

  const rows = studio.instructors.map((p) => {
    const shifts = studio.shifts.filter((s) => s.staffId === p.id && new Date(s.start) >= weekStart);
    const total = shifts.reduce((a, s) => a + hrs(s.start, s.end), 0);
    const taught = studio.sessions.filter((s) => s.instructorId === p.id && new Date(s.start) >= weekStart && new Date(s.start) < new Date()).length;
    return { p, total, taught, count: shifts.length };
  });
  const mine = studio.shifts.filter((s) => s.staffId === me).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 6);

  return (
    <div className="animate-fade">
      <PageTitle title="Hours" sub="Clock in, clock out, and see the week at a glance." />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-3xl bg-ink p-6 text-linen shadow-lift">
          <div className="text-[11px] uppercase tracking-[0.25em] opacity-60">{open ? "On shift since" : "Off shift"}</div>
          <div className="mt-2 font-display text-[40px] leading-none">{open ? formatTime(open.start) : "—"}</div>
          {open && <div className="mt-1 text-[13px] opacity-70">{hrs(open.start).toFixed(1)} hours so far</div>}
          <button
            onClick={() => notify(clockToggle(me))}
            className={`mt-6 w-full rounded-full py-3.5 text-[15px] ${open ? "bg-linen text-ink" : "bg-mauve text-linen"}`}
          >
            {open ? "Clock out" : "Clock in"}
          </button>
          <ul className="mt-6 space-y-2 text-[13px]">
            {mine.map((s) => (
              <li key={s.id} className="flex justify-between opacity-80">
                <span>{formatDayShort(s.start)}</span>
                <span>
                  {formatTime(s.start)} – {s.end ? formatTime(s.end) : "now"} · {hrs(s.start, s.end).toFixed(1)}h
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-x-auto rounded-3xl bg-linen p-5 shadow-soft">
          <h2 className="font-display text-[22px]">Last 7 days</h2>
          <table className="mt-3 w-full min-w-[420px] text-left text-[13.5px]">
            <thead className="text-[11px] uppercase tracking-[0.15em] text-muted">
              <tr>
                <th className="py-2 font-normal">Staff</th>
                <th className="py-2 font-normal">Shifts</th>
                <th className="py-2 font-normal">Classes taught</th>
                <th className="py-2 text-right font-normal">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {rows.map(({ p, total, taught, count }) => (
                <tr key={p.id}>
                  <td className="py-3">
                    <span className="flex items-center gap-2">
                      <Avatar person={p} size={28} /> {p.name}
                    </span>
                  </td>
                  <td>{count}</td>
                  <td>{p.role === "teacher" ? taught : "—"}</td>
                  <td className="text-right font-display text-[18px]">{total.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

/* ——————————————— Policies ——————————————— */

function Policies({ studio, notify }: { studio: StudioState; notify: Notify }) {
  const st = studio.settings;
  return (
    <div className="max-w-2xl animate-fade">
      <PageTitle title="Policies" sub="Applied instantly to the client app." />
      <div className="space-y-4">
        <Row title="Late-cancel window" sub="Cancellations inside this window are flagged as late.">
          <select
            value={st.lateCancelHours}
            onChange={(e) => notify(updateSettings({ lateCancelHours: Number(e.target.value) }))}
            className="rounded-xl border border-stone bg-linen px-3 py-2 text-[14px]"
          >
            {[2, 4, 6, 8, 12, 24].map((h) => (
              <option key={h} value={h}>
                {h} hours
              </option>
            ))}
          </select>
        </Row>
        <Row title="Late-cancel fee" sub="Charged unless waived by staff.">
          <select
            value={st.lateCancelFee}
            onChange={(e) => notify(updateSettings({ lateCancelFee: Number(e.target.value) }))}
            className="rounded-xl border border-stone bg-linen px-3 py-2 text-[14px]"
          >
            {[0, 5, 10, 15, 20, 25].map((f) => (
              <option key={f} value={f}>
                {f} DT
              </option>
            ))}
          </select>
        </Row>
        <Row title="Auto-promote waitlist" sub="When a spot opens, book the next person automatically.">
          <button
            role="switch"
            aria-checked={st.autoPromote}
            onClick={() => notify(updateSettings({ autoPromote: !st.autoPromote }))}
            className={`relative h-7 w-12 rounded-full transition ${st.autoPromote ? "bg-plum" : "bg-stone-deep"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-linen transition-all ${st.autoPromote ? "left-6" : "left-1"}`} />
          </button>
        </Row>
        <Row title="Reset demo data" sub="Restores the sample schedule, rosters and inventory.">
          <button
            onClick={() => {
              if (confirm("Reset all demo data?")) {
                resetDemo();
                notify({ ok: true, message: "Demo data reset" });
              }
            }}
            className="rounded-full border border-rose/40 px-4 py-2 text-[13px] text-rose"
          >
            Reset
          </button>
        </Row>
      </div>

      {studio.activity.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted">Recent activity</h2>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            {studio.activity.slice(0, 10).map((a) => (
              <li key={a.id} className="flex justify-between gap-4">
                <span>{a.text}</span>
                <span className="shrink-0 text-muted">{formatTime(a.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-linen px-5 py-4 shadow-soft">
      <div>
        <div className="text-[14.5px]">{title}</div>
        <div className="text-[12.5px] text-muted">{sub}</div>
      </div>
      {children}
    </div>
  );
}
