// שמירה וטעינה של הגדרות האייקונים (משותפות לכל המחלקות, בתוך display_settings.icons)

import type { SupabaseClient } from "@supabase/supabase-js";
import { latestIconConfig, type IconConfig } from "./icon-config";
import { patchDisplaySettings } from "./display-settings-db";

/**
 * ההגדרה העדכנית ביותר. זורק אם הקריאה נכשלה — כדי שאף אחד לא ישמור אחר כך
 * הגדרה ריקה במקום האמיתית (זה היה מוחק את כל האייקונים בכל המחלקות).
 */
export async function loadIconConfig(supabase: SupabaseClient): Promise<IconConfig> {
  const { data, error } = await supabase.from("screen_settings").select("display_settings");
  if (error || !data) throw new Error(error?.message ?? "ההגדרות לא נטענו");
  return latestIconConfig(data as { display_settings?: unknown }[]);
}

export type IconSaveResult = { error: string | null; saved: IconConfig | null };

/**
 * שומר את ההגדרות בכל המחלקות. בכל מחלקה מתעדכן רק המפתח icons (שאר ההגדרות שלה לא נוגעים בהן).
 * המסכים מקבלים את השינוי ברענון הקבוע שלהם (עד 5 דקות) — בלי לטעון מחדש את כל הטלוויזיות בבית.
 */
export async function saveIconConfig(supabase: SupabaseClient, config: IconConfig): Promise<IconSaveResult> {
  const icons: IconConfig = { ...config, updated_at: new Date().toISOString() };
  const depts = await supabase.from("departments").select("id");
  if (depts.error || !depts.data) return { error: "לא נשמר: " + (depts.error?.message ?? "רשימת המחלקות לא נטענה"), saved: null };
  if (depts.data.length === 0) return { error: "אין מחלקות לשמור בהן", saved: null };
  const results = await Promise.all(depts.data.map((d: { id: string }) => patchDisplaySettings(supabase, String(d.id), { icons })));
  const failed = results.filter(r => r.error).length;
  if (failed === results.length) return { error: "לא נשמר: " + results[0].error, saved: null };
  // נשמר בחלק מהמחלקות: המסכים לוקחים את הגרסה העדכנית ביותר, כך שהשינוי תקף — אבל כדאי לשמור שוב
  if (failed) return { error: `נשמר, אבל ב-${failed} מחלקות לא התעדכן. כדאי לשמור שוב.`, saved: icons };
  return { error: null, saved: icons };
}

/** קורא את ההגדרה העדכנית, מחיל עליה שינוי ושומר. אם הקריאה נכשלה — לא נשמר כלום */
export async function updateIconConfig(supabase: SupabaseClient, change: (cfg: IconConfig) => IconConfig): Promise<IconSaveResult> {
  let latest: IconConfig;
  try {
    latest = await loadIconConfig(supabase);
  } catch (e) {
    return { error: "לא נשמר (אין חיבור?): " + (e instanceof Error ? e.message : "שגיאה"), saved: null };
  }
  return saveIconConfig(supabase, change(latest));
}
