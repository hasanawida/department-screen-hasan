// @ts-nocheck
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import ViewRealtime from "@/components/view/view-realtime"

const DAY_ORDER: Record<string, number> = {
  "א'": 0, "ב'": 1, "ג'": 2, "ד'": 3, "ה'": 4, "ו'": 5, "שבת": 6, "ש'": 6,
}

export default async function ViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: instructor } = await supabase
    .from("instructors")
    .select("name")
    .eq("view_token", token)
    .single()

  const { data: department } = !instructor
    ? await supabase.from("departments").select("id, name").eq("view_token", token).single()
    : { data: null }

  if (!instructor && !department) return notFound()

  const mode: "instructor" | "department" = instructor ? "instructor" : "department"
  const initialName = instructor ? instructor.name : "מדריכת תעסוקה — " + (department as any).name

  let activities: any[] = []
  if (instructor) {
    const { data } = await supabase
      .from("activities")
      .select("id, title, day_of_week, start_time, departments(name)")
      .eq("is_active", true)
      .eq("instructor_name", instructor.name)
      .order("start_time")
    activities = data || []
  } else {
    const { data } = await supabase
      .from("activities")
      .select("id, title, day_of_week, start_time, departments(name)")
      .eq("is_active", true)
      .eq("department_id", department.id)
      .is("instructor_name", null)
    activities = (data || []).sort((a, b) => {
      const dayDiff = (DAY_ORDER[a.day_of_week] ?? 9) - (DAY_ORDER[b.day_of_week] ?? 9)
      if (dayDiff !== 0) return dayDiff
      return String(a.start_time || "").localeCompare(String(b.start_time || ""))
    })
  }

  const ids = activities.map((a) => a.id)
  let participants: any[] = []
  if (ids.length > 0) {
    const { data } = await supabase
      .from("activity_participants")
      .select("activity_id, residents(id, name, room_number, personal_activity)")
      .in("activity_id", ids)
    participants = data || []
  }

  const initialActivities = activities.map((a) => ({
    ...a,
    participants: participants
      .filter((p) => p.activity_id === a.id)
      .map((p) => p.residents)
      .filter(Boolean),
  }))

  return (
    <ViewRealtime
      token={token}
      mode={mode}
      initialName={initialName}
      initialActivities={initialActivities}
    />
  )
}

export const dynamic = "force-dynamic"
