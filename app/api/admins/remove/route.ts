import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY לא מוגדר" }, { status: 500 });
  }

  const { email, alsoDeleteAuth } = (await req.json()) as {
    email?: string;
    alsoDeleteAuth?: boolean;
  };
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return NextResponse.json({ error: "חסר אימייל" }, { status: 400 });

  // הגן מפני מחיקת עצמך
  if (user.email?.toLowerCase() === normalized) {
    return NextResponse.json({ error: "לא ניתן למחוק את עצמך" }, { status: 400 });
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // הסר מטבלת admins (גורם לחסימה מיידית ב-middleware)
  const { error: delErr } = await admin.from("admins").delete().eq("email", normalized);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // אופציונלי — מחיקת חשבון ה-auth לגמרי
  if (alsoDeleteAuth) {
    const { data: users, error: listErr } = await admin.auth.admin.listUsers();
    if (!listErr && users?.users) {
      const match = users.users.find((u) => u.email?.toLowerCase() === normalized);
      if (match) await admin.auth.admin.deleteUser(match.id);
    }
  }

  return NextResponse.json({ ok: true });
}
