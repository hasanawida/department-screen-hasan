"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Trash2, Music2, Coffee, Dumbbell, Sparkles, Heart, BookOpen, Palette, Users, Search, X } from "lucide-react"
import type { Activity, Department } from "@/lib/types"

interface ActivitiesTableProps {
  activities: (Activity & { departments: { name: string } | null })[]
  departments: Pick<Department, "id" | "name">[]
}

const DAY_OPTIONS = [
  { value: "א'", label: "ראשון" },
  { value: "ב'", label: "שני" },
  { value: "ג'", label: "שלישי" },
  { value: "ד'", label: "רביעי" },
  { value: "ה'", label: "חמישי" },
  { value: "ו'", label: "שישי" },
  { value: "ש'", label: "שבת" },
]

const DAY_ORDER: Record<string, number> = { "א'": 1, "ב'": 2, "ג'": 3, "ד'": 4, "ה'": 5, "ו'": 6, "ש'": 7 }

const CATEGORY_OPTIONS = [
  { value: "default", label: "כללי", icon: Sparkles },
  { value: "music", label: "מוזיקה", icon: Music2 },
  { value: "coffee", label: "הפסקה", icon: Coffee },
  { value: "exercise", label: "התעמלות", icon: Dumbbell },
  { value: "health", label: "בריאות", icon: Heart },
  { value: "education", label: "לימודים", icon: BookOpen },
  { value: "art", label: "אמנות", icon: Palette },
  { value: "social", label: "חברתי", icon: Users },
]

export function ActivitiesTable({ activities, departments }: ActivitiesTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [filterDept, setFilterDept] = useState<string>("all")
  const [filterDay, setFilterDay] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchText, setSearchText] = useState<string>("")
  const [editForm, setEditForm] = useState({
    title: "", description: "", start_time: "", end_time: "",
    location: "", department_id: "", instructor_name: "",
    participants: "", day_of_week: "", category: "default",
    image_url: "", is_active: true, activity_date: "", is_recurring: true,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const search = searchText.trim().toLowerCase()
  const filteredActivities = activities.filter((a) => {
    if (filterDept !== "all" && a.department_id !== filterDept) return false
    if (filterDay !== "all" && (a as any).day_of_week !== filterDay) return false
    if (filterCategory !== "all" && ((a as any).category || "default") !== filterCategory) return false
    if (filterStatus === "active" && !a.is_active) return false
    if (filterStatus === "inactive" && a.is_active) return false
    if (search) {
      const haystack = [
        a.title,
        a.description,
        a.location,
        a.instructor_name,
        a.participants,
        a.departments?.name,
      ].filter(Boolean).join(" ").toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })

  // מיון לפי יום (א'→ש') ואז לפי שעת התחלה
  const sortedActivities = [...filteredActivities].sort((x, y) => {
    const dx = DAY_ORDER[(x as any).day_of_week as string] ?? 99
    const dy = DAY_ORDER[(y as any).day_of_week as string] ?? 99
    if (dx !== dy) return dx - dy
    const tx = (x.start_time || "99:99").slice(0, 5)
    const ty = (y.start_time || "99:99").slice(0, 5)
    return tx.localeCompare(ty)
  })

  const groupedByDept: Record<string, typeof activities> = {}
  sortedActivities.forEach(a => {
    const deptName = a.departments?.name || "ללא מחלקה"
    if (!groupedByDept[deptName]) groupedByDept[deptName] = []
    groupedByDept[deptName].push(a)
  })

  const hasAnyFilter = filterDept !== "all" || filterDay !== "all" || filterCategory !== "all" || filterStatus !== "all" || !!search
  function clearFilters() {
    setFilterDept("all")
    setFilterDay("all")
    setFilterCategory("all")
    setFilterStatus("all")
    setSearchText("")
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = (deptActivities: typeof activities) => {
    const allIds = deptActivities.map(a => a.id)
    const allSelected = allIds.every(id => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (allSelected) allIds.forEach(id => next.delete(id))
    else allIds.forEach(id => next.add(id))
    setSelectedIds(next)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    const supabase = createClient()
    await supabase.from("activities").delete().eq("id", deleteId)
    setDeleteId(null)
    setIsDeleting(false)
    router.refresh()
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    const supabase = createClient()
    await supabase.from("activities").delete().in("id", Array.from(selectedIds))
    setSelectedIds(new Set())
    setShowBulkDelete(false)
    setIsDeleting(false)
    router.refresh()
  }

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity)
    setEditForm({
      title: activity.title,
      description: activity.description || "",
      start_time: activity.start_time?.slice(0, 5) || "",
      end_time: activity.end_time?.slice(0, 5) || "",
      location: activity.location || "",
      department_id: activity.department_id,
      instructor_name: activity.instructor_name || "",
      participants: activity.participants || "",
      day_of_week: (activity as any).day_of_week || "",
      category: (activity as any).category || "default",
      image_url: activity.image_url || "",
      is_active: activity.is_active,
      activity_date: (activity as any).activity_date || "",
      is_recurring: (activity as any).is_recurring !== false,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingActivity) return
    setIsSaving(true)
    const supabase = createClient()
    const instructorNameTrimmed = (editForm.instructor_name || "").trim()

    await supabase.from("activities").update({
      title: editForm.title,
      description: editForm.description || null,
      start_time: editForm.start_time,
      end_time: editForm.end_time || null,
      location: editForm.location || null,
      department_id: editForm.department_id,
      instructor_name: instructorNameTrimmed || null,
      participants: editForm.participants || null,
      day_of_week: editForm.day_of_week || null,
      category: editForm.category || null,
      image_url: editForm.image_url || null,
      is_active: editForm.is_active,
      activity_date: editForm.activity_date || null,
      is_recurring: editForm.is_recurring,
    }).eq("id", editingActivity.id)

    // ודא רשומת מפעיל עם view_token
    if (instructorNameTrimmed) {
      const { data: existing } = await supabase
        .from("instructors")
        .select("id, view_token")
        .eq("name", instructorNameTrimmed)
        .maybeSingle()
      if (!existing) {
        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
        await supabase.from("instructors").insert({ name: instructorNameTrimmed, view_token: token })
      } else if (!existing.view_token) {
        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
        await supabase.from("instructors").update({ view_token: token }).eq("id", existing.id)
      }
    }

    setEditingActivity(null)
    setIsSaving(false)
    router.refresh()
  }

  const toggleActive = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from("activities").update({ is_active: !currentState }).eq("id", id)
    router.refresh()
  }

  const getCategoryIcon = (category?: string | null) => {
    const opt = CATEGORY_OPTIONS.find(c => c.value === category)
    const Icon = opt?.icon || Sparkles
    return <Icon className="h-4 w-4" />
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">אין פעילויות במערכת.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="חיפוש כללי — שם, מנחה, מיקום, תיאור, מחלקה..."
              className="pr-10 pl-10"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">מחלקה</label>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המחלקות</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">יום</label>
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הימים</SelectItem>
                  {DAY_OPTIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">קטגוריה</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקטגוריות</SelectItem>
                  {CATEGORY_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">סטטוס</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="active">פעילות בלבד</SelectItem>
                  <SelectItem value="inactive">לא פעילות בלבד</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary">{sortedActivities.length} מתוך {activities.length} פעילויות</Badge>
            {hasAnyFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-3 w-3" /> נקה סינון
              </Button>
            )}
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" className="gap-2 mr-auto" onClick={() => setShowBulkDelete(true)}>
                <Trash2 className="h-4 w-4" />מחק {selectedIds.size} פעילויות
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedByDept).map(([deptName, deptActivities]) => {
        const allSelected = deptActivities.every(a => selectedIds.has(a.id))
        return (
          <Card key={deptName} className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Checkbox checked={allSelected} onCheckedChange={() => toggleSelectAll(deptActivities)} />
                <CardTitle className="text-lg">{deptName} ({deptActivities.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>פעיל</TableHead>
                    <TableHead>קטגוריה</TableHead>
                    <TableHead>שם</TableHead>
                    <TableHead>יום</TableHead>
                    <TableHead>תאריך</TableHead>
                    <TableHead>שעה</TableHead>
                    <TableHead>מיקום</TableHead>
                    <TableHead>מנחה</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptActivities.map((activity) => (
                    <TableRow key={activity.id} className={selectedIds.has(activity.id) ? "bg-red-50" : ""}>
                      <TableCell><Checkbox checked={selectedIds.has(activity.id)} onCheckedChange={() => toggleSelect(activity.id)} /></TableCell>
                      <TableCell><Switch checked={activity.is_active} onCheckedChange={() => toggleActive(activity.id, activity.is_active)} /></TableCell>
                      <TableCell>{getCategoryIcon((activity as any).category)}</TableCell>
                      <TableCell className="font-medium">{activity.title}</TableCell>
                      <TableCell className="text-muted-foreground">{(activity as any).day_of_week || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{(activity as any).activity_date ? new Date((activity as any).activity_date).toLocaleDateString("he-IL") : "-"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{activity.start_time?.slice(0, 5)}{activity.end_time && ` - ${activity.end_time.slice(0, 5)}`}</TableCell>
                      <TableCell className="text-muted-foreground">{activity.location || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{activity.instructor_name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(activity)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => setDeleteId(activity.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת פעילות</DialogTitle>
            <DialogDescription>האם אתה בטוח שברצונך למחוק פעילות זו?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>ביטול</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? "מוחק..." : "מחק"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkDelete} onOpenChange={() => setShowBulkDelete(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת {selectedIds.size} פעילויות</DialogTitle>
            <DialogDescription>האם אתה בטוח שברצונך למחוק {selectedIds.size} פעילויות?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBulkDelete(false)}>ביטול</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>{isDeleting ? "מוחק..." : `מחק ${selectedIds.size} פעילויות`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingActivity} onOpenChange={() => setEditingActivity(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>עריכת פעילות</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">שם הפעילות</label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">תיאור</label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">מחלקה</label>
              <Select value={editForm.department_id} onValueChange={(v) => setEditForm({ ...editForm, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="בחר מחלקה" /></SelectTrigger>
                <SelectContent>{departments.map((dept) => (<SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
              <input type="checkbox" id="edit_is_recurring" checked={editForm.is_recurring} onChange={(e) => setEditForm({ ...editForm, is_recurring: e.target.checked })} className="w-4 h-4" />
              <label htmlFor="edit_is_recurring" className="text-sm font-medium cursor-pointer">פעילות קבועה (חוזרת כל שבוע)</label>
            </div>
            <div>
              <label className="text-sm font-medium">יום בשבוע</label>
              <Select value={editForm.day_of_week} onValueChange={(v) => setEditForm({ ...editForm, day_of_week: v })}>
                <SelectTrigger><SelectValue placeholder="בחר יום" /></SelectTrigger>
                <SelectContent>{DAY_OPTIONS.map((day) => (<SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {!editForm.is_recurring && (
              <div>
                <label className="text-sm font-medium">תאריך ספציפי</label>
                <Input type="date" value={editForm.activity_date} onChange={(e) => setEditForm({ ...editForm, activity_date: e.target.value })} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">קטגוריה ואייקון</label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                <SelectContent>{CATEGORY_OPTIONS.map((cat) => { const Icon = cat.icon; return (<SelectItem key={cat.value} value={cat.value}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{cat.label}</span></div></SelectItem>) })}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">שעת התחלה</label>
                <Input type="time" value={editForm.start_time} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">שעת סיום</label>
                <Input type="time" value={editForm.end_time} onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">מיקום</label>
              <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">שם המנחה</label>
              <Input value={editForm.instructor_name} onChange={(e) => setEditForm({ ...editForm, instructor_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">משתתפים</label>
              <Textarea value={editForm.participants} onChange={(e) => setEditForm({ ...editForm, participants: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">קישור לתמונה</label>
              <Input placeholder="https://..." value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} />
              {editForm.image_url && (<img src={editForm.image_url} alt="תצוגה מקדימה" className="mt-2 rounded-lg max-h-32 object-cover w-full" onError={(e) => (e.currentTarget.style.display = "none")} />)}
            </div>
            <div className="flex items-center gap-2">
              <Switch id="is_active_edit" checked={editForm.is_active} onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })} />
              <label htmlFor="is_active_edit" className="text-sm font-medium">פעיל</label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingActivity(null)}>ביטול</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? "שומר..." : "שמור"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}