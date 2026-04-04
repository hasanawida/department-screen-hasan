"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Edit, Trash2 } from "lucide-react"
import type { Activity, Department } from "@/lib/types"

interface ActivitiesTableProps {
  activities: (Activity & { departments: { name: string } | null })[]
  departments: Pick<Department, "id" | "name">[]
}

export function ActivitiesTable({ activities, departments }: ActivitiesTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    department_id: "",
    is_active: true,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    
    const supabase = createClient()
    await supabase.from("activities").delete().eq("id", deleteId)
    
    setDeleteId(null)
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
      is_active: activity.is_active,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingActivity) return
    setIsSaving(true)

    const supabase = createClient()
    await supabase
      .from("activities")
      .update({
        title: editForm.title,
        description: editForm.description || null,
        start_time: editForm.start_time,
        end_time: editForm.end_time || null,
        location: editForm.location || null,
        department_id: editForm.department_id,
        is_active: editForm.is_active,
      })
      .eq("id", editingActivity.id)

    setEditingActivity(null)
    setIsSaving(false)
    router.refresh()
  }

  const toggleActive = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase
      .from("activities")
      .update({ is_active: !currentState })
      .eq("id", id)
    router.refresh()
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">
            אין פעילויות במערכת. לחץ על &quot;הוסף פעילות&quot; כדי להתחיל.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>רשימת פעילויות</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>פעיל</TableHead>
                <TableHead>שם</TableHead>
                <TableHead>מחלקה</TableHead>
                <TableHead>שעה</TableHead>
                <TableHead>מיקום</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <Switch
                      checked={activity.is_active}
                      onCheckedChange={() => toggleActive(activity.id, activity.is_active)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{activity.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {activity.departments?.name || "-"}
                  </TableCell>
                  <TableCell dir="ltr" className="text-right">
                    {activity.start_time?.slice(0, 5)}
                    {activity.end_time && ` - ${activity.end_time.slice(0, 5)}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {activity.location || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(activity)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDeleteId(activity.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת פעילות</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק פעילות זו?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              ביטול
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "מוחק..." : "מחק"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingActivity} onOpenChange={() => setEditingActivity(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>עריכת פעילות</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">שם הפעילות</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">תיאור</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">מחלקה</label>
              <Select
                value={editForm.department_id}
                onValueChange={(value) => setEditForm({ ...editForm, department_id: value })}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">שעת התחלה</label>
                <Input
                  type="time"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">שעת סיום</label>
                <Input
                  type="time"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">מיקום</label>
              <Input
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
              <label htmlFor="is_active" className="text-sm font-medium">פעיל</label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingActivity(null)}>
              ביטול
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
