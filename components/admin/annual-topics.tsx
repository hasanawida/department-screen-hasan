"use client";

// תוכנית נושאים שנתית: נושא לכל שבוע. הלוח בכל המחלקות מתחלף לבד בתחילת כל שבוע.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, PageShell, btnGhost, btnPrimary, inputCls, textareaCls } from "@/components/admin/brand-ui";
import { ImagePicker } from "@/components/admin/topic-card";
import { addDaysISO, israelDateISO, shortDate, weekStartISO } from "@/lib/week";
import { refreshDepartmentScreens } from "@/lib/screens";

type Row = { id?: string; week_start: string; title: string; description: string; image_url: string | null };
type Override = { id: string; week_start: string; title: string; image_url: string | null; department_id: string };

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

/** כל השבועות (יום ראשון) שמתחילים בשנה הזו */
function weeksOfYear(year: number): string[] {
  let ws = weekStartISO(`${year}-01-01`);
  if (ws < `${year}-01-01`) ws = addDaysISO(ws, 7);
  const out: string[] = [];
  while (ws <= `${year}-12-31`) { out.push(ws); ws = addDaysISO(ws, 7); }
  return out;
}

/** שורה מודבקת: "25.10 סתיו בגינה | שירים ועלים" או "2026-10-25<TAB>סתיו<TAB>תיאור" */
function parseLine(line: string, year: number): Omit<Row, "id" | "image_url"> | null {
  const t = line.trim();
  if (!t) return null;
  let date: string | null = null;
  let rest = t;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    date = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    rest = t.slice(m[0].length);
  } else if ((m = t.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/))) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : year;
    date = `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    rest = t.slice(m[0].length);
    // טווח תאריכים: "25.10-31.10" — לוקחים את הראשון
    rest = rest.replace(/^\s*[-–—]\s*\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?/, "");
  }
  if (!date || Number.isNaN(new Date(date + "T12:00:00").getTime())) return null;
  rest = rest.replace(/^[\s\-–—:,|\t]+/, "");
  const parts = rest.split(/\t|\s\|\s|\|/).map(x => x.trim()).filter(Boolean);
  if (!parts.length) return null;
  return { week_start: weekStartISO(date), title: parts[0], description: parts.slice(1).join(" ") };
}

export default function AnnualTopics() {
  const supabase = useMemo(() => createClient(), []);
  const today = israelDateISO();
  const thisWeek = weekStartISO(today);
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [depts, setDepts] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const currentRef = useRef<HTMLLIElement>(null);

  const weeks = useMemo(() => weeksOfYear(year), [year]);

  const load = useCallback(async () => {
    setLoading(true);
    const [plan, ov, dp] = await Promise.all([
      supabase.from("annual_topics").select("*").gte("week_start", weeks[0]).lte("week_start", weeks[weeks.length - 1]),
      supabase.from("weekly_topics").select("id, week_start, title, image_url, department_id").eq("is_active", true).gte("week_start", thisWeek).order("week_start"),
      supabase.from("departments").select("id, name"),
    ]);
    if (plan.error) setMissing(/annual_topics|relation|schema cache/i.test(plan.error.message));
    else {
      setMissing(false);
      const map: Record<string, Row> = {};
      for (const r of plan.data ?? []) map[r.week_start] = { id: r.id, week_start: r.week_start, title: r.title ?? "", description: r.description ?? "", image_url: r.image_url ?? null };
      setRows(map);
    }
    setOverrides((ov.data ?? []) as Override[]);
    setDepts(Object.fromEntries((dp.data ?? []).map((d: any) => [d.id, d.name])));
    setLoading(false);
  }, [supabase, weeks, thisWeek]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!loading) currentRef.current?.scrollIntoView({ block: "center" }); }, [loading, year]);

  const get = (ws: string): Row => rows[ws] ?? { week_start: ws, title: "", description: "", image_url: null };
  const setLocal = (ws: string, patch: Partial<Row>) => setRows(r => ({ ...r, [ws]: { ...get(ws), ...patch } }));

  async function save(ws: string, patch?: Partial<Row>) {
    const row = { ...get(ws), ...patch };
    if (patch) setLocal(ws, patch);
    setSaving(ws);
    const empty = !row.title.trim() && !row.description.trim() && !row.image_url;
    const res = empty
      ? await supabase.from("annual_topics").delete().eq("week_start", ws)
      : await supabase.from("annual_topics").upsert({
          week_start: ws, title: row.title.trim(), description: row.description.trim() || null, image_url: row.image_url, updated_at: new Date().toISOString(),
        }, { onConflict: "week_start" });
    setSaving(null);
    setMsg(res.error ? "לא נשמר: " + res.error.message : "נשמר");
  }

  const parsed = useMemo(() => paste.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => ({ line: l, p: parseLine(l, year) })), [paste, year]);
  const good = parsed.filter(x => x.p);

  async function importPasted() {
    if (!good.length) return;
    setSaving("paste");
    const byWeek = new Map<string, { week_start: string; title: string; description: string | null; updated_at: string }>();
    for (const { p } of good) byWeek.set(p!.week_start, { week_start: p!.week_start, title: p!.title, description: p!.description || null, updated_at: new Date().toISOString() });
    const res = await supabase.from("annual_topics").upsert(Array.from(byWeek.values()), { onConflict: "week_start" });
    setSaving(null);
    if (res.error) { setMsg("לא נשמר: " + res.error.message); return; }
    setMsg(`${byWeek.size} נושאים נכנסו לתוכנית`);
    setPaste(""); setShowPaste(false);
    load();
  }

  async function removeOverride(o: Override) {
    await supabase.from("weekly_topics").delete().eq("id", o.id);
    refreshDepartmentScreens(supabase, o.department_id, 0);
    load();
  }

  // קיבוץ לפי חודש
  const byMonth = useMemo(() => {
    const groups: { month: number; weeks: string[] }[] = [];
    for (const ws of weeks) {
      const m = Number(ws.slice(5, 7)) - 1;
      if (!groups.length || groups[groups.length - 1].month !== m) groups.push({ month: m, weeks: [] });
      groups[groups.length - 1].weeks.push(ws);
    }
    return groups;
  }, [weeks]);

  const filled = weeks.filter(ws => (rows[ws]?.title ?? "").trim()).length;

  return (
    <PageShell
      title="תוכנית נושאים שנתית"
      subtitle="נושא לכל שבוע. הנושא בלוח של כל המחלקות מתחלף לבד בתחילת השבוע. שינוי לשבוע מסוים במחלקה — מתוך הלוח השבועי."
      actions={
        <>
          <div className="flex items-center gap-1 rounded-xl bg-white p-1" role="group" aria-label="שנה">
            {[year - 1, year, year + 1].map(y => (
              <button key={y} type="button" onClick={() => setYear(y)}
                className={"rounded-lg px-3 py-1.5 text-sm font-semibold " + (y === year ? "bg-[#3F2F2D] text-[#F6F2EE]" : "hover:bg-[#E3ECE7]")}>{y}</button>
            ))}
          </div>
          <button type="button" className={btnGhost} onClick={() => setShowPaste(v => !v)} disabled={missing}>{showPaste ? "סגירת ההדבקה" : "הדבקת רשימה"}</button>
        </>
      }
    >
      {missing && (
        <div className="mb-5 rounded-2xl border border-[#FAB822]/60 bg-[#FDF0CC] p-4 text-[15px]">
          טבלת התוכנית השנתית עוד לא קיימת. מריצים פעם אחת את <b dir="ltr">scripts/012_topics_plan_attendance.sql</b> ב-Supabase.
        </div>
      )}
      {msg && <p role="status" className="mb-4 text-sm font-semibold text-[#5A826F]">{msg}</p>}

      {showPaste && (
        <Card title="הדבקת רשימה" className="mb-5">
          <p className="mb-2 text-sm text-[#3F2F2D]/65">שורה לכל שבוע: תאריך (כל יום בשבוע) ואחריו הנושא. תיאור אחרי קו |. אפשר להעתיק ישר מאקסל.</p>
          <textarea className={textareaCls + " min-h-[160px]"} value={paste} onChange={e => setPaste(e.target.value)}
            placeholder={"25.10 סתיו בגינה | עלים, צבעים ושירי סתיו\n1.11 בישול ואפייה\n8.11 מוזיקה של פעם"} />
          {parsed.length > 0 && (
            <p className="mt-2 text-sm">
              {good.length} נושאים מוכנים
              {parsed.length > good.length && <span className="text-[#B56262]">. {parsed.length - good.length} שורות בלי תאריך לא ייכנסו</span>}
            </p>
          )}
          <button type="button" className={btnPrimary + " mt-3"} disabled={!good.length || saving === "paste"} onClick={importPasted}>
            {saving === "paste" && <Loader2 className="h-4 w-4 animate-spin" />}
            {good.length ? `הוספת ${good.length} נושאים לתוכנית` : "הוספה"}
          </button>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card title={`${year}: ${filled} מתוך ${weeks.length} שבועות`}>
          {loading ? <p className="text-[#3F2F2D]/60">טוען…</p> : (
            <div className="space-y-6">
              {byMonth.map(g => (
                <div key={g.month}>
                  <h3 className="mb-2 text-sm font-bold text-[#5A826F]">{MONTHS[g.month]}</h3>
                  <ul className="divide-y divide-[#3F2F2D]/10">
                    {g.weeks.map(ws => {
                      const r = get(ws);
                      const isNow = ws === thisWeek;
                      return (
                        <li key={ws} ref={isNow ? currentRef : undefined}
                          className={"grid items-center gap-2 py-2.5 sm:grid-cols-[104px_minmax(0,1.1fr)_minmax(0,1fr)_auto] " + (isNow ? "rounded-xl bg-[#FDF0CC] px-2" : ws < thisWeek ? "opacity-60" : "")}>
                          <div className="text-sm font-semibold tabular-nums">
                            <span dir="ltr">{shortDate(ws)}–{shortDate(addDaysISO(ws, 6))}</span>
                            {isNow && <span className="mr-1.5 rounded-full bg-[#FAB822] px-1.5 py-0.5 text-[11px] font-bold">השבוע</span>}
                          </div>
                          <input className={inputCls} value={r.title} placeholder="נושא השבוע" aria-label={"נושא לשבוע " + shortDate(ws)} disabled={missing}
                            onChange={e => setLocal(ws, { title: e.target.value })} onBlur={() => save(ws)} />
                          <input className={inputCls} value={r.description} placeholder="משפט קצר (לא חובה)" aria-label={"תיאור לשבוע " + shortDate(ws)} disabled={missing}
                            onChange={e => setLocal(ws, { description: e.target.value })} onBlur={() => save(ws)} />
                          <div className="flex items-center gap-1">
                            <ImagePicker supabase={supabase} url={r.image_url} compact onChange={url => save(ws, { image_url: url })} onError={setMsg} />
                            {saving === ws && <Loader2 className="h-4 w-4 animate-spin text-[#5A826F]" />}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="שינויים במחלקות" className="h-fit lg:sticky lg:top-6">
          {overrides.length === 0 ? (
            <p className="text-sm text-[#3F2F2D]/65">אין שינויים. כל המחלקות מציגות את הנושא מהתוכנית.</p>
          ) : (
            <ul className="space-y-2">
              {overrides.map(o => (
                <li key={o.id} className="flex items-center gap-2 rounded-xl bg-[#F6F2EE] p-2.5 text-sm">
                  {o.image_url && <img src={o.image_url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{o.title}</div>
                    <div className="text-xs text-[#3F2F2D]/60">{depts[o.department_id] ?? "מחלקה"}, שבוע {shortDate(weekStartISO(o.week_start))}</div>
                  </div>
                  <button type="button" onClick={() => removeOverride(o)} title="חזרה לתוכנית" aria-label={"חזרה לתוכנית: " + o.title}
                    className="rounded-lg p-1.5 text-[#5A826F] hover:bg-white"><Undo2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-[#3F2F2D]/55">שינוי לשבוע מסוים במחלקה עושים ב<Link href="/admin/weekly" className="underline">לוח השבועי</Link>, בכרטיס ״נושא השבוע״.</p>
        </Card>
      </div>
    </PageShell>
  );
}
