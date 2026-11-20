import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadDepartmentDisplay } from "@/lib/department-data";
import PrintSheet from "@/components/print/print-sheet";

// הדפסת לוח הפעילויות השבועי של מחלקה: /print/board/<קוד המחלקה>?week=YYYY-MM-DD
export const dynamic = "force-dynamic";
export const metadata = { title: "הדפסת לוח פעילויות" };

export default async function PrintBoardPage({ params, searchParams }: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ week?: string; auto?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const data = await loadDepartmentDisplay(supabase, decodeURIComponent(code), { weekStart: sp.week, forPrint: true });
  if (!data) return notFound();
  const empty = data.days.every(d => d.length === 0);
  return (
    <PrintSheet
      data={data}
      view="weekly"
      title="לוח פעילויות שבועי"
      heading={"לוח פעילויות שבועי — " + data.department.name}
      basePath={"/print/board/" + encodeURIComponent(decodeURIComponent(code))}
      autoPrint={sp.auto === "1"}
      emptyText={empty ? "אין פעילויות בלוח של השבוע הזה." : undefined}
    />
  );
}
