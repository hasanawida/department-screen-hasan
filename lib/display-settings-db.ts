// שמירה של הגדרות המסך (screen_settings.display_settings) — במקום אחד לכל העמודים.
//
// ה-JSON הזה משותף לכמה עמודים (עורך הלוח, הגדרות המחלקה, אייקונים, המודעה), ולכן אף פעם
// לא כותבים אותו כולו מתוך מה שנטען לעמוד: קוראים את השורה העדכנית מהמסד, ממזגים לתוכה
// רק את המפתחות שהשתנו, ושומרים. כך עמוד אחד לא מוחק מה שנשמר מעמוד אחר.

import type { SupabaseClient } from "@supabase/supabase-js";

export type PatchResult = { error: string | null; settings: Record<string, unknown> | null };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * ממזג patch לתוך ההגדרות העדכניות של המחלקה. אם הקריאה נכשלה — לא כותבים כלום.
 * mergeKeys: מפתחות שהערך שלהם הוא אובייקט של הגדרות (למשל weekly_board) — ב-patch שולחים רק את
 * תתי-המפתחות שהשתנו, והם ממוזגים לתוך האובייקט השמור (שאר תתי-המפתחות שלו לא משתנים).
 */
export async function patchDisplaySettings(
  supabase: SupabaseClient,
  departmentId: string,
  patch: Record<string, unknown>,
  mergeKeys: string[] = [],
): Promise<PatchResult> {
  const cur = await supabase.from("screen_settings").select("id, display_settings").eq("department_id", departmentId).maybeSingle();
  if (cur.error) return { error: cur.error.message, settings: null };
  const base = cur.data?.display_settings && typeof cur.data.display_settings === "object" ? (cur.data.display_settings as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...base, ...patch };
  for (const k of mergeKeys) if (isObject(patch[k])) merged[k] = { ...(isObject(base[k]) ? base[k] : {}), ...patch[k] };
  // undefined = להסיר את המפתח
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  const res = cur.data?.id
    ? await supabase.from("screen_settings").update({ display_settings: merged }).eq("id", cur.data.id).select("id")
    : await supabase.from("screen_settings").insert({ department_id: departmentId, display_settings: merged }).select("id");
  if (res.error) return { error: res.error.message, settings: null };
  if (!res.data?.length) return { error: "ההגדרות לא נשמרו (אין הרשאה, או שהמחלקה נמחקה)", settings: null };
  return { error: null, settings: merged };
}

/**
 * תור שמירות: שמירות שמגיעות אחת אחרי השנייה (למשל כמה לחיצות על "+") נשמרות לפי הסדר,
 * כדי שתשובה איטית של שמירה ישנה לא תדרוס שמירה חדשה.
 */
export function createSaveQueue() {
  let chain: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const next = chain.then(job, job);
    chain = next.catch(() => {});
    return next;
  };
}
