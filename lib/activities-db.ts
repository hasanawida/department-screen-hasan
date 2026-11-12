// כתיבה לטבלת activities — במקום אחד, כדי שכל העמודים יכתבו אותה באותה צורה ויקבלו חזרה את השורות שנשמרו

import type { SupabaseClient } from "@supabase/supabase-js";

export async function insertActivities(supabase: SupabaseClient, rows: Record<string, unknown>[]) {
  return supabase.from("activities").insert(rows).select("*");
}

export async function updateActivity(supabase: SupabaseClient, id: string, patch: Record<string, unknown>) {
  return supabase.from("activities").update(patch).eq("id", id).select("*");
}
