"use client";

// נושא השבוע בעורך הלוח: מהתוכנית השנתית, או שינוי ידני למחלקה ולשבוע הזה

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ImagePlus, Loader2, Undo2, X } from "lucide-react";
import { inputCls } from "@/components/admin/brand-ui";
import { resolveTopic, type ResolvedTopic, type TopicData } from "@/lib/topics";
import { refreshDepartmentScreens, uploadImage } from "@/lib/screens";
import { shortDate } from "@/lib/week";

type Form = { title: string; description: string; image_url: string | null };

export default function TopicCard({ supabase, deptId, weekStart, onPreview }: {
  supabase: SupabaseClient;
  deptId: string;
  weekStart: string;
  /** מה להציג בתצוגה המקדימה (כולל שינוי שעוד לא נשמר) */
  onPreview: (t: TopicData | null) => void;
}) {
  const [res, setRes] = useState<ResolvedTopic | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    const r = await resolveTopic(supabase, deptId, weekStart);
    if (id !== reqId.current) return; // הגיעה תשובה ישנה (החליפו שבוע או מחלקה בינתיים)
    setRes(r);
    setForm(null);
    onPreview(r.topic);
  }, [supabase, deptId, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setMsg(""); setRes(null); setForm(null); load(); }, [load]);

  const edit = (f: Form | null) => {
    setForm(f);
    onPreview(f ? { title: f.title, description: f.description, image_url: f.image_url } : res?.topic ?? null);
  };

  async function save() {
    if (!form) return;
    const title = form.title.trim();
    if (!title) { setMsg("צריך לכתוב נושא"); return; }
    setBusy(true);
    const row = { title, description: form.description.trim() || null, image_url: form.image_url, is_active: true };
    const out = res?.override
      ? await supabase.from("weekly_topics").update(row).eq("id", res.override.id)
      : await supabase.from("weekly_topics").insert({ ...row, department_id: deptId, week_start: weekStart });
    setBusy(false);
    if (out.error) { setMsg("לא נשמר: " + out.error.message); return; }
    setMsg("הנושא נשמר");
    refreshDepartmentScreens(supabase, deptId);
    load();
  }

  async function backToPlan() {
    if (!res?.override) return;
    setBusy(true);
    const out = await supabase.from("weekly_topics").delete().eq("id", res.override.id);
    setBusy(false);
    if (out.error) { setMsg("לא נמחק: " + out.error.message); return; }
    setMsg(res.plan ? "חזרה לתוכנית השנתית" : "הנושא הוסר");
    refreshDepartmentScreens(supabase, deptId);
    load();
  }

  const t = res?.topic ?? null;
  const chip =
    res?.source === "override" ? "שינוי למחלקה הזו, לשבוע הזה"
    : res?.source === "plan" ? "מהתוכנית השנתית"
    : res?.source === "earlier" ? `נשאר מהשבוע של ${shortDate(res.earlierFrom!)}`
    : null;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">נושא השבוע</h2>
        {chip && !form && <span className="rounded-full bg-[#E3ECE7] px-2.5 py-1 text-xs font-semibold text-[#375044]">{chip}</span>}
      </div>

      {!res ? (
        <p className="text-sm text-[#3F2F2D]/60">טוען…</p>
      ) : form ? (
        <div className="space-y-2">
          <input autoFocus value={form.title} onChange={e => edit({ ...form, title: e.target.value })} className={inputCls} placeholder="למשל: סתיו בגינה" aria-label="נושא" />
          <input value={form.description} onChange={e => edit({ ...form, description: e.target.value })} className={inputCls} placeholder="משפט קצר (לא חובה)" aria-label="תיאור" />
          <ImagePicker supabase={supabase} url={form.image_url} onChange={url => edit({ ...form, image_url: url })} onError={setMsg} />
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#5A826F] py-2 text-sm font-semibold text-white hover:bg-[#5A826F]/90 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} שמירה לשבוע הזה
            </button>
            <button onClick={() => edit(null)} className="rounded-xl border border-[#3F2F2D]/15 px-3 py-2 text-sm font-semibold hover:bg-[#F6F2EE]">ביטול</button>
          </div>
          <p className="text-xs text-[#3F2F2D]/55">השינוי חל רק על המחלקה הזו ורק על השבוע הזה. בשבוע הבא חוזרים לתוכנית השנתית.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {t ? (
            <div className="flex items-center gap-3 rounded-xl bg-[#F6F2EE] p-3">
              {t.image_url
                ? <img src={t.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white text-[#3F2F2D]/30"><ImagePlus className="h-5 w-5" /></div>}
              <div className="min-w-0">
                <div className="truncate font-bold">{t.title}</div>
                {t.description && <div className="truncate text-sm text-[#3F2F2D]/65">{t.description}</div>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#3F2F2D]/65">{res.hasPlan ? "בתוכנית השנתית אין נושא לשבוע הזה." : "עוד אין נושא לשבוע הזה."}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {res.override ? (
              <>
                <button onClick={() => edit({ title: res.override!.title, description: res.override!.description ?? "", image_url: res.override!.image_url })}
                  className="rounded-xl bg-[#3F2F2D] px-3 py-2 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90">עריכה</button>
                <button onClick={backToPlan} disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#3F2F2D]/15 px-3 py-2 text-sm font-semibold hover:bg-[#F6F2EE] disabled:opacity-60">
                  <Undo2 className="h-4 w-4" /> {res.plan ? "חזרה לתוכנית השנתית" : "הסרת הנושא"}
                </button>
              </>
            ) : (
              <button onClick={() => edit({ title: t?.title ?? "", description: t?.description ?? "", image_url: t?.image_url ?? null })}
                className="rounded-xl bg-[#3F2F2D] px-3 py-2 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90">
                {t ? "שינוי לשבוע הזה במחלקה" : "הוספת נושא לשבוע הזה"}
              </button>
            )}
          </div>
          <Link href="/admin/topics" className="block text-sm font-semibold text-[#5A826F] hover:underline">
            {res.hasPlan ? "עריכת התוכנית השנתית" : "בניית תוכנית נושאים שנתית — הנושא יתחלף לבד כל שבוע"}
          </Link>
        </div>
      )}
      {msg && <p role="status" className="mt-2 text-sm font-semibold text-[#5A826F]">{msg}</p>}
    </section>
  );
}

/** בחירת תמונה לנושא: תצוגה קטנה, החלפה והסרה */
export function ImagePicker({ supabase, url, onChange, onError, compact }: {
  supabase: SupabaseClient;
  url: string | null;
  onChange: (url: string | null) => void;
  onError?: (msg: string) => void;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const r = await uploadImage(supabase, file, "topics");
    setUploading(false);
    if ("error" in r) onError?.(r.error);
    else onChange(r.url);
  }

  return (
    <div className={"flex items-center gap-2 " + (compact ? "" : "rounded-xl border border-dashed border-[#3F2F2D]/20 p-2")}>
      {url ? (
        <div className="relative shrink-0">
          <img src={url} alt="" className={(compact ? "h-10 w-10" : "h-14 w-14") + " rounded-lg object-cover"} />
          <button type="button" aria-label="הסרת התמונה" onClick={() => onChange(null)}
            className="absolute -left-1.5 -top-1.5 rounded-full bg-[#3F2F2D] p-0.5 text-white hover:bg-[#B56262]">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}
      <button type="button" onClick={() => input.current?.click()} disabled={uploading}
        className={"inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#5A826F] hover:bg-[#E3ECE7] disabled:opacity-60"}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {url ? "החלפת תמונה" : compact ? "תמונה" : "הוספת תמונה לנושא"}
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
