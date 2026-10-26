import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadDepartmentDisplay } from "@/lib/department-data";
import DepartmentDisplay from "@/components/display/department-display";
import DisplayRuntime from "@/components/display/display-runtime";

export const dynamic = "force-dynamic";

export default async function DisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const data = await loadDepartmentDisplay(supabase, decodeURIComponent(code));
  if (!data) notFound();

  return (
    <>
      <DisplayRuntime departmentId={data.department.id} />
      <DepartmentDisplay {...data} />
    </>
  );
}
