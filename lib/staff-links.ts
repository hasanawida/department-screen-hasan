// קישורים אישיים לצוות (דיאטנית, פיזיותרפיה) — נפתחים בלי סיסמה

import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffRole = "dietitian" | "physio";
export const STAFF_ROLE_LABEL: Record<StaffRole, string> = { dietitian: "דיאטנית", physio: "פיזיותרפיה" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function roleForToken(supabase: SupabaseClient, token: string): Promise<StaffRole | null | "missing"> {
  if (!UUID.test(token)) return null;
  const { data, error } = await supabase.from("staff_links").select("role").eq("token", token).maybeSingle();
  if (error) return /staff_links|relation|schema cache/i.test(error.message) ? "missing" : null;
  return (data?.role as StaffRole) ?? null;
}
