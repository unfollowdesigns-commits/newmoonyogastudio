"use client";

import { useMemo, useState } from "react";
import { STYLE_META } from "@/lib/seed";
import { endOf, formatDayLong, formatTime, hoursUntil } from "@/lib/date";
import {
  book,
  cancelMine,
  isPast,
  joinWaitlist,
  leaveWaitlist,
  myBooking,
  myWaitlistPosition,
  spotsLeft,
  takenSpots,
} from "@/lib/store";
import type { Session, StudioState } from "@/lib/types";
import { Avatar, Icon, Sheet } from "../ui";

export function ClassSheet({
  studio,
  session,
  onClose,
  notify,
}: {
  studio: StudioState;
  session: Session | null;
  onClose: () => void;
  notify: (text: string, tone?: "ok" | "warn") => void;
}) {
  return (
    <Sheet open={!!session} onClose={onClose} label={session?.title ?? "Class"}>
      {session && <Body key={session.id} studio={studio} session={session} notify={notify} />}
    </Sheet>
  );
}

function Body({ studio, session, notify }: { studio: StudioState; session: Session; notify: (t: string, tone?: "ok" | "warn") => void }) {
  const meta = STYLE_META[session.style];
  const teacher = studio.instructors.find((i) => i.id === session.instructorId)!;
  const room = studio.rooms.find((r) => r.id === session.roomId)!;
  const mine = myBooking(session, studio.me.id);
  const waitPos = myWaitlistPosition(session, studio.me.id);
  const left = spotsLeft(session);
  const taken = useMemo(() => takenSpots(session), [session]);
  const [spot, setSpot] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const past = isPast(session);
  const late = hoursUntil(session.start) < studio.settings.lateCancelHours;

  const act = (r: { ok: boolean; message: string }) => notify(r.message, r.ok ? "ok" : "warn");

  return (
    <div className="pb-safe">
      {/* hero */}
      <div className="mx-5 overflow-hidden rounded-3xl px-6 pt-6 pb-7" style={{ background: meta.soft }}>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-linen/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: meta.hue }}>
            {session.style}
          </span>
          <span className="text-[12px] text-ink/60">{session.level}</span>
        </div>
        <h2 className="mt-5 font-display text-[34px] leading-[1.05] font-medium">{session.title}</h2>
        <p className="mt-2 text-[14px] text-ink/70">
          {formatDayLong(session.start)} · {formatTime(session.start)}–{formatTime(endOf(session.start, session.durationMin).toISOString())}
        </p>
      </div>

      <div className="space-y-6 px-6 pt-6">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Fact label="Duration" value={`${session.durationMin} min`} />
          <Fact label="Room" value={room.name} />
          <Fact label="Open mats" value={mine ? `${left} left` : left > 0 ? `${left} of ${session.capacity}` : "Full"} warn={!mine && left === 0} />
        </div>

        <div className="flex items-start gap-3">
          <Avatar person={teacher} size={46} />
          <div>
            <div className="text-[15px] font-medium">{teacher.name}</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{teacher.bio}</p>
          </div>
        </div>

        <p className="text-[14.5px] leading-relaxed text-ink/80">{session.description}</p>

        {/* mat picker — optional, so booking stays one tap */}
        {!mine && left > 0 && !past && (
          <div className="rounded-2xl border border-stone bg-sand/60 p-4">
            <button className="flex w-full items-center justify-between text-left" onClick={() => setShowMap((v) => !v)} aria-expanded={showMap}>
              <span>
                <span className="block text-[14px] font-medium">Choose your mat</span>
                <span className="text-[12.5px] text-muted">{spot ? `Mat ${spot} selected` : "Optional — we'll pick a great spot for you"}</span>
              </span>
              <Icon name="chevronR" className={`text-muted transition-transform duration-300 ${showMap ? "rotate-90" : ""}`} />
            </button>
            {showMap && (
              <MatMap capacity={session.capacity} cols={room.cols} taken={taken} selected={spot} onSelect={setSpot} />
            )}
          </div>
        )}

        {mine && (
          <div className="flex items-center gap-3 rounded-2xl bg-sage-soft px-4 py-3.5 text-sage-deep">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-deep text-linen">
              <Icon name="check" size={18} />
            </span>
            <div className="text-[14px]">
              <div className="font-medium">You&apos;re booked{mine.spot ? ` · Mat ${mine.spot}` : ""}</div>
              <div className="text-[12.5px] opacity-80">Arrive 10 minutes early to settle in.</div>
            </div>
          </div>
        )}

        {waitPos && (
          <div className="rounded-2xl bg-clay-soft px-4 py-3.5 text-[14px] text-ink/80">
            You&apos;re <b className="font-medium">#{waitPos}</b> on the waitlist. If a mat opens we&apos;ll book you automatically and let you know.
          </div>
        )}
      </div>

      {/* sticky action */}
      <div className="sticky bottom-0 mt-6 border-t border-stone/70 bg-linen/95 px-6 pt-4 pb-safe backdrop-blur">
        {past ? (
          <button disabled className="w-full rounded-full bg-stone py-4 text-[15px] text-muted">
            This class has started
          </button>
        ) : mine ? (
          confirmCancel ? (
            <div className="space-y-3">
              <p className={`text-center text-[13px] ${late ? "text-rose" : "text-muted"}`}>
                {late
                  ? `Within ${studio.settings.lateCancelHours}h of class — a $${studio.settings.lateCancelFee} late-cancel fee applies.`
                  : "Free cancellation — your mat goes to the next person waiting."}
              </p>
              <div className="flex gap-3">
                <button className="flex-1 rounded-full border border-stone-deep py-3.5 text-[14px]" onClick={() => setConfirmCancel(false)}>
                  Keep my mat
                </button>
                <button
                  className="flex-1 rounded-full bg-rose py-3.5 text-[14px] text-linen"
                  onClick={() => {
                    act(cancelMine(session.id));
                    setConfirmCancel(false);
                  }}
                >
                  Cancel booking
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-stone-deep py-3.5 text-[14px]"
                onClick={() => downloadIcs(session, studio.rooms.find((r) => r.id === session.roomId)!.name)}
              >
                <Icon name="calendar" size={17} /> Add to calendar
              </button>
              <button className="rounded-full px-5 py-3.5 text-[14px] text-rose" onClick={() => setConfirmCancel(true)}>
                Cancel
              </button>
            </div>
          )
        ) : waitPos ? (
          <button className="w-full rounded-full border border-stone-deep py-4 text-[15px]" onClick={() => act(leaveWaitlist(session.id))}>
            Leave waitlist
          </button>
        ) : left > 0 ? (
          <button
            className="w-full rounded-full bg-sage-deep py-4 text-[15px] tracking-wide text-linen shadow-soft transition active:scale-[0.98]"
            onClick={() => act(book(session.id, spot))}
          >
            {spot ? `Reserve mat ${spot}` : "Reserve my mat"}
          </button>
        ) : (
          <button
            className="w-full rounded-full bg-clay py-4 text-[15px] tracking-wide text-linen transition active:scale-[0.98]"
            onClick={() => act(joinWaitlist(session.id))}
          >
            Join waitlist · {session.waitlist.length} ahead
          </button>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-stone bg-linen px-2 py-3">
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className={`mt-1 text-[14px] ${warn ? "text-rose" : ""}`}>{value}</div>
    </div>
  );
}

export function MatMap({
  capacity,
  cols,
  taken,
  selected,
  onSelect,
}: {
  capacity: number;
  cols: number;
  taken: Set<number>;
  selected: number | null;
  onSelect: (n: number | null) => void;
}) {
  return (
    <div className="mt-4 animate-rise">
      <div className="mb-3 rounded-full bg-stone/80 py-1 text-center text-[10.5px] uppercase tracking-[0.3em] text-muted">Teacher · Front</div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: capacity }, (_, i) => i + 1).map((n) => {
          const isTaken = taken.has(n);
          const isSel = selected === n;
          return (
            <button
              key={n}
              disabled={isTaken}
              onClick={() => onSelect(isSel ? null : n)}
              aria-label={`Mat ${n}${isTaken ? " taken" : ""}`}
              aria-pressed={isSel}
              className={`h-12 rounded-xl text-[12px] transition-all duration-200 ${
                isTaken
                  ? "cursor-not-allowed bg-stone/70 text-muted/50"
                  : isSel
                    ? "scale-105 bg-sage-deep text-linen shadow-soft"
                    : "border border-sage/40 bg-linen text-sage-deep hover:bg-sage-soft"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[11px] text-muted">
        <Legend cls="border border-sage/40 bg-linen" label="Open" />
        <Legend cls="bg-sage-deep" label="Yours" />
        <Legend cls="bg-stone" label="Taken" />
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${cls}`} /> {label}
    </span>
  );
}

function downloadIcs(s: Session, roomName: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(s.start);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//New Moon Yoga Studio//EN",
    "BEGIN:VEVENT",
    `UID:${s.id}@newmoon.studio`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(endOf(s.start, s.durationMin))}`,
    `SUMMARY:${s.title} · New Moon`,
    `LOCATION:New Moon Yoga Studio — ${roomName}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${s.title.replace(/\s+/g, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
