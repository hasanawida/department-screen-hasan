// כתיבה לטבלת activities שעובדת גם לפני שהורץ קובץ ה-SQL החדש
// (אם העמודות source/external_uid עוד לא קיימות — כותבים בלעדיהן)

import type { SupabaseClient } from "@supabase/supabase-js";

const NEW_COLUMNS = ["source", "external_uid"];

function missingColumn(message?: string) {
  return !!message && NEW_COLUMNS.some(c => message.includes(c));
}

function strip<T extends Record<string, unknown>>(row: T): T {
  const copy = { ...row };
  for (const c of NEW_COLUMNS) delete copy[c];
  return copy;
}

export async function insertActivities(supabase: SupabaseClient, rows: Record<string, unknown>[]) {
  let res = await supabase.from("activities").insert(rows).select("*");
  if (res.error && missingColumn(res.error.message)) res = await supabase.from("activities").insert(rows.map(strip)).select("*");
  return res;
}

export async function updateActivity(supabase: SupabaseClient, id: string, patch: Record<string, unknown>) {
  let res = await supabase.from("activities").update(patch).eq("id", id).select("*");
  if (res.error && missingColumn(res.error.message)) res = await supabase.from("activities").update(strip(patch)).eq("id", id).select("*");
  return res;
}
