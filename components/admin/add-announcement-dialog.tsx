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
import type { Department, Announcement } from "@/lib/types"

interface AddAnnouncementDialogProps {
  departments: Pick<Department, "id" | "name">[]
}

export function AddAnnouncementDialog({ departments }: AddAnnouncementDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "normal" as Announcement["priority"],
    department_id: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    
    await supabase.from("announcements").insert({
      title: form.title,
      content: form.content,
      priority: form.priority,
      department_id: form.department_id,
      is_active: true,
    })

    setIsLoading(false)
    setOpen(false)
    setForm({
      title: "",
      content: "",
      priority: "normal",
      department_id: "",
    })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          הוסף הודעה
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>הוסף הודעה חדשה</DialogTitle>
            <DialogDescription>
              צור הודעה חדשה שתוצג במסך המחלקה
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">כותרת</label>
              <Input
                placeholder="לדוגמה: ביקור משפחות"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">תוכן ההודעה</label>
              <Textarea
                placeholder="תוכן ההודעה המלא"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={3}
                required
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
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">עדיפות</label>
              <Select
                value={form.priority}
                onValueChange={(value) => setForm({ ...form, priority: value as Announcement["priority"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="normal">רגילה</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="urgent">דחופה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isLoading || !form.department_id}>
              {isLoading ? "יוצר..." : "צור הודעה"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
