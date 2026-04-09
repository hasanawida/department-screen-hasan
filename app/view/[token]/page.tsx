// @ts-nocheck
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

const DAY_ORDER: Record<string, number> = {
  "א'": 0, "ב'": 1, "ג'": 2, "ד'": 3, "ה'": 4, "ו'": 5, "שבת": 6
}
const PERSONAL_KEYWORDS = ["פרטני", "פרטנית", "אישי", "אישית"]

export default async function ViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: instructor } = await supabase
    .from("instructors")
    .select("*")
    .eq("view_token", token)
    .single()

  const { data: department } = !instructor
    ? await supabase.from("departments").select("*").eq("view_token", token).single()
    : { data: null }

  if (!instructor && !department) return notFound()

  const { data: participants } = await supabase
    .from("activity_participants")
    .select("activity_id, residents(id, name, room_number, personal_activity)")

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

  const actsWithP = activities.map(a => ({
    ...a,
    participants: (participants || [])
      .filter(p => p.activity_id === a.id)
      .map(p => p.residents)
      .filter(Boolean)
  }))

  const title = instructor ? instructor.name : "מדריכת תעסוקה — " + department.name
  const totalP = new Set(actsWithP.flatMap(a => a.participants.map((p: any) => p.id))).size
  const gradient = instructor
    ? "from-blue-400 to-blue-600"
    : "from-orange-400 to-pink-500"

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl`}>
              {title.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{title}</h1>
              <p className="text-sm text-gray-400">{actsWithP.length} פעילויות · {totalP} משתתפים</p>
              <p className="text-xs text-gray-300 mt-0.5">עודכן: {new Date().toLocaleDateString("he-IL")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {actsWithP.length === 0 && (
            <div className="text-center py-12 text-gray-300">אין פעילויות</div>
          )}
          {actsWithP.map((a: any) => {
            const isPersonal = PERSONAL_KEYWORDS.some(k => a.title.includes(k))
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                  <span className="font-bold text-gray-800">{a.title}</span>
                  <div className="text-left">
                    <span className="text-sm text-gray-400">יום {a.day_of_week} | {String(a.start_time || "").slice(0, 5)}</span>
                    {a.departments?.name && (
                      <span className="text-xs text-blue-400 block">{a.departments.name}</span>
                    )}
                  </div>
                </div>
                {a.participants.length > 0 ? (
                  <div className="px-4 py-3 space-y-1.5">
                    {a.participants.map((p: any) => (
                      <div key={p.id} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5"></span>
                        <div>
                          <span className="font-medium text-gray-800">{p.name}</span>
                          {isPersonal && p.personal_activity && (
                            <span className="text-purple-600"> — {p.personal_activity}</span>
                          )}
                          {p.room_number && (
                            <span className="text-gray-400 text-xs mr-1">חדר {p.room_number}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-300">אין משתתפים רשומים</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
