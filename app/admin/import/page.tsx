"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Loader2, Check, X, FileText } from "lucide-react"

interface Activity {
  title: string
  day_of_week: string
  start_time: string
  end_time: string
  location: string
  instructor_name: string
  activity_date?: string | null
  is_recurring?: boolean
}

interface Department {
  id: string
  name: string
}

export default function ImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [weeklyTopic, setWeeklyTopic] = useState<string>("")
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState("")

  useState(() => {
    const loadDepartments = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("departments").select("id, name").order("name")
      if (data) setDepartments(data)
    }
    loadDepartments()
  })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const ext = f.name.split(".").pop()?.toLowerCase()
    if (ext === "doc" || ext === "docx") {
      setError("קבצי Word אינם נתמכים. אנא המר ל-PDF או צלם תמונה של הלוח.")
      return
    }
    setFile(f)
    setActivities([])
    setWeeklyTopic("")
    setIsDone(false)
    setError("")
    if (f.type.startsWith("image/")) {
      setFileType("image")
      const reader = new FileReader()
      reader.onload = () => setFilePreview(reader.result as string)
      reader.readAsDataURL(f)
    } else if (ext === "pdf" || f.type === "application/pdf") {
      setFileType("pdf")
      setFilePreview(null)
    }
  }

  const analyzeFile = async () => {
    if (!file) return
    setIsAnalyzing(true)
    setError("")
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1]
        const response = await fetch("/api/analyze-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mediaType: file.type, fileName: file.name }),
        })
        const data = await response.json()
        if (data.error) {
          setError(data.error)
        } else if (data.activities) {
          setActivities(data.activities)
          if (data.weekly_topic) setWeeklyTopic(data.weekly_topic)
        } else {
          setError("לא הצלחתי לקרוא את הקובץ. נסה קובץ ברור יותר.")
        }
        setIsAnalyzing(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError("אירעה שגיאה. נסה שוב.")
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
        activity_date: activity.activity_date || null,
        is_recurring: activity.is_recurring !== false,
        department_id: selectedDept,
        is_active: true,
      })
    }
    if (weeklyTopic) {
      const today = new Date().toISOString().split("T")[0]
      await supabase.from("weekly_topics").insert({
        title: weeklyTopic,
        department_id: selectedDept,
        week_start: today,
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
        <h1 className="text-3xl font-bold">ייבוא לוח פעילויות</h1>
        <p className="text-muted-foreground mt-1">העלה תמונה או PDF — AI יזין את הפעילויות אוטומטית</p>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>1. בחר מחלקה</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="max-w-xs"><SelectValue placeholder="בחר מחלקה" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. העלה קובץ</CardTitle>
            <CardDescription>תמונה (JPG/PNG/WEBP) או PDF בלבד</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  {fileType === "image" && filePreview ? (
                    <img src={filePreview} alt="תצוגה מקדימה" className="max-h-36 object-contain rounded" />
                  ) : (
                    <>
                      <FileText className="h-10 w-10 text-red-500" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-10 w-10" />
                  <span>לחץ להעלאת קובץ</span>
                  <span className="text-sm">JPG, PNG, WEBP, PDF</span>
                </div>
              )}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
            </label>
            {file && (
              <Button className="mt-4 w-full gap-2" onClick={analyzeFile} disabled={isAnalyzing || !selectedDept}>
                {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> מנתח עם AI...</> : "נתח עם AI"}
              </Button>
            )}
            {!selectedDept && file && <p className="text-sm text-amber-600 mt-2">בחר מחלקה תחילה</p>}
          </CardContent>
        </Card>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>}

        {weeklyTopic && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2"><CardTitle className="text-lg text-blue-800">נושא שבועי שזוהה</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <input className="flex-1 bg-white border rounded px-3 py-2 text-sm" value={weeklyTopic} onChange={(e) => setWeeklyTopic(e.target.value)} />
                <Button variant="ghost" size="sm" onClick={() => setWeeklyTopic("")}><X className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-blue-600 mt-1">הנושא יישמר אוטומטית עם הפעילויות</p>
            </CardContent>
          </Card>
        )}

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
                      {activity.activity_date && <span className="text-blue-600"> · {new Date(activity.activity_date).toLocaleDateString("he-IL")}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeActivity(i)}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {isDone ? (
                <div className="flex items-center gap-2 text-green-600 font-medium"><Check className="h-5 w-5" /> נשמר בהצלחה!</div>
              ) : (
                <Button className="w-full gap-2" onClick={saveActivities} disabled={isSaving}>
                  {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> שומר...</> : `שמור ${activities.length} פעילויות${weeklyTopic ? " + נושא שבועי" : ""}`}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}