"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Image as ImageIcon, X } from "lucide-react"
import type { Department } from "@/lib/types"

interface AddTopicDialogProps {
  departments: Pick<Department, "id" | "name">[]
}

export function AddTopicDialog({ departments }: AddTopicDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [form, setForm] = useState({
    title: "", description: "", week_start: "", department_id: "", image_url: "",
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
      image_url: form.image_url || null,
      is_active: true,
    })
    setIsLoading(false)
    setOpen(false)
    setForm({ title: "", description: "", week_start: "", department_id: "", image_url: "" })
    router.refresh()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()?.toLowerCase()
    const fileName = `topics/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from("department-media").upload(fileName, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from("department-media").getPublicUrl(fileName)
      setForm((f) => ({ ...f, image_url: data.publicUrl }))
    } else {
      alert("שגיאה בהעלאת תמונה: " + error.message)
    }
    setIsUploading(false)
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
            <div>
              <label className="text-sm font-medium">תמונה (אופציונלי)</label>
              {form.image_url ? (
                <div className="mt-2 flex items-center gap-3">
                  <img src={form.image_url} alt="preview" className="h-20 w-20 rounded-lg object-cover border" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, image_url: "" })}>
                    <X className="h-4 w-4 me-1" /> הסר
                  </Button>
                </div>
              ) : (
                <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 hover:bg-slate-50">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm">{isUploading ? "מעלה..." : "בחר תמונה"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                </label>
              )}
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