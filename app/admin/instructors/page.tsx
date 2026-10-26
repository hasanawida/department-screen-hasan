import { createClient } from "@/lib/supabase/server"
import { InstructorsList } from "@/components/admin/instructors-list"
import { AddInstructorButton } from "@/components/admin/add-instructor-button"
import { cleanName } from "@/lib/participants"

export const dynamic = "force-dynamic"
export const revalidate = 0

function genToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export default async function InstructorsPage({ searchParams }: { searchParams: Promise<{ add?: string; back?: string }> }) {
  const sp = await searchParams
  // חזרה רק לעריכת פעילות בלוח השבועי
  const back = typeof sp?.back === "string" && sp.back.startsWith("/admin/weekly") ? sp.back : null
  const supabase = await createClient()
  const [
    { data: activities },
    { data: instructorsData },
    { data: participants },
    { data: departments },
  ] = await Promise.all([
    supabase.from("activities").select("id, title, day_of_week, start_time, activity_date, instructor_name, department_id, parent_id, departments(name)").eq("is_active", true).not("instructor_name", "is", null).order("start_time"),
    supabase.from("instructors").select("id, name, phone, email, view_token"),
    supabase.from("activity_participants").select("activity_id, residents(id, name, room_number, department_id)"),
    supabase.from("departments").select("id, name, code").order("name"),
  ])

  // אוטו-יצירת רשומה (כולל view_token) לכל מפעיל מהפעילויות שעדיין אין לו
  const existingNames = new Set((instructorsData || []).map((i: any) => cleanName(i.name ?? "")).filter(Boolean))
  const namesFromActivities = Array.from(new Set(
    (activities || []).map((a: any) => cleanName(a.instructor_name ?? "")).filter(Boolean)
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

  // הרשומים לפעילות: שלה, ובשינוי לשבוע אחד — של הפעילות הקבועה. רק דיירי המחלקה של הפעילות.
  const map: Record<string, any[]> = {}
  for (const a of activities || []) {
    const name = cleanName(a.instructor_name ?? "")
    if (!name) continue
    if (!map[name]) map[name] = []
    const ids = [a.id, a.parent_id].filter(Boolean)
    const seen = new Set<string>()
    map[name].push({
      ...a,
      participants: (participants || [])
        .filter((p: any) => ids.includes(p.activity_id))
        .map((p: any) => p.residents)
        .filter((r: any) => r && r.department_id === a.department_id && !seen.has(r.id) && seen.add(r.id))
    })
  }

  const instructors = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0], "he")).map(([name, acts]) => {
    const saved = mergedInstructors.find((i: any) => cleanName(i.name ?? "") === name)
    return {
      name,
      acts,
      phone: saved?.phone || "",
      email: saved?.email || "",
      id: saved?.id || null,
      view_token: saved?.view_token || null,
    }
  })

  const manualOnly = mergedInstructors
    .filter((i: any) => !map[cleanName(i.name ?? "")])
    .map((i: any) => ({
      name: cleanName(i.name ?? ""),
      acts: [],
      phone: i.phone || "",
      email: i.email || "",
      id: i.id,
      view_token: i.view_token || null,
    }))

  const allInstructors = [...instructors, ...manualOnly].sort((a, b) => a.name.localeCompare(b.name, "he"))

  const depts = (departments || []) as { id: string; name: string; code: string }[]
  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">מפעילים</h1>
          <p className="text-muted-foreground mt-1">
            {allInstructors.length} מפעילים. מוסיפים כאן מפעיל/ה, ואז משייכים לפעילות בלוח השבועי של המחלקה ובוחרים דיירים.
          </p>
        </div>
        {!(sp?.add === "1" || back) && (
          <AddInstructorButton existing={allInstructors.map(i => i.name)} departments={depts} />
        )}
      </div>
      {(sp?.add === "1" || back) && (
        <div className="mb-6">
          <AddInstructorButton existing={allInstructors.map(i => i.name)} departments={depts} autoOpen back={back} />
        </div>
      )}
      <InstructorsList instructors={allInstructors} departments={depts} />
    </div>
  )
}
