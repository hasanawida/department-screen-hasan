// דוחות: נוכחות בפעילויות ובפיזיותרפיה, לתקופה
//
// פעילות קבועה "מתקיימת" בכל שבוע ביום שלה (חוץ משבועות שבוטלו), ושינוי לשבוע אחד
// מחליף אותה — בדיוק כמו בלוח השבועי. הנוכחות נשמרת לפי פעילות ותאריך.

import type { SupabaseClient } from "@supabase/supabase-js";
import { activitiesByDay, addDaysISO, weekDatesISO, weekStartISO, type ActivityRow } from "./week";
import { cleanName } from "./participants";

/** קריאה בחלקים של 1000 שורות (המגבלה של Supabase לבקשה אחת) */
export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < 100_000; i += 1000) {
    const { data, error } = await build(i, i + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/** 2026-10-05 ← "5.10.2026" */
export const fullDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}.${m}.${y}`;
};

export type AttendanceMark = {
  activity_id: string | null;
  activity_title: string | null;
  occurrence_date: string;
  resident_id: string | null;
  resident_name: string;
  department_id: string | null;
  marked_by: string | null;
};

export type Occurrence = {
  key: string;
  activityId: string | null;
  date: string;
  time: string;
  title: string;
  instructor: string;
  departmentId: string | null;
  /** מזהי הדיירים הרשומים (של הפעילות, ובשינוי לשבוע — של הפעילות הקבועה) */
  registered: string[];
  attended: { id: string | null; name: string }[];
  /** הנוכחות נשמרה, אבל הפעילות כבר לא בלוח */
  removed?: boolean;
};

type Row = ActivityRow & { department_id?: string | null };

/**
 * כל הפעמים שפעילויות התקיימו בתקופה (עד עכשיו), עם הרשומים ומי שסומן/ה שהשתתף/ה.
 * nowISO/nowHM: פעילות של היום נחשבת רק אחרי שעת ההתחלה שלה.
 */
export function buildOccurrences(opts: {
  rows: Row[];
  marks: AttendanceMark[];
  participants: { activity_id: string; resident_id: string }[];
  from: string;
  to: string;
  nowISO: string;
  nowHM: string;
}): Occurrence[] {
  const { rows, marks, participants, from, to, nowISO, nowHM } = opts;
  const byId = new Map(rows.map(r => [String(r.id), r]));
  const regs = new Map<string, string[]>();
  for (const p of participants) {
    const k = String(p.activity_id);
    (regs.get(k) ?? regs.set(k, []).get(k)!).push(String(p.resident_id));
  }
  const marksBy = new Map<string, AttendanceMark[]>();
  for (const m of marks) {
    const k = (m.activity_id ?? "title:" + (m.activity_title ?? "")) + "|" + m.occurrence_date;
    (marksBy.get(k) ?? marksBy.set(k, []).get(k)!).push(m);
  }

  const out: Occurrence[] = [];
  const seen = new Set<string>();
  const last = to < nowISO ? to : nowISO;
  for (let ws = weekStartISO(from); ws <= last; ws = addDaysISO(ws, 7)) {
    const dates = weekDatesISO(ws);
    activitiesByDay(rows, ws).forEach((list, i) => {
      const date = dates[i];
      if (date < from || date > last) return;
      for (const a of list) {
        if (date === nowISO && a.start > nowHM) continue; // עוד לא התחילה
        const key = a.id + "|" + date;
        seen.add(key);
        const row = byId.get(a.id);
        const reg = Array.from(new Set([...(regs.get(a.id) ?? []), ...(a.parentId ? regs.get(a.parentId) ?? [] : [])]));
        out.push({
          key, activityId: a.id, date, time: a.start, title: a.title, instructor: cleanName(a.instructor),
          departmentId: row?.department_id ?? null, registered: reg,
          attended: (marksBy.get(key) ?? []).map(m => ({ id: m.resident_id, name: m.resident_name })),
        });
      }
    });
  }

  // נוכחות שנשמרה לפעילות שכבר לא בלוח באותו יום (נמחקה, או עברה ליום אחר)
  for (const [key, ms] of Array.from(marksBy.entries())) {
    if (seen.has(key)) continue;
    const m = ms[0];
    if (m.occurrence_date < from || m.occurrence_date > to) continue;
    const row = m.activity_id ? byId.get(m.activity_id) : undefined;
    out.push({
      key, activityId: m.activity_id, date: m.occurrence_date, time: row ? String(row.start_time ?? "").slice(0, 5) : "",
      title: row?.title ?? m.activity_title ?? "פעילות", instructor: cleanName(row?.instructor_name ?? m.marked_by ?? ""),
      departmentId: row?.department_id ?? m.department_id, registered: [], removed: true,
      attended: ms.map(x => ({ id: x.resident_id, name: x.resident_name })),
    });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title, "he"));
}

/** טעינת כל מה שדוח הנוכחות צריך, לתקופה ולמחלקה */
export async function loadAttendance(supabase: SupabaseClient, from: string, to: string, departmentId: string | null) {
  const acts = await fetchAll<Row>((a, b) => {
    let q = supabase.from("activities").select("*").eq("is_active", true);
    if (departmentId) q = q.eq("department_id", departmentId);
    return q.range(a, b);
  });
  const marks = await fetchAll<AttendanceMark>((a, b) => {
    let q = supabase.from("activity_attendance")
      .select("activity_id, activity_title, occurrence_date, resident_id, resident_name, department_id, marked_by")
      .gte("occurrence_date", from).lte("occurrence_date", to);
    if (departmentId) q = q.eq("department_id", departmentId);
    return q.range(a, b);
  });
  const participants = await fetchAll<{ activity_id: string; resident_id: string }>((a, b) =>
    supabase.from("activity_participants").select("activity_id, resident_id").range(a, b));
  return { acts, marks, participants };
}
