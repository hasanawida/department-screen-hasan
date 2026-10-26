import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * קישור קצר למסך ההתמצאות של מחלקה: ‎/o/kian‎ ← ‎/orientation/<הקישור המלא>‎
 * נוח להקליד בשלט של הטלוויזיה.
 */
export default async function ShortOrientationLink({ params, searchParams }: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: dept } = await supabase
    .from("departments")
    .select("view_token")
    .eq("code", decodeURIComponent(code))
    .maybeSingle();
  if (!dept?.view_token) notFound();

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") query.set(k, v);
  const qs = query.toString();
  redirect(`/orientation/${dept.view_token}${qs ? "?" + qs : ""}`);
}
