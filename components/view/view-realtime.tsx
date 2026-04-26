"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const DAY_ORDER: Record<string, number> = {
  "א'": 0, "ב'": 1, "ג'": 2, "ד'": 3, "ה'": 4, "ו'": 5, "שבת": 6, "ש'": 6,
}
const PERSONAL_KEYWORDS = ["פרטני", "פרטנית", "אישי", "אישית"]

type Activity = {
  id: string
  title: string
  day_of_week: string
  start_time: string
  departments?: { name: string } | null
  participants: Array<{ id: string; name: string; room_number?: string | null; personal_activity?: string | null }>
}

interface Props {
  token: string
  mode: "instructor" | "department"
  initialName: string
  initialActivities: Activity[]
}

export default function ViewRealtime({ token, mode, initialName, initialActivities }: Props) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [name, setName] = useState(initialName)
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date())
  const [pulse, setPulse] = useState(false)
  const reloadingRef = useRef(false)

  const reload = useCallback(async () => {
    if (reloadingRef.current) return
    reloadingRef.current = true
    try {
      let resolvedName = name
      let acts: any[] = []

      if (mode === "instructor") {
        const { data: inst } = await supabase
          .from("instructors").select("name").eq("view_token", token).single()
        if (inst) resolvedName = inst.name
        const { data } = await supabase
          .from("activities")
          .select("id, title, day_of_week, start_time, departments(name)")
          .eq("is_active", true)
          .eq("instructor_name", resolvedName)
          .order("start_time")
        acts = data || []
      } else {
        const { data: dept } = await supabase
          .from("departments").select("id, name").eq("view_token", token).single()
        if (!dept) return
        resolvedName = "מדריכת תעסוקה — " + dept.name
        const { data } = await supabase
          .from("activities")
          .select("id, title, day_of_week, start_time, departments(name)")
          .eq("is_active", true)
          .eq("department_id", dept.id)
          .is("instructor_name", null)
        acts = data || []
      }

      acts.sort((a: any, b: any) => {
        const dd = (DAY_ORDER[a.day_of_week] ?? 9) - (DAY_ORDER[b.day_of_week] ?? 9)
        if (dd !== 0) return dd
        return String(a.start_time || "").localeCompare(String(b.start_time || ""))
      })

      const ids = acts.map((a: any) => a.id)
      let participants: any[] = []
      if (ids.length > 0) {
        const { data } = await supabase
          .from("activity_participants")
          .select("activity_id, residents(id, name, room_number, personal_activity)")
          .in("activity_id", ids)
        participants = data || []
      }

      const merged: Activity[] = acts.map((a: any) => ({
        ...a,
        participants: participants
          .filter((p) => p.activity_id === a.id)
          .map((p) => p.residents)
          .filter(Boolean),
      }))

      setName(resolvedName)
      setActivities(merged)
      setUpdatedAt(new Date())
      setPulse(true)
      setTimeout(() => setPulse(false), 1500)
    } finally {
      reloadingRef.current = false
    }
  }, [token, mode, name])

  useEffect(() => {
    const channel = supabase
      .channel("view-" + token)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "residents" }, () => reload())
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "activity_participants" }, () => reload())
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "activities" }, () => reload())
      .subscribe()

    const id = setInterval(() => reload(), 30_000)

    return () => {
      clearInterval(id)
      supabase.removeChannel(channel)
    }
  }, [token, reload])

  const totalP = new Set(activities.flatMap((a) => a.participants.map((p) => p.id))).size
  const gradient = mode === "instructor" ? "from-blue-400 to-blue-600" : "from-orange-400 to-pink-500"

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl`}>
              {name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-800 truncate">{name}</h1>
              <p className="text-sm text-gray-400">{activities.length} פעילויות · {totalP} משתתפים</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={"inline-flex items-center gap-1 text-xs " + (pulse ? "text-emerald-600" : "text-gray-300")}>
                  <span className={"w-1.5 h-1.5 rounded-full " + (pulse ? "bg-emerald-500 animate-ping" : "bg-emerald-400")} />
                  {pulse ? "התעדכן זה עתה" : "מעודכן בזמן אמת"}
                </span>
                <span className="text-xs text-gray-300">· {updatedAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {activities.length === 0 && (
            <div className="text-center py-12 text-gray-300">אין פעילויות</div>
          )}
          {activities.map((a) => {
            const isPersonal = PERSONAL_KEYWORDS.some((k) => a.title.includes(k))
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
                    {a.participants.map((p) => (
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
