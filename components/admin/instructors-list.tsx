"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Phone, Mail, Edit2, Check, X, ChevronDown, ChevronUp, Users, Trash2, Link, Copy } from "lucide-react"

interface Participant { id: string; name: string; room_number?: string | null }
interface Activity { id: string; title: string; day_of_week: string; start_time: string; activity_date?: string | null; departments?: { name: string } | null; participants: Participant[] }
interface Resident { id: string; name: string; room_number?: string | null; leisure_activity?: string | null }
interface Instructor { name: string; acts: Activity[]; phone: string; email: string; id: string | null; view_token?: string | null; residents: Resident[] }

function getLeisureResidents(activity: Activity, residents: Resident[]): Resident[] {
  const titleLower = activity.title.toLowerCase().trim()

  return residents.filter(r => {
    if (!r.leisure_activity) return false
    const items = r.leisure_activity.split(/[,،\n]/).map(a => a.trim().toLowerCase()).filter(Boolean)
    return items.some(item => {
      const itemWords = item.split(" ").filter(w => w.length > 1)
      const titleWords = titleLower.split(" ").filter(w => w.length > 1)
      return titleLower.includes(item) || item.includes(titleLower) ||
        itemWords.some(w => titleWords.some(tw => tw.includes(w) || w.includes(tw)))
    })
  })
}

export function InstructorsList({ instructors }: { instructors: Instructor[] }) {
  const router = useRouter()
  const [data, setData] = useState(instructors)
  const [editing, setEditing] = useState<string | null>(null)
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel("residents-leisure-changes")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "residents" },
        (payload: any) => {
          const updated = payload.new as Resident
          if (!updated) return
          setData(prev => prev.map(inst => ({
            ...inst,
            residents: inst.residents.map(r =>
              r.id === updated.id ? { ...r, ...updated } : r
            )
          })))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const startEdit = (inst: Instructor) => { setEditing(inst.name); setEditPhone(inst.phone); setEditEmail(inst.email) }

  const saveEdit = async (inst: Instructor) => {
    if (inst.id) {
      await supabase.from("instructors").update({ phone: editPhone, email: editEmail }).eq("id", inst.id)
    } else {
      await supabase.from("instructors").insert({ name: inst.name, phone: editPhone, email: editEmail })
    }
    setData(data.map(i => i.name === inst.name ? { ...i, phone: editPhone, email: editEmail } : i))
    setEditing(null)
  }

  const handleDelete = async (inst: Instructor) => {
    if (inst.id) await supabase.from("instructors").delete().eq("id", inst.id)
    setData(data.filter(i => i.name !== inst.name))
    setConfirmDelete(null)
    router.refresh()
  }

  const generateToken = async (inst: Instructor) => {
    if (!inst.id) return
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    await supabase.from("instructors").update({ view_token: token }).eq("id", inst.id)
    setData(data.map(i => i.name === inst.name ? { ...i, view_token: token } : i))
  }

  const copyLink = (token: string) => {
    const url = window.location.origin + "/view/" + token
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {data.map((inst) => {
        const depts = Array.from(new Set(inst.acts.map(a => a.departments?.name).filter(Boolean)))
        const days = Array.from(new Set(inst.acts.map(a => a.day_of_week).filter(Boolean)))

        const totalP = new Set(inst.acts.flatMap(a => {
          const leisureRes = getLeisureResidents(a, inst.residents)
          if (leisureRes.length > 0) return leisureRes.map(r => r.id)
          return a.participants.map(p => p.id)
        })).size

        const waLines = inst.acts.map(a => {
          const t = String(a.start_time || "").slice(0, 5)
          const d = a.activity_date ? " | " + new Date(a.activity_date).toLocaleDateString("he-IL") : ""
          const dep = a.departments?.name ? " | " + a.departments.name : ""
          const leisureRes = getLeisureResidents(a, inst.residents)

          let pl = ""
          if (leisureRes.length > 0) {
            pl = "\n    " + leisureRes.map(r =>
              r.name + (r.room_number ? " (חדר " + r.room_number + ")" : "")
            ).join("\n    ")
          } else if (a.participants.length > 0) {
            pl = "\n    משתתפים: " + a.participants.map(p =>
              p.name + (p.room_number ? " (חדר " + p.room_number + ")" : "")
            ).join(", ")
          }

          return "* " + a.title + " | יום " + a.day_of_week + " " + t + d + dep + pl
        }).join("\n")

        const waText = encodeURIComponent("שלום " + inst.name + ",\n\nלוח הפעילויות שלך:\n" + waLines + "\n\nתודה!")
        const ms = encodeURIComponent("לוח פעילויות - " + inst.name)
        const isE = editing === inst.name
        const isConfirm = confirmDelete === inst.name

        return (
          <div key={inst.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {inst.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-800">{inst.name}</h2>
                  <p className="text-xs text-gray-400">{inst.acts.length} פעילויות · {totalP} משתתפים</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(inst)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => setConfirmDelete(inst.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>

            {isConfirm && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                <p className="text-sm text-red-700 font-medium">למחוק את {inst.name}?</p>
                <p className="text-xs text-red-500">הפעילויות לא יימחקו — רק הרישום במערכת</p>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(inst)} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm py-1.5 rounded-lg">מחק</button>
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-gray-200 text-gray-700 text-sm py-1.5 rounded-lg">ביטול</button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {depts.map(d => (<span key={String(d)} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">{String(d)}</span>))}
              {days.map(d => (<span key={String(d)} className="text-xs bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full">יום {String(d)}</span>))}
              {inst.acts.length === 0 && <span className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">ללא פעילויות</span>}
            </div>

            {isE ? (
              <div className="space-y-2">
                <input type="tel" placeholder="טלפון" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" />
                <input type="email" placeholder="אימייל" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(inst)} className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white text-sm py-2 rounded-xl"><Check className="h-4 w-4" />שמור</button>
                  <button onClick={() => setEditing(null)} className="flex-1 flex items-center justify-center gap-1 bg-gray-200 text-gray-700 text-sm py-2 rounded-xl"><X className="h-4 w-4" />ביטול</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {(inst.phone || inst.email) && (
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {inst.phone && <div dir="ltr">{inst.phone}</div>}
                    {inst.email && <div dir="ltr">{inst.email}</div>}
                  </div>
                )}

                {inst.acts.length > 0 && (
                  <div className="divide-y divide-gray-50 rounded-xl overflow-hidden border border-gray-100">
                    {inst.acts.map(a => {
                      const date = a.activity_date ? " | " + new Date(a.activity_date).toLocaleDateString("he-IL") : ""
                      const dept = a.departments?.name ? " | " + a.departments.name : ""
                      const isExp = expandedActivity === a.id
                      const leisureRes = getLeisureResidents(a, inst.residents)
                      const showLeisure = leisureRes.length > 0
                      const displayParticipants = showLeisure ? leisureRes : a.participants
                      const count = displayParticipants.length

                      return (
                        <div key={a.id}>
                          <div className="flex justify-between items-center text-sm px-3 py-2 bg-gray-50 hover:bg-gray-100">
                            <span className="font-medium text-gray-700 truncate">{a.title}</span>
                            <div className="flex items-center gap-2 shrink-0 mr-2">
                              <span className="text-xs text-gray-400">יום {a.day_of_week} | {String(a.start_time || "").slice(0, 5)}{date}{dept}</span>
                              {count > 0 && (
                                <button
                                  onClick={() => setExpandedActivity(isExp ? null : a.id)}
                                  className={"flex items-center gap-1 text-xs px-2 py-0.5 rounded-full hover:opacity-80 " + (showLeisure ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600")}
                                >
                                  <Users className="h-3 w-3" />
                                  {count}
                                  {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                          {isExp && count > 0 && (
                            <div className={"px-3 py-2 space-y-1 " + (showLeisure ? "bg-orange-50" : "bg-blue-50")}>
                              {displayParticipants.map((p: any) => (
                                <div key={p.id} className="flex items-center gap-2 text-xs">
                                  <span className={"w-1.5 h-1.5 rounded-full shrink-0 " + (showLeisure ? "bg-orange-400" : "bg-blue-400")} />
                                  <span className={"font-medium " + (showLeisure ? "text-orange-800" : "text-blue-800")}>{p.name}</span>
                                  {p.room_number && (
                                    <span className={showLeisure ? "text-orange-400" : "text-blue-400"}>חדר {p.room_number}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {inst.view_token ? (
                  <button
                    onClick={() => copyLink(inst.view_token!)}
                    className="flex items-center justify-center gap-2 w-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium py-2 rounded-xl transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedToken === inst.view_token ? "הקישור הועתק!" : "העתק קישור צפייה"}
                  </button>
                ) : (
                  inst.id && (
                    <button
                      onClick={() => generateToken(inst)}
                      className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:bg-gray-50 text-gray-400 text-xs py-2 rounded-xl transition-colors"
                    >
                      <Link className="h-3 w-3" />צור קישור צפייה אישי
                    </button>
                  )
                )}

                <div className="flex gap-2 pt-1">
                  <a
                    href={inst.phone ? "https://wa.me/972" + inst.phone.replace(/^0/, "").replace(/\D/g, "") + "?text=" + waText : "https://wa.me/?text=" + waText}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                  >
                    <Phone className="h-4 w-4" />WhatsApp
                  </a>
                  <a
                    href={"mailto:" + (inst.email || "") + "?subject=" + ms + "&body=" + waText}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                  >
                    <Mail className="h-4 w-4" />מייל
                  </a>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
