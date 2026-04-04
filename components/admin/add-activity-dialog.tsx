"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import type { Department } from "@/lib/types"

interface AddActivityDialogProps {
  departments: Pick<Department, "id" | "name">[]
}

export function AddActivityDialog({ departments }: AddActivityDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    department_id: "",
    instructor_name: "",
    participants: "",
    image_url: "",
    activity_date: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    await supabase.from("activities").insert({
      title: form.title,
      description: form.description || null,
      start_time: form.start_time,
      end_time: form.end_time || null,
      location: form.location || null,
      department_id: form.department_id,
      instructor_name: form.instructor_name || null,
      participants: form.participants || null,
      image_url: form.image_url || null,
      activity_date: form.activity_date || null,
      is_active: true,
    })

    setIsLoading(false)
    setOpen(false)
    setForm({
      title: "", description: "", start_time: "", end_time: "",
      location: "", department_id: "", instructor_name: "",
      participants: "", image_url: "", activity_date: "",
    })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          הוסף פעילות
        </Button>
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
              <Input
                placeholder="לדוגמה: התעמלות בוקר"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">תיאור (אופציונלי)</label>
              <Textarea
                placeholder="תיאור קצר"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">מחלקה</label>
              <Select
                value={form.department_id}
                onValueChange={(value) => setForm({ ...form, department_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר מחלקה" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">תאריך</label>
              <Input
                type="date"
                value={form.activity_date}
                onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">שעת התחלה</label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">שעת סיום</label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">מיקום</label>
              <Input
                placeholder="לדוגמה: חדר כושר"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">שם המנחה</label>
              <Input
                placeholder="לדוגמה: יוסי כהן"
                value={form.instructor_name}
                onChange={(e) => setForm({ ...form, instructor_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">משתתפים</label>
              <Textarea
                placeholder="לדוגמה: דוד לוי, רחל כהן, משה ישראלי"
                value={form.participants}
                onChange={(e) => setForm({ ...form, participants: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">קישור לתמונה (אופציונלי)</label>
              <Input
                placeholder="https://..."
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button type="submit" disabled={isLoading || !form.department_id}>
              {isLoading ? "יוצר..." : "צור פעילות"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}