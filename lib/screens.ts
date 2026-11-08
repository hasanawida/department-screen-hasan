// כלים קטנים שמשותפים לעמודי הניהול

import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_UPLOAD_BYTES, looksLikeImage, prepareImage } from "./image-prep";

/**
 * רענון המסכים של מחלקה: force_refresh עולה ל-true (המסכים נטענים מחדש)
 * ואחרי כמה שניות חוזר ל-false. כמה שינויים ברצף — רענון אחד.
 */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
export function refreshDepartmentScreens(supabase: SupabaseClient, departmentId: string | null | undefined, delayMs = 1500) {
  if (!departmentId) return;
  const prev = timers.get(departmentId);
  if (prev) clearTimeout(prev);
  timers.set(departmentId, setTimeout(async () => {
    timers.delete(departmentId);
    await supabase.from("departments").update({ force_refresh: true }).eq("id", departmentId);
    // הבונה של supabase שולח את הבקשה רק כשמחכים לה — לכן then
    setTimeout(() => { supabase.from("departments").update({ force_refresh: false }).eq("id", departmentId).then(() => {}); }, 3000);
  }, delayMs));
}

/**
 * העלאת תמונה לאחסון של המערכת. מחזיר כתובת ציבורית, או הודעת שגיאה בעברית.
 * צילום גדול מוקטן לפני ההעלאה, ו-HEIC של אייפון מומר ל-JPG (ראו lib/image-prep).
 */
export async function uploadImage(supabase: SupabaseClient, input: File, folder: string): Promise<{ url: string } | { error: string }> {
  if (!looksLikeImage(input)) return { error: "צריך לבחור קובץ תמונה" };
  const prep = await prepareImage(input);
  if ("error" in prep) return prep;
  const file = prep.file;
  if (file.size > MAX_UPLOAD_BYTES) return { error: "התמונה גדולה מדי (עד 8MB)" };
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("department-media").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) return { error: "ההעלאה נכשלה: " + error.message };
  const { data } = supabase.storage.from("department-media").getPublicUrl(path);
  return { url: data.publicUrl };
}

/** מוודא שלמפעיל יש רשומה וקישור אישי (לעמוד שבו מסמנים נוכחות) */
export async function ensureInstructors(supabase: SupabaseClient, names: (string | null | undefined)[]) {
  const wanted = Array.from(new Set(names.map(n => (n ?? "").trim()).filter(Boolean)));
  if (!wanted.length) return;
  const { data, error } = await supabase.from("instructors").select("id, name, view_token").in("name", wanted);
  if (error) return;
  const token = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  for (const name of wanted) {
    const row = (data ?? []).find((r: any) => r.name === name);
    if (!row) await supabase.from("instructors").insert({ name, view_token: token() });
    else if (!row.view_token) await supabase.from("instructors").update({ view_token: token() }).eq("id", row.id);
  }
}
