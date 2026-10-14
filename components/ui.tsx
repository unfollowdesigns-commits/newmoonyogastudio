"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Instructor } from "@/lib/types";

export function Logo({ size = 28 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-512.png" width={size} height={size} alt="New Moon Yoga Studio" className="shrink-0 rounded-full shadow-soft" />;
}

export function Wordmark({ sub }: { sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={42} />
      <div className="leading-none">
        <div className="font-display text-[22px] font-medium tracking-wide">New Moon</div>
        <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.32em] text-muted">{sub ?? "Yoga Studio"}</div>
      </div>
    </div>
  );
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

export function Avatar({ person, name, size = 36, tone }: { person?: Instructor; name?: string; size?: number; tone?: string }) {
  const label = person?.name ?? name ?? "";
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-medium text-ink/80"
      style={{ width: size, height: size, background: person?.tone ?? tone ?? "#e7dfd3", fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(label)}
    </span>
  );
}

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal aria-label={label}>
      <button aria-label="Close" className="absolute inset-0 animate-fade bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative max-h-[92dvh] w-full max-w-[460px] animate-sheet overflow-y-auto rounded-t-[28px] bg-linen shadow-lift no-scrollbar">
        <div className="sticky top-0 z-10 flex justify-center bg-linen/90 pt-3 pb-2 backdrop-blur">
          <span className="h-1 w-10 rounded-full bg-stone-deep" />
        </div>
        {children}
      </div>
    </div>
  );
}

export type ToastMsg = { text: string; tone?: "ok" | "warn"; key: number } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastMsg>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  const show = (text: string, tone: "ok" | "warn" = "ok") => text && setToast({ text, tone, key: Date.now() });
  return { toast, show };
}

export function Toast({ toast }: { toast: ToastMsg }) {
  if (!toast) return null;
  return (
    <div
      key={toast.key}
      role="status"
      className={`fixed top-[max(env(safe-area-inset-top),16px)] left-1/2 z-[60] w-[min(92vw,400px)] animate-toast rounded-2xl px-4 py-3 text-center text-sm shadow-lift ${
        toast.tone === "warn" ? "bg-rose text-linen" : "bg-plum text-linen"
      }`}
    >
      {toast.text}
    </div>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-4 py-2 text-[13px] transition-all duration-300 ${
        active ? "border-plum bg-plum text-linen" : "border-stone-deep/70 bg-linen text-ink/75 hover:border-mauve"
      }`}
    >
      {children}
    </button>
  );
}

const paths: Record<string, ReactNode> = {
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  user: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" /></>,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  pin: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.2" /></>,
  chevronL: <path d="M15 5l-7 7 7 7" />,
  chevronR: <path d="M9 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  sparkle: <path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z" />,
  users: <><circle cx="9" cy="9" r="3.3" /><path d="M3 19c.9-3 3.2-4.5 6-4.5s5.1 1.5 6 4.5M15.5 5.8a3.2 3.2 0 0 1 0 6.3M17.5 14.8c1.7.6 2.9 2 3.5 4.2" /></>,
  box: <><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></>,
  swap: <path d="M7 4L4 7l3 3M4 7h12M17 20l3-3-3-3M20 17H8" />,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function Icon({ name, size = 20, className = "" }: { name: keyof typeof paths | string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-pulse opacity-70">
        <Logo size={44} />
      </div>
    </div>
  );
}

export function CapacityBar({ used, total, waitlist = 0 }: { used: number; total: number; waitlist?: number }) {
  const pct = Math.min(100, (used / total) * 100);
  const full = used >= total;
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-stone">
      <div
        className={`h-full rounded-full transition-all duration-700 ${full ? (waitlist ? "bg-rose" : "bg-clay") : "bg-mauve"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
