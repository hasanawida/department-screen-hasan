"use client";

// בחירת תמונה למנה מתוך הטופס של התפריט — כמו בחירת אייקון לפעילות בלוח:
// אוטומטי (לפי המילים בשורה), בלי תמונה, אחת מהמנות הקיימות, או תמונה חדשה שמעלים.
// הבחירה נשמרת לשורה הזו בתפריט (בכל הימים ובכל המחלקות), ונשמרת מיד.

import React, { useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Ban, Check, ImagePlus, Loader2, Search, Trash2, Wand2 } from "lucide-react";
import { uploadImage } from "@/lib/screens";
import { loadIconConfig, saveIconConfig } from "@/lib/icon-config-db";
import { DISH_LIST, DISH_NONE, autoDishKey, dishImage, dishLabel } from "@/lib/dishes";
import type { IconConfig } from "@/lib/icon-config";
import { inputCls } from "@/components/admin/brand-ui";

export default function DishIconPicker({ supabase, line, config, onSaved, onClose }: {
  supabase: SupabaseClient;
  line: string;
  config: IconConfig;
  onSaved: (cfg: IconConfig) => void;
  onClose?: () => void;
}) {
  const name = line.trim();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [q, setQ] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const manual = config.dishes?.lines?.[name];
  const autoKey = autoDishKey(name, config);
  const customs = config.dishes?.custom ?? [];
  const all = [
    ...DISH_LIST.map(d => ({ key: d.key, label: d.label })),
    ...customs.map(c => ({ key: c.key, label: c.label })),
  ];
  const shown = all.filter(d => !q.trim() || d.label.includes(q.trim()));

  /** שומר על בסיס ההגדרה העדכנית ביותר (אולי מישהו שינה בינתיים בעמוד האייקונים) */
  const update = async (busyKey: string, change: (cfg: IconConfig) => IconConfig) => {
    setBusy(busyKey); setErr(null);
    const latest = await loadIconConfig(supabase);
    const { failed, saved } = await saveIconConfig(supabase, change(latest));
    setBusy(null);
    if (failed) setErr("לא נשמר בכל המחלקות. נסו שוב.");
    onSaved(saved);
  };

  const setLine = (key: string | null) => update(key ?? "auto", cfg => {
    const lines = { ...(cfg.dishes?.lines ?? {}) };
    if (key) lines[name] = key; else delete lines[name];
    return { ...cfg, dishes: { ...cfg.dishes, lines } };
  });

  const addNew = async (file: File | undefined) => {
    if (!file) return;
    setBusy("upload"); setErr(null);
    const res = await uploadImage(supabase, file, "icons");
    if ("error" in res) { setBusy(null); setErr(res.error); return; }
    const key = "dish-" + Date.now().toString(36);
    const label = newLabel.trim() || name;
    await update("upload", cfg => ({
      ...cfg,
      dishes: {
        ...cfg.dishes,
        custom: [...(cfg.dishes?.custom ?? []), { key, label, image: res.url, words: [] }],
        lines: { ...(cfg.dishes?.lines ?? {}), [name]: key },
      },
    }));
    setNewLabel("");
  };

  /* ── מנות שנוספו: שינוי שם, החלפת תמונה, מחיקה ── */
  const renameCustom = (key: string, label: string) => {
    const v = label.trim();
    if (!v || v === customs.find(c => c.key === key)?.label) return;
    update("rename-" + key, cfg => ({ ...cfg, dishes: { ...cfg.dishes, custom: (cfg.dishes?.custom ?? []).map(c => (c.key === key ? { ...c, label: v } : c)) } }));
  };
  const replaceImage = async (key: string, file: File | undefined) => {
    if (!file) return;
    setBusy("img-" + key); setErr(null);
    const res = await uploadImage(supabase, file, "icons");
    if ("error" in res) { setBusy(null); setErr(res.error); return; }
    await update("img-" + key, cfg => ({ ...cfg, dishes: { ...cfg.dishes, custom: (cfg.dishes?.custom ?? []).map(c => (c.key === key ? { ...c, image: res.url } : c)) } }));
  };
  const removeCustom = (key: string) => {
    setConfirmDel(null);
    update("del-" + key, cfg => ({
      ...cfg,
      dishes: {
        ...cfg.dishes,
        custom: (cfg.dishes?.custom ?? []).filter(c => c.key !== key),
        // שורות שהמנה הזו נבחרה להן חוזרות לזיהוי האוטומטי
        lines: Object.fromEntries(Object.entries(cfg.dishes?.lines ?? {}).filter(([, v]) => v !== key)),
      },
    }));
  };

  if (!name) return null;

  return (
    <div className="mt-2 rounded-xl bg-[#F6F2EE] p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 text-sm">
          <span className="text-[#3F2F2D]/60">תמונה ל: </span>
          <span className="font-bold">{name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin text-[#5A826F]" />}
          {onClose && <button type="button" onClick={onClose} className="text-xs font-semibold text-[#5A826F] hover:underline">סגירה</button>}
        </div>
      </div>

      <div className="mb-2 grid gap-1.5 sm:grid-cols-2">
        <button type="button" onClick={() => setLine(null)} disabled={!!busy}
          className={"flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold " + (!manual ? "bg-white shadow-sm" : "hover:bg-white/70")}>
          <Wand2 className="h-4 w-4 shrink-0 text-[#5A826F]" />
          <span className="truncate">אוטומטי ({autoKey ? dishLabel(autoKey, config) : "אין תמונה מתאימה"})</span>
          {!manual && <Check className="ms-auto h-4 w-4 shrink-0 text-[#5A826F]" />}
        </button>
        <button type="button" onClick={() => setLine(DISH_NONE)} disabled={!!busy}
          className={"flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold " + (manual === DISH_NONE ? "bg-white shadow-sm" : "hover:bg-white/70")}>
          <Ban className="h-4 w-4 shrink-0 text-[#B56262]" /> בלי תמונה
          {manual === DISH_NONE && <Check className="ms-auto h-4 w-4 shrink-0 text-[#5A826F]" />}
        </button>
      </div>

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F2F2D]/40" />
        <input className={inputCls + " h-9 pr-9 text-sm"} value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש מנה" aria-label="חיפוש מנה" />
      </div>
      <div className="grid max-h-60 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6" role="listbox" aria-label="תמונות המנות">
        {shown.map(d => {
          const on = manual === d.key;
          return (
            <button key={d.key} type="button" role="option" aria-selected={on} disabled={!!busy} onClick={() => setLine(d.key)} title={d.label}
              className={"flex flex-col items-center gap-1 rounded-lg p-1 text-[11px] font-semibold leading-tight " + (on ? "bg-white ring-2 ring-[#5A826F]" : "hover:bg-white")}>
              <img src={dishImage(d.key, config)} alt="" className="h-11 w-11 rounded-full object-cover" />
              <span className="line-clamp-2 text-center">{d.label}</span>
            </button>
          );
        })}
      </div>

      {customs.length > 0 && (
        <div className="mt-3 border-t border-[#3F2F2D]/10 pt-3">
          <div className="mb-1 text-sm font-semibold text-[#5A826F]">המנות שהוספתם</div>
          <ul className="space-y-1.5">
            {customs.map(c => (
              <li key={c.key} className="flex items-center gap-2">
                <label className="relative shrink-0 cursor-pointer" title="החלפת התמונה">
                  <img src={c.image} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-[#3F2F2D]/10" />
                  {busy === "img-" + c.key && <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-white" />}
                  <input type="file" accept="image/*" className="sr-only" aria-label={`החלפת התמונה של ${c.label}`}
                    onChange={e => { replaceImage(c.key, e.target.files?.[0]); e.currentTarget.value = ""; }} />
                </label>
                <input className={inputCls + " h-9 min-w-0 flex-1 text-sm"} defaultValue={c.label} aria-label="שם המנה"
                  onBlur={e => renameCustom(c.key, e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                <label className="shrink-0 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold text-[#5A826F] hover:bg-white">
                  תמונה אחרת
                  <input type="file" accept="image/*" className="sr-only" aria-label={`תמונה אחרת ל${c.label}`}
                    onChange={e => { replaceImage(c.key, e.target.files?.[0]); e.currentTarget.value = ""; }} />
                </label>
                {confirmDel === c.key ? (
                  <button type="button" onClick={() => removeCustom(c.key)} disabled={!!busy}
                    className="shrink-0 rounded-lg bg-[#B56262] px-2 py-1.5 text-xs font-semibold text-white">למחוק?</button>
                ) : (
                  <button type="button" onClick={() => setConfirmDel(c.key)} disabled={!!busy} aria-label={`מחיקת ${c.label}`}
                    className="shrink-0 rounded-lg p-1.5 text-[#B56262] hover:bg-white"><Trash2 className="h-4 w-4" /></button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 border-t border-[#3F2F2D]/10 pt-3">
        <div className="mb-1 text-sm font-semibold text-[#5A826F]">תמונה חדשה למנה</div>
        <div className="flex items-center gap-2">
          <input className={inputCls + " text-sm"} value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={`שם המנה (${name})`} aria-label="שם המנה החדשה" />
          <label className={"inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#5A826F] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#5A826F]/90 " + (busy ? "pointer-events-none opacity-60" : "")}>
            {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} העלאת תמונה
            <input type="file" accept="image/*" className="sr-only" aria-label="תמונה למנה חדשה" onChange={e => { addNew(e.target.files?.[0]); e.currentTarget.value = ""; }} />
          </label>
        </div>
      </div>

      <p className="mt-2 text-xs text-[#3F2F2D]/55">
        הבחירה חלה על השורה &quot;{name}&quot; בכל הימים ובכל המחלקות, ונשמרת מיד.{" "}
        <Link href="/admin/icons" className="font-semibold text-[#5A826F] hover:underline">כל התמונות</Link>
      </p>
      {err && <p className="mt-1 text-xs font-semibold text-[#B56262]" role="alert">{err}</p>}
    </div>
  );
}
