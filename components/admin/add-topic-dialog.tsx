"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen } from "lucide-react"
import type { Department } from "@/lib/types"

interface AddTopicDialogProps {
  departments: Pick<Department, "id" | "name">[]
}

export function AddTopicDialog({ departments }: AddTopicDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    title: "", description: "", week_start: "", department_id: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const supabase = createClient()
    await supabase.from("weekly_topics").insert({
      title: form.title,
      description: form.description || null,
      week_start: form.week_start,
      department_id: form.department_id,
      is_active: true,
    })
    setIsLoading(false)
    setOpen(false)
    setForm({ title: "", description: "", week_start: "", department_id: "" })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BookOpen className="h-4 w-4" />נושא שבועי
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>הוסף נושא שבועי</DialogTitle>
            <DialogDescription>נושא שיוצג במסך השבועי של המחלקה</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div>
              <label className="text-sm font-medium">תחילת שבוע</label>
              <Input type="date" value={form.week_start} onChange={(e) => setForm({ ...form, week_start: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium">נושא השבוע</label>
              <Input placeholder="לדוגמה: שבוע האהבה והחברות" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium">תיאור (אופציונלי)</label>
              <Textarea placeholder="פירוט על הנושא..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button type="submit" disabled={isLoading || !form.department_id || !form.week_start}>
              {isLoading ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}