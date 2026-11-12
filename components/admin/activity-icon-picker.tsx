"use client";

// בחירת אייקון לפעילות מתוך חלון העריכה בלוח השבועי:
// אוטומטי (לפי השם), אחד מהאייקונים הקיימים, או אייקון חדש מתמונה שמעלים.
// הבחירה נשמרת לשם הפעילות, כך שהיא חלה על כל הפעילויות בשם הזה בכל המחלקות.

import React, { useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Check, ImagePlus, Loader2, Trash2, Wand2 } from "lucide-react";
import { uploadImage } from "@/lib/screens";
import { updateIconConfig } from "@/lib/icon-config-db";
import { activityKey } from "@/components/display/icons";
import { ACTIVITY_TYPES, activityImage, activityTypeLabel, type IconConfig } from "@/lib/icon-config";
import { inputCls } from "@/components/admin/brand-ui";

export default function ActivityIconPicker({ supabase, title, config, onSaved }: {
  supabase: SupabaseClient;
  title: string;
  config: IconConfig;
  onSaved: (cfg: IconConfig) => void;
}) {
  const name = title.trim();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const manual = config.titles?.[name];
  const autoKey = activityKey(name, { ...config, titles: {} });
  const currentKey = manual ?? autoKey;
  const types = [
    ...ACTIVITY_TYPES.map(t => ({ key: t.key, label: t.label })),
    ...(config.custom ?? []).map(c => ({ key: c.key, label: c.label })),
  ];

  /** שומר על בסיס ההגדרה העדכנית ביותר (אולי מישהו שינה בינתיים בעמוד האייקונים) */
  const update = async (busyKey: string, change: (cfg: IconConfig) => IconConfig) => {
    setBusy(busyKey); setErr(null);
    const { error, saved } = await updateIconConfig(supabase, change);
    setBusy(null);
    if (error) setErr(error);
    if (saved) onSaved(saved);
  };

  const choose = (key: string | null) => update(key ?? "auto", cfg => {
    const titles = { ...(cfg.titles ?? {}) };
    if (key) titles[name] = key; else delete titles[name];
    return { ...cfg, titles };
  });

  const addNew = async (file: File | undefined) => {
    if (!file) return;
    setBusy("upload"); setErr(null);
    const res = await uploadImage(supabase, file, "icons");
    if ("error" in res) { setBusy(null); setErr(res.error); return; }
    const key = "custom-" + Date.now().toString(36);
    const label = newLabel.trim() || name;
    await update("upload", cfg => ({
      ...cfg,
      custom: [...(cfg.custom ?? []), { key, label, image: res.url, words: [] }],
      titles: { ...(cfg.titles ?? {}), [name]: key },
    }));
    setNewLabel("");
  };

  /* ── האייקונים שנוספו: שינוי שם, החלפת תמונה, מחיקה ── */
  const renameCustom = (key: string, label: string) => {
    const v = label.trim();
    if (!v || v === config.custom?.find(c => c.key === key)?.label) return;
    update("rename-" + key, cfg => ({ ...cfg, custom: (cfg.custom ?? []).map(c => (c.key === key ? { ...c, label: v } : c)) }));
  };
  const replaceImage = async (key: string, file: File | undefined) => {
    if (!file) return;
    setBusy("img-" + key); setErr(null);
    const res = await uploadImage(supabase, file, "icons");
    if ("error" in res) { setBusy(null); setErr(res.error); return; }
    await update("img-" + key, cfg => ({ ...cfg, custom: (cfg.custom ?? []).map(c => (c.key === key ? { ...c, image: res.url } : c)) }));
  };
  const removeCustom = (key: string) => {
    setConfirmDel(null);
    update("del-" + key, cfg => ({
      ...cfg,
      custom: (cfg.custom ?? []).filter(c => c.key !== key),
      // פעילויות שהאייקון הזה נבחר להן חוזרות לבחירה האוטומטית
      titles: Object.fromEntries(Object.entries(cfg.titles ?? {}).filter(([, v]) => v !== key)),
    }));
  };
  const customs = config.custom ?? [];

  if (!name) return null;

  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl border border-[#3F2F2D]/15 bg-white p-2 text-start hover:bg-[#F6F2EE]">
        <img src={activityImage(currentKey, config)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-[#3F2F2D]/10" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{activityTypeLabel(currentKey, config)}</span>
          <span className="block text-xs text-[#3F2F2D]/55">{manual ? "נבחר ידנית" : "נבחר אוטומטית לפי השם"} · {open ? "סגירה" : "החלפה"}</span>
        </span>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-[#5A826F]" />}
      </button>

      {open && (
        <div className="mt-2 rounded-xl bg-[#F6F2EE] p-3">
          <button type="button" onClick={() => choose(null)} disabled={!!busy}
            className={"mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold " + (!manual ? "bg-white shadow-sm" : "hover:bg-white/70")}>
            <Wand2 className="h-4 w-4 text-[#5A826F]" /> אוטומטי לפי השם ({activityTypeLabel(autoKey, config)})
            {!manual && <Check className="ms-auto h-4 w-4 text-[#5A826F]" />}
          </button>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="listbox" aria-label="אייקונים">
            {types.map(t => {
              const on = manual === t.key;
              return (
                <button key={t.key} type="button" role="option" aria-selected={on} disabled={!!busy} onClick={() => choose(t.key)} title={t.label}
                  className={"flex flex-col items-center gap-1 rounded-lg p-1.5 text-[11px] font-semibold leading-tight " + (on ? "bg-white ring-2 ring-[#5A826F]" : "hover:bg-white")}>
                  <img src={activityImage(t.key, config)} alt="" className="h-12 w-12 rounded-md object-cover" />
                  <span className="line-clamp-2 text-center">{t.label}</span>
                </button>
              );
            })}
          </div>

          {customs.length > 0 && (
            <div className="mt-3 border-t border-[#3F2F2D]/10 pt-3">
              <div className="mb-1 text-sm font-semibold text-[#5A826F]">האייקונים שהוספתם</div>
              <ul className="space-y-1.5">
                {customs.map(c => (
                  <li key={c.key} className="flex items-center gap-2">
                    <label className="relative shrink-0 cursor-pointer" title="החלפת התמונה">
                      <img src={c.image} alt="" className="h-10 w-10 rounded-md object-cover ring-1 ring-[#3F2F2D]/10" />
                      {busy === "img-" + c.key && <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-white" />}
                      <input type="file" accept="image/*" className="sr-only" aria-label={`החלפת התמונה של ${c.label}`}
                        onChange={e => { replaceImage(c.key, e.target.files?.[0]); e.currentTarget.value = ""; }} />
                    </label>
                    <input className={inputCls + " h-9 min-w-0 flex-1 text-sm"} defaultValue={c.label} aria-label="שם האייקון"
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
            <div className="mb-1 text-sm font-semibold text-[#5A826F]">אייקון חדש מתמונה</div>
            <div className="flex items-center gap-2">
              <input className={inputCls + " text-sm"} value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={`שם האייקון (${name})`} aria-label="שם האייקון החדש" />
              <label className={"inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#5A826F] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#5A826F]/90 " + (busy ? "pointer-events-none opacity-60" : "")}>
                {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} העלאת תמונה
                <input type="file" accept="image/*" className="sr-only" aria-label="תמונה לאייקון חדש" onChange={e => { addNew(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              </label>
            </div>
          </div>

          <p className="mt-2 text-xs text-[#3F2F2D]/55">
            הבחירה חלה על כל הפעילויות בשם &quot;{name}&quot;, בכל המחלקות, ונשמרת מיד.{" "}
            <Link href="/admin/icons" className="font-semibold text-[#5A826F] hover:underline">כל האייקונים</Link>
          </p>
          {err && <p className="mt-1 text-xs font-semibold text-[#B56262]" role="alert">{err}</p>}
        </div>
      )}
    </div>
  );
}
