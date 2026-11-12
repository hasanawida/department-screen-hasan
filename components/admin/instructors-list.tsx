"use client"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Phone, Mail, Edit2, Check, X, ChevronDown, ChevronUp, Users, Trash2, Link, Copy, GitMerge, Loader2 } from "lucide-react"
import { cleanName, nameKey, similarNames } from "@/lib/participants"
import { assignHref } from "@/components/admin/add-instructor-button"
import { israelDateISO, weekStartISO } from "@/lib/week"

interface Participant { id: string; name: string; room_number?: string | null }
interface Activity { id: string; title: string; day_of_week: string; start_time: string; activity_date?: string | null; departments?: { name: string } | null; participants: Participant[] }
interface Instructor {
  name: string; acts: Activity[]; phone: string; email: string; id: string | null; view_token?: string | null
  /** דיירים שסומן אצלם V בפנאי עם המפעיל/ה (בכרטיס הדייר) */
  leisure?: Participant[]
}

const actsLabel = (n: number) => (n === 1 ? "פעילות אחת" : `${n} פעילויות`)
const newToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

export function InstructorsList({ instructors, departments }: { instructors: Instructor[]; departments: { id: string; name: string; code: string }[] }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState(instructors)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState("")
  const [assigning, setAssigning] = useState<string | null>(null)

  // אחרי רענון מהשרת — הרשימה המעודכנת
  useEffect(() => { setData(instructors) }, [instructors])

  /** שמות שכנראה אותו אדם (למשל "אלדד" ו"אלדד כהן") */
  const duplicates = useMemo(() => {
    const out: [Instructor, Instructor][] = []
    for (let i = 0; i < data.length; i++)
      for (let j = i + 1; j < data.length; j++)
        if (similarNames(data[i].name, data[j].name)) out.push([data[i], data[j]])
    return out
  }, [data])

  /** הפעילויות שהשם רשום בהן — נקראות בדפים של 1000 (המגבלה של שאילתה אחת). currentOnly: בלי פעילויות חד-פעמיות שכבר עברו */
  const activityIdsOf = async (name: string, currentOnly = false): Promise<{ ids: string[]; error: string | null }> => {
    const ids: string[] = []
    for (let from = 0; ; from += 1000) {
      let q = supabase.from("activities").select("id, instructor_name").not("instructor_name", "is", null)
      if (currentOnly) q = q.or(`activity_date.is.null,activity_date.gte.${weekStartISO(israelDateISO())}`)
      const { data: rows, error } = await q.order("id").range(from, from + 999)
      if (error) return { ids: [], error: error.message }
      for (const a of (rows ?? []) as { id: string; instructor_name: string | null }[])
        if (cleanName(a.instructor_name ?? "") === name) ids.push(String(a.id))
      if ((rows ?? []).length < 1000) break
    }
    return { ids, error: null }
  }

  const setActivitiesInstructor = async (ids: string[], value: string | null): Promise<string | null> => {
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from("activities").update({ instructor_name: value }).in("id", ids.slice(i, i + 200))
      if (error) return error.message
    }
    return null
  }

  /**
   * בכרטיסי הדיירים שם המפעיל/ה כתוב כטקסט (פנאי / פרטני / קבוצתי). כשהשם משתנה — מחליפים אותו גם שם,
   * אחרת הסימון בכרטיס מפסיק להתאים והדייר/ת נעלם/ת מהרשימה של המפעיל/ה.
   */
  const renameInResidentCards = async (oldName: string, newName: string): Promise<string | null> => {
    const cols = ["leisure_activity", "personal_activity", "group_activity"] as const
    const oldKey = nameKey(oldName)
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await supabase.from("residents").select("id, leisure_activity, personal_activity, group_activity").order("id").range(from, from + 999)
      if (error) return error.message
      for (const r of (rows ?? []) as Record<string, string | null>[]) {
        const patch: Record<string, string> = {}
        for (const c of cols) {
          const terms = String(r[c] ?? "").split(/[,،;\n]+/).map(t => t.trim()).filter(Boolean)
          if (!terms.some(t => nameKey(t) === oldKey)) continue
          const seen = new Set<string>()
          patch[c] = terms.map(t => (nameKey(t) === oldKey ? newName : t))
            .filter(t => { const k = nameKey(t); if (seen.has(k)) return false; seen.add(k); return true })
            .join(", ")
        }
        if (Object.keys(patch).length) {
          const res = await supabase.from("residents").update(patch).eq("id", r.id as string)
          if (res.error) return res.error.message
        }
      }
      if ((rows ?? []).length < 1000) break
    }
    return null
  }

  /**
   * שינוי שם של מפעיל/ה — גם בכל הפעילויות שלו/ה ובכרטיסי הדיירים.
   * אם יש כבר מפעיל/ה בשם החדש — איחוד: הפעילויות עוברות, והרשומה הכפולה נמחקת.
   */
  const renameOrMerge = async (from: Instructor, toName: string): Promise<string | null> => {
    const into = data.find(i => i !== from && nameKey(i.name) === nameKey(toName))
    const target = into ? into.name : cleanName(toName)
    if (!target || target === from.name) return null
    const found = await activityIdsOf(from.name)
    if (found.error) return found.error

    if (from.id && !into?.id) {
      // קודם הרשומה של המפעיל/ה — הקישור האישי, הטלפון והמייל נשארים איתה — ורק אחר כך הפעילויות.
      // בסדר ההפוך, עדכון הפעילויות יוצר במסד רשומה חדשה בשם החדש (עם קישור חדש), ושינוי השם נכשל על כפילות.
      const res = await supabase.from("instructors").update({ name: target }).eq("id", from.id).select("id")
      if (res.error) return res.error.code === "23505" ? `כבר יש מפעיל/ה בשם «${target}». רעננו את העמוד ונסו שוב.` : res.error.message
      if (!res.data?.length) return "הרשומה לא עודכנה. רעננו את העמוד ונסו שוב."
      const err = await setActivitiesInstructor(found.ids, target)
      if (err) return `השם שונה, אבל חלק מהפעילויות עוד רשומות על «${from.name}» (${err}). לחצו "איחוד" כדי להעביר אותן.`
    } else {
      // איחוד לתוך מפעיל/ה שכבר יש לו/ה רשומה (או מפעיל/ה שעוד אין לו/ה רשומה): הפעילויות עוברות לשם החדש
      const err = await setActivitiesInstructor(found.ids, target)
      if (err) return err
      if (from.id) {
        const del = await supabase.from("instructors").delete().eq("id", from.id)
        if (del.error) return "הפעילויות עברו, אבל הרשומה הכפולה לא נמחקה: " + del.error.message
      }
    }
    const cards = await renameInResidentCards(from.name, target)
    return cards ? "השם עודכן בפעילויות, אבל לא בכל כרטיסי הדיירים: " + cards : null
  }

  const merge = async (from: Instructor, into: Instructor) => {
    setBusy(from.name + "|" + into.name)
    const err = await renameOrMerge(from, into.name)
    setBusy(null)
    if (err) { setMsg("האיחוד לא הצליח: " + err); return }
    setMsg(`«${from.name}» אוחד/ה עם «${into.name}». ${from.acts.length ? (from.acts.length === 1 ? "פעילות אחת עברה" : `${from.acts.length} פעילויות עברו`) : "לא היו פעילויות להעביר"}.`)
    router.refresh()
  }

  const startEdit = (inst: Instructor) => { setEditing(inst.name); setEditName(inst.name); setEditPhone(inst.phone); setEditEmail(inst.email); setMsg("") }

  const saveEdit = async (inst: Instructor) => {
    const newName = cleanName(editName) || inst.name
    const into = data.find(i => i !== inst && nameKey(i.name) === nameKey(newName))
    setBusy(inst.name)
    if (newName !== inst.name) {
      const err = await renameOrMerge(inst, newName)
      if (err) { setBusy(null); setMsg("לא נשמר: " + err); router.refresh(); return }
    }
    // טלפון ומייל — על הרשומה שנשארת. באיחוד לא מוחקים מה שכבר כתוב בה
    const finalName = into ? into.name : newName
    const patch: Record<string, string | null> = into
      ? { ...(editPhone ? { phone: editPhone } : {}), ...(editEmail ? { email: editEmail } : {}) }
      : { phone: editPhone || null, email: editEmail || null }
    let rowId: string | null = (into ? into.id : inst.id) ?? null
    let err: string | null = null
    if (!rowId) {
      // אין מזהה בעמוד: אולי הרשומה נוצרה במסד בינתיים (כשהפעילויות עודכנו)
      const row = await supabase.from("instructors").select("id").eq("name", finalName).maybeSingle()
      if (row.error) err = row.error.message
      else rowId = row.data?.id ?? null
    }
    if (!err && rowId && Object.keys(patch).length) err = (await supabase.from("instructors").update(patch).eq("id", rowId)).error?.message ?? null
    if (!err && !rowId) err = (await supabase.from("instructors").insert({ name: finalName, view_token: newToken(), ...patch })).error?.message ?? null
    setBusy(null)
    if (err) { setMsg("הטלפון והמייל לא נשמרו: " + err); router.refresh(); return }
    setEditing(null)
    setMsg(into ? `אוחד/ה עם «${into.name}».` : newName !== inst.name ? `השם עודכן גם בכל הפעילויות ובכרטיסי הדיירים.` : "")
    router.refresh()
  }

  /**
   * מחיקת מפעיל/ה: השם יורד מהפעילויות שבלוח (הן נשארות, בלי מפעיל/ה), והרשומה נמחקת יחד עם הקישור האישי.
   * פעילויות חד-פעמיות שכבר עברו נשארות עם השם, בשביל הדוחות.
   */
  const handleDelete = async (inst: Instructor) => {
    setBusy(inst.name)
    const found = await activityIdsOf(inst.name, true)
    let err = found.error ?? (await setActivitiesInstructor(found.ids, null))
    if (!err && inst.id) err = (await supabase.from("instructors").delete().eq("id", inst.id)).error?.message ?? null
    setBusy(null)
    setConfirmDelete(null)
    if (err) setMsg("המחיקה לא הצליחה: " + err)
    else {
      setData(data.filter(i => i.name !== inst.name))
      setMsg(`«${inst.name}» נמחק/ה.${found.ids.length ? " הפעילויות נשארו בלוח, בלי מפעיל/ה." : ""}`)
    }
    router.refresh()
  }

  const generateToken = async (inst: Instructor) => {
    if (!inst.id) return
    const token = newToken()
    const { error } = await supabase.from("instructors").update({ view_token: token }).eq("id", inst.id)
    if (error) { setMsg("הקישור לא נוצר: " + error.message); return }
    setData(data.map(i => i.name === inst.name ? { ...i, view_token: token } : i))
  }

  const copyLink = (token: string) => {
    const url = window.location.origin + "/view/" + token
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="space-y-5">
      {msg && <p role="status" className="rounded-xl bg-[#E3ECE7] px-4 py-2.5 text-sm font-semibold text-[#375044]">{msg}</p>}

      {duplicates.length > 0 && (
        <section className="rounded-2xl border border-[#FAB822]/60 bg-[#FDF0CC] p-4">
          <h2 className="flex items-center gap-2 font-bold"><GitMerge className="h-4 w-4" /> שמות שנראים כמו אותו מפעיל/ה</h2>
          <p className="mt-1 text-sm text-[#3F2F2D]/70">
            באיחוד, הפעילויות עוברות לשם שנשאר, והקישור האישי של השם השני מפסיק לעבוד. שולחים לו/ה את הקישור של השם שנשאר.
          </p>
          <ul className="mt-3 space-y-2">
            {duplicates.map(([a, b]) => {
              const key = a.name + "|" + b.name
              return (
                <li key={key} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <b>{a.name}</b> ({actsLabel(a.acts.length)}) ו<b>{b.name}</b> ({actsLabel(b.acts.length)})
                  </span>
                  <button onClick={() => merge(a, b)} disabled={!!busy}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#3F2F2D] px-3 py-1.5 font-semibold text-[#F6F2EE] disabled:opacity-60">
                    {busy === a.name + "|" + b.name && <Loader2 className="h-3.5 w-3.5 animate-spin" />} לאחד בשם «{b.name}»
                  </button>
                  <button onClick={() => merge(b, a)} disabled={!!busy}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#3F2F2D]/20 px-3 py-1.5 font-semibold disabled:opacity-60">
                    {busy === b.name + "|" + a.name && <Loader2 className="h-3.5 w-3.5 animate-spin" />} לאחד בשם «{a.name}»
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {data.map((inst) => {
          const depts = Array.from(new Set(inst.acts.map(a => a.departments?.name).filter(Boolean)))
          const days = Array.from(new Set(inst.acts.map(a => a.day_of_week).filter(Boolean)))
          const totalP = new Set(inst.acts.flatMap(a => a.participants.map(p => p.id))).size

          const waLines = inst.acts.map(a => {
            const t = String(a.start_time || "").slice(0, 5)
            const d = a.activity_date ? " | " + new Date(a.activity_date).toLocaleDateString("he-IL") : ""
            const dep = a.departments?.name ? " | " + a.departments.name : ""
            const pl = a.participants.length > 0
              ? "\n    רשומים: " + a.participants.map(p => p.name + (p.room_number ? " (חדר " + p.room_number + ")" : "")).join(", ")
              : ""
            return "* " + a.title + " | יום " + a.day_of_week + " " + t + d + dep + pl
          }).join("\n")

          const waText = encodeURIComponent("שלום " + inst.name + ",\n\nלוח הפעילויות שלך:\n" + waLines + "\n\nתודה!")
          const ms = encodeURIComponent("לוח פעילויות - " + inst.name)
          const isE = editing === inst.name
          const isConfirm = confirmDelete === inst.name
          const mergeInto = isE ? data.find(i => i !== inst && nameKey(i.name) === nameKey(editName)) : undefined

          return (
            <div key={inst.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {inst.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-800">{inst.name}</h2>
                    <p className="text-xs text-gray-400">{actsLabel(inst.acts.length)}, {totalP === 1 ? "רשום/ה אחד/ת" : `${totalP} רשומים`}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(inst)} aria-label={"עריכת " + inst.name} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => setConfirmDelete(inst.name)} aria-label={"מחיקת " + inst.name} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {isConfirm && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                  <p className="text-sm text-red-700 font-medium">למחוק את {inst.name}?</p>
                  <p className="text-xs text-red-500">
                    {inst.acts.length ? "הפעילויות נשארות בלוח, בלי מפעיל/ה. " : ""}הקישור האישי שנשלח למפעיל/ה יפסיק לעבוד.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(inst)} disabled={busy === inst.name} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm py-1.5 rounded-lg">מחק</button>
                    <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-gray-200 text-gray-700 text-sm py-1.5 rounded-lg">ביטול</button>
                  </div>
                </div>
              )}

              {(inst.leisure?.length ?? 0) > 0 && (
                <div className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-800">
                  <span className="font-semibold">בפנאי ({inst.leisure!.length}): </span>
                  {inst.leisure!.map(p => p.name).join(", ")}
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {depts.map(d => (<span key={String(d)} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">{String(d)}</span>))}
                {days.map(d => (<span key={String(d)} className="text-xs bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full">יום {String(d)}</span>))}
                {inst.acts.length === 0 && <span className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">ללא פעילויות</span>}
              </div>

              {isE ? (
                <div className="space-y-2">
                  <input placeholder="שם" aria-label="שם" value={editName} onChange={e => setEditName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  {cleanName(editName) !== inst.name && cleanName(editName) && (
                    <p className="text-xs text-gray-500">
                      {mergeInto
                        ? <>יש כבר מפעיל/ה בשם «{mergeInto.name}». השמירה תאחד ביניהם, והפעילויות ({actsLabel(inst.acts.length)}) יעברו אליו/ה.</>
                        : <>השם יתעדכן גם בפעילויות ({actsLabel(inst.acts.length)}). הקישור האישי נשאר אותו קישור.</>}
                    </p>
                  )}
                  <input type="tel" placeholder="טלפון" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" />
                  <input type="email" placeholder="אימייל" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(inst)} disabled={busy === inst.name} className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white text-sm py-2 rounded-xl disabled:opacity-60">
                      {busy === inst.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{mergeInto ? "שמירה ואיחוד" : "שמור"}
                    </button>
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
                        const count = a.participants.length
                        return (
                          <div key={a.id}>
                            <div className="flex justify-between items-center text-sm px-3 py-2 bg-gray-50 hover:bg-gray-100">
                              <span className="font-medium text-gray-700 truncate">{a.title}</span>
                              <div className="flex items-center gap-2 shrink-0 mr-2">
                                <span className="text-xs text-gray-400">יום {a.day_of_week} | {String(a.start_time || "").slice(0, 5)}{date}{dept}</span>
                                {count > 0 && (
                                  <button onClick={() => setExpandedActivity(isExp ? null : a.id)} aria-expanded={isExp}
                                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full hover:opacity-80 bg-blue-50 text-blue-600">
                                    <Users className="h-3 w-3" />
                                    {count}
                                    {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>
                                )}
                              </div>
                            </div>
                            {isExp && count > 0 && (
                              <div className="px-3 py-2 space-y-1 bg-blue-50">
                                {a.participants.map(p => (
                                  <div key={p.id} className="flex items-center gap-2 text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400" />
                                    <span className="font-medium text-blue-800">{p.name}</span>
                                    {p.room_number && <span className="text-blue-400">חדר {p.room_number}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {assigning === inst.name ? (
                    <div className="rounded-xl bg-[#F6F2EE] p-3">
                      <div className="mb-2 text-sm font-semibold">לאיזו מחלקה? בלוח שלה לוחצים על פעילות, או מוסיפים חדשה:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {departments.map(d => (
                          <a key={d.id} href={assignHref(d.code, inst.name)}
                            className="rounded-full bg-[#3F2F2D] px-3 py-1.5 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90">{d.name}</a>
                        ))}
                        <button onClick={() => setAssigning(null)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#3F2F2D]/60 hover:bg-white">ביטול</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAssigning(inst.name)}
                      className="w-full rounded-xl bg-[#3F2F2D] py-2 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90">
                      שיוך לפעילות בלוח השבועי
                    </button>
                  )}

                  {inst.view_token ? (
                    <button
                      onClick={() => copyLink(inst.view_token!)}
                      className="flex items-center justify-center gap-2 w-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium py-2 rounded-xl transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedToken === inst.view_token ? "הקישור הועתק!" : "העתקת הקישור האישי (פעילויות ונוכחות)"}
                    </button>
                  ) : (
                    inst.id && (
                      <button
                        onClick={() => generateToken(inst)}
                        className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:bg-gray-50 text-gray-400 text-xs py-2 rounded-xl transition-colors"
                      >
                        <Link className="h-3 w-3" />יצירת קישור אישי לפעילויות ולנוכחות
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
    </div>
  )
}
