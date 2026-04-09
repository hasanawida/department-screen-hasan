"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Save, Upload, FileText, Monitor, Image, Trash2, Plus } from "lucide-react"
import type { Department, ScreenSettings } from "@/lib/types"

interface MediaItem {
  id?: string
  media_url: string
  media_type: string
  display_order: number
  is_active: boolean
}

interface SettingsFormProps {
  departments: Pick<Department, "id" | "name">[]
  settings: (ScreenSettings & { departments: { name: string } | null })[]
}

type DisplaySettings = {
  show_daily: boolean
  show_weekly: boolean
  show_media: boolean
  show_ticker: boolean
  show_announcements: boolean
  view_interval_seconds: number
}

const DEFAULT_DISPLAY: DisplaySettings = {
  show_daily: true,
  show_weekly: true,
  show_media: true,
  show_ticker: true,
  show_announcements: true,
  view_interval_seconds: 20,
}

const DISPLAY_LABELS: { key: keyof DisplaySettings; label: string; desc: string }[] = [
  { key: "show_daily",         label: "תצוגה יומית",    desc: "עכשיו / בהמשך היום" },
  { key: "show_weekly",        label: "תצוגה שבועית",   desc: "לוח פעילויות שבועי" },
  { key: "show_media",         label: "מדיה",           desc: "תמונות ו-PDF" },
  { key: "show_ticker",        label: "שורת רצה",       desc: "הודעות מתחלפות בתחתית" },
  { key: "show_announcements", label: "הודעות חשובות",  desc: "הודעות מחלקה" },
]

export function SettingsForm({ departments, settings }: SettingsFormProps) {
  const router = useRouter()
  const [selectedDept, setSelectedDept] = useState(departments[0]?.id || "")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY)

  const currentSettings = settings.find(s => s.department_id === selectedDept)

  const [form, setForm] = useState({
    welcome_message: currentSettings?.welcome_message || "ברוכים הבאים",
    show_date: currentSettings?.show_date ?? true,
    show_time: currentSettings?.show_time ?? true,
    transition_interval: currentSettings?.transition_interval || 20,
    theme: currentSettings?.theme || "light",
    display_mode: currentSettings?.display_mode || "daily",
    media_display_seconds: currentSettings?.media_display_seconds || 20,
  })

  // טוען תמונות וhגדרות תצוגה כשמחלקה משתנה
  useEffect(() => {
    if (!selectedDept) return
    const supabase = createClient()

    supabase
      .from("department_media")
      .select("*")
      .eq("department_id", selectedDept)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => setMediaItems(data || []))

    supabase
      .from("screen_settings")
      .select("display_settings")
      .eq("department_id", selectedDept)
      .single()
      .then(({ data }) => {
        if (data?.display_settings) {
          setDisplaySettings({ ...DEFAULT_DISPLAY, ...data.display_settings })
        } else {
          setDisplaySettings(DEFAULT_DISPLAY)
        }
      })
  }, [selectedDept])

  const handleDeptChange = (deptId: string) => {
    setSelectedDept(deptId)
    const s = settings.find(x => x.department_id === deptId)
    setForm({
      welcome_message: s?.welcome_message || "ברוכים הבאים",
      show_date: s?.show_date ?? true,
      show_time: s?.show_time ?? true,
      transition_interval: s?.transition_interval || 20,
      theme: s?.theme || "light",
      display_mode: s?.display_mode || "daily",
      media_display_seconds: s?.media_display_seconds || 20,
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (mediaItems.length + files.length > 10) {
      alert("ניתן להעלות עד 10 תמונות/PDF בלבד")
      return
    }

    setIsUploading(true)
    const supabase = createClient()

    for (const file of files) {
      const fileExt = file.name.split(".").pop()?.toLowerCase()
      const mediaType = fileExt === "pdf" ? "pdf" : "image"
      const fileName = `media/${selectedDept}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      const { data, error } = await supabase.storage
        .from("department-media")
        .upload(fileName, file, { upsert: true })

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from("department-media")
          .getPublicUrl(fileName)

        const { data: newItem } = await supabase
          .from("department_media")
          .insert({
            department_id: selectedDept,
            media_url: urlData.publicUrl,
            media_type: mediaType,
            display_order: mediaItems.length,
            is_active: true,
          })
          .select()
          .single()

        if (newItem) setMediaItems(prev => [...prev, newItem])
      }
    }

    setIsUploading(false)
    e.target.value = ""
  }

  const handleDeleteMedia = async (item: MediaItem, index: number) => {
    const supabase = createClient()
    if (item.id) {
      await supabase.from("department_media").delete().eq("id", item.id)
    }
    setMediaItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()
    const payload = {
      welcome_message: form.welcome_message,
      show_date: form.show_date,
      show_time: form.show_time,
      transition_interval: form.transition_interval,
      theme: form.theme,
      display_mode: form.display_mode,
      media_display_seconds: form.media_display_seconds,
      display_settings: displaySettings,
    }
    if (currentSettings) {
      await supabase.from("screen_settings").update(payload).eq("id", currentSettings.id)
    } else {
      await supabase.from("screen_settings").insert({ department_id: selectedDept, ...payload })
    }
    setIsSaving(false)
    router.refresh()
  }

  if (departments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">אין מחלקות במערכת.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">

      {/* בחר מחלקה */}
      <Card>
        <CardHeader>
          <CardTitle>בחר מחלקה</CardTitle>
          <CardDescription>בחר את המחלקה שברצונך לערוך</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedDept} onValueChange={handleDeptChange}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="בחר מחלקה" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* הגדרות מסך */}
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
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">הצג תאריך</label>
              <p className="text-xs text-muted-foreground">הצג את התאריך הנוכחי במסך</p>
            </div>
            <Switch checked={form.show_date} onCheckedChange={(c) => setForm({ ...form, show_date: c })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">הצג שעה</label>
              <p className="text-xs text-muted-foreground">הצג את השעה הנוכחית במסך</p>
            </div>
            <Switch checked={form.show_time} onCheckedChange={(c) => setForm({ ...form, show_time: c })} />
          </div>
          <div>
            <label className="text-sm font-medium">זמן מעבר (שניות)</label>
            <Input
              type="number"
              value={form.transition_interval}
              onChange={(e) => setForm({ ...form, transition_interval: parseInt(e.target.value) || 20 })}
              min={5} max={120}
              className="mt-1 max-w-xs"
            />
          </div>
          <div>
            <label className="text-sm font-medium">ערכת נושא</label>
            <Select value={form.theme} onValueChange={(v: 'light' | 'dark') => setForm({ ...form, theme: v })}>
              <SelectTrigger className="w-full max-w-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">בהיר</SelectItem>
                <SelectItem value="dark">כהה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── הגדרות תצוגה מתקדמות (חדש) ── */}
      <Card>
        <CardHeader>
          <CardTitle>מה להציג במסך</CardTitle>
          <CardDescription>בחר אילו קטעים יופיעו במסך המחלקה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {DISPLAY_LABELS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={!!displaySettings[key]}
                  onCheckedChange={() =>
                    setDisplaySettings(prev => ({ ...prev, [key]: !prev[key] }))
                  }
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium">מהירות החלפת תצוגות</label>
            <p className="text-xs text-muted-foreground mb-3">כל כמה שניות המסך עובר לתצוגה הבאה</p>
            <div className="flex items-center gap-4">
              <Slider
                min={5} max={60} step={5}
                value={[displaySettings.view_interval_seconds]}
                onValueChange={([v]) =>
                  setDisplaySettings(prev => ({ ...prev, view_interval_seconds: v }))
                }
                className="flex-1"
              />
              <span className="w-16 text-center text-sm font-bold text-emerald-700">
                {displaySettings.view_interval_seconds} שנ׳
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* מצב תצוגה */}
      <Card>
        <CardHeader>
          <CardTitle>מצב תצוגה</CardTitle>
          <CardDescription>בחר כיצד יוצג המסך</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {["daily", "weekly", "media"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setForm({ ...form, display_mode: mode })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${form.display_mode === mode ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`}
              >
                {mode === "media" ? <Image className="h-8 w-8" /> : <Monitor className="h-8 w-8" />}
                <span className="text-sm font-medium">
                  {mode === "daily" ? "פעילות יומית" : mode === "weekly" ? "פעילות שבועית" : "תמונה / PDF"}
                </span>
              </button>
            ))}
          </div>

          {form.display_mode === "media" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">זמן תצוגה לכל מסך (שניות)</label>
                <p className="text-xs text-muted-foreground mb-1">כמה שניות להציג כל תמונה/PDF</p>
                <Input
                  type="number"
                  value={form.media_display_seconds}
                  onChange={(e) => setForm({ ...form, media_display_seconds: parseInt(e.target.value) || 20 })}
                  min={5} max={300}
                  className="max-w-xs"
                />
              </div>

              {mediaItems.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">תמונות/PDF מועלים ({mediaItems.length}/10)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {mediaItems.map((item, index) => (
                      <div key={index} className="relative rounded-xl border overflow-hidden bg-muted">
                        {item.media_type === "pdf" ? (
                          <div className="flex items-center gap-2 p-3">
                            <FileText className="h-8 w-8 text-red-500 shrink-0" />
                            <span className="text-sm font-medium truncate">PDF {index + 1}</span>
                          </div>
                        ) : (
                          <img src={item.media_url} alt={`מסך ${index + 1}`} className="w-full h-32 object-cover" />
                        )}
                        <div className="absolute top-1 right-1">
                          <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{index + 1}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(item, index)}
                          className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mediaItems.length < 10 && (
                <div className="border-2 border-dashed border-muted rounded-xl p-6 space-y-3">
                  <div className="text-center">
                    <Plus className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-medium">הוסף תמונות או PDF</p>
                    <p className="text-xs text-muted-foreground">עד {10 - mediaItems.length} נוספים</p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="cursor-pointer"
                  />
                  {isUploading && <p className="text-sm text-center text-muted-foreground animate-pulse">מעלה קבצים...</p>}
                </div>
              )}

              {mediaItems.length >= 10 && (
                <p className="text-sm text-center text-amber-600 font-medium">הגעת למקסימום 10 תמונות/PDF ✓</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="gap-2 w-full">
        <Save className="h-4 w-4" />
        {isSaving ? "שומר..." : "שמור הגדרות"}
      </Button>

    </div>
  )
}
