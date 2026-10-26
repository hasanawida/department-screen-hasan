"use client"

// הוספת מפעיל/ה: שם, טלפון ומייל, וקישור אישי לסימון נוכחות.
// אם הגיעו מעריכת פעילות בלוח השבועי — אחרי השמירה חוזרים אליה, עם המפעיל/ה החדש/ה.
// אחרת — בוחרים מחלקה, ועוברים ללוח שלה כדי לשייך את המפעיל/ה לפעילויות.

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Copy, Loader2, Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cleanName, nameKey, similarNames } from "@/lib/participants"

type Dept = { id: string; name: string; code: string }

const newToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
const field = "w-full rounded-xl border border-[#3F2F2D]/15 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#5A826F] focus:ring-2 focus:ring-[#5A826F]/20"

/** כתובת החזרה לעריכת הפעילות, עם שם המפעיל/ה */
export function backWithInstructor(back: string, name: string) {
  return back + (back.includes("?") ? "&" : "?") + "instructor=" + encodeURIComponent(name)
}

/** לוח שבועי של מחלקה, במצב שיוך של מפעיל/ה */
export const assignHref = (code: string, name: string) =>
  `/admin/weekly?dept=${encodeURIComponent(code)}&instructor=${encodeURIComponent(name)}`

export function AddInstructorButton({ existing, departments, autoOpen, back }: {
  existing: string[]
  departments: Dept[]
  autoOpen?: boolean
  /** חזרה לעריכת פעילות בלוח השבועי */
  back?: string | null
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(!!autoOpen)
  const [form, setForm] = useState({ name: "", phone: "", email: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState<{ name: string; token: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  const name = cleanName(form.name)
  const exact = name ? existing.find(n => nameKey(n) === nameKey(name)) : undefined
  const k = nameKey(name)
  const similar = !exact && k.length >= 2
    ? existing.filter(n => similarNames(n, name) || (k.length >= 3 && (nameKey(n).includes(k) || k.includes(nameKey(n)))))
    : []

  /** אחרי שיש מפעיל/ה: חוזרים לפעילות, או מציגים את השלב הבא */
  const finish = (finalName: string, token: string | null) => {
    if (back) { router.push(backWithInstructor(back, finalName)); return }
    setDone({ name: finalName, token })
    setForm({ name: "", phone: "", email: "" })
    router.refresh()
  }

  const pickExisting = async (n: string) => {
    const { data } = await supabase.from("instructors").select("view_token").eq("name", n).maybeSingle()
    finish(n, (data as any)?.view_token ?? null)
  }

  const save = async () => {
    if (!name) { setError("צריך לכתוב שם"); return }
    if (exact) { await pickExisting(exact); return }
    setSaving(true)
    setError("")
    const token = newToken()
    const { error: err } = await supabase.from("instructors").insert({ name, phone: form.phone.trim() || null, email: form.email.trim() || null, view_token: token })
    setSaving(false)
    if (err) { setError("לא נשמר: " + err.message); return }
    finish(name, token)
  }

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(window.location.origin + "/view/" + token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open && !done) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-[#5A826F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5A826F]/90">
        <Plus className="h-4 w-4" /> הוספת מפעיל/ה
      </button>
    )
  }

  if (done) {
    return (
      <section className="w-full rounded-2xl border border-[#5A826F]/30 bg-white p-5 shadow-sm" aria-live="polite">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">«{done.name}» ברשימת המפעילים</h2>
            <p className="mt-1 text-sm text-[#3F2F2D]/70">השלב הבא: לשייך לפעילויות בלוח של מחלקה, ושם לבחור אילו דיירים רשומים.</p>
          </div>
          <button onClick={() => { setDone(null); setOpen(false) }} aria-label="סגירה" className="rounded-full p-1.5 hover:bg-[#E3ECE7]"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">לשייך לפעילות במחלקה:</span>
          {departments.map(d => (
            <Link key={d.id} href={assignHref(d.code, done.name)}
              className="rounded-full bg-[#3F2F2D] px-3.5 py-1.5 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90">{d.name}</Link>
          ))}
        </div>
        {done.token && (
          <button onClick={() => copyLink(done.token!)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-[#5A826F] hover:bg-[#E3ECE7]">
            <Copy className="h-4 w-4" /> {copied ? "הקישור הועתק" : "העתקת הקישור האישי לשליחה"}
          </button>
        )}
      </section>
    )
  }

  return (
    <section className="w-full rounded-2xl border border-[#5A826F]/30 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">מפעיל/ה חדש/ה</h2>
          {back && <p className="mt-1 text-sm text-[#3F2F2D]/70">אחרי השמירה חוזרים לפעילות שערכתם, והמפעיל/ה כבר יהיה/תהיה בה.</p>}
        </div>
        {back
          ? <Link href={back} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#3F2F2D]/70 hover:bg-[#F6F2EE]">ביטול וחזרה לפעילות</Link>
          : <button onClick={() => setOpen(false)} aria-label="סגירה" className="rounded-full p-1.5 hover:bg-[#E3ECE7]"><X className="h-4 w-4" /></button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="sm:col-span-3">
          <span className="mb-1 block text-sm font-semibold text-[#5A826F]">שם מלא</span>
          <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={field} placeholder="למשל: אלדד כהן" />
        </label>
        <label className="sm:col-span-1">
          <span className="mb-1 block text-sm font-semibold text-[#5A826F]">טלפון (לא חובה)</span>
          <input type="tel" dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={field} />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-[#5A826F]">מייל (לא חובה)</span>
          <input type="email" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={field} />
        </label>
      </div>

      {exact && (
        <p className="mt-3 rounded-xl bg-[#E3ECE7] p-3 text-sm">
          «{exact}» כבר ברשימה. השמירה תשתמש בו/ה, בלי ליצור כפילות.
        </p>
      )}
      {similar.length > 0 && (
        <div className="mt-3 rounded-xl bg-[#FDF0CC] p-3 text-sm">
          <div className="mb-1.5">כבר יש ברשימה שם דומה. אם זה אותו אדם, בוחרים אותו:</div>
          <div className="flex flex-wrap gap-1.5">
            {similar.map(n => (
              <button key={n} type="button" onClick={() => pickExisting(n)}
                className="rounded-full bg-white px-3 py-1 font-semibold hover:bg-[#E3ECE7]">{n}</button>
            ))}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-[#9e4f4f]">{error}</p>}

      <div className="mt-4">
        <button onClick={save} disabled={saving || !name}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3F2F2D] px-5 py-2.5 font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {exact ? (back ? "חזרה לפעילות עם " + exact : "להמשיך עם " + exact) : back ? "שמירה וחזרה לפעילות" : "שמירה"}
        </button>
      </div>
    </section>
  )
}
