// קישורים אישיים לצוות (דיאטנית, פיזיותרפיה) — נפתחים בלי סיסמה

import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffRole = "dietitian" | "physio";
export const STAFF_ROLE_LABEL: Record<StaffRole, string> = { dietitian: "דיאטנית", physio: "פיזיותרפיה" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** התפקיד שהקישור שייך אליו, או null אם אין קישור כזה. זורק בתקלת חיבור — כדי שלא יוצג "הקישור לא קיים" על קישור תקין */
export async function roleForToken(supabase: SupabaseClient, token: string): Promise<StaffRole | null> {
  if (!UUID.test(token)) return null;
  const { data, error } = await supabase.from("staff_links").select("role").eq("token", token).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.role as StaffRole) ?? null;
}
