"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Phone, Mail, Users, ChevronDown, ChevronUp, Link, Copy } from "lucide-react"

interface Participant {
  id: string
  name: string
  room_number?: string | null
  personal_activity?: string | null
}

interface Activity {
  id: string
  title: string
  day_of_week: string
  start_time: string
  activity_date?: string | null
  participants: Participant[]
}

interface Resident {
  id: string
  name: string
  room_number?: string | null
  personal_activity?: string | null
  group_activity?: string | null
}

interface Department {
  id: string
  name: string
  acts: Activity[]
  residents: Resident[]
  view_token?: string | null
}

const PERSONAL_KEYWORDS = ["פרטני", "פרטנית", "אישי", "אישית", "personal"]
const GROUP_KEYWORDS = ["קבוצתי", "קבוצתית", "group"]

function isPersonalActivity(title: string) {
  return PERSONAL_KEYWORDS.some(k => title.toLowerCase().includes(k))
}

function isGroupActivity(title: string) {
  return GROUP_KEYWORDS.some(k => title.toLowerCase().includes(k))
}

function getMatchingResidents(activity: Activity, residents: Resident[]): Resident[] {
  const titleLower = activity.title.toLowerCase()

  if (isPersonalActivity(activity.title)) {
    return residents.filter(r => r.personal_activity)
  }

  if (isGroupActivity(activity.title)) {
    return residents.filter(r => {
      if (!r.group_activity) return false
      const activities = r.group_activity.split(/[,،\n]/).map(a => a.trim().toLowerCase())
      return activities.some(a => a && (titleLower.includes(a) || a.includes(titleLower.split(" ")[0])))
    })
  }

  return residents.filter(r => {
    if (!r.group_activity) return false
    const activities = r.group_activity.split(/[,،\n]/).map(a => a.trim().toLowerCase())
    return activities.some(a => {
      if (!a) return false
      const words = a.split(" ").filter(w => w.length > 2)
      return words.some(w => titleLower.includes(w)) || titleLower.includes(a)
    })
  })
}

export function OccupationList({ departments }: { departments: Department[] }) {
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)
  const [deptData, setDeptData] = useState(departments)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel("residents-changes")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "residents" },
        (payload: any) => {
          const updated = payload.new as Resident
          if (!updated) return
          setDeptData(prev => prev.map(dept => ({
            ...dept,
            residents: dept.residents.map(r =>
              r.id === updated.id ? { ...r, ...updated } : r
            )
          })))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const generateToken = async (dept: Department) => {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    await supabase.from("departments").update({ view_token: token }).eq("id", dept.id)
    setDeptData(deptData.map(d => d.id === dept.id ? { ...d, view_token: token } : d))
  }

  const copyLink = (token: string) => {
    const url = window.location.origin + "/view/" + token
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {deptData.map((dept) => {
        const totalP = new Set(
          dept.acts.flatMap(a => getMatchingResidents(a, dept.residents).map(r => r.id))
        ).size

        const waLines = dept.acts.map((a) => {
          const t = String(a.start_time || "").slice(0, 5)
          const isPersonal = isPersonalActivity(a.title)
          const matchingResidents = getMatchingResidents(a, dept.residents)

          let participantsList = ""
          if (matchingResidents.length > 0) {
            participantsList = "\n    " + matchingResidents.map(r => {
              if (isPersonal && r.personal_activity) {
                return r.name + " - " + r.personal_activity + (r.room_number ? " (חדר " + r.room_number + ")" : "")
              }
              return r.name + (r.room_number ? " (חדר " + r.room_number + ")" : "")
            }).join("\n    ")
          }

          return "* " + a.title + " | יום " + a.day_of_week + " " + t + participantsList
        }).join("\n")

        const waText = encodeURIComponent(
          "שלום,\n\nלוח פעילויות מחלקת " + dept.name + ":\n" + waLines + "\n\nתודה!"
        )
        const mailSubject = encodeURIComponent("לוח פעילויות - מחלקת " + dept.name)

        return (
          <div
            key={dept.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                {dept.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">מדריכת תעסוקה</h2>
                <p className="text-xs text-gray-500">מחלקת {dept.name}</p>
                <p className="text-xs text-gray-400">{dept.acts.length} פעילויות · {totalP} משתתפים</p>
              </div>
            </div>

            {dept.acts.length > 0 ? (
              <div className="rounded-xl overflow-hidden border border-gray-100 divide-y divide-gray-100">
                {dept.acts.map((a) => {
                  const isExp = expandedActivity === a.id
                  const isPersonal = isPersonalActivity(a.title)
                  const matchingResidents = getMatchingResidents(a, dept.residents)
                  const count = matchingResidents.length

                  return (
                    <div key={a.id}>
                      <div className="flex justify-between items-center text-sm px-3 py-2 bg-gray-50 hover:bg-gray-100">
                        <span className="font-semibold text-gray-700 truncate">{a.title}</span>
                        <div className="flex items-center gap-2 shrink-0 mr-2">
                          <span className="text-xs text-gray-400">
                            יום {a.day_of_week} | {String(a.start_time || "").slice(0, 5)}
                          </span>
                          {count > 0 ? (
                            <button
                              onClick={() => setExpandedActivity(isExp ? null : a.id)}
                              className={
                                "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full hover:opacity-80 " +
                                (isPersonal ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600")
                              }
                            >
                              <Users className="h-3 w-3" />
                              {count}
                              {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300">0 משתתפים</span>
                          )}
                        </div>
                      </div>

                      {isExp && count > 0 && (
                        <div className={"px-3 py-2 space-y-1.5 " + (isPersonal ? "bg-purple-50" : "bg-blue-50")}>
                          {matchingResidents.map((r) => (
                            <div key={r.id} className="flex items-start gap-2 text-xs">
                              <span className={"w-1.5 h-1.5 rounded-full shrink-0 mt-1 " + (isPersonal ? "bg-purple-400" : "bg-blue-400")} />
                              <div className="flex-1">
                                <span className={"font-semibold " + (isPersonal ? "text-purple-800" : "text-blue-800")}>
                                  {r.name}
                                </span>
                                {isPersonal && r.personal_activity && (
                                  <span className="text-purple-600 font-medium"> — {r.personal_activity}</span>
                                )}
                                {r.room_number && (
                                  <span className={"mr-1 " + (isPersonal ? "text-purple-400" : "text-blue-400")}>
                                    חדר {r.room_number}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-300 text-sm">אין פעילויות במחלקה זו</div>
            )}

            {dept.view_token ? (
              <button
                onClick={() => copyLink(dept.view_token!)}
                className="flex items-center justify-center gap-2 w-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium py-2 rounded-xl transition-colors"
              >
                <Copy className="h-3 w-3" />
                {copiedToken === dept.view_token ? "הקישור הועתק!" : "העתק קישור צפייה"}
              </button>
            ) : (
              <button
                onClick={() => generateToken(dept)}
                className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:bg-gray-50 text-gray-400 text-xs py-2 rounded-xl transition-colors"
              >
                <Link className="h-3 w-3" />
                צור קישור צפייה אישי
              </button>
            )}

            <div className="flex gap-2 pt-1">
              <a
                href={"https://wa.me/?text=" + waText}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                <Phone className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href={"mailto:?subject=" + mailSubject + "&body=" + waText}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                <Mail className="h-4 w-4" />
                מייל
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
