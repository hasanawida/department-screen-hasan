// לקוח Supabase לקריאות אנונימיות בצד השרת, בלי עוגיות (מסכי ההתמצאות, בדיקת הזמינות).
//
// ב-Next 14 קריאות fetch בצד השרת נשמרות במטמון כברירת מחדל — גם בעמוד שמוגדר force-dynamic,
// כל עוד הוא לא קורא עוגיות. בלי cache: "no-store" העמוד ממשיך לקבל את התשובה מהטעינה
// הראשונה שלו: שם מחלקה ששונה לא מגיע למסך, ובדיקת זמינות עונה "תקין" גם כשהמסד למטה.

import { createClient } from "@supabase/supabase-js";

export function createAnonServerClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
