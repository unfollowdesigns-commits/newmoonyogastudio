"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { PHONE_PREFIX } from "@/lib/seed";
import { auth } from "@/lib/store";
import { GOOGLE_AUTH } from "@/lib/supabase";
import type { StudioState } from "@/lib/types";
import { Logo, Sheet } from "./ui";

// Sign up / sign in with a 6-digit email code (or Google), then collect
// name + WhatsApp + consent once. `onDone` runs when the account is complete.
export function AuthSheet({
  studio,
  open,
  onClose,
  onDone,
  editProfile = false,
}: {
  studio: StudioState;
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
  editProfile?: boolean;
}) {
  const { t } = useT();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const wasReady = useRef(studio.auth === "ready");

  // the moment the account becomes complete, finish what the person was doing
  useEffect(() => {
    if (!open) {
      wasReady.current = studio.auth === "ready";
      return;
    }
    if (studio.auth === "ready" && !wasReady.current && !editProfile) {
      wasReady.current = true;
      onClose();
      doneRef.current?.();
    }
  }, [studio.auth, open, editProfile, onClose]);

  const showProfile = studio.auth === "incomplete" || (editProfile && studio.auth === "ready");

  async function send() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t("auth.badEmail"));
    setBusy(true);
    setError("");
    const r = await auth.sendCode(email);
    setBusy(false);
    if (!r.ok) return setError(t(r.message));
    setInfo(t(r.message, r.vars));
    setStep("code");
  }

  async function verify() {
    setBusy(true);
    setError("");
    const r = await auth.verifyCode(email, code);
    setBusy(false);
    if (!r.ok) setError(t(r.message));
  }

  return (
    <Sheet open={open} onClose={onClose} label={t("auth.title")}>
      <div className="px-6 pb-8">
        <div className="mb-5 flex items-center gap-3">
          <Logo size={44} />
          <div>
            <h2 className="font-display text-[26px] leading-tight">
              {showProfile ? (editProfile && studio.auth === "ready" ? t("auth.editTitle") : t("auth.profileTitle")) : t("auth.title")}
            </h2>
            <p className="text-[13px] text-muted">{showProfile ? t("auth.profileSub") : t("auth.sub")}</p>
          </div>
        </div>

        {showProfile ? (
          <ProfileForm studio={studio} onSaved={editProfile ? onClose : undefined} />
        ) : step === "email" ? (
          <div className="space-y-3">
            <Field label={t("auth.email")}>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="prenom@exemple.com"
                className="input"
              />
            </Field>
            <button disabled={busy} onClick={send} className="w-full rounded-full bg-plum py-3.5 text-[15px] text-linen disabled:opacity-60">
              {busy ? "…" : t("auth.sendCode")}
            </button>
            {GOOGLE_AUTH && (
              <>
                <div className="flex items-center gap-3 py-1 text-[12px] text-muted">
                  <span className="h-px flex-1 bg-stone" /> {t("auth.or")} <span className="h-px flex-1 bg-stone" />
                </div>
                <button onClick={() => auth.google()} className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-deep bg-linen py-3.5 text-[15px]">
                  <GoogleMark /> {t("auth.google")}
                </button>
              </>
            )}
            <p className="pt-1 text-center text-[12px] text-muted">{t("auth.noPassword")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-xl bg-blush px-3 py-2.5 text-[13px] text-plum">{info}</p>
            <Field label={t("auth.code")}>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                placeholder="123456"
                className="input text-center text-[22px] tracking-[0.4em]"
              />
            </Field>
            <button disabled={busy || code.length < 6} onClick={verify} className="w-full rounded-full bg-plum py-3.5 text-[15px] text-linen disabled:opacity-60">
              {busy ? "…" : t("auth.verify")}
            </button>
            <div className="flex justify-between text-[13px]">
              <button onClick={() => (setStep("email"), setCode(""), setError(""))} className="text-muted underline underline-offset-4">
                {t("auth.changeEmail")}
              </button>
              <button onClick={send} disabled={busy} className="text-plum underline underline-offset-4">
                {t("auth.resend")}
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-3 rounded-xl bg-rose-soft px-3 py-2.5 text-[13px] text-rose">{error}</p>}
      </div>
    </Sheet>
  );
}

function ProfileForm({ studio, onSaved }: { studio: StudioState; onSaved?: () => void }) {
  const { t, lang } = useT();
  const me = studio.me;
  const [firstName, setFirst] = useState(me.firstName ?? "");
  const [lastName, setLast] = useState(me.lastName ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [consent, setConsent] = useState(studio.auth === "ready");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!firstName.trim() || !lastName.trim()) return setError(t("auth.needName"));
    if (phone.replace(/\D/g, "").length < 8) return setError(t("auth.needPhone"));
    if (!consent) return setError(t("auth.needConsent"));
    setBusy(true);
    setError("");
    const r = await auth.saveProfile({ firstName, lastName, phone, consent, lang });
    setBusy(false);
    if (!r.ok) return setError(t(r.message));
    onSaved?.();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("auth.firstName")}>
          <input autoComplete="given-name" value={firstName} onChange={(e) => setFirst(e.target.value)} className="input" />
        </Field>
        <Field label={t("auth.lastName")}>
          <input autoComplete="family-name" value={lastName} onChange={(e) => setLast(e.target.value)} className="input" />
        </Field>
      </div>
      <Field label={t("auth.phone")}>
        <div className="flex items-center rounded-xl border border-stone bg-linen focus-within:border-mauve">
          <span className="pl-3 text-[14px] text-muted">+{PHONE_PREFIX}</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="56 775 096"
            className="w-full bg-transparent px-2 py-3 text-[15px] outline-none"
          />
        </div>
      </Field>
      <label className="flex items-start gap-3 rounded-xl bg-sand/70 p-3 text-[12.5px] leading-relaxed text-ink/80">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-plum" />
        <span>{t("auth.consent")}</span>
      </label>
      <button disabled={busy} onClick={save} className="w-full rounded-full bg-plum py-3.5 text-[15px] text-linen disabled:opacity-60">
        {busy ? "…" : t("auth.save")}
      </button>
      {error && <p className="rounded-xl bg-rose-soft px-3 py-2.5 text-[13px] text-rose">{error}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-muted">{label}</span>
      {children}
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
