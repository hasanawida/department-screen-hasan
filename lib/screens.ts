// כלים קטנים שמשותפים לעמודי הניהול

import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_UPLOAD_BYTES, looksLikeImage, prepareImage } from "./image-prep";

/**
 * רענון המסכים של מחלקה: force_refresh עולה ל-true (המסכים נטענים מחדש) ומיד חוזר ל-false.
 * כמה שינויים ברצף — רענון אחד.
 * (פעם הדגל חזר ל-false רק אחרי 3 שניות; מי שסגר את הלשונית בינתיים השאיר אותו דלוק,
 * ומאז כל שינוי אחר בשורת המחלקה טען מחדש את המסכים שלה.)
 */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
export function refreshDepartmentScreens(supabase: SupabaseClient, departmentId: string | null | undefined, delayMs = 1500) {
  if (!departmentId) return;
  const prev = timers.get(departmentId);
  if (prev) clearTimeout(prev);
  timers.set(departmentId, setTimeout(async () => {
    timers.delete(departmentId);
    await supabase.from("departments").update({ force_refresh: true }).eq("id", departmentId);
    await supabase.from("departments").update({ force_refresh: false }).eq("id", departmentId);
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

const BUCKET_MARK = "/storage/v1/object/public/department-media/";

/**
 * מוחק מהאחסון קובץ שהועלה למערכת (לפי הכתובת הציבורית שלו), אחרי שהוסר מהמסך.
 * לא קריטי: אם המחיקה נכשלה הקובץ פשוט נשאר באחסון, ולכן אין כאן הודעת שגיאה.
 */
export async function removeStoredFile(supabase: SupabaseClient, url: string | null | undefined) {
  const at = String(url ?? "").indexOf(BUCKET_MARK);
  if (at < 0) return;
  const path = decodeURIComponent(String(url).slice(at + BUCKET_MARK.length).split("?")[0]);
  if (!path) return;
  try { await supabase.storage.from("department-media").remove([path]); } catch { /* נשאר באחסון */ }
}
