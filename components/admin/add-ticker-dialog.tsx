"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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

interface AddTickerDialogProps {
  departments: Pick<Department, "id" | "name">[]
}

export function AddTickerDialog({ departments }: AddTickerDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    message: "",
    department_id: "",
    is_global: true,
    display_order: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    
    await supabase.from("ticker_messages").insert({
      message: form.message,
      department_id: form.is_global ? null : form.department_id || null,
      is_global: form.is_global,
      display_order: form.display_order,
      is_active: true,
    })

    setIsLoading(false)
    setOpen(false)
    setForm({
      message: "",
      department_id: "",
      is_global: true,
      display_order: 0,
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
            <DialogTitle>הוסף הודעה לשורת הרצה</DialogTitle>
            <DialogDescription>
              הודעות שורת רצה מוצגות בתחתית מסך התצוגה
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">הודעה</label>
              <Input
                placeholder="לדוגמה: שבת שלום לכולם!"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_global"
                checked={form.is_global}
                onCheckedChange={(checked) => setForm({ ...form, is_global: checked })}
              />
              <label htmlFor="is_global" className="text-sm font-medium">
                הודעה גלובלית (מוצגת בכל המחלקות)
              </label>
            </div>
            {!form.is_global && (
              <div>
                <label className="text-sm font-medium">מחלקה</label>
                <Select
                  value={form.department_id}
                  onValueChange={(value) => setForm({ ...form, department_id: value })}
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
            )}
            <div>
              <label className="text-sm font-medium">סדר תצוגה</label>
              <Input
                type="number"
                placeholder="0"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                מספר נמוך יותר = יוצג קודם
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isLoading || (!form.is_global && !form.department_id)}>
              {isLoading ? "יוצר..." : "צור הודעה"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
