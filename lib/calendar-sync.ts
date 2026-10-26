// סנכרון יומני Outlook (ICS) לטבלת activities.
// פעילויות מהיומן נשמרות עם source='calendar'. פעילות שנערכה במערכת מסומנת source='override'
// והסנכרון לא נוגע בה יותר (גם לא מחזיר אותה אם נמחקה).

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIcs, type IcsOccurrence } from "./ics";
import { DAY_CODES, addDaysISO, dayIndexOf, israelDateISO, weekStartISO } from "./week";
import { ensureInstructors } from "./screens";

const STALE_MINUTES = 15;
const WEEKS_AHEAD = 2;

type Source = { id: string; label: string; ics_url: string; department_id: string | null; last_synced_at: string | null };
type Dept = { id: string; name: string; code: string | null };

export type SyncResult = { sourceId: string; label: string; ok: boolean; message: string; count: number };

function normalize(s: string) {
  return s.replace(/["'׳״`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** ביומן משותף: מוצאים את המחלקה לפי השם שלה במיקום, בכותרת או בקטגוריה */
function matchDepartment(o: IcsOccurrence, depts: Dept[]): Dept | null {
  const hay = [o.location, o.title, ...o.categories].map(normalize);
  let best: Dept | null = null;
  for (const d of depts) {
    const names = [d.name, d.code ?? ""].map(normalize).filter(n => n.length >= 2);
    if (names.some(n => hay.some(h => h === n || h.includes(n)))) {
      if (!best || d.name.length > best.name.length) best = d;
    }
  }
  return best;
}

/** ביומן משותף שם המחלקה כתוב במיקום — מורידים אותו ומשאירים רק את המקום עצמו */
function cleanLocation(location: string, dept: Dept | null) {
  if (!dept || !location) return location;
  const stripped = location.split(dept.name).join(" ").replace(/^[\s\-–—,:|/]+|[\s\-–—,:|/]+$/g, "").replace(/\s+/g, " ").trim();
  return normalize(stripped) === "" ? "" : stripped;
}

function uidKey(source: Source, occUid: string) {
  return "cal:" + source.id.slice(0, 8) + ":" + occUid;
}

export async function syncCalendarSource(supabase: SupabaseClient, source: Source, depts: Dept[]): Promise<SyncResult> {
  const today = israelDateISO();
  const from = weekStartISO(today);
  const to = addDaysISO(from, WEEKS_AHEAD * 7 - 1);
  const prefix = "cal:" + source.id.slice(0, 8) + ":";

  try {
    const res = await fetch(source.ics_url.replace(/^webcal:/i, "https:"), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EshkolotScreens/1.0)", Accept: "text/calendar, */*" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error("היומן לא נפתח (קוד " + res.status + "). בדקו שהקישור מפורסם וזמין לכולם.");
    const ics = await res.text();
    if (!ics.includes("BEGIN:VCALENDAR")) throw new Error("הקישור לא מחזיר יומן. צריך את קישור ה-ICS, לא קישור ה-HTML.");

    const occurrences = parseIcs(ics, from, to);

    // מה אמור להיות במערכת
    type Want = { department_id: string; external_uid: string; title: string; start_time: string; end_time: string | null; location: string | null; instructor_name: string | null; activity_date: string; day_of_week: string };
    const want = new Map<string, Want>();
    let unmatched = 0;
    for (const o of occurrences) {
      const dept = source.department_id ? depts.find(d => d.id === source.department_id) ?? null : matchDepartment(o, depts);
      if (!dept) { unmatched++; continue; }
      const w: Want = {
        department_id: dept.id,
        external_uid: uidKey(source, o.uid),
        title: o.title || "פעילות",
        start_time: o.start,
        end_time: o.end || null,
        location: cleanLocation(o.location, source.department_id ? null : dept) || null,
        instructor_name: o.instructor || null,
        activity_date: o.date,
        day_of_week: DAY_CODES[dayIndexOf(o.date)],
      };
      want.set(w.department_id + "|" + w.external_uid, w);
    }

    // מה כבר קיים מהיומן הזה
    const { data: existing, error: exErr } = await supabase
      .from("activities")
      .select("id, department_id, external_uid, source, title, start_time, end_time, location, instructor_name, activity_date")
      .like("external_uid", prefix + "%")
      .gte("activity_date", from)
      .lte("activity_date", to);
    if (exErr) throw new Error("שגיאה בקריאת הפעילויות: " + exErr.message);

    const have = new Map<string, any>();
    for (const row of existing ?? []) have.set(row.department_id + "|" + row.external_uid, row);

    const inserts: any[] = [];
    const updates: { id: string; patch: any }[] = [];
    for (const [key, w] of want) {
      const row = have.get(key);
      if (!row) {
        inserts.push({ ...w, is_active: true, is_recurring: false, source: "calendar" });
        continue;
      }
      if (row.source !== "calendar") continue; // נערך במערכת — לא נוגעים
      const same =
        row.title === w.title &&
        String(row.start_time ?? "").slice(0, 5) === w.start_time &&
        String(row.end_time ?? "").slice(0, 5) === String(w.end_time ?? "") &&
        (row.location ?? null) === w.location &&
        (row.instructor_name ?? null) === w.instructor_name &&
        row.activity_date === w.activity_date;
      if (!same) updates.push({ id: row.id, patch: { title: w.title, start_time: w.start_time, end_time: w.end_time, location: w.location, instructor_name: w.instructor_name, activity_date: w.activity_date, day_of_week: w.day_of_week } });
    }
    const removals = (existing ?? []).filter(r => r.source === "calendar" && !want.has(r.department_id + "|" + r.external_uid)).map(r => r.id);

    if (inserts.length) {
      const { error } = await supabase.from("activities").insert(inserts);
      if (error) throw new Error("שגיאה בהוספת פעילויות: " + error.message);
    }
    for (const u of updates) await supabase.from("activities").update(u.patch).eq("id", u.id);
    if (removals.length) await supabase.from("activities").delete().in("id", removals);

    // למפעילים מהיומן — קישור אישי לסימון נוכחות
    try { await ensureInstructors(supabase, Array.from(want.values()).map(w => w.instructor_name)); } catch { /* לא קריטי */ }

    const message =
      `${want.size} פעילויות בשבועיים הקרובים` +
      (inserts.length ? `, ${inserts.length} חדשות` : "") +
      (updates.length ? `, ${updates.length} עודכנו` : "") +
      (removals.length ? `, ${removals.length} הוסרו` : "") +
      (unmatched ? `. ${unmatched} אירועים בלי שם מחלקה — לא נכנסו` : "");

    await supabase.from("calendar_sources").update({ last_synced_at: new Date().toISOString(), last_status: "ok: " + message, last_count: want.size }).eq("id", source.id);
    return { sourceId: source.id, label: source.label, ok: true, message, count: want.size };
  } catch (e: any) {
    const message = e?.name === "TimeoutError" ? "היומן לא ענה בזמן. ננסה שוב בסנכרון הבא." : (e?.message || "שגיאה לא ידועה");
    await supabase.from("calendar_sources").update({ last_synced_at: new Date().toISOString(), last_status: "error: " + message }).eq("id", source.id);
    return { sourceId: source.id, label: source.label, ok: false, message, count: 0 };
  }
}

/** מסנכרן את כל היומנים. force=false — רק יומנים שלא סונכרנו ברבע השעה האחרונה */
export async function syncCalendars(supabase: SupabaseClient, opts: { force?: boolean; sourceId?: string } = {}): Promise<SyncResult[]> {
  let q = supabase.from("calendar_sources").select("id, label, ics_url, department_id, last_synced_at").eq("is_active", true);
  if (opts.sourceId) q = q.eq("id", opts.sourceId);
  const { data: sources, error } = await q;
  if (error || !sources?.length) return [];

  const { data: depts } = await supabase.from("departments").select("id, name, code");
  const threshold = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();
  const results: SyncResult[] = [];

  for (const src of sources as Source[]) {
    if (!opts.force) {
      // "תופסים" את היומן כדי שכמה מסכים לא יסנכרנו אותו בבת אחת
      const { data: claimed } = await supabase
        .from("calendar_sources")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", src.id)
        .or(`last_synced_at.is.null,last_synced_at.lt.${threshold}`)
        .select("id");
      if (!claimed?.length) continue;
    }
    results.push(await syncCalendarSource(supabase, src, (depts ?? []) as Dept[]));
  }
  return results;
}

/** לשימוש במסכים: מסנכרן ברקע אם צריך, בלי לעכב את המסך יותר מכמה שניות */
export async function syncCalendarsIfStale(supabase: SupabaseClient): Promise<void> {
  try {
    await Promise.race([syncCalendars(supabase), new Promise(resolve => setTimeout(resolve, 6000))]);
  } catch {
    // הסנכרון לא אמור להפיל את המסך
  }
}
