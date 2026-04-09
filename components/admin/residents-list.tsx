"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Edit2, Check, X, Upload, Loader2, CheckSquare, Square } from "lucide-react"
import * as XLSX from "xlsx"

interface Resident {
  id: string; name: string; department_id: string | null; room_number: string | null
  phone: string | null; is_active: boolean
  personal_activity?: string | null; group_activity?: string | null; leisure_activity?: string | null
  departments?: { name: string } | null
}
interface Department { id: string; name: string }

export function ResidentsList({ residents, departments }: { residents: Resident[], departments: Department[] }) {
  const router = useRouter()
  const [data, setData] = useState(residents)
  const [filterDept, setFilterDept] = useState("all")
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", room_number: "", phone: "", department_id: "", personal_activity: "", group_activity: "", leisure_activity: "" })
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: "", room_number: "", phone: "", department_id: "", personal_activity: "", group_activity: "", leisure_activity: "" })
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importDept, setImportDept] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [importStats, setImportStats] = useState<{saved: number, matched: number} | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isReassigning, setIsReassigning] = useState(false)
  const [reassignStats, setReassignStats] = useState<{matched: number} | null>(null)

  const filtered = filterDept === "all" ? data : data.filter(r => r.department_id === filterDept)
  const groupedByDept: Record<string, Resident[]> = {}
  filtered.forEach(r => {
    const deptName = r.departments?.name || "ללא מחלקה"
    if (!groupedByDept[deptName]) groupedByDept[deptName] = []
    groupedByDept[deptName].push(r)
  })

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(r => r.id)))
  }

  const toggleSelectDept = (deptResidents: Resident[]) => {
    const ids = deptResidents.map(r => r.id)
    const allSelected = ids.every(id => selected.has(id))
    const next = new Set(selected)
    if (allSelected) ids.forEach(id => next.delete(id))
    else ids.forEach(id => next.add(id))
    setSelected(next)
  }

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()
    await supabase.from("residents").delete().in("id", Array.from(selected))
    setData(data.filter(r => !selected.has(r.id)))
    setSelected(new Set())
    setShowDeleteConfirm(false)
    setIsDeleting(false)
    router.refresh()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "binary" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
      if (!rows.length) return
      const hdrs = rows[0].map((h: any) => String(h || ""))
      setHeaders(hdrs)
      const nC = Math.max(0, hdrs.findIndex((h: string) => h.includes("שם") || h.toLowerCase().includes("name")))
      const rC = hdrs.findIndex((h: string) => h.includes("חדר") || h.toLowerCase().includes("room"))
      const pC = hdrs.findIndex((h: string) => h.includes("טלפון") || h.toLowerCase().includes("phone"))
      const peC = hdrs.findIndex((h: string) => h.includes("פרטני") || h.includes("personal"))
      const gC = hdrs.findIndex((h: string) => h.includes("קבוצתי") || h.includes("group"))
      const lC = hdrs.findIndex((h: string) => h.includes("פנאי") || h.includes("leisure"))
      const result: any[] = []
      rows.forEach((row, i) => {
        if (i === 0) return
        const name = String(row[nC] || "").trim()
        if (!name || name.length < 2) return
        result.push({ name, room_number: rC >= 0 && row[rC] ? String(row[rC]).trim() : "", phone: pC >= 0 && row[pC] ? String(row[pC]).trim() : "", personal_activity: peC >= 0 && row[peC] ? String(row[peC]).trim() : "", group_activity: gC >= 0 && row[gC] ? String(row[gC]).trim() : "", leisure_activity: lC >= 0 && row[lC] ? String(row[lC]).trim() : "" })
      })
      setImportPreview(result)
    }
    reader.readAsBinaryString(file)
  }

  const assignParticipants = async (residentId: string, personal: string, group: string, leisure: string) => {
    const supabase = createClient()
    const terms = [personal, group, leisure].filter(Boolean)
    if (!terms.length) return 0
    const { data: activities } = await supabase.from("activities").select("id, title").eq("is_active", true)
    if (!activities) return 0
    let matched = 0
    const matchedIds = new Set<string>()
    for (const term of terms) {
      const termLower = term.toLowerCase().trim()
      for (const a of activities) {
        if (!matchedIds.has(a.id) && a.title.toLowerCase().includes(termLower)) {
          await supabase.from("activity_participants").upsert(
            { activity_id: a.id, resident_id: residentId },
            { onConflict: "activity_id,resident_id" }
          )
          matchedIds.add(a.id)
          matched++
        }
      }
    }
    return matched
  }

  const handleReassignAll = async () => {
    setIsReassigning(true)
    const supabase = createClient()
    await supabase.from("activity_participants").delete().in("resident_id", data.map(r => r.id))
    let totalMatched = 0
    for (const r of data) {
      totalMatched += await assignParticipants(
        r.id,
        r.personal_activity || "",
        r.group_activity || "",
        r.leisure_activity || ""
      )
    }
    setReassignStats({ matched: totalMatched })
    setIsReassigning(false)
    router.refresh()
  }

  const handleImport = async () => {
    if (!importDept || importPreview.length === 0) return
    setIsImporting(true)
    const supabase = createClient()
    let totalSaved = 0, totalMatched = 0
    for (const r of importPreview) {
      const { data: newRes } = await supabase.from("residents").insert({ name: r.name, room_number: r.room_number || null, phone: r.phone || null, personal_activity: r.personal_activity || null, group_activity: r.group_activity || null, leisure_activity: r.leisure_activity || null, department_id: importDept, is_active: true }).select("*, departments(name)").single()
      if (newRes) { setData(prev => [...prev, newRes]); totalSaved++; totalMatched += await assignParticipants(newRes.id, r.personal_activity, r.group_activity, r.leisure_activity) }
    }
    setImportStats({ saved: totalSaved, matched: totalMatched })
    setImportPreview([]); setShowImport(false); setIsImporting(false)
    router.refresh()
  }

  const handleAdd = async () => {
    if (!addForm.name || !addForm.department_id) return
    setIsSaving(true)
    const supabase = createClient()
    const { data: newRes } = await supabase.from("residents").insert({ name: addForm.name, room_number: addForm.room_number || null, phone: addForm.phone || null, personal_activity: addForm.personal_activity || null, group_activity: addForm.group_activity || null, leisure_activity: addForm.leisure_activity || null, department_id: addForm.department_id, is_active: true }).select("*, departments(name)").single()
    if (newRes) { setData([...data, newRes]); await assignParticipants(newRes.id, addForm.personal_activity, addForm.group_activity, addForm.leisure_activity) }
    setAddForm({ name: "", room_number: "", phone: "", department_id: "", personal_activity: "", group_activity: "", leisure_activity: "" })
    setShowAdd(false); setIsSaving(false); router.refresh()
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from("residents").delete().eq("id", id)
    setData(data.filter(r => r.id !== id))
  }

  const startEdit = (r: Resident) => {
    setEditing(r.id)
    setEditForm({ name: r.name, room_number: r.room_number || "", phone: r.phone || "", department_id: r.department_id || "", personal_activity: r.personal_activity || "", group_activity: r.group_activity || "", leisure_activity: r.leisure_activity || "" })
  }

  const saveEdit = async (id: string) => {
    const supabase = createClient()
    await supabase.from("residents").update({ name: editForm.name, room_number: editForm.room_number || null, phone: editForm.phone || null, department_id: editForm.department_id || null, personal_activity: editForm.personal_activity || null, group_activity: editForm.group_activity || null, leisure_activity: editForm.leisure_activity || null }).eq("id", id)
    setData(data.map(r => r.id === id ? { ...r, ...editForm, departments: departments.find(d => d.id === editForm.department_id) ? { name: departments.find(d => d.id === editForm.department_id)!.name } : r.departments } : r))
    await assignParticipants(id, editForm.personal_activity, editForm.group_activity, editForm.leisure_activity)
    setEditing(null); router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="all">כל המחלקות</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button onClick={toggleSelectAll} className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
          {selected.size > 0 ? `נבחרו ${selected.size}` : "בחר הכל"}
        </button>
        {selected.size > 0 && (
          <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <Trash2 className="h-4 w-4" />מחק {selected.size} נבחרים
          </button>
        )}
        <button onClick={() => { setShowAdd(!showAdd); setShowImport(false) }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus className="h-4 w-4" />הוסף דייר
        </button>
        <button onClick={() => { setShowImport(!showImport); setShowAdd(false); setImportStats(null) }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Upload className="h-4 w-4" />ייבוא מ-Excel
        </button>
        <button onClick={handleReassignAll} disabled={isReassigning} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
          {isReassigning ? <><Loader2 className="h-4 w-4 animate-spin" />משייך...</> : <>🔗 שייך מחדש את כל הדיירים</>}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <p className="font-bold text-red-800">מחיקת {selected.size} דיירים</p>
          <p className="text-sm text-red-600">פעולה זו אינה ניתנת לביטול. כל השיוכים לפעילויות יימחקו גם כן.</p>
          <div className="flex gap-2">
            <button onClick={handleBulkDelete} disabled={isDeleting} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-50">
              {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" />מוחק...</> : <><Trash2 className="h-4 w-4" />מחק {selected.size} דיירים</>}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="flex items-center gap-2 bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-xl"><X className="h-4 w-4" />ביטול</button>
          </div>
        </div>
      )}

      {reassignStats && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <p className="font-bold text-purple-800">✅ שיוך הושלם!</p>
          <p className="text-sm text-purple-700 mt-1">{reassignStats.matched} שיוכים לפעילויות נוצרו</p>
          <button onClick={() => setReassignStats(null)} className="text-xs text-purple-600 mt-1 underline">סגור</button>
        </div>
      )}

      {importStats && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="font-bold text-green-800">✅ יובאו בהצלחה!</p>
          <p className="text-sm text-green-700 mt-1">{importStats.saved} דיירים נשמרו · {importStats.matched} שיוכים לפעילויות נוצרו</p>
          <button onClick={() => setImportStats(null)} className="text-xs text-green-600 mt-1 underline">סגור</button>
        </div>
      )}

      {showImport && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-green-800">ייבוא דיירים מ-Excel</h3>
          <p className="text-sm text-green-700">עמודות: שם | חדר | טלפון | פעילות פרטנית | פעילות קבוצתית | פנאי</p>
          <p className="text-xs text-green-600 bg-green-100 px-3 py-1.5 rounded-lg">המערכת תשייך אוטומטית דיירים לפעילויות התואמות</p>
          <div className="flex gap-3 flex-wrap items-center">
            <label className="flex items-center gap-2 bg-white border border-green-300 text-green-700 text-sm px-4 py-2 rounded-xl cursor-pointer hover:bg-green-50">
              <Upload className="h-4 w-4" />בחר קובץ Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </label>
            <select value={importDept} onChange={e => setImportDept(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">בחר מחלקה *</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {headers.length > 0 && <div className="bg-white rounded-xl border border-green-200 p-2 text-xs text-gray-500">עמודות: {headers.join(" | ")}</div>}
          {importPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-800">נמצאו {importPreview.length} דיירים:</p>
              <div className="max-h-48 overflow-y-auto bg-white rounded-xl border border-green-200 divide-y">
                {importPreview.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div><span className="font-medium">{r.name}</span><span className="text-gray-400 text-xs mr-2">{r.room_number && "חדר " + r.room_number}</span></div>
                    <div className="flex gap-1 text-xs">
                      {r.personal_activity && <span className="bg-purple-50 text-purple-600 px-1.5 rounded">{r.personal_activity}</span>}
                      {r.group_activity && <span className="bg-blue-50 text-blue-600 px-1.5 rounded">{r.group_activity}</span>}
                      {r.leisure_activity && <span className="bg-orange-50 text-orange-600 px-1.5 rounded">{r.leisure_activity}</span>}
                    </div>
                    <button onClick={() => setImportPreview(importPreview.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mr-1"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleImport} disabled={isImporting || !importDept} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-50">
                  {isImporting ? <><Loader2 className="h-4 w-4 animate-spin" />מייבא ומשייך...</> : <><Check className="h-4 w-4" />שמור {importPreview.length} דיירים</>}
                </button>
                <button onClick={() => { setShowImport(false); setImportPreview([]) }} className="flex items-center gap-2 bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-xl"><X className="h-4 w-4" />ביטול</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-blue-800">הוסף דייר חדש</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="שם מלא *" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            <input placeholder="מספר חדר" value={addForm.room_number} onChange={e => setAddForm({...addForm, room_number: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="טלפון" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" dir="ltr" />
            <input placeholder="פעילות פרטנית" value={addForm.personal_activity} onChange={e => setAddForm({...addForm, personal_activity: e.target.value})} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            <input placeholder="פעילות קבוצתית" value={addForm.group_activity} onChange={e => setAddForm({...addForm, group_activity: e.target.value})} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            <input placeholder="פנאי" value={addForm.leisure_activity} onChange={e => setAddForm({...addForm, leisure_activity: e.target.value})} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            <select value={addForm.department_id} onChange={e => setAddForm({...addForm, department_id: e.target.value})} className="border rounded-lg px-3 py-2 text-sm bg-white col-span-2">
              <option value="">בחר מחלקה *</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={isSaving || !addForm.name || !addForm.department_id} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-50">
              <Check className="h-4 w-4" />{isSaving ? "שומר..." : "שמור"}
            </button>
            <button onClick={() => setShowAdd(false)} className="flex items-center gap-2 bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-xl"><X className="h-4 w-4" />ביטול</button>
          </div>
        </div>
      )}

      {Object.entries(groupedByDept).map(([deptName, deptResidents]) => {
        const allDeptSelected = deptResidents.every(r => selected.has(r.id))
        return (
          <div key={deptName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleSelectDept(deptResidents)} className="text-gray-400 hover:text-blue-600">
                  {allDeptSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                </button>
                <h2 className="font-bold text-gray-700">{deptName}</h2>
              </div>
              <span className="text-sm text-gray-400">{deptResidents.length} דיירים</span>
            </div>
            <div className="divide-y divide-gray-50">
              {deptResidents.map(r => (
                <div key={r.id} className={`px-5 py-3 hover:bg-gray-50 transition-colors ${selected.has(r.id) ? "bg-blue-50" : ""}`}>
                  {editing === r.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm col-span-2" />
                        <input placeholder="חדר" value={editForm.room_number} onChange={e => setEditForm({...editForm, room_number: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm" />
                        <input placeholder="טלפון" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm" dir="ltr" />
                        <input placeholder="פעילות פרטנית" value={editForm.personal_activity} onChange={e => setEditForm({...editForm, personal_activity: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm col-span-2" />
                        <input placeholder="פעילות קבוצתית" value={editForm.group_activity} onChange={e => setEditForm({...editForm, group_activity: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm col-span-2" />
                        <input placeholder="פנאי" value={editForm.leisure_activity} onChange={e => setEditForm({...editForm, leisure_activity: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm col-span-2" />
                        <select value={editForm.department_id} onChange={e => setEditForm({...editForm, department_id: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm bg-white col-span-2">
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(r.id)} className="flex items-center gap-1 bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg"><Check className="h-3 w-3" />שמור</button>
                        <button onClick={() => setEditing(null)} className="flex items-center gap-1 bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-lg"><X className="h-3 w-3" />ביטול</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleSelect(r.id)} className="shrink-0 text-gray-400 hover:text-blue-600">
                        {selected.has(r.id) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                      </button>
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">{r.name}</span>
                        <span className="text-sm text-gray-400 mr-2">{r.room_number && "חדר " + r.room_number}</span>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {r.personal_activity && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">פרטני: {r.personal_activity}</span>}
                          {r.group_activity && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">קבוצתי: {r.group_activity}</span>}
                          {r.leisure_activity && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">פנאי: {r.leisure_activity}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">אין דיירים במערכת</p>
          <p className="text-sm mt-1">הוסף דיירים ידנית או העלה קובץ Excel</p>
        </div>
      )}
    </div>
  )
}