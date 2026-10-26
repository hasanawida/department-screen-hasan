"use client";

// לוח הזמנים של הפיזיותרפיה — מי מוזמן לטיפול ומתי.
// מה שנשמר כאן מופיע מיד במסך הפיזיותרפיה.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PhysioBoard, { type PhysioAppt } from "@/components/display/physio-board";
import { Card, Field, ScreenFrame, btnGhost, btnPrimary, inputCls, textareaCls, usePreviewCu } from "@/components/admin/brand-ui";
import { DAY_NAMES, addDaysISO, dayIndexOf, israelDateISO, shortDate } from "@/lib/week";

type Dept = { id: string; name: string; code: string | null };
type Resident = { id: string; name: string; department_id: string | null };
type Row = { id: string; appt_date: string; start_time: string; resident_name: string; resident_id: string | null; department_id: string | null; note: string | null };
type Form = { id: string | null; time: string; name: string; department_id: string; note: string };

const EMPTY_FORM: Form = { id: null, time: "", name: "", department_id: "", note: "" };
const hm = (t: string) => String(t ?? "").slice(0, 5);

function normalize(s: string) {
  return s.replace(/["'׳״`]/g, "").replace(/\s+/g, " ").trim();
}

/** "08:30 שרה כהן, כיאן" ← שורה אחת ברשימה מודבקת */
function parseLine(line: string, depts: Dept[]) {
  const m = line.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const h = Number(m[1]), mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  let rest = (line.slice(0, m.index) + " " + line.slice((m.index ?? 0) + m[0].length)).trim();
  let department_id = "";
  for (const d of [...depts].sort((a, b) => b.name.length - a.name.length)) {
    if (rest.includes(d.name)) { department_id = d.id; rest = rest.split(d.name).join(" "); break; }
  }
  const name = normalize(rest.replace(/^[\s\-–—,:|.]+|[\s\-–—,:|.]+$/g, "").replace(/[\s]*[,|][\s]*$/, ""));
  if (!name) return null;
  return { time: String(h).padStart(2, "0") + ":" + m[2], name, department_id };
}

export default function PhysioEditor({ screenUrl }: { screenUrl?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const today = israelDateISO();
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [missingTable, setMissingTable] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [cu, frameRef] = usePreviewCu();

  useEffect(() => {
    (async () => {
      const [d, r] = await Promise.all([
        supabase.from("departments").select("id, name, code").order("name"),
        supabase.from("residents").select("id, name, department_id").eq("is_active", true).order("name"),
      ]);
      setDepts((d.data ?? []) as Dept[]);
      setResidents((r.data ?? []) as Resident[]);
    })();
  }, [supabase]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("physio_appointments").select("*").eq("appt_date", date).order("start_time");
    if (error) { setMissingTable(/physio_appointments|relation|schema cache/i.test(error.message)); setRows([]); return; }
    setMissingTable(false);
    setRows((data ?? []) as Row[]);
  }, [supabase, date]);

  useEffect(() => { load(); setForm(EMPTY_FORM); }, [load]);

  const deptName = (id: string | null) => (id ? depts.find(d => d.id === id)?.name ?? null : null);
  const findResident = (name: string) => residents.find(r => normalize(r.name) === normalize(name)) ?? null;

  function setName(name: string) {
    const r = findResident(name);
    setForm(f => ({ ...f, name, department_id: r?.department_id ?? f.department_id }));
  }

  async function save() {
    setError("");
    if (!form.time || !form.name.trim()) { setError("צריך שעה ושם"); return; }
    setBusy(true);
    const r = findResident(form.name);
    const row = {
      appt_date: date,
      start_time: form.time,
      resident_name: form.name.trim(),
      resident_id: r?.id ?? null,
      department_id: form.department_id || r?.department_id || null,
      note: form.note.trim() || null,
    };
    const res = form.id
      ? await supabase.from("physio_appointments").update(row).eq("id", form.id)
      : await supabase.from("physio_appointments").insert(row);
    setBusy(false);
    if (res.error) { setError("לא נשמר: " + res.error.message); return; }
    // נשארים באותה מחלקה ובשעה הבאה — כך מוסיפים רשימה מהר
    const [h, m] = form.time.split(":").map(Number);
    const next = h * 60 + m + 30;
    setForm({ ...EMPTY_FORM, department_id: form.id ? "" : form.department_id, time: form.id ? "" : String(Math.floor(next / 60) % 24).padStart(2, "0") + ":" + String(next % 60).padStart(2, "0") });
    load();
  }

  async function remove(id: string) {
    await supabase.from("physio_appointments").delete().eq("id", id);
    if (form.id === id) setForm(EMPTY_FORM);
    load();
  }

  const parsed = useMemo(() => paste.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => ({ line: l, p: parseLine(l, depts) })), [paste, depts]);
  const good = parsed.filter(x => x.p);

  async function addPasted() {
    if (!good.length) return;
    setBusy(true);
    const rowsToAdd = good.map(({ p }) => {
      const r = findResident(p!.name);
      return { appt_date: date, start_time: p!.time, resident_name: p!.name, resident_id: r?.id ?? null, department_id: p!.department_id || r?.department_id || null, note: null };
    });
    const res = await supabase.from("physio_appointments").insert(rowsToAdd);
    setBusy(false);
    if (res.error) { setError("לא נשמר: " + res.error.message); return; }
    setPaste(""); setShowPaste(false);
    load();
  }

  async function copyLastWeek() {
    setError("");
    const { data, error } = await supabase.from("physio_appointments").select("*").eq("appt_date", addDaysISO(date, -7));
    if (error) { setError(error.message); return; }
    if (!data?.length) { setError("לא היו טיפולים באותו יום בשבוע שעבר"); return; }
    const have = new Set(rows.map(r => hm(r.start_time) + "|" + normalize(r.resident_name)));
    const add = (data as Row[]).filter(r => !have.has(hm(r.start_time) + "|" + normalize(r.resident_name)))
      .map(r => ({ appt_date: date, start_time: hm(r.start_time), resident_name: r.resident_name, resident_id: r.resident_id, department_id: r.department_id, note: r.note }));
    if (add.length) await supabase.from("physio_appointments").insert(add);
    load();
  }

  const appts: PhysioAppt[] = rows.map(r => ({ id: r.id, time: hm(r.start_time), name: r.resident_name, department: deptName(r.department_id), note: r.note }));
  if (form.name.trim() && form.time && !form.id) appts.push({ id: "__draft", time: form.time, name: form.name.trim(), department: deptName(form.department_id), note: form.note || null });
  if (form.id) {
    const i = appts.findIndex(a => a.id === form.id);
    if (i >= 0) appts[i] = { id: form.id, time: form.time || appts[i].time, name: form.name || appts[i].name, department: deptName(form.department_id), note: form.note || null };
  }

  const dayLabel = date === today ? "היום" : date === addDaysISO(today, 1) ? "מחר" : date === addDaysISO(today, -1) ? "אתמול" : "יום " + DAY_NAMES[dayIndexOf(date)];

  return (
    <div className="space-y-5">
      {missingTable && (
        <div className="rounded-2xl border border-[#FAB822]/60 bg-[#FDF0CC] p-4 text-[15px]">
          טבלת הפיזיותרפיה עוד לא קיימת. מריצים פעם אחת את <b dir="ltr">scripts/010_menu_physio_calendar.sql</b> ב-Supabase.
        </div>
      )}

      {/* יום */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
          <button type="button" aria-label="יום קודם" className="h-10 w-10 rounded-xl text-lg hover:bg-[#E3ECE7]" onClick={() => setDate(d => addDaysISO(d, -1))}>›</button>
          <div className="min-w-[150px] px-2 text-center">
            <div className="text-[15px] font-bold">{dayLabel}</div>
            <div className="text-xs text-[#3F2F2D]/60">{date === today || date === addDaysISO(today, 1) ? "יום " + DAY_NAMES[dayIndexOf(date)] + ", " : ""}{shortDate(date)}</div>
          </div>
          <button type="button" aria-label="יום הבא" className="h-10 w-10 rounded-xl text-lg hover:bg-[#E3ECE7]" onClick={() => setDate(d => addDaysISO(d, 1))}>‹</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {date !== today && <button type="button" className={btnGhost} onClick={() => setDate(today)}>חזרה להיום</button>}
          <button type="button" className={btnGhost} onClick={copyLastWeek} disabled={missingTable}>העתקה מהשבוע שעבר</button>
          <button type="button" className={btnGhost} onClick={() => setShowPaste(v => !v)} disabled={missingTable}>{showPaste ? "סגירת ההדבקה" : "הדבקת רשימה"}</button>
          {screenUrl && <a className={btnGhost} href={screenUrl} target="_blank" rel="noreferrer">פתיחת המסך</a>}
        </div>
      </div>

      {error && <div role="alert" className="rounded-2xl bg-[#FDE8E1] p-3 text-[15px] text-[#7a2e22]">{error}</div>}

      {showPaste && (
        <Card title="הדבקת רשימה">
          <p className="mb-2 text-sm text-[#3F2F2D]/65">שורה לכל דייר: שעה ושם מלא. אפשר להוסיף את שם המחלקה.</p>
          <textarea className={textareaCls + " min-h-[140px]"} value={paste} onChange={e => setPaste(e.target.value)}
            placeholder={"08:30 שרה כהן\n09:00 משה לוי, יסמין\n09:30 רחל אברהם"} />
          {parsed.length > 0 && (
            <div className="mt-2 text-sm">
              {good.length} מוכנים להוספה
              {parsed.length > good.length && <span className="text-[#B56262]">. {parsed.length - good.length} שורות בלי שעה לא ייכנסו</span>}
            </div>
          )}
          <button type="button" className={btnPrimary + " mt-3"} disabled={!good.length || busy} onClick={addPasted}>
            {good.length ? `הוספת ${good.length} טיפולים` : "הוספה"}
          </button>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* רשימת היום */}
        <Card title={rows.length ? `${rows.length} מוזמנים ל${dayLabel}` : `אין עדיין טיפולים ל${dayLabel}`}>
          {rows.length === 0 ? (
            <p className="text-[15px] text-[#3F2F2D]/65">מוסיפים דייר בטופס, או מדביקים רשימה שלמה.</p>
          ) : (
            <ul className="divide-y divide-[#3F2F2D]/10">
              {rows.map(r => (
                <li key={r.id} className={"flex items-center gap-4 py-3 " + (form.id === r.id ? "rounded-xl bg-[#E3ECE7] px-2" : "")}>
                  <span className="w-14 shrink-0 text-lg font-bold tabular-nums text-[#5A826F]" dir="ltr">{hm(r.start_time)}</span>
                  <button type="button" className="min-w-0 flex-1 text-right" onClick={() => setForm({ id: r.id, time: hm(r.start_time), name: r.resident_name, department_id: r.department_id ?? "", note: r.note ?? "" })}>
                    <div className="truncate text-[17px] font-bold">{r.resident_name}</div>
                    <div className="truncate text-sm text-[#3F2F2D]/60">{[deptName(r.department_id), r.note].filter(Boolean).join(", ") || " "}</div>
                  </button>
                  <button type="button" aria-label={"מחיקת " + r.resident_name} className="h-9 w-9 shrink-0 rounded-xl text-xl text-[#B56262] hover:bg-[#FDE8E1]" onClick={() => remove(r.id)}>×</button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* טופס */}
        <Card title={form.id ? "עריכת טיפול" : "הוספת דייר לטיפול"} className="order-first h-fit lg:order-none">
          <div className="space-y-4">
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <Field label="שעה">
                <input type="time" step={300} className={inputCls + " text-center"} dir="ltr" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              </Field>
              <Field label="שם מלא">
                <input className={inputCls} list="physio-residents" value={form.name} onChange={e => setName(e.target.value)} placeholder="שרה כהן" autoComplete="off" />
                <datalist id="physio-residents">
                  {residents.map(r => <option key={r.id} value={r.name}>{deptName(r.department_id) ?? ""}</option>)}
                </datalist>
              </Field>
            </div>
            <Field label="מחלקה">
              <select className={inputCls} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                <option value="">בלי מחלקה</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="הערה" hint="לא חובה. למשל: טיפול בחדר, להביא הליכון">
              <input className={inputCls} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <button type="button" className={btnPrimary + " flex-1"} disabled={busy || missingTable} onClick={save}>
                {busy ? "שומר…" : form.id ? "שמירת השינויים" : "הוספה ללוח"}
              </button>
              {form.id && <button type="button" className={btnGhost} onClick={() => setForm(EMPTY_FORM)}>ביטול</button>}
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold">כך זה ייראה במסך</h2>
        <ScreenFrame frameRef={frameRef}>
          <PhysioBoard appts={appts} dateISO={date} embeddedCu={cu} />
        </ScreenFrame>
      </div>
    </div>
  );
}
