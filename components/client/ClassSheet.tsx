"use client";

import { useState } from "react";
import { studio } from "@/clients";
import { STUDIO, STYLE_META } from "@/lib/seed";
import { endOf, formatTime, hoursUntil, formatDuration } from "@/lib/date";
import { useT } from "@/lib/i18n";
import {
  book,
  cancelMine,
  isPast,
  joinWaitlist,
  leaveWaitlist,
  myBooking,
  myWaitlistPosition,
  spotsLeft,
  waitCount,
  bookingClosed,
  type Result,
} from "@/lib/store";
import type { Session, StudioState } from "@/lib/types";
import { Avatar, Icon, Sheet } from "../ui";

export function ClassSheet({
  studio,
  session,
  onClose,
  notify,
  requireAccount,
}: {
  studio: StudioState;
  session: Session | null;
  onClose: () => void;
  notify: (r: Result | Promise<Result>) => void;
  requireAccount: (action: () => void) => void;
}) {
  return (
    <Sheet open={!!session} onClose={onClose} label={session?.title ?? "Class"}>
      {session && <Body key={session.id} studio={studio} session={session} notify={notify} requireAccount={requireAccount} />}
    </Sheet>
  );
}

function Body({
  studio,
  session,
  notify,
  requireAccount,
}: {
  studio: StudioState;
  session: Session;
  notify: (r: Result | Promise<Result>) => void;
  requireAccount: (action: () => void) => void;
}) {
  const i = useT();
  const { t } = i;
  const meta = STYLE_META[session.style];
  const teacher = studio.instructors.find((i) => i.id === session.instructorId)!;
  const room = studio.rooms.find((r) => r.id === session.roomId)!;
  const mine = myBooking(session, studio.me.id);
  const waitPos = myWaitlistPosition(session, studio.me.id);
  const left = spotsLeft(session);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const past = isPast(session);
  const late = hoursUntil(session.start) < studio.settings.lateCancelHours;
  const closed = bookingClosed(session, studio.settings.bookingCutoffHours);

  const act = notify;

  return (
    <div className="pb-safe">
      {/* hero */}
      <div className="mx-5 overflow-hidden rounded-3xl px-6 pt-6 pb-7" style={{ background: meta.soft }}>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-linen/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: meta.hue }}>
            {i.style(session.style)}
          </span>
          <span className="text-[12px] text-ink/60">{i.level(session.level)}</span>
        </div>
        <h2 className="mt-5 font-display text-[34px] leading-[1.05] font-medium">{session.title}</h2>
        <p className="mt-2 text-[14px] text-ink/70">
          {i.dayLong(session.start)} · {formatTime(session.start)}–{formatTime(endOf(session.start, session.durationMin))}
        </p>
      </div>

      <div className="space-y-6 px-6 pt-6">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Fact label={t("class.duration")} value={formatDuration(session.durationMin)} />
          <Fact label={t("class.room")} value={i.room(room)} />
          <Fact label={t("class.spotsLeft")} value={left > 0 ? t("class.ofCap", { n: left, cap: session.capacity }) : t("class.full")} warn={!mine && left === 0} />
        </div>

        <div className="flex items-start gap-3">
          <Avatar person={teacher} size={46} />
          <div>
            <div className="text-[15px] font-medium">{i.person(teacher)}</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{i.bio(teacher)}</p>
          </div>
        </div>

        <p className="text-[14.5px] leading-relaxed text-ink/80">{i.desc(session)}</p>
        <a href={STUDIO.whatsapp} target="_blank" rel="noreferrer" className="inline-block text-[13px] text-plum underline underline-offset-4">
          {t("class.questions")}
        </a>

        {mine && (
          <div className="flex items-center gap-3 rounded-2xl bg-blush px-4 py-3.5 text-plum">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-plum text-linen">
              <Icon name="check" size={18} />
            </span>
            <div className="text-[14px]">
              <div className="font-medium">{t("class.bookedTitle")}</div>
              <div className="text-[12.5px] opacity-80">{t("class.bookedBody")}</div>
            </div>
          </div>
        )}

        {waitPos && (
          <div className="rounded-2xl bg-clay-soft px-4 py-3.5 text-[14px] text-ink/80">
            {t("class.waitPos", { n: waitPos })}
          </div>
        )}
      </div>

      {/* sticky action */}
      <div className="sticky bottom-0 mt-6 border-t border-stone/70 bg-linen/95 px-6 pt-4 pb-safe backdrop-blur">
        {past ? (
          <button disabled className="w-full rounded-full bg-stone py-4 text-[15px] text-muted">
            {t("class.started")}
          </button>
        ) : mine ? (
          confirmCancel ? (
            <div className="space-y-3">
              <p className={`text-center text-[13px] ${late ? "text-rose" : "text-muted"}`}>
                {late
                  ? t(studio.settings.lateCancelFee > 0 ? "class.lateWarn" : "class.lateWarnNoFee", { h: studio.settings.lateCancelHours, fee: studio.settings.lateCancelFee })
                  : t("class.freeCancel")}
              </p>
              <div className="flex gap-3">
                <button className="flex-1 rounded-full border border-stone-deep py-3.5 text-[14px]" onClick={() => setConfirmCancel(false)}>
                  {t("class.keep")}
                </button>
                <button
                  className="flex-1 rounded-full bg-rose py-3.5 text-[14px] text-linen"
                  onClick={() => {
                    act(cancelMine(session.id));
                    setConfirmCancel(false);
                  }}
                >
                  {t("class.cancelBooking")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-stone-deep py-3.5 text-[14px]"
                onClick={() => downloadIcs(session, i.room(room))}
              >
                <Icon name="calendar" size={17} /> {t("class.addCal")}
              </button>
              <button className="rounded-full px-5 py-3.5 text-[14px] text-rose" onClick={() => setConfirmCancel(true)}>
                {t("class.cancel")}
              </button>
            </div>
          )
        ) : waitPos ? (
          <button className="w-full rounded-full border border-stone-deep py-4 text-[15px]" onClick={() => act(leaveWaitlist(session.id))}>
            {t("class.leaveWait")}
          </button>
        ) : closed ? (
          <button disabled className="w-full rounded-full bg-stone py-4 text-[15px] text-muted">
            {t("class.bookingClosed", { h: studio.settings.bookingCutoffHours })}
          </button>
        ) : left > 0 ? (
          <button
            className="w-full rounded-full bg-plum py-4 text-[15px] tracking-wide text-linen shadow-soft transition active:scale-[0.98]"
            onClick={() => requireAccount(() => act(book(session.id)))}
          >
            {t("class.reserve")}
          </button>
        ) : (
          <button
            className="w-full rounded-full bg-clay py-4 text-[15px] tracking-wide text-linen transition active:scale-[0.98]"
            onClick={() => requireAccount(() => act(joinWaitlist(session.id)))}
          >
            {t("class.joinWait", { n: waitCount(session) })}
          </button>
        )}
        {!past && !mine && !waitPos && (
          <p className="mt-2 text-center text-[11.5px] text-muted">{t("class.commitment", { b: studio.settings.bookingCutoffHours, h: studio.settings.lateCancelHours })}</p>
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

function downloadIcs(s: Session, roomName: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(s.start);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${STUDIO.name}//EN`,
    "BEGIN:VEVENT",
    `UID:${s.id}@${studio.id}.studio`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(endOf(s.start, s.durationMin))}`,
    `SUMMARY:${s.title} · ${studio.shortName}`,
    `LOCATION:${STUDIO.name} — ${roomName}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${s.title.normalize("NFD").replace(/[\u0300-\u036f']/g, "").replace(/\s+/g, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
