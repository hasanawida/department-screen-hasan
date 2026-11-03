// שמירה וטעינה של הגדרות האייקונים (משותפות לכל המחלקות, בתוך display_settings.icons)

import type { SupabaseClient } from "@supabase/supabase-js";
import { latestIconConfig, type IconConfig } from "./icon-config";
import { refreshDepartmentScreens } from "./screens";

export async function loadIconConfig(supabase: SupabaseClient): Promise<IconConfig> {
  const { data } = await supabase.from("screen_settings").select("display_settings");
  return latestIconConfig(data as { display_settings?: unknown }[] | null);
}

/** שומר את ההגדרות בכל המחלקות ומרענן את המסכים. מחזיר כמה מחלקות נכשלו */
export async function saveIconConfig(supabase: SupabaseClient, config: IconConfig): Promise<{ failed: number; saved: IconConfig }> {
  const icons: IconConfig = { ...config, updated_at: new Date().toISOString() };
  const [depts, rows] = await Promise.all([
    supabase.from("departments").select("id"),
    supabase.from("screen_settings").select("id, department_id, display_settings"),
  ]);
  const byDept = new Map(((rows.data ?? []) as { id: string; department_id: string; display_settings: any }[]).map(r => [String(r.department_id), r]));
  let failed = 0;
  for (const d of (depts.data ?? []) as { id: string }[]) {
    const deptId = String(d.id);
    const cur = byDept.get(deptId);
    const merged = { ...(cur?.display_settings ?? {}), icons };
    const res = cur
      ? await supabase.from("screen_settings").update({ display_settings: merged }).eq("id", cur.id)
      : await supabase.from("screen_settings").insert({ department_id: deptId, display_settings: merged });
    if (res.error) failed++;
    else refreshDepartmentScreens(supabase, deptId);
  }
  return { failed, saved: icons };
}
