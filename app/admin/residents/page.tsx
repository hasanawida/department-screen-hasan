import { createClient } from "@/lib/supabase/server"
import { ResidentsList, type Registration } from "@/components/admin/residents-list"

export default async function ResidentsPage() {
  const supabase = await createClient()
  const [{ data: residents }, { data: departments }, { data: participants }, { data: activities }] = await Promise.all([
    supabase.from("residents").select("*, departments(name)").order("name"),
    supabase.from("departments").select("id, name, code").order("name"),
    supabase.from("activity_participants").select("activity_id, resident_id"),
    supabase.from("activities").select("id, title, instructor_name, day_of_week, activity_date, department_id").eq("is_active", true).is("parent_id", null),
  ])

  // לכל דייר: הפעילויות שהוא/היא רשום/ה אליהן בפועל (רק במחלקה שלו/ה)
  const byId = new Map((activities || []).map((a: any) => [String(a.id), a]))
  const deptOf = new Map((residents || []).map((r: any) => [String(r.id), r.department_id]))
  const registrations: Record<string, Registration[]> = {}
  for (const p of participants || []) {
    const a: any = byId.get(String(p.activity_id))
    const rid = String(p.resident_id)
    if (!a || a.department_id !== deptOf.get(rid)) continue
    ;(registrations[rid] ??= []).push({
      title: a.title,
      instructor: a.instructor_name ?? null,
      day: a.activity_date ? null : a.day_of_week ?? null,
      date: a.activity_date ?? null,
    })
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">דיירים</h1>
          <p className="text-muted-foreground mt-1">{residents?.length || 0} דיירים במערכת</p>
        </div>
      </div>
      <ResidentsList residents={residents || []} departments={departments || []} registrations={registrations} />
    </div>
  )
}
