"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Check } from "lucide-react"

interface Department { id: string; name: string }
interface Topic { id: string; title: string; description: string; week_start: string; is_active: boolean; department_id: string }

export default function TopicsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [form, setForm] = useState({ title: "", description: "", week_start: "", department_id: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from("departments").select("id, name").order("name").then(({ data }) => {
      if (data) setDepartments(data)
    })
    loadTopics()
  }, [])

  const loadTopics = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("weekly_topics").select("*, departments(name)").order("week_start", { ascending: false })
    if (data) setTopics(data)
  }

  const handleSubmit = async () => {
    if (!form.title || !form.week_start || !form.department_id) return
    setIsLoading(true)
    const supabase = createClient()
    await supabase.from("weekly_topics").insert({
      title: form.title,
      description: form.description || null,
      week_start: form.week_start,
      department_id: form.department_id,
      is_active: true,
    })
    setForm({ title: "", description: "", week_start: "", department_id: "" })
    setIsLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    loadTopics()
  }

  const deleteTopic = async (id: string) => {
    const supabase = createClient()
    await supabase.from("weekly_topics").delete().eq("id", id)
    loadTopics()
  }

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from("weekly_topics").update({ is_active: !current }).eq("id", id)
    loadTopics()
  }

  return (
    <div className="p-6 max-w-4xl" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">נושא השבוע</h1>
        <p className="text-muted-foreground mt-1">הגדר נושא שבועי שיוצג במסך המחלקה</p>
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle>הוסף נושא חדש</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">מחלקה</label>
            <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
              <SelectTrigger><SelectValue placeholder="בחר מחלקה" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">תחילת שבוע</label>
            <Input type="date" value={form.week_start} onChange={(e) => setForm({ ...form, week_start: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">נושא השבוע</label>
            <Input placeholder="לדוגמה: שבוע האהבה והחברות" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">תיאור (אופציונלי)</label>
            <Textarea placeholder="פירוט על הנושא השבועי..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <Button className="w-full gap-2" onClick={handleSubmit} disabled={isLoading || !form.title || !form.week_start || !form.department_id}>
            {saved ? <><Check className="h-4 w-4" /> נשמר!</> : isLoading ? "שומר..." : <><Plus className="h-4 w-4" /> הוסף נושא</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>נושאים קיימים</CardTitle></CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">אין נושאים עדיין</p>
          ) : (
            <div className="space-y-3">
              {topics.map((topic: any) => (
                <div key={topic.id} className="flex items-center justify-between p-4 rounded-lg border gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{topic.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${topic.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {topic.is_active ? "פעיל" : "לא פעיל"}
                      </span>
                    </div>
                    {topic.description && <p className="text-sm text-muted-foreground">{topic.description}</p>}
                    <div className="text-xs text-muted-foreground mt-1">
                      {topic.departments?.name} · מתחיל {topic.week_start}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleActive(topic.id, topic.is_active)}>
                      {topic.is_active ? "השבת" : "הפעל"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteTopic(topic.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}