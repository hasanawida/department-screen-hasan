"use client";

// רכיבים קטנים לממשק הניהול — בזהות אשכולות

import React, { useEffect, useState } from "react";
import { EshkolotLogo } from "@/components/orientation/eshkolot-logo";

export const inputCls =
  "h-10 w-full rounded-xl border border-[#3F2F2D]/15 bg-white px-3 text-[15px] text-[#3F2F2D] outline-none placeholder:text-[#3F2F2D]/40 focus:border-[#5A826F] focus:ring-2 focus:ring-[#5A826F]/25";

export const textareaCls =
  "w-full rounded-xl border border-[#3F2F2D]/15 bg-white px-3 py-2 text-[15px] leading-relaxed text-[#3F2F2D] outline-none placeholder:text-[#3F2F2D]/40 focus:border-[#5A826F] focus:ring-2 focus:ring-[#5A826F]/25";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#3F2F2D] px-4 py-2.5 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90 disabled:opacity-60";

export const btnSage =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#5A826F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5A826F]/90 disabled:opacity-60";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#3F2F2D]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#3F2F2D] hover:bg-[#E3ECE7] disabled:opacity-60";

export function PageShell({ title, subtitle, actions, children }: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F2EE] text-[#3F2F2D]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-[15px] text-[#3F2F2D]/65">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Card({ title, children, className, aside }: { title?: React.ReactNode; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <section className={"rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(63,47,45,0.06)] " + (className ?? "")}>
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={label} className={"block " + (className ?? "")}>
      <span className="mb-1 block text-sm font-semibold text-[#5A826F]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[#3F2F2D]/55">{hint}</span>}
    </div>
  );
}

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between py-2.5 text-[15px]">
      <span>{label}</span>
      <span className={"relative h-6 w-11 shrink-0 rounded-full transition-colors " + (on ? "bg-[#5A826F]" : "bg-[#3F2F2D]/15")}>
        <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " + (on ? "left-0.5" : "left-[22px]")} />
      </span>
    </button>
  );
}

/** קישור להעתקה (לקישורים אישיים לצוות ולמסכים) */
export function CopyLink({ url, label }: { url: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={url} dir="ltr" className={inputCls + " text-left text-[14px]"} onFocus={e => e.currentTarget.select()} aria-label={label ?? "קישור"} />
      <button type="button" className={btnGhost + " shrink-0"}
        onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* */ } }}>
        {copied ? "הועתק" : "העתקה"}
      </button>
    </div>
  );
}

/** גודל יחידת המסך בתוך מסגרת תצוגה מקדימה 16:9 */
export function usePreviewCu() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [cu, setCu] = useState(6);
  useEffect(() => {
    if (!el) return;
    setCu(el.getBoundingClientRect().width / 177.78);
    const ro = new ResizeObserver(([entry]) => setCu(entry.contentRect.width / 177.78));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [cu, setEl] as const;
}

/** מסגרת 16:9 לתצוגה מקדימה של מסך */
export function ScreenFrame({ frameRef, children, className }: { frameRef: (el: HTMLDivElement | null) => void; children: React.ReactNode; className?: string }) {
  return (
    <div ref={frameRef} className={"relative w-full overflow-hidden rounded-2xl shadow-[0_10px_40px_rgba(63,47,45,0.15)] ring-1 ring-[#3F2F2D]/10 " + (className ?? "")} style={{ aspectRatio: "16 / 9" }}>
      {children}
    </div>
  );
}

/** מסגרת לעמודי הצוות שנפתחים בקישור אישי (בלי תפריט הניהול) */
export function StaffShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F2EE] text-[#3F2F2D]">
      <header className="border-b border-[#3F2F2D]/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-[#3F2F2D]/65">{subtitle}</p>}
          </div>
          <EshkolotLogo className="h-10 w-auto shrink-0" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
