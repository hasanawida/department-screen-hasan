"use client"

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
}

interface Department {
  id: string
  name: string
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
        <h1 className="text-3xl font-bold">ייבוא לוח פעילויות מתמונה</h1>
        <p className="text-muted-foreground mt-1">צלם את לוח הפעילויות השבועי ו-AI יזין את הפעילויות אוטומטית</p>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>1. בחר מחלקה</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="בחר מחלקה" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}