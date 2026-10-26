"use client";

// העמוד האישי של מפעיל / מדריכת תעסוקה: הפעילויות שלי השבוע, ומי השתתף בכל פעילות

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, MapPin, Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EshkolotLogo } from "@/components/orientation/eshkolot-logo";
import {
  DAY_NAMES, activitiesByDay, addDaysISO, israelDateISO, shortDate, weekDatesISO, weekStartISO,
  type ActivityRow, type BoardActivity,
} from "@/lib/week";

const PERSONAL_KEYWORDS = ["פרטני", "פרטנית", "אישי", "אישית"];

type Resident = { id: string; name: string; room_number: string | null; department_id: string | null; personal_activity?: string | null };
type Row = ActivityRow & { department_id: string };
type Occurrence = BoardActivity & { departmentId: string; dateISO: string };
type Mark = { activity_id: string; occurrence_date: string; resident_id: string | null; resident_name: string };

export default function AttendancePortal({ mode, name, departmentId }: {
  mode: "instructor" | "department";
  /** שם המפעיל (או המחלקה, במצב מדריכת תעסוקה) */
  name: string;
  /** במצב מחלקה: המחלקה */
  departmentId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const today = israelDateISO();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDaysISO(weekStartISO(today), weekOffset * 7);
  const weekDates = weekDatesISO(weekStart);

  const [rows, setRows] = useState<Row[]>([]);
  const [depts, setDepts] = useState<Record<string, string>>({});
  const [residents, setResidents] = useState<Resident[]>([]);
  const [registered, setRegistered] = useState<Record<string, string[]>>({});
  const [marks, setMarks] = useState<Mark[]>([]);
  const [attendanceReady, setAttendanceReady] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  /* ── הפעילויות של השבוע המוצג (קבועות + של התאריכים האלה), הדיירים והרשומים ── */
  const loadBase = useCallback(async () => {
    let q = supabase.from("activities").select("*") // פעילויות מוסתרות מסוננות ב-activitiesByDay
      .or(`activity_date.is.null,and(activity_date.gte.${weekDates[0]},activity_date.lte.${weekDates[6]})`);
    q = mode === "instructor" ? q.eq("instructor_name", name) : q.eq("department_id", departmentId!).is("instructor_name", null);
    const { data: acts, error: actsErr } = await q;
    setLoadError(!!actsErr);
    const list = (acts ?? []) as Row[];
    setRows(list);

    const deptIds = Array.from(new Set(list.map(a => a.department_id).filter(Boolean)));
    if (mode === "department" && departmentId && !deptIds.includes(departmentId)) deptIds.push(departmentId);
    const [dp, rs, pr] = await Promise.all([
      supabase.from("departments").select("id, name").in("id", deptIds.length ? deptIds : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("residents").select("id, name, room_number, department_id, personal_activity").eq("is_active", true).in("department_id", deptIds.length ? deptIds : ["00000000-0000-0000-0000-000000000000"]).order("name"),
      list.length ? supabase.from("activity_participants").select("activity_id, resident_id").in("activity_id", list.map(a => a.id)) : Promise.resolve({ data: [] as any[] }),
    ]);
    setDepts(Object.fromEntries((dp.data ?? []).map((d: any) => [d.id, d.name])));
    setResidents((rs.data ?? []) as Resident[]);
    const reg: Record<string, string[]> = {};
    for (const p of (pr as any).data ?? []) (reg[p.activity_id] ??= []).push(String(p.resident_id));
    setRegistered(reg);
  }, [supabase, mode, name, departmentId, weekDates[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── הנוכחות של השבוע ── */
  const loadMarks = useCallback(async (ids: string[]) => {
    if (!ids.length) { setMarks([]); return; }
    const { data, error } = await supabase.from("activity_attendance")
      .select("activity_id, occurrence_date, resident_id, resident_name")
      .in("activity_id", ids).gte("occurrence_date", weekDates[0]).lte("occurrence_date", weekDates[6]);
    if (error) {
      const missing = /activity_attendance|relation|schema cache/i.test(error.message);
      setAttendanceReady(!missing);
      if (!missing) setLoadError(true);
      setMarks([]);
      return;
    }
    setAttendanceReady(true);
    setMarks((data ?? []) as Mark[]);
  }, [supabase, weekDates[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { (async () => { setLoading(true); await loadBase(); setLoading(false); })(); }, [loadBase]);

  // שינויים של אחרים (מנהל, מפעיל אחר בטלפון אחר) — מתעדכנים לבד
  useEffect(() => {
    const ch = supabase.channel("attendance-portal")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "activity_attendance" }, () => loadMarks(weekIdsRef.current))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, loadMarks]);

  /* ── המופעים של השבוע ── */
  const byDay = useMemo(() => {
    const byDept = new Map<string, Row[]>();
    for (const r of rows) byDept.set(r.department_id, [...(byDept.get(r.department_id) ?? []), r]);
    const days: Occurrence[][] = [[], [], [], [], [], [], []];
    for (const [deptId, list] of byDept) {
      activitiesByDay(list, weekStart).forEach((day, i) => {
        for (const a of day) days[i].push({ ...a, departmentId: deptId, dateISO: weekDates[i] });
      });
    }
    for (const d of days) d.sort((a, b) => a.start.localeCompare(b.start));
    return days;
  }, [rows, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = byDay.reduce((n, d) => n + d.length, 0);

  // הנוכחות נטענת רק לפעילויות של השבוע המוצג (כך הבקשה לא גדלה עם הזמן)
  const weekIds = useMemo(() => Array.from(new Set(byDay.flat().map(o => o.id))), [byDay]);
  const weekIdsRef = React.useRef<string[]>([]);
  weekIdsRef.current = weekIds;
  const weekKey = weekIds.join(",");
  useEffect(() => { loadMarks(weekIdsRef.current); }, [weekKey, loadMarks]);
  const marksFor = (o: Occurrence) => marks.filter(m => m.activity_id === o.id && m.occurrence_date === o.dateISO);

  async function toggle(o: Occurrence, r: Resident, on: boolean) {
    const key = (m: Mark) => m.activity_id === o.id && m.occurrence_date === o.dateISO && m.resident_id === r.id;
    // מיד על המסך, ואחר כך נשמר
    setMarks(ms => on ? [...ms, { activity_id: o.id, occurrence_date: o.dateISO, resident_id: r.id, resident_name: r.name }] : ms.filter(m => !key(m)));
    const res = on
      ? await supabase.from("activity_attendance").upsert({
          activity_id: o.id, activity_title: o.title, occurrence_date: o.dateISO, resident_id: r.id, resident_name: r.name, department_id: o.departmentId, marked_by: name,
        }, { onConflict: "activity_id,occurrence_date,resident_id" })
      : await supabase.from("activity_attendance").delete().eq("activity_id", o.id).eq("occurrence_date", o.dateISO).eq("resident_id", r.id);
    if (res.error) loadMarks(weekIdsRef.current);
  }

  async function markAll(o: Occurrence, list: Resident[]) {
    const have = new Set(marksFor(o).map(m => m.resident_id));
    const add = list.filter(r => !have.has(r.id));
    if (!add.length) return;
    setMarks(ms => [...ms, ...add.map(r => ({ activity_id: o.id, occurrence_date: o.dateISO, resident_id: r.id, resident_name: r.name }))]);
    const res = await supabase.from("activity_attendance").upsert(add.map(r => ({
      activity_id: o.id, activity_title: o.title, occurrence_date: o.dateISO, resident_id: r.id, resident_name: r.name, department_id: o.departmentId, marked_by: name,
    })), { onConflict: "activity_id,occurrence_date,resident_id" });
    if (res.error) loadMarks(weekIdsRef.current);
  }

  const weekLabel = weekOffset === 0 ? "השבוע" : weekOffset === -1 ? "שבוע שעבר" : weekOffset === 1 ? "שבוע הבא" : "שבוע";

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F2EE] text-[#3F2F2D]">
      <header className="border-b border-[#3F2F2D]/10 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#5A826F]">{mode === "instructor" ? "הפעילויות שלי" : "מדריכת תעסוקה"}</div>
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{name}</h1>
          </div>
          <EshkolotLogo className="h-10 w-auto shrink-0" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
            <button type="button" aria-label="שבוע קודם" onClick={() => { setOpen(null); setWeekOffset(w => w - 1); }} className="rounded-xl p-2 hover:bg-[#E3ECE7]"><ChevronRight className="h-5 w-5" /></button>
            <div className="min-w-[140px] text-center">
              <div className="text-[15px] font-bold">{weekLabel}</div>
              <div className="text-xs text-[#3F2F2D]/60" dir="ltr">{shortDate(weekDates[0])}–{shortDate(weekDates[6])}</div>
            </div>
            <button type="button" aria-label="שבוע הבא" onClick={() => { setOpen(null); setWeekOffset(w => w + 1); }} className="rounded-xl p-2 hover:bg-[#E3ECE7]"><ChevronLeft className="h-5 w-5" /></button>
          </div>
          <span className="text-sm text-[#3F2F2D]/65">{loading ? "טוען…" : total ? `${total} פעילויות` : ""}</span>
        </div>

        {!attendanceReady && (
          <div className="mb-4 rounded-2xl bg-[#FDF0CC] p-4 text-[15px]">סימון הנוכחות עוד לא הופעל במערכת. מבקשים מהמנהל להריץ את עדכון מסד הנתונים.</div>
        )}

        {loadError && (
          <div className="mb-4 rounded-2xl bg-[#FDE8E1] p-4 text-[15px] text-[#7a2e22]">לא הצלחנו לטעון את כל הנתונים. בודקים את החיבור לאינטרנט ומרעננים את העמוד.</div>
        )}

        {!loading && total === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center text-[15px] text-[#3F2F2D]/65">אין פעילויות {weekOffset === 0 ? "השבוע" : "בשבוע הזה"}.</div>
        )}

        <div className="space-y-6">
          {byDay.map((list, i) => list.length > 0 && (
            <section key={i}>
              <h2 className={"mb-2 flex items-center gap-2 text-[15px] font-bold " + (weekDates[i] === today ? "text-[#3F2F2D]" : "text-[#3F2F2D]/70")}>
                יום {DAY_NAMES[i]}, {shortDate(weekDates[i])}
                {weekDates[i] === today && <span className="rounded-full bg-[#FAB822] px-2 py-0.5 text-xs">היום</span>}
              </h2>
              <ul className="space-y-2.5">
                {list.map(o => {
                  const k = o.id + "@" + o.dateISO;
                  const m = marksFor(o);
                  const canMark = o.dateISO <= today && attendanceReady;
                  const isOpen = open === k;
                  const deptResidents = residents.filter(r => r.department_id === o.departmentId);
                  // שינוי לשבוע אחד — הרשומים של הפעילות הקבועה
                  const regIds = [...(registered[o.id] ?? []), ...(o.parentId ? registered[o.parentId] ?? [] : [])];
                  return (
                    <li key={k} className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
                      <button type="button" onClick={() => setOpen(isOpen ? null : k)} aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 p-4 text-right hover:bg-[#FBF9F7]">
                        <span className="w-12 shrink-0 text-lg font-bold tabular-nums text-[#5A826F]" dir="ltr">{o.start}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[17px] font-bold">{o.title}</span>
                          <span className="flex items-center gap-1 truncate text-sm text-[#3F2F2D]/60">
                            {depts[o.departmentId] ?? ""}
                            {o.location && <><MapPin className="h-3.5 w-3.5 shrink-0" />{o.location}</>}
                          </span>
                        </span>
                        <span className={"shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold " + (m.length ? "bg-[#E3ECE7] text-[#375044]" : canMark ? "bg-[#FDF0CC] text-[#6b4e00]" : "bg-[#F6F2EE] text-[#3F2F2D]/50")}>
                          {m.length ? `${m.length} השתתפו` : canMark ? "סימון נוכחות" : "בהמשך"}
                        </span>
                      </button>
                      {isOpen && (
                        <AttendanceList
                          occurrence={o} canMark={canMark} marks={m}
                          registered={deptResidents.filter(r => regIds.includes(String(r.id)))}
                          others={deptResidents.filter(r => !regIds.includes(String(r.id)))}
                          personal={PERSONAL_KEYWORDS.some(w => o.title.includes(w))}
                          onToggle={(r, on) => toggle(o, r, on)}
                          onMarkAll={list => markAll(o, list)}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function AttendanceList({ occurrence, canMark, marks, registered, others, personal, onToggle, onMarkAll }: {
  occurrence: Occurrence;
  canMark: boolean;
  marks: Mark[];
  registered: Resident[];
  others: Resident[];
  personal: boolean;
  onToggle: (r: Resident, on: boolean) => void;
  onMarkAll: (list: Resident[]) => void;
}) {
  const [q, setQ] = useState("");
  const [showOthers, setShowOthers] = useState(registered.length === 0);
  const marked = new Set(marks.map(m => m.resident_id));
  const filteredOthers = others.filter(r => !q.trim() || r.name.includes(q.trim()) || (r.room_number ?? "").includes(q.trim()));
  // דיירים שסומנו אבל לא ברשימות (למשל עברו מחלקה)
  const known = new Set([...registered, ...others].map(r => r.id));
  const extra = marks.filter(m => m.resident_id && !known.has(m.resident_id));

  const Item = ({ r }: { r: Resident }) => {
    const on = marked.has(r.id);
    return (
      <li>
        <button type="button" disabled={!canMark} onClick={() => onToggle(r, !on)} aria-pressed={on}
          className={"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-colors disabled:cursor-default " + (on ? "bg-[#E3ECE7]" : "hover:bg-[#F6F2EE]")}>
          <span className={"flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 " + (on ? "border-[#5A826F] bg-[#5A826F] text-white" : "border-[#3F2F2D]/25 bg-white")}>
            {on && <Check className="h-4 w-4" strokeWidth={3} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold">{r.name}</span>
            {(r.room_number || (personal && r.personal_activity)) && (
              <span className="block truncate text-sm text-[#3F2F2D]/60">
                {[r.room_number ? "חדר " + r.room_number : null, personal ? r.personal_activity : null].filter(Boolean).join(", ")}
              </span>
            )}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="border-t border-[#3F2F2D]/10 p-3">
      {!canMark && <p className="mb-2 px-1 text-sm text-[#3F2F2D]/60">את הנוכחות מסמנים ביום הפעילות או אחריו.</p>}

      {registered.length > 0 && (
        <>
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-sm font-bold text-[#5A826F]"><Users className="h-4 w-4" /> רשומים לפעילות</span>
            {canMark && <button type="button" onClick={() => onMarkAll(registered)} className="rounded-lg px-2 py-1 text-sm font-semibold text-[#5A826F] hover:bg-[#E3ECE7]">סימון כל הרשומים</button>}
          </div>
          <ul className="mb-2">{registered.map(r => <Item key={r.id} r={r} />)}</ul>
        </>
      )}

      {extra.length > 0 && (
        <ul className="mb-2 px-3 text-sm text-[#3F2F2D]/70">{extra.map(m => <li key={m.resident_id!}>✓ {m.resident_name}</li>)}</ul>
      )}

      {others.length > 0 && (
        showOthers ? (
          <>
            <div className="mb-1 mt-1 px-1 text-sm font-bold text-[#5A826F]">{registered.length ? "עוד דיירים מהמחלקה" : "דיירי המחלקה"}</div>
            {others.length > 8 && (
              <label className="mb-1 flex items-center gap-2 rounded-xl border border-[#3F2F2D]/15 bg-white px-3">
                <Search className="h-4 w-4 text-[#3F2F2D]/40" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש לפי שם או חדר" className="h-10 w-full bg-transparent text-[15px] outline-none" />
              </label>
            )}
            <ul>{filteredOthers.map(r => <Item key={r.id} r={r} />)}</ul>
          </>
        ) : (
          <button type="button" onClick={() => setShowOthers(true)} className="w-full rounded-xl px-3 py-2 text-right text-sm font-semibold text-[#5A826F] hover:bg-[#E3ECE7]">
            + עוד דיירים מהמחלקה ({others.length})
          </button>
        )
      )}

      {registered.length === 0 && others.length === 0 && (
        <p className="px-1 text-sm text-[#3F2F2D]/60">אין דיירים רשומים במחלקה הזו. מוסיפים דיירים בעמוד ״דיירים״ בניהול.</p>
      )}
    </div>
  );
}
