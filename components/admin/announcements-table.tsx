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
import type { Announcement, Department } from "@/lib/types"

interface AnnouncementsTableProps {
  announcements: (Announcement & { departments: { name: string } | null })[]
  departments: Pick<Department, "id" | "name">[]
}

const priorityLabels = {
  low: { label: "נמוכה", variant: "secondary" as const },
  normal: { label: "רגילה", variant: "default" as const },
  high: { label: "גבוהה", variant: "destructive" as const },
  urgent: { label: "דחופה", variant: "destructive" as const },
}

export function AnnouncementsTable({ announcements, departments }: AnnouncementsTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    priority: "normal" as Announcement["priority"],
    department_id: "",
    is_active: true,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    
    const supabase = createClient()
    await supabase.from("announcements").delete().eq("id", deleteId)
    
    setDeleteId(null)
    setIsDeleting(false)
    router.refresh()
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setEditForm({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      department_id: announcement.department_id,
      is_active: announcement.is_active,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingAnnouncement) return
    setIsSaving(true)

    const supabase = createClient()
    await supabase
      .from("announcements")
      .update({
        title: editForm.title,
        content: editForm.content,
        priority: editForm.priority,
        department_id: editForm.department_id,
        is_active: editForm.is_active,
      })
      .eq("id", editingAnnouncement.id)

    setEditingAnnouncement(null)
    setIsSaving(false)
    router.refresh()
  }

  const toggleActive = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase
      .from("announcements")
      .update({ is_active: !currentState })
      .eq("id", id)
    router.refresh()
  }

  if (announcements.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">
            אין הודעות במערכת. לחץ על &quot;הוסף הודעה&quot; כדי להתחיל.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>רשימת הודעות</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>פעיל</TableHead>
                <TableHead>כותרת</TableHead>
                <TableHead>מחלקה</TableHead>
                <TableHead>עדיפות</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell>
                    <Switch
                      checked={announcement.is_active}
                      onCheckedChange={() => toggleActive(announcement.id, announcement.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{announcement.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {announcement.content}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {announcement.departments?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityLabels[announcement.priority].variant}>
                      {priorityLabels[announcement.priority].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDeleteId(announcement.id)}
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
            <DialogTitle>מחיקת הודעה</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק הודעה זו?
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
      <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>עריכת הודעה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">כותרת</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">תוכן</label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={3}
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
            <div>
              <label className="text-sm font-medium">עדיפות</label>
              <Select
                value={editForm.priority}
                onValueChange={(value) => setEditForm({ ...editForm, priority: value as Announcement["priority"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="normal">רגילה</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="urgent">דחופה</SelectItem>
                </SelectContent>
              </Select>
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
            <Button variant="outline" onClick={() => setEditingAnnouncement(null)}>
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
