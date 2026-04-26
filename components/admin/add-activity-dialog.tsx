"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Music2, Coffee, Dumbbell, Sparkles, Heart, BookOpen, Palette, Users } from "lucide-react"
import type { Department } from "@/lib/types"

interface AddActivityDialogProps {
  departments: Pick<Department, "id" | "name">[]
}

const DAY_OPTIONS = [
  { value: "א'", label: "ראשון" },
  { value: "ב'", label: "שני" },
  { value: "ג'", label: "שלישי" },
  { value: "ד'", label: "רביעי" },
  { value: "ה'", label: "חמישי" },
  { value: "ו'", label: "שישי" },
  { value: "ש'", label: "שבת" },
]

const CATEGORY_OPTIONS = [
  { value: "default", label: "כללי", icon: Sparkles },
  { value: "music", label: "מוזיקה", icon: Music2 },
  { value: "coffee", label: "הפסקה", icon: Coffee },
  { value: "exercise", label: "התעמלות", icon: Dumbbell },
  { value: "health", label: "בריאות", icon: Heart },
  { value: "education", label: "לימודים", icon: BookOpen },
  { value: "art", label: "אמנות", icon: Palette },
  { value: "social", label: "חברתי", icon: Users },
]

export function AddActivityDialog({ departments }: AddActivityDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    title: "", description: "", start_time: "", end_time: "",
    location: "", department_id: "", instructor_name: "",
    participants: "", image_url: "", day_of_week: "", category: "default",
    activity_date: "", is_recurring: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const supabase = createClient()
    const instructorNameTrimmed = form.instructor_name.trim()

    await supabase.from("activities").insert({
      title: form.title,
      description: form.description || null,
      start_time: form.start_time,
      end_time: form.end_time || null,
      location: form.location || null,
      department_id: form.department_id,
      instructor_name: instructorNameTrimmed || null,
      participants: form.participants || null,
      image_url: form.image_url || null,
      day_of_week: form.day_of_week || null,
      category: form.category || null,
      activity_date: form.activity_date || null,
      is_recurring: form.is_recurring,
      is_active: true,
    })

    // אם הוקלד שם מפעיל — ודא שיש רשומה ב-instructors עם view_token
    if (instructorNameTrimmed) {
      const { data: existing } = await supabase
        .from("instructors")
        .select("id, view_token")
        .eq("name", instructorNameTrimmed)
        .maybeSingle()
      if (!existing) {
        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
        await supabase.from("instructors").insert({ name: instructorNameTrimmed, view_token: token })
      } else if (!existing.view_token) {
        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
        await supabase.from("instructors").update({ view_token: token }).eq("id", existing.id)
      }
    }

    setIsLoading(false)
    setOpen(false)
    setForm({ title: "", description: "", start_time: "", end_time: "", location: "", department_id: "", instructor_name: "", participants: "", image_url: "", day_of_week: "", category: "default", activity_date: "", is_recurring: true })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />הוסף פעילות</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>הוסף פעילות חדשה</DialogTitle>
            <DialogDescription>צור פעילות חדשה שתוצג במסך המחלקה</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">שם הפעילות</label>
              <Input placeholder="לדוגמה: התעמלות בוקר" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium">תיאור (אופציונלי)</label>
              <Textarea placeholder="תיאור קצר" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">מחלקה</label>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })} required>
                <SelectTrigger><SelectValue placeholder="בחר מחלקה" /></SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
              <input
                type="checkbox"
                id="is_recurring"
                checked={form.is_recurring}
                onChange={(e) => setForm({ ...form, is_recurring: e.target.checked, activity_date: e.target.checked ? "" : form.activity_date })}
                className="w-4 h-4"
              />
              <label htmlFor="is_recurring" className="text-sm font-medium cursor-pointer">פעילות קבועה (חוזרת כל שבוע)</label>
            </div>
            <div>
              <label className="text-sm font-medium">יום בשבוע</label>
              <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })} required>
                <SelectTrigger><SelectValue placeholder="בחר יום" /></SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((day) => (
                    <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!form.is_recurring && (
              <div>
                <label className="text-sm font-medium">תאריך ספציפי</label>
                <Input type="date" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} required={!form.is_recurring} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">קטגוריה ואייקון</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">שעת התחלה</label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">שעת סיום</label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">מיקום</label>
              <Input placeholder="לדוגמה: חדר כושר" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">שם המנחה</label>
              <Input placeholder="לדוגמה: יוסי כהן" value={form.instructor_name} onChange={(e) => setForm({ ...form, instructor_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">משתתפים</label>
              <Textarea placeholder="לדוגמה: דוד לוי, רחל כהן" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">קישור לתמונה (אופציונלי)</label>
              <Input placeholder="https://..." value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              {form.image_url && (
                <img src={form.image_url} alt="תצוגה מקדימה" className="mt-2 rounded-lg max-h-32 object-cover w-full" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button type="submit" disabled={isLoading || !form.department_id}>{isLoading ? "יוצר..." : "צור פעילות"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}