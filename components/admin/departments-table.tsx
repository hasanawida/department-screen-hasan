"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Edit, Trash2, Monitor, ExternalLink, Settings } from "lucide-react"
import { cleanDepartmentCode, departmentCodeProblem, departmentErrorText } from "@/lib/department-code"

type Department = { id: string; name: string; code: string; color: string }
import Link from "next/link"

interface DepartmentsTableProps {
  departments: Department[]
}

export function DepartmentsTable({ departments }: DepartmentsTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [editForm, setEditForm] = useState({ name: "", code: "", color: "" })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [error, setError] = useState("")

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    setError("")
    const supabase = createClient()
    const { error: deleteError } = await supabase.from("departments").delete().eq("id", deleteId)
    setIsDeleting(false)
    // לא נמחקה (למשל כי יש בה דיירים) — החלון נשאר פתוח עם ההסבר
    if (deleteError) { setError("המחלקה לא נמחקה: " + departmentErrorText(deleteError)); return }
    setDeleteId(null)
    router.refresh()
  }

  const handleEdit = (dept: Department) => {
    setError("")
    setEditingDept(dept)
    setEditForm({ name: dept.name, code: dept.code, color: dept.color })
  }

  const handleSaveEdit = async () => {
    if (!editingDept) return
    setError("")
    const name = editForm.name.trim()
    const code = cleanDepartmentCode(editForm.code)
    if (!name) { setError("צריך שם למחלקה"); return }
    const problem = departmentCodeProblem(code)
    if (problem) { setError(problem); return }
    // הקוד הוא הכתובת של המסך: שינוי שלו מנתק את הטלוויזיות שפתוחות בכתובת הישנה
    if (code !== editingDept.code && !window.confirm(
      `שינוי הקוד משנה את הכתובת של המסך: /display/${code} במקום /display/${editingDept.code}.\n` +
      "טלוויזיות שפתוחות בכתובת הישנה יפסיקו להציג את הלוח עד שיעדכנו בהן את הכתובת. להמשיך?")) return
    setIsSaving(true)
    const supabase = createClient()
    const patch: Record<string, unknown> = { name, code, color: editForm.color }
    // שם חדש — התרגומים של השם הישן (למסך ההתמצאות) נמחקים, והשם יתורגם מחדש
    if (name !== editingDept.name) Object.assign(patch, { name_ar: null, name_ru: null, name_en: null })
    const { error: saveError } = await supabase.from("departments").update(patch).eq("id", editingDept.id)
    setIsSaving(false)
    if (saveError) { setError("לא נשמר: " + departmentErrorText(saveError)); return }
    setEditingDept(null)
    router.refresh()
  }

  if (departments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-lg">
            אין מחלקות במערכת. לחץ על &quot;הוסף מחלקה&quot; כדי להתחיל.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>רשימת מחלקות</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>צבע</TableHead>
                <TableHead>שם</TableHead>
                <TableHead>קוד</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>
                    <div
                      className="w-8 h-8 rounded-full border"
                      style={{ backgroundColor: dept.color }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell className="text-muted-foreground">{dept.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* מסך */}
                      <Link href={`/display/${dept.code}?preview=1`} target="_blank">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Monitor className="h-4 w-4" />
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                      {/* הגדרות מסך */}
                      <Link href={`/admin/display-settings/${dept.code}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
                      {/* עריכה */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(dept)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {/* מחיקה */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(dept.id)}
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
      <Dialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setError("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת מחלקה</DialogTitle>
            <DialogDescription>
              למחוק את המחלקה? יחד איתה נמחקים כל הפעילויות שלה והגדרות המסך שלה. אי אפשר לבטל.
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
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
      <Dialog open={!!editingDept} onOpenChange={() => { setEditingDept(null); setError("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת מחלקה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">שם המחלקה</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">קוד</label>
              <Input
                value={editForm.code}
                onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                הקוד הוא הכתובת של המסך (<span dir="ltr">/display/{cleanDepartmentCode(editForm.code) || "…"}</span>). משנים אותו רק אם חייבים.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">צבע</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingDept(null)}>
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
