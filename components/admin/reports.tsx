"use client";

// דוחות נוכחות: פעילויות (מי השתתף, לפי פעילות ולפי דייר, ומה לא סומן) ופיזיותרפיה (מי הוזמן ומי הגיע).
// אפשר להדפיס (רק הדוח, בלי התפריט) או לשמור לאקסל.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Loader2, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EshkolotLogo } from "@/components/orientation/eshkolot-logo";
import { btnGhost, btnPrimary, inputCls } from "@/components/admin/brand-ui";
import { DAY_NAMES, addDaysISO, dayIndexOf, israelDateISO, israelTimeHM, weekStartISO } from "@/lib/week";
import { cleanName, nameKey } from "@/lib/participants";
import { buildOccurrences, fetchAll, fullDate, loadAttendance, type Occurrence } from "@/lib/reports";

type Dept = { id: string; name: string; code: string | null; color: string | null };
type Resident = { id: string; name: string; room_number: string | null; department_id: string | null; is_active: boolean | null };
type PhysioRow = {
  id: string; appt_date: string; start_time: string; end_time?: string | null; resident_name: string;
  resident_id: string | null; department_id: string | null; note: string | null; attended?: boolean | null;
};
type Tab = "activities" | "physio";
type Preset = "today" | "week" | "lastWeek" | "month" | "lastMonth" | "custom";
const NO_INSTRUCTOR = "__none";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "היום" },
  { id: "week", label: "השבוע" },
  { id: "lastWeek", label: "שבוע שעבר" },
  { id: "month", label: "החודש" },
  { id: "lastMonth", label: "חודש שעבר" },
  { id: "custom", label: "תאריכים אחרים" },
];

function presetRange(p: Preset, today: string): [string, string] {
  const ws = weekStartISO(today);
  const [y, m] = today.split("-").map(Number);
  const first = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, "0")}-01`;
  switch (p) {
    case "today": return [today, today];
    case "week": return [ws, addDaysISO(ws, 6)];
    case "lastWeek": return [addDaysISO(ws, -7), addDaysISO(ws, -1)];
    case "month": { const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1; return [first(y, m), addDaysISO(first(ny, nm), -1)]; }
    case "lastMonth": { const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1; return [first(py, pm), addDaysISO(first(y, m), -1)]; }
    default: return [ws, addDaysISO(ws, 6)];
  }
}

const hm = (t: string | null | undefined) => String(t ?? "").slice(0, 5);
const dayName = (iso: string) => DAY_NAMES[dayIndexOf(iso)];

const th = "border-b border-[#3F2F2D]/15 px-2 py-2 text-right text-[13px] font-bold text-[#5A826F] print:px-1 print:py-1 print:text-[10px] print:text-black";
const td = "border-b border-[#3F2F2D]/10 px-2 py-2 align-top text-[14px] print:px-1 print:py-1 print:text-[10.5px]";

export default function Reports() {
  const supabase = useMemo(() => createClient(), []);
  const today = israelDateISO();
  const [tab, setTab] = useState<Tab>("activities");
  const [preset, setPreset] = useState<Preset>("week");
  const [range, setRange] = useState<[string, string]>(() => presetRange("week", israelDateISO()));
  const [deptId, setDeptId] = useState("");
  const [instructor, setInstructor] = useState("");
  const [actView, setActView] = useState<"byActivity" | "byResident" | "unmarked">("byActivity");
  const [physioView, setPhysioView] = useState<"byDay" | "byResident">("byDay");

  const [depts, setDepts] = useState<Dept[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [occ, setOcc] = useState<Occurrence[]>([]);
  const [physio, setPhysio] = useState<PhysioRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [from, to] = range;

  useEffect(() => {
    supabase.from("departments").select("id, name, code, color").order("name").then(({ data }) => setDepts((data ?? []) as Dept[]));
  }, [supabase]);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p, today));
  };

  const load = useCallback(async () => {
    if (!from || !to || from > to) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchAll<Resident>((a, b) => {
        let q = supabase.from("residents").select("id, name, room_number, department_id, is_active");
        if (deptId) q = q.eq("department_id", deptId);
        return q.order("name").range(a, b);
      });
      setResidents(res);
      if (tab === "activities") {
        const { acts, marks, participants } = await loadAttendance(supabase, from, to, deptId || null);
        setOcc(buildOccurrences({ rows: acts, marks, participants, from, to, nowISO: today, nowHM: israelTimeHM() }));
      } else {
        const rows = await fetchAll<PhysioRow>((a, b) => {
          let q = supabase.from("physio_appointments").select("*").gte("appt_date", from).lte("appt_date", to);
          if (deptId) q = q.eq("department_id", deptId);
          return q.order("appt_date").order("start_time").range(a, b);
        });
        setPhysio(rows.sort((x, y) => x.appt_date.localeCompare(y.appt_date) || hm(x.start_time).localeCompare(hm(y.start_time))));
      }
    } catch (e) {
      setError("הדוח לא נטען: " + (e instanceof Error ? e.message : String(e)));
    }
    setLoading(false);
  }, [supabase, tab, from, to, deptId, today]);

  useEffect(() => { load(); }, [load]);

  const deptName = (id: string | null) => (id ? depts.find(d => d.id === id)?.name ?? "" : "");
  const chosenDept = depts.find(d => d.id === deptId) ?? null;
  const resById = useMemo(() => new Map(residents.map(r => [r.id, r])), [residents]);

  /* ── פעילויות ── */
  const instructors = useMemo(() => Array.from(new Set(occ.map(o => o.instructor).filter(Boolean))).sort((a, b) => a.localeCompare(b, "he")), [occ]);
  const shownOcc = useMemo(() => occ.filter(o =>
    !instructor || (instructor === NO_INSTRUCTOR ? !o.instructor : nameKey(o.instructor) === nameKey(instructor))), [occ, instructor]);
  const unmarked = shownOcc.filter(o => o.attended.length === 0 && !o.removed);
  const marksCount = shownOcc.reduce((n, o) => n + o.attended.length, 0);
  const uniqueAttendees = new Set(shownOcc.flatMap(o => o.attended.map(a => a.id ?? "name:" + a.name))).size;

  const byResident = useMemo(() => {
    const map = new Map<string, { id: string | null; name: string; room: string; dept: string; count: number; acts: Map<string, number>; last: string }>();
    for (const r of residents) {
      if (r.is_active === false) continue;
      map.set(r.id, { id: r.id, name: r.name, room: r.room_number ?? "", dept: deptName(r.department_id), count: 0, acts: new Map(), last: "" });
    }
    for (const o of shownOcc) for (const a of o.attended) {
      const k = a.id && map.has(a.id) ? a.id : "name:" + cleanName(a.name);
      const cur = map.get(k) ?? { id: a.id, name: a.name, room: a.id ? resById.get(a.id)?.room_number ?? "" : "", dept: deptName(o.departmentId), count: 0, acts: new Map(), last: "" };
      cur.count++;
      cur.acts.set(o.title, (cur.acts.get(o.title) ?? 0) + 1);
      if (o.date > cur.last) cur.last = o.date;
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "he"));
  }, [residents, shownOcc, resById]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── פיזיותרפיה ── */
  const physioSummary = {
    total: physio.length,
    came: physio.filter(r => r.attended === true).length,
    missed: physio.filter(r => r.attended === false).length,
    open: physio.filter(r => r.attended == null && r.appt_date <= today).length,
    future: physio.filter(r => r.attended == null && r.appt_date > today).length,
  };
  const physioByResident = useMemo(() => {
    const map = new Map<string, { name: string; dept: string; invited: number; came: number; missed: number; open: number }>();
    for (const r of physio) {
      const k = r.resident_id ?? "name:" + cleanName(r.resident_name);
      const cur = map.get(k) ?? { name: r.resident_name, dept: deptName(r.department_id), invited: 0, came: 0, missed: 0, open: 0 };
      cur.invited++;
      if (r.attended === true) cur.came++;
      else if (r.attended === false) cur.missed++;
      else if (r.appt_date <= today) cur.open++;
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.invited - a.invited || a.name.localeCompare(b.name, "he"));
  }, [physio, depts]); // eslint-disable-line react-hooks/exhaustive-deps
  const physioStatus = (r: PhysioRow) =>
    r.attended === true ? "הגיע/ה" : r.attended === false ? "לא הגיע/ה" : r.appt_date > today ? "עוד לא" : "לא סומן";

  /* ── אקסל ── */
  async function exportExcel() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] }; // גיליון מימין לשמאל
    const add = (name: string, rows: Record<string, unknown>[]) => {
      const data = rows.length ? rows : [{ "": "אין נתונים" }];
      const ws = XLSX.utils.json_to_sheet(data);
      const keys = Object.keys(data[0]);
      ws["!cols"] = keys.map(k => ({ wch: Math.min(60, Math.max(k.length, ...data.map(r => String(r[k] ?? "").length)) + 2) }));
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    };
    if (tab === "activities") {
      add("לפי פעילות", shownOcc.map(o => ({
        "תאריך": fullDate(o.date), "יום": dayName(o.date), "שעה": o.time, "פעילות": o.title + (o.removed ? " (לא בלוח)" : ""),
        "מפעיל/ה": o.instructor || "מדריכות תעסוקה", "מחלקה": deptName(o.departmentId),
        "רשומים": o.registered.length, "השתתפו": o.attended.length, "מי השתתף": o.attended.map(a => a.name).join(", ") || "לא סומן",
      })));
      add("לפי דייר", byResident.map(r => ({
        "דייר/ת": r.name, "חדר": r.room, "מחלקה": r.dept, "השתתפויות": r.count,
        "פעילויות": Array.from(r.acts.entries()).map(([t, n]) => (n > 1 ? `${t} (${n})` : t)).join(", "),
        "השתתפות אחרונה": r.last ? fullDate(r.last) : "",
      })));
      add("לא סומנה נוכחות", unmarked.map(o => ({
        "תאריך": fullDate(o.date), "יום": dayName(o.date), "שעה": o.time, "פעילות": o.title,
        "מפעיל/ה": o.instructor || "מדריכות תעסוקה", "מחלקה": deptName(o.departmentId),
      })));
    } else {
      add("לפי יום", physio.map(r => ({
        "תאריך": fullDate(r.appt_date), "יום": dayName(r.appt_date), "משעה": hm(r.start_time), "עד": hm(r.end_time),
        "דייר/ת": r.resident_name, "מחלקה": deptName(r.department_id), "הערה": r.note ?? "", "הגעה": physioStatus(r),
      })));
      add("לפי דייר", physioByResident.map(r => ({
        "דייר/ת": r.name, "מחלקה": r.dept, "הוזמן/ה": r.invited, "הגיע/ה": r.came, "לא הגיע/ה": r.missed, "לא סומן": r.open,
      })));
    }
    const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab === "activities" ? "נוכחות-בפעילויות" : "פיזיותרפיה"}-${from}-${to}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const rangeText = from === to ? `${dayName(from)}, ${fullDate(from)}` : `${fullDate(from)} עד ${fullDate(to)}`;
  const title = tab === "activities" ? "דוח נוכחות בפעילויות" : "דוח פיזיותרפיה";
  const filtersText = [
    chosenDept ? "מחלקה: " + chosenDept.name : "כל המחלקות",
    tab === "activities" && instructor ? (instructor === NO_INSTRUCTOR ? "מדריכות תעסוקה" : "מפעיל/ה: " + instructor) : "",
  ].filter(Boolean).join(", ");

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F2EE] text-[#3F2F2D] print:min-h-0 print:bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8 print:max-w-none print:p-0">
        {/* כותרת להדפסה */}
        <div className="mb-4 hidden items-center justify-between border-b border-black/20 pb-3 print:flex">
          <div>
            <div className="text-[18px] font-extrabold">{title}</div>
            <div className="text-[12px]">{rangeText}. {filtersText}.</div>
          </div>
          <EshkolotLogo className="h-9 w-auto" />
        </div>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">דוחות</h1>
            <p className="mt-1 text-[15px] text-[#3F2F2D]/65">מי השתתף בפעילויות ומי הגיע לפיזיותרפיה, לפי תקופה ומחלקה.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnGhost} onClick={exportExcel} disabled={loading}><FileSpreadsheet className="h-4 w-4" /> שמירה לאקסל</button>
            <button type="button" className={btnPrimary} onClick={() => window.print()} disabled={loading}><Printer className="h-4 w-4" /> הדפסה</button>
          </div>
        </div>

        {/* בחירות */}
        <section className="mb-5 space-y-4 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(63,47,45,0.06)] print:hidden">
          <div className="flex flex-wrap gap-1 rounded-xl bg-[#F6F2EE] p-1 text-sm font-semibold sm:inline-flex" role="tablist" aria-label="סוג הדוח">
            {([["activities", "נוכחות בפעילויות"], ["physio", "פיזיותרפיה"]] as [Tab, string][]).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={"rounded-lg px-4 py-2 " + (tab === id ? "bg-white shadow-sm" : "text-[#3F2F2D]/60")}>{label}</button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#5A826F]">תקופה:</span>
            {PRESETS.map(p => (
              <button key={p.id} type="button" onClick={() => choosePreset(p.id)} aria-pressed={preset === p.id}
                className={"rounded-full px-3 py-1.5 text-sm font-semibold " + (preset === p.id ? "bg-[#3F2F2D] text-[#F6F2EE]" : "bg-[#F6F2EE] hover:bg-[#E3ECE7]")}>
                {p.label}
              </button>
            ))}
            {preset === "custom" && (
              <span className="flex flex-wrap items-center gap-2">
                <input type="date" aria-label="מתאריך" className={inputCls + " !w-auto"} value={from} onChange={e => setRange([e.target.value, to])} />
                <span className="text-sm">עד</span>
                <input type="date" aria-label="עד תאריך" className={inputCls + " !w-auto"} value={to} onChange={e => setRange([from, e.target.value])} />
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-semibold text-[#5A826F]">מחלקה</span>
              <select className={inputCls} value={deptId} onChange={e => setDeptId(e.target.value)}>
                <option value="">כל המחלקות</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            {tab === "activities" && (
              <label>
                <span className="mb-1 block text-sm font-semibold text-[#5A826F]">מפעיל/ה</span>
                <select className={inputCls} value={instructor} onChange={e => setInstructor(e.target.value)}>
                  <option value="">כולם</option>
                  <option value={NO_INSTRUCTOR}>מדריכות תעסוקה (בלי מפעיל/ה)</option>
                  {instructors.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
          </div>
          <p className="text-sm text-[#3F2F2D]/60">{rangeText}. {filtersText}.</p>
        </section>

        {error && <div role="alert" className="mb-4 rounded-2xl bg-[#FDE8E1] p-3 text-[15px] text-[#7a2e22] print:hidden">{error}</div>}
        {loading && <p className="mb-4 flex items-center gap-2 text-[15px] text-[#3F2F2D]/65 print:hidden"><Loader2 className="h-4 w-4 animate-spin" /> טוען את הדוח…</p>}

        {!loading && tab === "activities" && (
          <>
            <Summary items={[
              ["פעילויות שהתקיימו", shownOcc.filter(o => !o.removed).length],
              ["סומנה נוכחות", shownOcc.filter(o => !o.removed).length - unmarked.length],
              ["השתתפויות", marksCount],
              ["דיירים שהשתתפו", uniqueAttendees],
            ]} />
            {unmarked.length > 0 && (
              <p className="mb-4 rounded-xl bg-[#FDF0CC] px-4 py-2.5 text-[15px] print:border print:border-black/20 print:bg-white print:text-[11px]">
                {unmarked.length === 1 ? "בפעילות אחת" : `ב-${unmarked.length} פעילויות`} עוד לא סומנה נוכחות.
                <button type="button" onClick={() => setActView("unmarked")} className="ms-2 font-semibold text-[#5A826F] underline print:hidden">לרשימה</button>
              </p>
            )}

            <ViewTabs value={actView} onChange={v => setActView(v as typeof actView)} options={[
              ["byActivity", "לפי פעילות"], ["byResident", "לפי דייר"], ["unmarked", `לא סומנה נוכחות (${unmarked.length})`],
            ]} />

            {actView === "byActivity" && (
              <Table empty="אין פעילויות שהתקיימו בתקופה הזו." rows={shownOcc.length} head={
                <tr>
                  <th className={th}>תאריך</th><th className={th}>שעה</th><th className={th}>פעילות</th><th className={th}>מפעיל/ה</th>
                  {!deptId && <th className={th}>מחלקה</th>}
                  <th className={th}>רשומים</th><th className={th}>השתתפו</th><th className={th + " w-[38%]"}>מי השתתף</th>
                </tr>
              }>
                {shownOcc.map(o => (
                  <tr key={o.key} className="break-inside-avoid">
                    <td className={td + " whitespace-nowrap"}>{dayName(o.date)}, {fullDate(o.date)}</td>
                    <td className={td + " tabular-nums"} dir="ltr">{o.time}</td>
                    <td className={td + " font-semibold"}>{o.title}{o.removed && <span className="font-normal text-[#3F2F2D]/55"> (כבר לא בלוח)</span>}</td>
                    <td className={td}>{o.instructor || <span className="text-[#3F2F2D]/55">מדריכות תעסוקה</span>}</td>
                    {!deptId && <td className={td}>{deptName(o.departmentId)}</td>}
                    <td className={td + " tabular-nums"}>{o.registered.length || ""}</td>
                    <td className={td + " font-bold tabular-nums"}>{o.attended.length || ""}</td>
                    <td className={td}>
                      {o.attended.length
                        ? o.attended.map(a => a.name).join(", ")
                        : <span className="font-semibold text-[#9a6b00] print:text-black">לא סומן</span>}
                    </td>
                  </tr>
                ))}
              </Table>
            )}

            {actView === "byResident" && (
              <Table empty="אין דיירים במחלקה." rows={byResident.length} head={
                <tr>
                  <th className={th}>דייר/ת</th><th className={th}>חדר</th>{!deptId && <th className={th}>מחלקה</th>}
                  <th className={th}>השתתפויות</th><th className={th + " w-[45%]"}>בפעילויות</th><th className={th}>אחרונה</th>
                </tr>
              }>
                {byResident.map(r => (
                  <tr key={(r.id ?? "") + r.name} className={"break-inside-avoid " + (r.count === 0 ? "text-[#3F2F2D]/55" : "")}>
                    <td className={td + " font-semibold"}>{r.name}</td>
                    <td className={td}>{r.room}</td>
                    {!deptId && <td className={td}>{r.dept}</td>}
                    <td className={td + " font-bold tabular-nums"}>{r.count}</td>
                    <td className={td}>{Array.from(r.acts.entries()).map(([t, n]) => (n > 1 ? `${t} (${n})` : t)).join(", ") || "לא השתתף/ה"}</td>
                    <td className={td + " whitespace-nowrap"}>{r.last ? fullDate(r.last) : ""}</td>
                  </tr>
                ))}
              </Table>
            )}

            {actView === "unmarked" && (
              <Table empty="בכל הפעילויות שהתקיימו סומנה נוכחות." rows={unmarked.length} head={
                <tr>
                  <th className={th}>תאריך</th><th className={th}>שעה</th><th className={th}>פעילות</th><th className={th}>מפעיל/ה</th>
                  {!deptId && <th className={th}>מחלקה</th>}
                </tr>
              }>
                {unmarked.map(o => (
                  <tr key={o.key} className="break-inside-avoid">
                    <td className={td + " whitespace-nowrap"}>{dayName(o.date)}, {fullDate(o.date)}</td>
                    <td className={td + " tabular-nums"} dir="ltr">{o.time}</td>
                    <td className={td + " font-semibold"}>{o.title}</td>
                    <td className={td}>{o.instructor || "מדריכות תעסוקה"}</td>
                    {!deptId && <td className={td}>{deptName(o.departmentId)}</td>}
                  </tr>
                ))}
              </Table>
            )}
            <p className="mt-3 text-sm text-[#3F2F2D]/60 print:hidden">
              הנוכחות מסומנת בקישור האישי של כל מפעיל/ה (בעמוד המפעילים), ובקישור של המחלקה למדריכות התעסוקה.
            </p>
          </>
        )}

        {!loading && tab === "physio" && (
          <>
            <Summary items={[
              ["מוזמנים", physioSummary.total],
              ["הגיעו", physioSummary.came],
              ["לא הגיעו", physioSummary.missed],
              [physioSummary.future ? "לא סומנו / עוד לא" : "לא סומנו", physioSummary.future ? `${physioSummary.open} / ${physioSummary.future}` : physioSummary.open],
            ]} />

            <ViewTabs value={physioView} onChange={v => setPhysioView(v as typeof physioView)} options={[["byDay", "לפי יום"], ["byResident", "לפי דייר"]]} />

            {physioView === "byDay" && (
              <Table empty="אין טיפולים בתקופה הזו." rows={physio.length} head={
                <tr>
                  <th className={th}>תאריך</th><th className={th}>שעה</th><th className={th}>דייר/ת</th>
                  {!deptId && <th className={th}>מחלקה</th>}
                  <th className={th}>הערה</th><th className={th}>הגעה</th>
                </tr>
              }>
                {physio.map(r => (
                  <tr key={r.id} className="break-inside-avoid">
                    <td className={td + " whitespace-nowrap"}>{dayName(r.appt_date)}, {fullDate(r.appt_date)}</td>
                    <td className={td + " whitespace-nowrap tabular-nums"} dir="ltr">{hm(r.start_time)}{r.end_time ? "–" + hm(r.end_time) : ""}</td>
                    <td className={td + " font-semibold"}>{r.resident_name}</td>
                    {!deptId && <td className={td}>{deptName(r.department_id)}</td>}
                    <td className={td}>{r.note}</td>
                    <td className={td + " font-semibold " + (r.attended === true ? "text-[#3d6b56]" : r.attended === false ? "text-[#9e4f4f]" : "text-[#3F2F2D]/55")}>{physioStatus(r)}</td>
                  </tr>
                ))}
              </Table>
            )}

            {physioView === "byResident" && (
              <Table empty="אין טיפולים בתקופה הזו." rows={physioByResident.length} head={
                <tr>
                  <th className={th}>דייר/ת</th>{!deptId && <th className={th}>מחלקה</th>}
                  <th className={th}>הוזמן/ה</th><th className={th}>הגיע/ה</th><th className={th}>לא הגיע/ה</th><th className={th}>לא סומן</th>
                </tr>
              }>
                {physioByResident.map(r => (
                  <tr key={r.name + r.dept} className="break-inside-avoid">
                    <td className={td + " font-semibold"}>{r.name}</td>
                    {!deptId && <td className={td}>{r.dept}</td>}
                    <td className={td + " tabular-nums"}>{r.invited}</td>
                    <td className={td + " font-bold tabular-nums"}>{r.came}</td>
                    <td className={td + " tabular-nums"}>{r.missed || ""}</td>
                    <td className={td + " tabular-nums"}>{r.open || ""}</td>
                  </tr>
                ))}
              </Table>
            )}
            <p className="mt-3 text-sm text-[#3F2F2D]/60 print:hidden">
              ההגעה מסומנת בעמוד הפיזיותרפיה (״הגיע/ה״ / ״לא הגיע/ה״ ליד כל דייר), גם בקישור של צוות הפיזיותרפיה.
            </p>
          </>
        )}

        <p className="mt-4 hidden text-[10px] text-black/60 print:block">הודפס ב-{fullDate(today)}, אשכולות אורנים.</p>
      </div>
    </div>
  );
}

function Summary({ items }: { items: [string, number | string][] }) {
  return (
    <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4 print:gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(63,47,45,0.06)] print:rounded-none print:border print:border-black/20 print:px-2 print:py-1 print:shadow-none">
          <dt className="text-sm text-[#3F2F2D]/65 print:text-[10px] print:text-black">{label}</dt>
          <dd className="text-2xl font-extrabold tabular-nums print:text-[15px]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ViewTabs({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="תצוגה">
      {options.map(([id, label]) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          className={"rounded-full px-3.5 py-1.5 text-sm font-semibold " + (value === id ? "bg-[#3F2F2D] text-[#F6F2EE]" : "bg-white hover:bg-[#E3ECE7]")}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Table({ head, children, rows, empty }: { head: React.ReactNode; children: React.ReactNode; rows: number; empty: string }) {
  if (rows === 0) return <p className="rounded-2xl bg-white p-6 text-center text-[15px] text-[#3F2F2D]/65 print:p-2 print:text-[11px]">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-2xl bg-white p-2 shadow-[0_1px_2px_rgba(63,47,45,0.06)] print:overflow-visible print:rounded-none print:p-0 print:shadow-none">
      <table className="w-full border-collapse">
        <thead>{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
