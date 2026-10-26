import { createClient } from "@/lib/supabase/server";
import DisplayRuntime from "@/components/display/display-runtime";
import PhysioBoard, { type PhysioAppt } from "@/components/display/physio-board";
import { israelDateISO } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata = { title: "פיזיותרפיה — מוזמנים לטיפול" };

/**
 * מסך הפיזיותרפיה: כל המוזמנים להיום, עם ספירה לפי מחלקה.
 * לרכז/ת מחלקה — רק המחלקה שלו/ה: /physio?dept=קוד
 */
export default async function PhysioScreen({ searchParams }: { searchParams: Promise<{ dept?: string }> }) {
  const { dept } = await searchParams;
  const supabase = await createClient();
  const today = israelDateISO();

  const [{ data: rows }, { data: depts }] = await Promise.all([
    supabase.from("physio_appointments").select("*").eq("appt_date", today).order("start_time"),
    supabase.from("departments").select("id, name, code, color"),
  ]);

  const only = dept ? (depts ?? []).find(d => d.code === decodeURIComponent(dept)) : null;
  const dep = (id: string | null) => (depts ?? []).find(d => d.id === id);
  const appts: PhysioAppt[] = (rows ?? [])
    .filter(r => !only || r.department_id === only.id)
    .map(r => ({
      id: r.id,
      time: String(r.start_time).slice(0, 5),
      end: r.end_time ? String(r.end_time).slice(0, 5) : null,
      name: r.resident_name,
      department: dep(r.department_id)?.name ?? null,
      departmentColor: dep(r.department_id)?.color ?? null,
      note: r.note,
      attended: r.attended ?? null,
    }));

  return (
    <>
      <DisplayRuntime refreshMinutes={2} watchTable="physio_appointments" />
      <PhysioBoard appts={appts} title={only ? "פיזיותרפיה, " + only.name : "פיזיותרפיה"} showDepartments={!only} />
    </>
  );
}
