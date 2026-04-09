import { createClient } from "@/lib/supabase/server"
import { InstructorsList } from "@/components/admin/instructors-list"
import { AddInstructorButton } from "@/components/admin/add-instructor-button"

export default async function InstructorsPage() {
  const supabase = await createClient()
  const [{ data: activities }, { data: instructorsData }, { data: participants }] = await Promise.all([
    supabase.from("activities").select("id, title, day_of_week, start_time, activity_date, instructor_name, departments(name)").eq("is_active", true).not("instructor_name", "is", null).order("start_time"),
   supabase.from("instructors").select("id, name, phone, email, view_token"),
    supabase.from("activity_participants").select("activity_id, residents(id, name, room_number)"),
  ])

  const map: Record<string, any[]> = {}
  for (const a of activities || []) {
    const name = a.instructor_name?.trim()
    if (!name) continue
    if (!map[name]) map[name] = []
    map[name].push({
      ...a,
      participants: (participants || [])
        .filter(p => p.activity_id === a.id)
        .map(p => p.residents)
        .filter(Boolean)
    })
  }

  const instructors = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0], "he")).map(([name, acts]) => {
    const saved = (instructorsData || []).find((i: any) => i.name === name)
    return { name, acts, phone: saved?.phone || "", email: saved?.email || "", id: saved?.id || null }
  })

  const manualOnly = (instructorsData || [])
    .filter((i: any) => !map[i.name])
    .map((i: any) => ({ name: i.name, acts: [], phone: i.phone || "", email: i.email || "", id: i.id }))

  const allInstructors = [...instructors, ...manualOnly].sort((a, b) => a.name.localeCompare(b.name, "he"))

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">מפעילים</h1>
          <p className="text-muted-foreground mt-1">{allInstructors.length} מפעילים</p>
        </div>
        <AddInstructorButton />
      </div>
      <InstructorsList instructors={allInstructors} />
    </div>
  )
}