import { createClient } from "@/lib/supabase/server"
import { OccupationList } from "@/components/admin/occupation-list"

const DAY_ORDER: Record<string, number> = {
  "א'": 0, "ב'": 1, "ג'": 2, "ד'": 3, "ה'": 4, "ו'": 5, "שבת": 6
}

export default async function OccupationPage() {
  const supabase = await createClient()
  const [{ data: departments }, { data: activities }, { data: participants }] = await Promise.all([
    supabase.from("departments").select("id, name, view_token").order("name"),
    supabase.from("activities").select("id, title, day_of_week, start_time, activity_date, instructor_name, department_id, departments(name)").eq("is_active", true).is("instructor_name", null),
    supabase.from("activity_participants").select("activity_id, residents(id, name, room_number, personal_activity)"),
  ])

  const deptList = (departments || []).map(dept => ({
    id: dept.id,
    name: dept.name,
    view_token: dept.view_token,
    acts: (activities || [])
      .filter(a => a.department_id === dept.id)
      .map(a => ({
        ...a,
        participants: (participants || [])
          .filter(p => p.activity_id === a.id)
          .map(p => p.residents)
          .filter(Boolean)
      }))
      .sort((a, b) => {
        const dayDiff = (DAY_ORDER[a.day_of_week] ?? 9) - (DAY_ORDER[b.day_of_week] ?? 9)
        if (dayDiff !== 0) return dayDiff
        return String(a.start_time || "").localeCompare(String(b.start_time || ""))
      })
  }))

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">מדריכות תעסוקה</h1>
        <p className="text-muted-foreground mt-1">{deptList.length} מחלקות</p>
      </div>
      <OccupationList departments={deptList} />
    </div>
  )
}