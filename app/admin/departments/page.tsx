import { createClient } from "@/lib/supabase/server"
import { DepartmentsTable } from "@/components/admin/departments-table"
import { AddDepartmentDialog } from "@/components/admin/add-department-dialog"

export default async function DepartmentsPage() {
  const supabase = await createClient()
  
  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">מחלקות</h1>
          <p className="text-muted-foreground mt-1">ניהול מחלקות בית האבות</p>
        </div>
        <AddDepartmentDialog />
      </div>

      <DepartmentsTable departments={departments || []} />
    </div>
  )
}
