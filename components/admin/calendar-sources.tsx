"use client";

// ניהול יומני Outlook שמהם נכנסות הפעילויות ללוח השבועי

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Field, PageShell, btnGhost, btnPrimary, btnSage, inputCls } from "@/components/admin/brand-ui";

type Dept = { id: string; name: string; code: string | null };
type Source = {
  id: string;
  label: string;
  ics_url: string;
  department_id: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  last_status: string | null;
  last_count: number | null;
};

const EMPTY = { id: "", label: "", ics_url: "", department_id: "" };

function timeAgo(iso: string | null) {
  if (!iso) return "עוד לא סונכרן";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "סונכרן עכשיו";
  if (min < 60) return `סונכרן לפני ${min} דק׳`;
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? "סונכרן לפני שעה" : `סונכרן לפני ${h} שעות`;
  return "סונכרן " + new Date(iso).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric" });
}

function statusOf(s: Source): { ok: boolean | null; text: string } {
  if (!s.last_status) return { ok: null, text: "ממתין לסנכרון הראשון" };
  if (s.last_status.startsWith("ok: ")) return { ok: true, text: s.last_status.slice(4) };
  if (s.last_status.startsWith("error: ")) return { ok: false, text: s.last_status.slice(7) };
  return { ok: null, text: s.last_status };
}

export function CalendarSources() {
  const supabase = useMemo(() => createClient(), []);
  const [sources, setSources] = useState<Source[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [src, dep] = await Promise.all([
      supabase.from("calendar_sources").select("*").order("created_at"),
      supabase.from("departments").select("id, name, code").order("name"),
    ]);
    if (src.error) setMissingTable(/calendar_sources|relation|schema cache/i.test(src.error.message));
    else { setMissingTable(false); setSources((src.data ?? []) as Source[]); }
    setDepts((dep.data ?? []) as Dept[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const deptName = (id: string | null) => (id ? depts.find(d => d.id === id)?.name ?? "מחלקה שנמחקה" : "יומן משותף — לפי שם המחלקה באירוע");

  async function sync(sourceId?: string) {
    setSyncing(sourceId ?? "all");
    setNotice(null);
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceId ? { sourceId } : {}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "הסנכרון נכשל");
      const results = (body.results ?? []) as { ok: boolean; label: string; message: string }[];
      if (!results.length) setNotice({ ok: true, text: "אין יומנים פעילים לסנכרון" });
      else if (results.every(r => r.ok)) setNotice({ ok: true, text: results.map(r => `${r.label}: ${r.message}`).join(". ") });
      else setNotice({ ok: false, text: results.filter(r => !r.ok).map(r => `${r.label}: ${r.message}`).join(". ") });
    } catch (e: any) {
      setNotice({ ok: false, text: e?.message || "הסנכרון נכשל" });
    }
    setSyncing(null);
    load();
  }

  async function save() {
    const url = form.ics_url.trim();
    if (!form.label.trim() || !url) { setNotice({ ok: false, text: "צריך שם ליומן וקישור ICS" }); return; }
    if (!/^(https?|webcal):\/\//i.test(url)) { setNotice({ ok: false, text: "הקישור צריך להתחיל ב-https://" }); return; }
    setSaving(true);
    const row = { label: form.label.trim(), ics_url: url, department_id: form.department_id || null };
    const res = form.id
      ? await supabase.from("calendar_sources").update(row).eq("id", form.id).select("id").single()
      : await supabase.from("calendar_sources").insert({ ...row, is_active: true }).select("id").single();
    setSaving(false);
    if (res.error) { setNotice({ ok: false, text: "השמירה נכשלה: " + res.error.message }); return; }
    setForm(EMPTY);
    await load();
    if (res.data?.id) sync(res.data.id);
  }

  async function toggleActive(s: Source) {
    await supabase.from("calendar_sources").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  }

  async function remove(s: Source) {
    // הפעילויות שכבר נכנסו מהיומן הזה נמחקות איתו (חוץ מאלה שנערכו במערכת)
    await supabase.from("activities").delete().like("external_uid", "cal:" + s.id.slice(0, 8) + ":%").eq("source", "calendar");
    await supabase.from("calendar_sources").delete().eq("id", s.id);
    if (form.id === s.id) setForm(EMPTY);
    load();
  }

  return (
    <PageShell
      title="ייבוא מהיומן"
      subtitle="מה שקובעים ביומן Outlook עם המפעילים נכנס ללוח השבועי לבד, ומתעדכן כל רבע שעה."
      actions={sources.length > 0 && (
        <button type="button" className={btnPrimary} disabled={!!syncing} onClick={() => sync()}>
          {syncing === "all" ? "מסנכרן…" : "לסנכרן את כל היומנים"}
        </button>
      )}
    >
      {missingTable && (
        <div className="mb-5 rounded-2xl border border-[#FAB822]/60 bg-[#FDF0CC] p-4 text-[15px]">
          הטבלה של היומנים עוד לא קיימת. מריצים פעם אחת את הקובץ <b dir="ltr">scripts/010_menu_physio_calendar.sql</b> ב-SQL Editor של Supabase.
        </div>
      )}

      {notice && (
        <div role="status" className={"mb-5 rounded-2xl p-4 text-[15px] " + (notice.ok ? "bg-[#E3ECE7] text-[#2c4037]" : "bg-[#FDE8E1] text-[#7a2e22]")}>
          {notice.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card title="היומנים המחוברים">
            {loading ? (
              <p className="text-[#3F2F2D]/60">טוען…</p>
            ) : sources.length === 0 ? (
              <p className="text-[15px] text-[#3F2F2D]/70">עוד לא חובר יומן. מוסיפים יומן בטופס שבצד — ההוראות למטה.</p>
            ) : (
              <ul className="divide-y divide-[#3F2F2D]/10">
                {sources.map(s => {
                  const st = statusOf(s);
                  return (
                    <li key={s.id} className={"py-4 " + (s.is_active ? "" : "opacity-55")}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + (st.ok === true ? "bg-[#5A826F]" : st.ok === false ? "bg-[#B56262]" : "bg-[#FAB822]")} aria-hidden />
                            <span className="text-[17px] font-bold">{s.label}</span>
                            {!s.is_active && <span className="rounded-full bg-[#3F2F2D]/10 px-2 py-0.5 text-xs">מושהה</span>}
                          </div>
                          <div className="mt-0.5 text-sm text-[#5A826F]">{deptName(s.department_id)}</div>
                          <div className={"mt-1 text-sm " + (st.ok === false ? "text-[#B56262]" : "text-[#3F2F2D]/70")}>
                            {timeAgo(s.last_synced_at)}. {st.text}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={btnSage} disabled={!!syncing || !s.is_active} onClick={() => sync(s.id)}>
                            {syncing === s.id ? "מסנכרן…" : "סנכרון עכשיו"}
                          </button>
                          <button type="button" className={btnGhost} onClick={() => setForm({ id: s.id, label: s.label, ics_url: s.ics_url, department_id: s.department_id ?? "" })}>עריכה</button>
                          <button type="button" className={btnGhost} onClick={() => toggleActive(s)}>{s.is_active ? "השהיה" : "הפעלה"}</button>
                          <ConfirmButton onConfirm={() => remove(s)} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="איך מקבלים קישור מ-Outlook">
            <ol className="list-decimal space-y-2 pr-5 text-[15px] leading-relaxed">
              <li>נכנסים ל-Outlook באינטרנט (outlook.office.com) עם החשבון שבו נקבעות הפעילויות.</li>
              <li>הגדרות (גלגל השיניים) ← <b>לוח שנה</b> ← <b>לוחות שנה משותפים</b>.</li>
              <li>בחלק <b>פרסום לוח שנה</b> בוחרים את היומן, ובהרשאות: <b>יכול להציג את כל הפרטים</b>. לוחצים <b>פרסם</b>.</li>
              <li>מעתיקים את הקישור <b dir="ltr">ICS</b> (מסתיים ב-<span dir="ltr">.ics</span>) ומדביקים כאן בטופס.</li>
            </ol>
            <div className="mt-4 rounded-xl bg-[#F6F2EE] p-4 text-sm leading-relaxed">
              <div className="mb-1 font-bold text-[#5A826F]">כדי שהלוח ייראה טוב</div>
              <ul className="list-disc space-y-1 pr-5">
                <li>כותרת האירוע היא שם הפעילות שיופיע במסך.</li>
                <li>שם המפעיל — בתיאור האירוע: <b>מפעיל: אלדד</b> (או מזמינים אותו לאירוע).</li>
                <li>ביומן משותף לכמה מחלקות כותבים את שם המחלקה במיקום, למשל: <b>כיאן, חדר אוכל</b>.</li>
                <li>אירוע שבוטל ב-Outlook יורד מהלוח בסנכרון הבא. פעילות שתוקנה כאן במערכת לא תידרס.</li>
              </ul>
            </div>
          </Card>
        </div>

        <Card title={form.id ? "עריכת יומן" : "חיבור יומן חדש"} className="h-fit lg:sticky lg:top-6">
          <div className="space-y-4">
            <Field label="שם היומן" hint="איך תזהו אותו כאן, למשל: פעילויות כיאן">
              <input className={inputCls} value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="פעילויות המחלקה" />
            </Field>
            <Field label="קישור ICS">
              <input className={inputCls + " text-left"} dir="ltr" value={form.ics_url} onChange={e => setForm({ ...form, ics_url: e.target.value })} placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics" />
            </Field>
            <Field label="לאיזו מחלקה">
              <select className={inputCls} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                <option value="">יומן משותף — לפי שם המחלקה באירוע</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <div className="flex gap-2 pt-1">
              <button type="button" className={btnPrimary + " flex-1"} disabled={saving || missingTable} onClick={save}>
                {saving ? "שומר…" : form.id ? "שמירת השינויים" : "חיבור וסנכרון"}
              </button>
              {form.id && <button type="button" className={btnGhost} onClick={() => setForm(EMPTY)}>ביטול</button>}
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function ConfirmButton({ onConfirm }: { onConfirm: () => void }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className={btnGhost + " text-[#B56262]"} onClick={() => setAsk(true)}>הסרה</button>;
  return (
    <span className="flex items-center gap-1">
      <button type="button" className="rounded-xl bg-[#B56262] px-3 py-2.5 text-sm font-semibold text-white" onClick={() => { setAsk(false); onConfirm(); }}>להסיר את היומן</button>
      <button type="button" className={btnGhost} onClick={() => setAsk(false)}>לא</button>
    </span>
  );
}
