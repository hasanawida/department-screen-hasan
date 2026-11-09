// רישום דיירים לפעילויות — כלל אחד לכל המערכת
//
// - דייר נרשם רק לפעילויות של המחלקה שלו.
// - הרישום נשמר על הפעילות הקבועה; שינוי לשבוע אחד (parent_id) משתמש ברשומים שלה.
// - בכרטיס הדייר אפשר לכתוב פעילויות (פרטני / קבוצתי / פנאי), מופרדות בפסיק —
//   שם של פעילות, או שם של מפעיל/ה. פעילות שהשם שלה מכיל אחת מהן, או שהמפעיל/ה שלה
//   כתוב/ה בכרטיס — מוצעת לדייר, ונרשמת לבד כששומרים את הכרטיס.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ResidentCard = {
  id: string;
  department_id: string | null;
  personal_activity?: string | null;
  group_activity?: string | null;
  leisure_activity?: string | null;
};

/** רווחים מיותרים בחוץ — "אלדד  כהן " ← "אלדד כהן" */
export const cleanName = (s: string) => s.replace(/\s+/g, " ").trim();

/** להשוואה בין שמות: בלי רווחים, גרשיים ומקפים */
export const nameKey = (s: string) => s.replace(/[\s"'׳״`\-–.]/g, "").toLowerCase();

/** שמות שכנראה אותו אדם: "אלדד" ו"אלדד כהן", או אותו שם עם רווח/גרש שונה */
export function similarNames(a: string, b: string): boolean {
  const ka = nameKey(a), kb = nameKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const ca = cleanName(a), cb = cleanName(b);
  return cb.startsWith(ca + " ") || ca.startsWith(cb + " ");
}

/** הפעילויות שכתובות בכרטיס הדייר, כל אחת לחוד */
export function residentTerms(r: Omit<ResidentCard, "id" | "department_id">): string[] {
  return [r.personal_activity, r.group_activity, r.leisure_activity]
    .flatMap(t => String(t ?? "").split(/[,،;\n/]+/))
    .map(t => cleanName(t).toLowerCase())
    .filter(t => t.length >= 2);
}

/** האם הפעילות מתאימה למה שכתוב בכרטיס הדייר: לפי שם הפעילות, או לפי שם המפעיל/ה */
export function matchesActivity(title: string, r: Omit<ResidentCard, "id" | "department_id">, instructor?: string | null): boolean {
  const t = cleanName(title).toLowerCase();
  const who = cleanName(instructor ?? "");
  return residentTerms(r).some(term =>
    (!!t && t.includes(term)) || (!!who && (nameKey(who) === nameKey(term) || similarNames(who, term))),
  );
}

/** הדיירים שהכרטיס שלהם מתאים לפעילות (רק מהמחלקה של הפעילות) — לרשימת המשתתפים גם בלי רישום שמור */
export function residentsMatching<T extends ResidentCard>(residents: T[], activity: { title: string; instructor?: string | null; departmentId: string | null }): T[] {
  return residents.filter(r => r.department_id === activity.departmentId && matchesActivity(activity.title, r, activity.instructor));
}

export type SyncResult = {
  /** כל הפעילויות במחלקה שמתאימות לכרטיס (גם מה שכבר היה רשום) */
  matched: { id: string; title: string; instructor: string | null }[];
  /** כמה נרשמו עכשיו */
  added: number;
  error: string | null;
};

const israelToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());

/**
 * מעדכן את הרישום של דייר לפי הכרטיס שלו:
 * מוחק רישום לפעילויות ממחלקות אחרות, ומוסיף פעילויות מתאימות במחלקה שלו
 * (קבועות, ושל היום והלאה). לא מוחק רישום שנעשה ידנית במחלקה.
 */
export async function syncResidentRegistrations(supabase: SupabaseClient, r: ResidentCard): Promise<SyncResult> {
  const { data: mine } = await supabase.from("activity_participants").select("activity_id").eq("resident_id", r.id);
  const mineIds = (mine ?? []).map((p: any) => String(p.activity_id));
  if (mineIds.length) {
    const { data: theirs } = await supabase.from("activities").select("id, department_id").in("id", mineIds);
    const wrong = (theirs ?? []).filter((a: any) => a.department_id !== r.department_id).map((a: any) => a.id);
    if (wrong.length) await supabase.from("activity_participants").delete().eq("resident_id", r.id).in("activity_id", wrong);
  }

  if (!r.department_id || residentTerms(r).length === 0) return { matched: [], added: 0, error: null };
  // רק פעילויות רלוונטיות: קבועות, ועם תאריך — מהיום והלאה (בלי ההיסטוריה, שגדלה עם הזמן)
  const { data: acts, error: actsErr } = await supabase.from("activities").select("id, title, instructor_name")
    .eq("department_id", r.department_id).eq("is_active", true).is("parent_id", null)
    .or(`activity_date.is.null,activity_date.gte.${israelToday()}`);
  if (actsErr) return { matched: [], added: 0, error: actsErr.message };
  const matched = (acts ?? []).filter((a: any) => matchesActivity(a.title ?? "", r, a.instructor_name));
  const have = new Set(mineIds);
  const rows = matched.filter((a: any) => !have.has(String(a.id))).map((a: any) => ({ activity_id: a.id, resident_id: r.id }));
  let added = 0;
  let error: string | null = null;
  if (rows.length) {
    const res = await supabase.from("activity_participants").insert(rows);
    if (!res.error) added = rows.length;
    else {
      // אולי חלק כבר נרשם בינתיים — אחד-אחד, ומדלגים על מה שכבר קיים
      for (const row of rows) {
        const one = await supabase.from("activity_participants").insert(row);
        if (!one.error) added++;
        else if (one.error.code !== "23505") error = one.error.message;
      }
    }
  }
  return {
    matched: matched.map((a: any) => ({ id: String(a.id), title: cleanName(a.title ?? ""), instructor: a.instructor_name ? cleanName(a.instructor_name) : null })),
    added,
    error,
  };
}
