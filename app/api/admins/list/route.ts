import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { envAdminEmails } from "@/lib/supabase/middleware";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("admins")
    .select("email, created_at, created_by")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // envAdmins — מנהלים שמוגדרים בשרת (ADMIN_EMAILS). הם תמיד מורשים, ואי אפשר להסיר אותם מכאן
  return NextResponse.json({ admins: data ?? [], envAdmins: envAdminEmails(), me: user.email?.toLowerCase() ?? null });
}
