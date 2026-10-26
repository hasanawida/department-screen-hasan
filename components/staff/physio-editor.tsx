"use client";

// לוח הזמנים של הפיזיותרפיה — מי מוזמן לטיפול, משעה עד שעה.
// מה שנשמר כאן מופיע מיד במסך הפיזיותרפיה.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import PhysioBoard, { type PhysioAppt } from "@/components/display/physio-board";
import { Card, Field, ScreenFrame, btnGhost, btnPrimary, inputCls, textareaCls, usePreviewCu } from "@/components/admin/brand-ui";
import { DAY_NAMES, addDaysISO, dayIndexOf, israelDateISO, shortDate, toMinutes } from "@/lib/week";

type Dept = { id: string; name: string; code: string | null };
type Resident = { id: string; name: string; department_id: string | null };
type Row = {
  id: string; appt_date: string; start_time: string; end_time?: string | null;
  resident_name: string; resident_id: string | null; department_id: string | null; note: string | null;
};
type Form = { id: string | null; start: string; end: string; name: string; department_id: string; note: string };

const EMPTY_FORM: Form = { id: null, start: "", end: "", name: "", department_id: "", note: "" };
const DEFAULT_MINUTES = 30;

const hm = (t: string | null | undefined) => String(t ?? "").slice(0, 5);
const fromMinutes = (m: number) => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const range = (start: string, end?: string | null) => (end ? `${start}–${end}` : start);

function normalize(s: string) {
  return s.replace(/["'׳״`]/g, "").replace(/\s+/g, " ").trim();
}

function pad(h: string, m: string) {
  return String(Number(h)).padStart(2, "0") + ":" + m;
}

/** "08:30-09:15 שרה כהן, כיאן" או "08:30 שרה כהן" ← שורה אחת ברשימה מודבקת */
function parseLine(line: string, depts: Dept[]) {
  const r = line.match(/(\d{1,2})[:.](\d{2})\s*(?:[-–—]|עד)\s*(\d{1,2})[:.](\d{2})/);
  const s = r ?? line.match(/(\d{1,2})[:.](\d{2})/);
  if (!s) return null;
  if (Number(s[1]) > 23 || Number(s[2]) > 59) return null;
  const start = pad(s[1], s[2]);
  let end = "";
  if (r) {
    if (Number(r[3]) > 23 || Number(r[4]) > 59) return null;
    end = pad(r[3], r[4]);
    if (toMinutes(end) <= toMinutes(start)) end = "";
  }
  let rest = (line.slice(0, s.index) + " " + line.slice((s.index ?? 0) + s[0].length)).trim();
  let department_id = "";
  for (const d of [...depts].sort((a, b) => b.name.length - a.name.length)) {
    if (rest.includes(d.name)) { department_id = d.id; rest = rest.split(d.name).join(" "); break; }
  }
  const name = normalize(rest.replace(/^[\s\-–—,:|.]+|[\s\-–—,:|.]+$/g, ""));
  if (!name) return null;
  return { start, end, name, department_id };
}

/** כתיבה שעובדת גם לפני שנוספה עמודת end_time (שומרת בלי שעת סיום) */
async function writeAppointments(
  supabase: SupabaseClient,
  op: { insert: Record<string, unknown>[] } | { update: Record<string, unknown>; id: string },
) {
  const run = (strip: boolean) => {
    const clean = (r: Record<string, unknown>) => { if (!strip) return r; const { end_time, ...rest } = r; return rest; };
    return "insert" in op
      ? supabase.from("physio_appointments").insert(op.insert.map(clean))
      : supabase.from("physio_appointments").update(clean(op.update)).eq("id", op.id);
  };
  let res = await run(false);
  let endTimeMissing = false;
  if (res.error && /end_time/.test(res.error.message)) { endTimeMissing = true; res = await run(true); }
  return { error: res.error, endTimeMissing };
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
  const [notice, setNotice] = useState("");
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

  /** שינוי שעת ההתחלה מזיז גם את שעת הסיום, ושומר על משך הטיפול */
  function setStart(start: string) {
    setForm(f => {
      if (!start) return { ...f, start };
      const duration = f.start && f.end ? toMinutes(f.end) - toMinutes(f.start) : DEFAULT_MINUTES;
      return { ...f, start, end: fromMinutes(toMinutes(start) + (duration > 0 ? duration : DEFAULT_MINUTES)) };
    });
  }

  async function save() {
    setError(""); setNotice("");
    if (!form.start || !form.name.trim()) { setError("צריך שעת התחלה ושם"); return; }
    if (form.end && toMinutes(form.end) <= toMinutes(form.start)) { setError("שעת הסיום צריכה להיות אחרי שעת ההתחלה"); return; }
    setBusy(true);
    const r = findResident(form.name);
    const row = {
      appt_date: date,
      start_time: form.start,
      end_time: form.end || null,
      resident_name: form.name.trim(),
      resident_id: r?.id ?? null,
      department_id: form.department_id || r?.department_id || null,
      note: form.note.trim() || null,
    };
    const res = await writeAppointments(supabase, form.id ? { update: row, id: form.id } : { insert: [row] });
    setBusy(false);
    if (res.error) { setError("לא נשמר: " + res.error.message); return; }
    if (res.endTimeMissing) setNotice("נשמר בלי שעת הסיום — צריך להריץ את scripts/011_physio_end_time.sql ב-Supabase.");
    // הוספה רצופה: הטיפול הבא מתחיל כשהקודם נגמר, באותו משך ובאותה מחלקה
    if (form.id) { setForm(EMPTY_FORM); }
    else {
      const startM = toMinutes(form.start);
      const endM = form.end ? toMinutes(form.end) : startM + DEFAULT_MINUTES;
      setForm({ ...EMPTY_FORM, department_id: form.department_id, start: fromMinutes(endM), end: fromMinutes(endM + (endM - startM)) });
    }
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
    setBusy(true); setError(""); setNotice("");
    const rowsToAdd = good.map(({ p }) => {
      const r = findResident(p!.name);
      return {
        appt_date: date, start_time: p!.start, end_time: p!.end || null, resident_name: p!.name,
        resident_id: r?.id ?? null, department_id: p!.department_id || r?.department_id || null, note: null,
      };
    });
    const res = await writeAppointments(supabase, { insert: rowsToAdd });
    setBusy(false);
    if (res.error) { setError("לא נשמר: " + res.error.message); return; }
    if (res.endTimeMissing) setNotice("נשמר בלי שעות הסיום — צריך להריץ את scripts/011_physio_end_time.sql ב-Supabase.");
    setPaste(""); setShowPaste(false);
    load();
  }

  async function copyLastWeek() {
    setError(""); setNotice("");
    const { data, error } = await supabase.from("physio_appointments").select("*").eq("appt_date", addDaysISO(date, -7));
    if (error) { setError(error.message); return; }
    if (!data?.length) { setError("לא היו טיפולים באותו יום בשבוע שעבר"); return; }
    const have = new Set(rows.map(r => hm(r.start_time) + "|" + normalize(r.resident_name)));
    const add = (data as Row[]).filter(r => !have.has(hm(r.start_time) + "|" + normalize(r.resident_name)))
      .map(r => ({
        appt_date: date, start_time: hm(r.start_time), end_time: r.end_time ? hm(r.end_time) : null,
        resident_name: r.resident_name, resident_id: r.resident_id, department_id: r.department_id, note: r.note,
      }));
    if (add.length) await writeAppointments(supabase, { insert: add });
    load();
  }

  const appts: PhysioAppt[] = rows.map(r => ({
    id: r.id, time: hm(r.start_time), end: r.end_time ? hm(r.end_time) : null,
    name: r.resident_name, department: deptName(r.department_id), note: r.note,
  }));
  if (form.name.trim() && form.start && !form.id) {
    appts.push({ id: "__draft", time: form.start, end: form.end || null, name: form.name.trim(), department: deptName(form.department_id), note: form.note || null });
  }
  if (form.id) {
    const i = appts.findIndex(a => a.id === form.id);
    if (i >= 0) appts[i] = { id: form.id, time: form.start || appts[i].time, end: form.end || null, name: form.name || appts[i].name, department: deptName(form.department_id), note: form.note || null };
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
      {notice && <div role="status" className="rounded-2xl bg-[#FDF0CC] p-3 text-[15px]">{notice}</div>}

      {showPaste && (
        <Card title="הדבקת רשימה">
          <p className="mb-2 text-sm text-[#3F2F2D]/65">שורה לכל דייר: שעה (או משעה עד שעה) ושם מלא. אפשר להוסיף את שם המחלקה.</p>
          <textarea className={textareaCls + " min-h-[140px]"} value={paste} onChange={e => setPaste(e.target.value)}
            placeholder={"08:30-09:00 שרה כהן\n09:00-09:45 משה לוי, יסמין\n10:00 רחל אברהם"} />
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

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* רשימת היום */}
        <Card title={rows.length ? `${rows.length} מוזמנים ל${dayLabel}` : `אין עדיין טיפולים ל${dayLabel}`}>
          {rows.length === 0 ? (
            <p className="text-[15px] text-[#3F2F2D]/65">מוסיפים דייר בטופס, או מדביקים רשימה שלמה.</p>
          ) : (
            <ul className="divide-y divide-[#3F2F2D]/10">
              {rows.map(r => (
                <li key={r.id} className={"flex items-center gap-4 py-3 " + (form.id === r.id ? "rounded-xl bg-[#E3ECE7] px-2" : "")}>
                  <span className="w-[124px] shrink-0 whitespace-nowrap text-right text-lg font-bold tabular-nums text-[#5A826F]" dir="ltr">{range(hm(r.start_time), r.end_time ? hm(r.end_time) : null)}</span>
                  <button type="button" className="min-w-0 flex-1 text-right"
                    onClick={() => setForm({ id: r.id, start: hm(r.start_time), end: r.end_time ? hm(r.end_time) : "", name: r.resident_name, department_id: r.department_id ?? "", note: r.note ?? "" })}>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="משעה">
                <input type="time" step={300} className={inputCls + " text-center"} dir="ltr" value={form.start} onChange={e => setStart(e.target.value)} />
              </Field>
              <Field label="עד שעה">
                <input type="time" step={300} className={inputCls + " text-center"} dir="ltr" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
              </Field>
            </div>
            <Field label="שם מלא">
              <input className={inputCls} list="physio-residents" value={form.name} onChange={e => setName(e.target.value)} placeholder="שרה כהן" autoComplete="off" />
              <datalist id="physio-residents">
                {residents.map(r => <option key={r.id} value={r.name}>{deptName(r.department_id) ?? ""}</option>)}
              </datalist>
            </Field>
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
