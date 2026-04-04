"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Edit, Trash2, Globe } from "lucide-react"
import type { TickerMessage, Department } from "@/lib/types"

interface TickerTableProps {
  messages: (TickerMessage & { departments: { name: string } | null })[]
  departments: Pick<Department, "id" | "name">[]
}

export function TickerTable({ messages, departments }: TickerTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState<TickerMessage | null>(null)
  const [editForm, setEditForm] = useState({
    message: "",
    department_id: "",
    is_global: false,
    display_order: 0,
    is_active: true,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    
    const supabase = createClient()
    await supabase.from("ticker_messages").delete().eq("id", deleteId)
    
    setDeleteId(null)
    setIsDeleting(false)
    router.refresh()
  }

  const handleEdit = (msg: TickerMessage) => {
    setEditingMessage(msg)
    setEditForm({
      message: msg.message,
      department_id: msg.department_id || "",
      is_global: msg.is_global,
      display_order: msg.display_order,
      is_active: msg.is_active,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingMessage) return
    setIsSaving(true)

    const supabase = createClient()
    await supabase
      .from("ticker_messages")
      .update({
        message: editForm.message,
        department_id: editForm.is_global ? null : editForm.department_id || null,
        is_global: editForm.is_global,
        display_order: editForm.display_order,
        is_active: editForm.is_active,
      })
      .eq("id", editingMessage.id)

    setEditingMessage(null)
    setIsSaving(false)
    router.refresh()
  }

  const toggleActive = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase
      .from("ticker_messages")
      .update({ is_active: !currentState })
      .eq("id", id)
    router.refresh()
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">
            אין הודעות שורת רצה במערכת. לחץ על &quot;הוסף הודעה&quot; כדי להתחיל.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>הודעות שורת רצה</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>פעיל</TableHead>
                <TableHead>הודעה</TableHead>
                <TableHead>מחלקה</TableHead>
                <TableHead>סדר</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell>
                    <Switch
                      checked={msg.is_active}
                      onCheckedChange={() => toggleActive(msg.id, msg.is_active)}
                    />
                  </TableCell>
                  <TableCell className="font-medium max-w-md">
                    <div className="truncate">{msg.message}</div>
                  </TableCell>
                  <TableCell>
                    {msg.is_global ? (
                      <Badge variant="secondary" className="gap-1">
                        <Globe className="h-3 w-3" />
                        גלובלי
                      </Badge>
                    ) : (
                      msg.departments?.name || "-"
                    )}
                  </TableCell>
                  <TableCell>{msg.display_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(msg)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDeleteId(msg.id)}
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
      <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>עריכת הודעה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">הודעה</label>
              <Input
                value={editForm.message}
                onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_global"
                checked={editForm.is_global}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_global: checked })}
              />
              <label htmlFor="is_global" className="text-sm font-medium">הודעה גלובלית (מוצגת בכל המחלקות)</label>
            </div>
            {!editForm.is_global && (
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
            )}
            <div>
              <label className="text-sm font-medium">סדר תצוגה</label>
              <Input
                type="number"
                value={editForm.display_order}
                onChange={(e) => setEditForm({ ...editForm, display_order: parseInt(e.target.value) || 0 })}
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
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
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
