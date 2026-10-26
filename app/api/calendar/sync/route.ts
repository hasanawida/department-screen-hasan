import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCalendars } from "@/lib/calendar-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// סנכרון יומנים עכשיו (מכפתור "סנכרון מהיומן" בניהול)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "צריך להתחבר כדי לסנכרן" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const results = await syncCalendars(supabase, { force: true, sourceId: body?.sourceId || undefined });
  return NextResponse.json({ results });
}
