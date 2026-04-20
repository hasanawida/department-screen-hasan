import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY לא מוגדר ב-Vercel env" },
      { status: 500 }
    );
  }

  const body = (await req.json()) as { email?: string; password?: string };
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "אימייל לא תקין" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "סיסמה חייבת להכיל לפחות 6 תווים" }, { status: 400 });
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // צור משתמש ב-auth (או הפוך קיים למאושר)
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created.error) {
    // אם כבר קיים — לא נכשל; רק נוסיף לטבלת admins
    const msg = (created.error.message || "").toLowerCase();
    const alreadyExists = msg.includes("already") || msg.includes("registered");
    if (!alreadyExists) {
      return NextResponse.json({ error: created.error.message }, { status: 400 });
    }
  }

  // הוסף לטבלת admins
  const { error: insertErr } = await admin
    .from("admins")
    .upsert({ email, created_by: user.email ?? null }, { onConflict: "email" });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
