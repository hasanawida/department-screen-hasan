import { createClient } from "@/lib/supabase/server";
import DisplayRuntime from "@/components/display/display-runtime";
import PhysioBoard, { type PhysioAppt } from "@/components/display/physio-board";
import { israelDateISO } from "@/lib/week";

export const dynamic = "force-dynamic";
export const metadata = { title: "פיזיותרפיה — מוזמנים לטיפול" };

/** מסך הפיזיותרפיה. אפשר להציג מחלקה אחת: /physio?dept=קוד */
export default async function PhysioScreen({ searchParams }: { searchParams: Promise<{ dept?: string }> }) {
  const { dept } = await searchParams;
  const supabase = await createClient();
  const today = israelDateISO();

  const [{ data: rows }, { data: depts }] = await Promise.all([
    supabase.from("physio_appointments").select("id, start_time, resident_name, department_id, note").eq("appt_date", today).order("start_time"),
    supabase.from("departments").select("id, name, code"),
  ]);

  const only = dept ? (depts ?? []).find(d => d.code === decodeURIComponent(dept)) : null;
  const name = (id: string | null) => (depts ?? []).find(d => d.id === id)?.name ?? null;
  const appts: PhysioAppt[] = (rows ?? [])
    .filter(r => !only || r.department_id === only.id)
    .map(r => ({ id: r.id, time: String(r.start_time).slice(0, 5), name: r.resident_name, department: only ? null : name(r.department_id), note: r.note }));

  return (
    <>
      <DisplayRuntime refreshMinutes={2} watchTable="physio_appointments" />
      <PhysioBoard appts={appts} title={only ? "פיזיותרפיה, " + only.name : "פיזיותרפיה"} />
    </>
  );
}
