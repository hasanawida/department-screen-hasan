"use client"

<<<<<<< HEAD
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Loader2, Check, X } from "lucide-react"

interface Activity {
  title: string
  day_of_week: string
  start_time: string
  end_time: string
  location: string
  instructor_name: string
=======
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
>>>>>>> 5e8d02786103f654c4caabd6b54b3308e7ae6bf0
}

interface Department {
  id: string
  name: string
<<<<<<< HEAD
}

export default function ImportPage() {
  const router = useRouter()
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState("")

  const loadDepartments = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("departments").select("id, name").order("name")
    if (data) setDepartments(data)
  }

  useState(() => { loadDepartments() })

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setActivities([])
    setIsDone(false)
    setError("")
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const analyzeImage = async () => {
    if (!image || !imagePreview) return
    setIsAnalyzing(true)
    setError("")
    try {
      const base64 = imagePreview.split(",")[1]
      const mediaType = image.type as "image/jpeg" | "image/png" | "image/webp"
      const response = await fetch("/api/analyze-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType }),
      })
      const data = await response.json()
      if (data.activities) {
        setActivities(data.activities)
      } else {
        setError("לא הצלחתי לקרוא את הלוח. נסה תמונה ברורה יותר.")
      }
    } catch {
      setError("אירעה שגיאה. נסה שוב.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveActivities = async () => {
    if (!selectedDept || activities.length === 0) return
    setIsSaving(true)
    const supabase = createClient()
    for (const activity of activities) {
      await supabase.from("activities").insert({
        title: activity.title,
        start_time: activity.start_time,
        end_time: activity.end_time || null,
        location: activity.location || null,
        instructor_name: activity.instructor_name || null,
        day_of_week: activity.day_of_week || null,
        department_id: selectedDept,
        is_active: true,
      })
    }
    setIsSaving(false)
    setIsDone(true)
    setTimeout(() => router.push("/admin/activities"), 2000)
  }

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index))
  }

  const dayLabel: Record<string, string> = {
    "א'": "ראשון", "ב'": "שני", "ג'": "שלישי",
    "ד'": "רביעי", "ה'": "חמישי", "ו'": "שישי", "ש'": "שבת"
  }

  return (
    <div className="p-6 max-w-3xl" dir="rtl">
      <div className="mb-6">
=======
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
>>>>>>> 5e8d02786103f654c4caabd6b54b3308e7ae6bf0
        <h1 className="text-3xl font-bold">ייבוא לוח פעילויות מתמונה</h1>
        <p className="text-muted-foreground mt-1">צלם את לוח הפעילויות השבועי ו-AI יזין את הפעילויות אוטומטית</p>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>1. בחר מחלקה</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
<<<<<<< HEAD
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="בחר מחלקה" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
=======
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="בחר מחלקה" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
>>>>>>> 5e8d02786103f654c4caabd6b54b3308e7ae6bf0
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
<<<<<<< HEAD
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              {imagePreview ? (
                <img src={imagePreview} alt="לוח פעילויות" className="max-h-44 object-contain rounded" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-10 w-10" />
                  <span>לחץ להעלאת תמונה</span>
                  <span className="text-sm">JPG, PNG, WEBP</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
            {image && (
              <Button className="mt-4 w-full gap-2" onClick={analyzeImage} disabled={isAnalyzing || !selectedDept}>
                {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> מנתח...</> : "נתח עם AI"}
              </Button>
            )}
            {!selectedDept && image && <p className="text-sm text-amber-600 mt-2">בחר מחלקה תחילה</p>}
          </CardContent>
        </Card>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>}
        {activities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>3. אשר פעילויות ({activities.length})</CardTitle>
              <CardDescription>בדוק את הפעילויות שזוהו ומחק שגויות</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activities.map((activity, i) => (
                <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-muted/50 gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{activity.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {activity.day_of_week && <span>{dayLabel[activity.day_of_week] || activity.day_of_week} · </span>}
                      <span dir="ltr">{activity.start_time}{activity.end_time && ` - ${activity.end_time}`}</span>
                      {activity.location && <span> · {activity.location}</span>}
                      {activity.instructor_name && <span> · {activity.instructor_name}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeActivity(i)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {isDone ? (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <Check className="h-5 w-5" /> נשמר בהצלחה!
                </div>
              ) : (
                <Button className="w-full gap-2" onClick={saveActivities} disabled={isSaving}>
                  {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> שומר...</> : `שמור ${activities.length} פעילויות`}
                </Button>
              )}
=======
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
>>>>>>> 5e8d02786103f654c4caabd6b54b3308e7ae6bf0
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}