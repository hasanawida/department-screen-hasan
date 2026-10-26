// רישום דיירים לפעילויות — כלל אחד לכל המערכת
//
// - דייר נרשם רק לפעילויות של המחלקה שלו.
// - הרישום נשמר על הפעילות הקבועה; שינוי לשבוע אחד (parent_id) משתמש ברשומים שלה.
// - בכרטיס הדייר אפשר לכתוב פעילויות (פרטני / קבוצתי / פנאי), מופרדות בפסיק.
//   פעילות שהשם שלה מכיל אחת מהן — מוצעת לדייר, ונרשמת לבד כששומרים את הכרטיס.

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

/** האם הפעילות מתאימה למה שכתוב בכרטיס הדייר */
export function matchesActivity(title: string, r: Omit<ResidentCard, "id" | "department_id">): boolean {
  const t = cleanName(title).toLowerCase();
  return !!t && residentTerms(r).some(term => t.includes(term));
}

/**
 * מעדכן את הרישום של דייר לפי הכרטיס שלו:
 * מוחק רישום לפעילויות ממחלקות אחרות, ומוסיף פעילויות מתאימות במחלקה שלו.
 * לא מוחק רישום שנעשה ידנית במחלקה. מחזיר כמה פעילויות נוספו.
 */
export async function syncResidentRegistrations(supabase: SupabaseClient, r: ResidentCard): Promise<number> {
  const { data: mine } = await supabase.from("activity_participants").select("activity_id").eq("resident_id", r.id);
  const mineIds = (mine ?? []).map((p: any) => String(p.activity_id));
  if (mineIds.length) {
    const { data: theirs } = await supabase.from("activities").select("id, department_id").in("id", mineIds);
    const wrong = (theirs ?? []).filter((a: any) => a.department_id !== r.department_id).map((a: any) => a.id);
    if (wrong.length) await supabase.from("activity_participants").delete().eq("resident_id", r.id).in("activity_id", wrong);
  }

  if (!r.department_id || residentTerms(r).length === 0) return 0;
  const { data: acts } = await supabase.from("activities").select("id, title, parent_id")
    .eq("department_id", r.department_id).eq("is_active", true).is("parent_id", null);
  const have = new Set(mineIds);
  const add = (acts ?? []).filter((a: any) => !have.has(String(a.id)) && matchesActivity(a.title ?? "", r));
  if (!add.length) return 0;
  const { error } = await supabase.from("activity_participants").upsert(
    add.map((a: any) => ({ activity_id: a.id, resident_id: r.id })), { onConflict: "activity_id,resident_id" },
  );
  return error ? 0 : add.length;
}
