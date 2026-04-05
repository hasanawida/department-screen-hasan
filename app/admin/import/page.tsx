"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Upload, Loader2, CheckCircle2, Trash2, Save } from "lucide-react"
import Image from "next/image"

interface Activity {
  name: string
  facilitator: string | null
  day_of_week: string
  start_time: string
  end_time: string | null
  location: string | null
}

interface Department {
  id: string
  name: string
  code: string
}

export default function ImportSchedulePage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState<string>("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const loadDepartments = async () => {
      const { data } = await supabase.from("departments").select("*").order("name")
      setDepartments(data || [])
    }
    loadDepartments()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setActivities([])
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const handleAnalyze = async () => {
    if (!file) {
      toast({ title: "נא לבחור קובץ", variant: "destructive" })
      return
    }
    setAnalyzing(true)
    try {
      const bytes = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))
      const res = await fetch("/api/analyze-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "שגיאה בניתוח")
      setActivities(data.activities)
      toast({ title: `זוהו ${data.activities.length} פעילויות` })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "אירעה שגיאה"
      toast({ title: "שגיאה", description: message, variant: "destructive" })
    } finally {
      setAnalyzing(false)
    }
  }

  const removeActivity = (index: number) => {
    setActivities((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!selectedDept) {
      toast({ title: "נא לבחור מחלקה", variant: "destructive" })
      return
    }
    if (activities.length === 0) {
      toast({ title: "אין פעילויות לשמור", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const rows = activities.map((a) => ({
        department_id: selectedDept,
        title: a.name,
        description: a.facilitator,
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
        location: a.location,
        is_active: true,
      }))
      const { error } = await supabase.from("activities").insert(rows)
      if (error) throw error
      toast({ title: `נשמרו ${rows.length} פעילויות בהצלחה` })
      setActivities([])
      setFile(null)
      setPreviewUrl(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "שגיאה בשמירה"
      toast({ title: "שגיאה בשמירה", description: message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const DAY_COLORS: Record<string, string> = {
    ראשון: "bg-blue-100 text-blue-800",
    שני: "bg-green-100 text-green-800",
    שלישי: "bg-yellow-100 text-yellow-800",
    רביעי: "bg-orange-100 text-orange-800",
    חמישי: "bg-purple-100 text-purple-800",
    שישי: "bg-pink-100 text-pink-800",
    שבת: "bg-gray-100 text-gray-800",
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">ייבוא לוח פעילויות מתמונה</h1>
        <p className="text-muted-foreground mt-1">צלם את לוח הפעילויות השבועי ו-AI יזין את הפעילויות אוטומטית</p>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>1. בחר מחלקה</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-full md:w-80">
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
        <Card>
          <CardHeader>
            <CardTitle>2. העלה תמונה של הלוח</CardTitle>
            <CardDescription>תמונה ברורה של לוח הפעילויות השבועי</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {previewUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border max-h-80">
                  <Image src={previewUrl} alt="תצוגה מקדימה" width={800} height={400} className="w-full object-contain" />
                </div>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} size="sm">החלף תמונה</Button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 hover:border-primary/50 hover:bg-muted/20 transition-colors cursor-pointer flex flex-col items-center gap-3">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-muted-foreground">לחץ לבחירת תמונה</span>
                <span className="text-sm text-muted-foreground/60">PNG, JPG, WEBP</span>
              </button>
            )}
            <Button onClick={handleAnalyze} disabled={!file || analyzing} className="w-full" size="lg">
              {analyzing ? (<><Loader2 className="ml-2 h-5 w-5 animate-spin" />מנתח עם AI...</>) : "נתח עם AI"}
            </Button>
          </CardContent>
        </Card>
        {activities.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    זוהו {activities.length} פעילויות
                  </CardTitle>
                  <CardDescription>בדוק את הנתונים לפני השמירה</CardDescription>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  שמור הכל
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${DAY_COLORS[activity.day_of_week] || "bg-gray-100 text-gray-800"}`}>
                      {activity.day_of_week}
                    </span>
                    <span className="font-medium text-sm tabular-nums text-muted-foreground">
                      {activity.start_time}{activity.end_time && ` - ${activity.end_time}`}
                    </span>
                    <span className="font-semibold flex-1">{activity.name}</span>
                    {activity.facilitator && <span className="text-sm text-muted-foreground">{activity.facilitator}</span>}
                    {activity.location && <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{activity.location}</span>}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeActivity(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}