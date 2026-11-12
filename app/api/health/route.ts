// בדיקת זמינות קצרה למסכי הטלוויזיה: לפני שמסך מרענן או נטען מחדש הוא שואל כאן
// אם השרת והמסד עונים. אם לא — הוא נשאר עם הלוח שכבר מוצג ומנסה שוב מאוחר יותר.

import { NextResponse } from "next/server";
import { createAnonServerClient } from "@/lib/supabase/anon-server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  let ok = false;
  try {
    const supabase = createAnonServerClient();
    const { error } = await supabase.from("departments").select("id").limit(1).abortSignal(AbortSignal.timeout(5000));
    ok = !error;
  } catch {
    ok = false;
  }
  return NextResponse.json({ ok }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
