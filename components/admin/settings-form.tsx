"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save } from "lucide-react"
import type { Department, ScreenSettings } from "@/lib/types"

interface SettingsFormProps {
  departments: Pick<Department, "id" | "name">[]
  settings: (ScreenSettings & { departments: { name: string } | null })[]
}

export function SettingsForm({ departments, settings }: SettingsFormProps) {
  const router = useRouter()
  const [selectedDept, setSelectedDept] = useState(departments[0]?.id || "")
  const [isSaving, setIsSaving] = useState(false)
  
  const currentSettings = settings.find(s => s.department_id === selectedDept)
  
  const [form, setForm] = useState({
    welcome_message: currentSettings?.welcome_message || "ברוכים הבאים",
    show_date: currentSettings?.show_date ?? true,
    show_time: currentSettings?.show_time ?? true,
    transition_interval: currentSettings?.transition_interval || 10,
    theme: currentSettings?.theme || "light",
  })

  const handleDeptChange = (deptId: string) => {
    setSelectedDept(deptId)
    const newSettings = settings.find(s => s.department_id === deptId)
    setForm({
      welcome_message: newSettings?.welcome_message || "ברוכים הבאים",
      show_date: newSettings?.show_date ?? true,
      show_time: newSettings?.show_time ?? true,
      transition_interval: newSettings?.transition_interval || 10,
      theme: newSettings?.theme || "light",
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    if (currentSettings) {
      // Update existing settings
      await supabase
        .from("screen_settings")
        .update({
          welcome_message: form.welcome_message,
          show_date: form.show_date,
          show_time: form.show_time,
          transition_interval: form.transition_interval,
          theme: form.theme,
        })
        .eq("id", currentSettings.id)
    } else {
      // Create new settings
      await supabase
        .from("screen_settings")
        .insert({
          department_id: selectedDept,
          welcome_message: form.welcome_message,
          show_date: form.show_date,
          show_time: form.show_time,
          transition_interval: form.transition_interval,
          theme: form.theme,
        })
    }

    setIsSaving(false)
    router.refresh()
  }

  if (departments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">
            אין מחלקות במערכת. צור מחלקה תחילה כדי להגדיר את הגדרות המסך.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>בחר מחלקה</CardTitle>
          <CardDescription>בחר את המחלקה שברצונך לערוך את הגדרותיה</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedDept} onValueChange={handleDeptChange}>
            <SelectTrigger className="w-full max-w-xs">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הגדרות מסך</CardTitle>
          <CardDescription>התאם את תצוגת מסך המחלקה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium">הודעת ברכה</label>
            <Input
              value={form.welcome_message}
              onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
              placeholder="ברוכים הבאים"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ההודעה תוצג בראש המסך ליד שם המחלקה
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">הצג תאריך</label>
              <p className="text-xs text-muted-foreground">הצג את התאריך הנוכחי במסך</p>
            </div>
            <Switch
              checked={form.show_date}
              onCheckedChange={(checked) => setForm({ ...form, show_date: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">הצג שעה</label>
              <p className="text-xs text-muted-foreground">הצג את השעה הנוכחית במסך</p>
            </div>
            <Switch
              checked={form.show_time}
              onCheckedChange={(checked) => setForm({ ...form, show_time: checked })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">זמן מעבר (שניות)</label>
            <Input
              type="number"
              value={form.transition_interval}
              onChange={(e) => setForm({ ...form, transition_interval: parseInt(e.target.value) || 10 })}
              min={5}
              max={60}
              className="mt-1 max-w-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              זמן בשניות בין מעברי תוכן (מינימום 5, מקסימום 60)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">ערכת נושא</label>
            <Select
              value={form.theme}
              onValueChange={(value: 'light' | 'dark') => setForm({ ...form, theme: value })}
            >
              <SelectTrigger className="w-full max-w-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">בהיר</SelectItem>
                <SelectItem value="dark">כהה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "שומר..." : "שמור הגדרות"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
