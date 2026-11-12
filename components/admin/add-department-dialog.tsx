"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cleanDepartmentCode, departmentCodeProblem, departmentErrorText } from "@/lib/department-code"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"

export function AddDepartmentDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    code: "",
    color: "#3B82F6",
  })

  const [error, setError] = useState("")
  const code = cleanDepartmentCode(form.code).toLowerCase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const name = form.name.trim()
    if (!name) { setError("צריך שם למחלקה"); return }
    const problem = departmentCodeProblem(code)
    if (problem) { setError(problem); return }
    setIsLoading(true)

    const supabase = createClient()
    const { data: dept, error: insertError } = await supabase
      .from("departments")
      .insert({ name, code, color: form.color })
      .select()
      .single()
    if (insertError || !dept) {
      // לא נוצרה מחלקה — הטופס נשאר פתוח עם ההודעה
      setIsLoading(false)
      setError("המחלקה לא נוצרה: " + departmentErrorText(insertError ?? {}))
      return
    }
    // הגדרות המסך של המחלקה (ברירות המחדל). אם זה נכשל — הן נוצרות בשמירה הראשונה של הגדרה כלשהי
    await supabase.from("screen_settings").insert({ department_id: dept.id })

    setIsLoading(false)
    setOpen(false)
    setForm({ name: "", code: "", color: "#3B82F6" })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          הוסף מחלקה
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>הוסף מחלקה חדשה</DialogTitle>
            <DialogDescription>
              צור מחלקה חדשה עם מסך תצוגה ייעודי
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">שם המחלקה</label>
              <Input
                placeholder="לדוגמה: מחלקה א"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">קוד (לכתובת URL)</label>
              <Input
                placeholder="לדוגמה: dept-a"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                אותיות באנגלית, ספרות ומקף. הכתובת של המסך תהיה: <span dir="ltr">/display/{code || "dept-code"}</span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">צבע</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="flex-1"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
          {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "יוצר..." : "צור מחלקה"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
