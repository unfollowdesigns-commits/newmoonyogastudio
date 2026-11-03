"use client";

import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { computeStats, type DashBooking, type DashSession } from "@/lib/stats";
import { loadDashboard, loadMembers, whatsappLink } from "@/lib/store";
import type { MemberRow, StudioState } from "@/lib/types";
import { Avatar } from "../ui";

const WINDOWS = [30, 90] as const;

/* ——————————————— Owner's studio overview ——————————————— */

export function Overview({ studio }: { studio: StudioState }) {
  const L = useT();
  const t = L.t;
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [rows, setRows] = useState<MemberRow[] | null>(null);
  const [dash, setDash] = useState<{ sessions: DashSession[]; bookings: DashBooking[] } | null>(null);

  useEffect(() => {
    let alive = true;
    loadMembers().then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, [studio.seededAt]);

  useEffect(() => {
    let alive = true;
    setDash(null);
    loadDashboard(new Date(Date.now() - days * 864e5).toISOString()).then((d) => alive && setDash(d));
    return () => {
      alive = false;
    };
  }, [days, studio.seededAt]);

  const s = useMemo(() => (rows && dash ? computeStats(rows, dash.sessions, dash.bookings, new Date(), days) : null), [rows, dash, days]);
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)} %`);
  const num = (x: number) => x.toLocaleString(L.locale, { maximumFractionDigits: 1 });

  return (
    <div className="animate-fade">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[34px] leading-tight font-medium">{t("dash.title")}</h1>
          <p className="text-[13px] text-muted">{t("dash.sub")}</p>
        </div>
        <div className="flex rounded-full border border-stone-deep bg-linen p-0.5 text-[12.5px]" role="group" aria-label={t("dash.window")}>
          {WINDOWS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`rounded-full px-3.5 py-1.5 transition ${days === d ? "bg-plum text-linen" : "text-muted"}`}
            >
              {t("dash.days", { n: d })}
            </button>
          ))}
        </div>
      </div>

      {!s ? (
        <p className="rounded-3xl bg-linen p-8 text-center text-[14px] text-muted shadow-soft">{t("members.loading")}</p>
      ) : (
        <div className="space-y-5">
          {/* the four numbers the owner asked for, plus fill */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label={t("dash.members")} value={num(s.members)} note={t("dash.newMembers", { n: s.newMembers, d: days })} />
            <Tile label={t("dash.avgClasses")} value={s.visitedOnce ? num(s.avgClasses) : "—"} note={t("dash.avgNote", { n: s.visitedOnce })} />
            <Tile label={t("dash.returnRate")} value={pct(s.returnRate)} note={t("dash.returnNote")} />
            <Tile label={t("dash.fill")} value={pct(s.fillRate)} note={t("dash.fillNote", { n: s.classes, d: days })} />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Small label={t("dash.active", { d: days })} value={num(s.activeMembers)} />
            <Small label={t("dash.noShowRate")} value={pct(s.noShowRate)} />
            <Small label={t("dash.lateCancels")} value={num(s.lateCancels)} />
            <Small label={t("dash.unmarked")} value={num(s.unmarked)} warn={s.unmarked > 0} />
          </div>

          {s.unmarked > 0 && <p className="rounded-2xl bg-clay-soft px-4 py-3 text-[13px] text-clay">{t("dash.unmarkedHint", { n: s.unmarked })}</p>}

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={t("dash.byClass")} sub={t("dash.byClassSub", { d: days })}>
              {s.byClass.length === 0 ? (
                <Empty>{t("dash.noClasses")}</Empty>
              ) : (
                <ul className="space-y-3">
                  {s.byClass.map((c) => (
                    <li key={c.title}>
                      <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                        <span className="min-w-0 truncate">{c.title}</span>
                        <span className="shrink-0 tabular-nums text-muted">
                          {c.taken}/{c.capacity} · <span className="text-ink">{Math.round(c.rate * 100)} %</span>
                        </span>
                      </div>
                      <Bar value={c.rate} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={t("dash.signups")} sub={t("dash.signupsSub")}>
              <Columns
                items={s.signupsByWeek.map((w) => ({
                  label: new Date(w.week + "T12:00:00").toLocaleDateString(L.locale, { day: "2-digit", month: "2-digit" }),
                  value: w.count,
                }))}
              />
            </Panel>

            <Panel title={t("dash.visits")} sub={t("dash.visitsSub")}>
              <Columns items={s.visits.map((v) => ({ label: v.label, value: v.count }))} />
            </Panel>

            <Panel title={t("dash.lapsed")} sub={t("dash.lapsedSub", { d: days })}>
              {s.lapsed.length === 0 ? (
                <Empty>{t("dash.lapsedNone")}</Empty>
              ) : (
                <ul className="divide-y divide-stone">
                  {s.lapsed.slice(0, 8).map((m) => {
                    const wa = whatsappLink(m.phone);
                    return (
                      <li key={m.id} className="flex items-center gap-3 py-2.5">
                        <Avatar name={`${m.firstName} ${m.lastName}`} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px]">
                            {m.firstName} {m.lastName}
                          </div>
                          <div className="text-[11.5px] text-muted">{t("dash.lapsedCount", { n: m.attended })}</div>
                        </div>
                        {wa && (
                          <a href={wa} target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-stone-deep px-3 py-1.5 text-[12.5px] text-plum">
                            WhatsApp
                          </a>
                        )}
                      </li>
                    );
                  })}
                  {s.lapsed.length > 8 && <li className="pt-2.5 text-[12.5px] text-muted">{t("dash.lapsedMore", { n: s.lapsed.length - 8 })}</li>}
                </ul>
              )}
            </Panel>
          </div>

          <p className="text-[12px] leading-relaxed text-muted">{t("dash.footnote")}</p>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl bg-linen p-4 shadow-soft sm:p-5">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-2 text-[36px] leading-none font-light tabular-nums">{value}</div>
      <div className="mt-2 text-[12px] leading-snug text-muted">{note}</div>
    </div>
  );
}

function Small({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-2xl border border-stone bg-linen px-4 py-3">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className={`text-[18px] tabular-nums ${warn ? "text-clay" : ""}`}>{value}</span>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-linen p-5 shadow-soft">
      <h2 className="font-display text-[22px] leading-tight">{title}</h2>
      <p className="mb-4 text-[12px] text-muted">{sub}</p>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-[13px] text-muted">{children}</p>;
}

function Bar({ value }: { value: number }) {
  return (
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone">
      <div className="h-full rounded-full bg-mauve" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

// small column chart; bars scale to the largest value
function Columns({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex h-40 items-end gap-2">
      {items.map((i, k) => (
        <div key={k} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="text-[11.5px] tabular-nums text-muted">{i.value}</span>
          <div className="w-full max-w-10 rounded-t-lg bg-mauve/80" style={{ height: `${(i.value / max) * 96}px`, minHeight: i.value ? 4 : 1 }} />
          <span className="w-full truncate text-center text-[10.5px] text-muted">{i.label}</span>
        </div>
      ))}
    </div>
  );
}
