"use client";

import { useEffect, useState } from "react";
import { downloadCsv } from "@/lib/csv";
import { dayKey, formatTime } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { remote } from "@/lib/remote";
import { loadInvites, loadMembers, setBlocked, setRole, whatsappLink, type Result } from "@/lib/store";
import type { MemberRow, Role, StudioState } from "@/lib/types";
import { Avatar, Icon } from "../ui";

type Notify = (r: Result | Promise<Result>) => void;

/* ——————————————— Members ——————————————— */

export function Members({ studio, notify }: { studio: StudioState; notify: Notify }) {
  const L = useT();
  const t = L.t;
  const [rows, setRows] = useState<MemberRow[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    loadMembers().then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, [studio.seededAt]);

  const clients = rows ?? [];
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? clients.filter((m) => `${m.firstName} ${m.lastName} ${m.phone} ${m.email}`.toLowerCase().includes(needle))
    : clients;
  const date = (iso: string) => new Date(iso).toLocaleDateString(L.locale, { day: "numeric", month: "short", year: "numeric" });

  function exportMembers() {
    downloadCsv(
      `new-moon-membres-${dayKey(new Date())}.csv`,
      [t("auth.firstName"), t("auth.lastName"), t("members.phone"), t("members.email"), t("members.joined"), t("members.attended"), t("members.noShows"), t("members.late"), t("members.upcoming")],
      clients.map((m) => [m.firstName, m.lastName, m.phone, m.email, date(m.createdAt), m.attended, m.noShows, m.lateCancels, m.upcoming]),
    );
  }

  async function exportBookings() {
    const header = ["Date", "Heure", "Cours", t("members.name"), t("members.phone"), t("members.email"), "Statut", "Frais offerts", "Réservé le"];
    if (studio.mode === "live") {
      const from = new Date(Date.now() - 90 * 864e5).toISOString();
      const to = new Date(Date.now() + 30 * 864e5).toISOString();
      const data = await remote.bookingsExport(from, to);
      downloadCsv(
        `new-moon-reservations-${dayKey(new Date())}.csv`,
        header,
        data.map((b) => {
          const s = b.sessions as { title: string; starts_at: string };
          const p = (b.profiles ?? {}) as { first_name?: string; last_name?: string; phone?: string; email?: string };
          const who = (b.guest_name as string) ? `${b.guest_name} (invitée${b.guest_of ? " de " + b.guest_of : ""})` : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
          return [date(s.starts_at), formatTime(s.starts_at), s.title, who, p.phone ?? "", p.email ?? "", t(`status.${b.status}`), b.fee_waived ? "oui" : "", date(b.created_at as string)];
        }),
      );
    } else {
      downloadCsv(
        `new-moon-reservations-${dayKey(new Date())}.csv`,
        header,
        studio.sessions.flatMap((s) =>
          s.bookings.map((b) => [date(s.start), formatTime(s.start), s.title, b.name, "", "", t(`status.${b.status}`), b.feeWaived ? "oui" : "", date(b.createdAt)]),
        ),
      );
    }
  }

  return (
    <div className="animate-fade">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[34px] leading-tight font-medium">{t("members.title")}</h1>
          <p className="text-[13px] text-muted">{t("members.sub")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportMembers} className="flex items-center gap-1.5 rounded-full bg-plum px-4 py-2.5 text-[13px] text-linen">
            <Icon name="download" size={16} /> {t("members.exportMembers")}
          </button>
          <button onClick={() => void exportBookings()} className="flex items-center gap-1.5 rounded-full border border-stone-deep bg-linen px-4 py-2.5 text-[13px]">
            <Icon name="download" size={16} /> {t("members.exportBookings")}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-stone bg-linen px-3">
          <Icon name="search" size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("members.search")} className="w-full bg-transparent py-2.5 text-[14px] outline-none" />
        </div>
        <span className="shrink-0 text-[13px] text-muted">{t("members.count", { n: clients.length })}</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl bg-linen shadow-soft">
        {rows === null ? (
          <p className="p-8 text-center text-[14px] text-muted">{t("members.loading")}</p>
        ) : shown.length === 0 ? (
          <p className="p-8 text-center text-[14px] text-muted">{t("members.empty")}</p>
        ) : (
          <ul className="divide-y divide-stone">
            {shown.map((m) => {
              const wa = whatsappLink(m.phone);
              return (
                <li key={m.id} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-4 py-3.5 md:grid-cols-[auto_1.4fr_1fr_1.6fr_repeat(4,70px)_96px]">
                  <Avatar name={`${m.firstName} ${m.lastName}`} size={36} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 truncate text-[14.5px]">
                      {m.firstName} {m.lastName}
                      {m.role !== "client" && <span className="rounded-full bg-blush px-2 py-0.5 text-[10.5px] text-plum">{t(`staff.role.${m.role}`)}</span>}
                      {m.blocked && <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[10.5px] text-rose">{t("members.blockedBadge")}</span>}
                    </div>
                    <div className="text-[11.5px] text-muted">
                      {t("members.joined")} {date(m.createdAt)}
                    </div>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] md:col-span-1 md:block">
                    {wa ? (
                      <a href={wa} target="_blank" rel="noreferrer" className="text-plum underline underline-offset-4">
                        {m.phone}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                  <div className="col-span-2 truncate text-[13px] text-muted md:col-span-1">{m.email || "—"}</div>
                  <div className="col-span-2 flex gap-2 md:contents">
                    <Num label={t("members.attended")} n={m.attended} />
                    <Num label={t("members.noShows")} n={m.noShows} warn />
                    <Num label={t("members.late")} n={m.lateCancels} warn />
                    <Num label={t("members.upcoming")} n={m.upcoming} />
                  </div>
                  {m.role !== "client" ? <span className="hidden md:block" /> : (
                    <div className="col-span-2 flex justify-end md:col-span-1">
                      <button
                        onClick={() => {
                          const name = `${m.firstName} ${m.lastName}`.trim();
                          if (!m.blocked && !confirm(t("members.confirmBlock", { name }))) return;
                          const p = setBlocked(m.id, !m.blocked);
                          notify(p);
                          void p.then(() => loadMembers().then(setRows));
                        }}
                        className={`rounded-full border px-3 py-1.5 text-[12px] ${m.blocked ? "border-stone-deep text-ink/80" : "border-rose/40 text-rose"}`}
                      >
                        {m.blocked ? t("members.unblock") : t("members.block")}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Num({ label, n, warn }: { label: string; n: number; warn?: boolean }) {
  return (
    <div className="flex-1 rounded-xl bg-sand/70 px-2 py-1.5 text-center md:bg-transparent">
      <div className={`font-display text-[20px] leading-none ${warn && n > 0 ? "text-rose" : ""}`}>{n}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted">{label}</div>
    </div>
  );
}

/* ——————————————— Team (owner) ——————————————— */

const STAFF_ROLES: Role[] = ["teacher", "desk", "owner"];

export function Team({ studio, notify }: { studio: StudioState; notify: Notify }) {
  const L = useT();
  const t = L.t;
  const [people, setPeople] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<{ email: string; role: Role }[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRoleSel] = useState<Role>("teacher");
  const [teacher, setTeacher] = useState<string>("");

  useEffect(() => {
    let alive = true;
    loadMembers().then((r) => alive && setPeople(r.filter((m) => STAFF_ROLES.includes(m.role))));
    loadInvites().then((r) => alive && setInvites(r));
    return () => {
      alive = false;
    };
  }, [studio.seededAt]);

  const apply = (mail: string, r: Role, teacherId: string | null) => {
    const p = setRole(mail, r, teacherId);
    notify(p);
    return p;
  };

  return (
    <div className="max-w-3xl animate-fade">
      <div className="mb-6">
        <h1 className="font-display text-[34px] leading-tight font-medium">{t("team.title")}</h1>
        <p className="text-[13px] text-muted">{t("team.sub")}</p>
      </div>

      <section className="rounded-3xl bg-linen p-5 shadow-soft">
        <h2 className="font-display text-[22px]">{t("team.add")}</h2>
        <p className="mt-1 text-[12.5px] text-muted">{t("team.addHelp")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("team.email")} className="input" />
          <select value={role} onChange={(e) => setRoleSel(e.target.value as Role)} className="input">
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`staff.role.${r}`)}
              </option>
            ))}
          </select>
          <select value={teacher} onChange={(e) => setTeacher(e.target.value)} disabled={role !== "teacher"} className="input disabled:opacity-50" aria-label={t("team.teacherOf")}>
            <option value="">
              {t("team.teacherOf")}: {t("team.none")}
            </option>
            {studio.instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {L.person(i)}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              void apply(email, role, role === "teacher" && teacher ? teacher : null).then((r) => {
                if (!r.ok) return;
                setEmail("");
                loadInvites().then(setInvites);
                loadMembers().then((m) => setPeople(m.filter((x) => STAFF_ROLES.includes(x.role))));
              })
            }
            disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
            className="rounded-xl bg-plum px-4 py-3 text-[14px] text-linen disabled:opacity-40"
          >
            {t("team.save")}
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-linen p-5 shadow-soft">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted">{t("team.current")}</h2>
        <ul className="mt-2 divide-y divide-stone">
          {(studio.mode === "demo" ? studio.instructors.map((i) => ({ id: i.id, name: L.person(i), email: "", role: (i.role === "teacher" ? "teacher" : "desk") as Role })) : people.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`.trim() || p.email, email: p.email, role: p.role }))).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={p.name} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px]">
                  {p.name} {p.id === studio.me.id && <span className="text-muted">{t("team.you")}</span>}
                </div>
                <div className="truncate text-[12px] text-muted">{p.email}</div>
              </div>
              <span className="rounded-full bg-blush px-3 py-1 text-[12px] text-plum">{t(`staff.role.${p.role}`)}</span>
              {studio.mode === "live" && p.id !== studio.me.id && (
                <button
                  onClick={() => void apply(p.email, "client", null).then(() => loadMembers().then((m) => setPeople(m.filter((x) => STAFF_ROLES.includes(x.role)))))}
                  className="rounded-full border border-rose/40 px-3 py-1.5 text-[12px] text-rose"
                >
                  {t("team.remove")}
                </button>
              )}
            </li>
          ))}
        </ul>
        {invites.length > 0 && (
          <>
            <h2 className="mt-5 text-[11px] uppercase tracking-[0.2em] text-muted">{t("team.pending")}</h2>
            <ul className="mt-2 space-y-1.5 text-[13.5px]">
              {invites.map((i) => (
                <li key={i.email} className="flex justify-between gap-3">
                  <span className="truncate">{i.email}</span>
                  <span className="text-muted">{t(`staff.role.${i.role}`)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
