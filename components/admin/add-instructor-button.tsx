"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Plus, Check, X } from "lucide-react"
export function AddInstructorButton() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", email: "" })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!form.name) return
    setSaving(true)
    const s = createClient()
    await s.from("instructors").upsert({ name: form.name, phone: form.phone || null, email: form.email || null }, { onConflict: "name" })
    setForm({ name: "", phone: "", email: "" })
    setShow(false)
    setSaving(false)
    router.refresh()
  }
  return (<div className="relative"><button onClick={() => setShow(!show)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl"><Plus className="h-4 w-4" />הוסף מפעיל</button>{show && (<div className="absolute left-0 top-12 bg-white rounded-2xl border shadow-lg p-4 z-50 w-72 space-y-3"><h3 className="font-bold">הוסף מפעיל</h3><input placeholder="שם *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /><input placeholder="טלפון" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" /><input placeholder="אימייל" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" /><div className="flex gap-2"><button onClick={save} disabled={saving || !form.name} className="flex-1 bg-green-500 text-white text-sm py-2 rounded-xl disabled:opacity-50">{saving ? "שומר..." : "שמור"}</button><button onClick={() => setShow(false)} className="flex-1 bg-gray-200 text-gray-700 text-sm py-2 rounded-xl">ביטול</button></div></div>)}</div>)
}