import { createClient } from "@/lib/supabase/server"
import { InstructorsList } from "@/components/admin/instructors-list"
import { AddInstructorButton } from "@/components/admin/add-instructor-button"

export const dynamic = "force-dynamic"
export const revalidate = 0

function genToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export default async function InstructorsPage() {
  const supabase = await createClient()
  const [
    { data: activities },
    { data: instructorsData },
    { data: participants },
    { data: residents },
  ] = await Promise.all([
    supabase.from("activities").select("id, title, day_of_week, start_time, activity_date, instructor_name, department_id, departments(name)").eq("is_active", true).not("instructor_name", "is", null).order("start_time"),
    supabase.from("instructors").select("id, name, phone, email, view_token"),
    supabase.from("activity_participants").select("activity_id, residents(id, name, room_number)"),
    supabase.from("residents").select("id, name, room_number, leisure_activity, department_id").eq("is_active", true).order("name"),
  ])

  // אוטו-יצירת רשומה (כולל view_token) לכל מפעיל מהפעילויות שעדיין אין לו
  const existingNames = new Set((instructorsData || []).map((i: any) => i.name?.trim()).filter(Boolean))
  const namesFromActivities = Array.from(new Set(
    (activities || []).map((a: any) => a.instructor_name?.trim()).filter(Boolean)
  )) as string[]
  const missing = namesFromActivities.filter((n) => !existingNames.has(n))
  let mergedInstructors = instructorsData || []
  if (missing.length > 0) {
    const rows = missing.map((name) => ({ name, view_token: genToken() }))
    const { data: inserted } = await supabase
      .from("instructors")
      .insert(rows)
      .select("id, name, phone, email, view_token")
    if (inserted) mergedInstructors = [...mergedInstructors, ...inserted]
  }

  // השלמת view_token למפעילים קיימים שאין להם
  const noToken = mergedInstructors.filter((i: any) => !i.view_token && i.id)
  if (noToken.length > 0) {
    await Promise.all(
      noToken.map((i: any) =>
        supabase.from("instructors").update({ view_token: genToken() }).eq("id", i.id)
      )
    )
    const { data: refetched } = await supabase
      .from("instructors")
      .select("id, name, phone, email, view_token")
    if (refetched) mergedInstructors = refetched
  }

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
    const saved = mergedInstructors.find((i: any) => i.name === name)
    const deptIds = Array.from(new Set(acts.map((a: any) => a.department_id).filter(Boolean)))
    const deptResidents = (residents || []).filter(r => deptIds.includes(r.department_id))
    return {
      name,
      acts,
      phone: saved?.phone || "",
      email: saved?.email || "",
      id: saved?.id || null,
      view_token: saved?.view_token || null,
      residents: deptResidents,
    }
  })

  const manualOnly = mergedInstructors
    .filter((i: any) => !map[i.name])
    .map((i: any) => ({
      name: i.name,
      acts: [],
      phone: i.phone || "",
      email: i.email || "",
      id: i.id,
      view_token: i.view_token || null,
      residents: [],
    }))

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