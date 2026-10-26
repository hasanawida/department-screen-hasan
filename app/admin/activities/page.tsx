import { createClient } from "@/lib/supabase/server"
import { ActivitiesTable } from "@/components/admin/activities-table"
import { AddActivityDialog } from "@/components/admin/add-activity-dialog"
import Link from "next/link"

export default async function ActivitiesPage() {
  const supabase = await createClient()
  
  const [activitiesResult, departmentsResult] = await Promise.all([
    supabase.from("activities").select("*, departments(name)").order("day_of_week", { ascending: true }).order("start_time", { ascending: true }),
    supabase.from("departments").select("id, name").order("name", { ascending: true }),
  ])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">פעילויות</h1>
          <p className="text-muted-foreground mt-1">כל הפעילויות של כל המחלקות. לעריכה נוחה עם תצוגה של המסך — <Link href="/admin/weekly" className="underline">הלוח השבועי</Link>.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/topics" className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">תוכנית נושאים</Link>
          <AddActivityDialog departments={departmentsResult.data || []} />
        </div>
      </div>
      <ActivitiesTable 
        activities={(activitiesResult.data || []) as any} 
        departments={departmentsResult.data || []}
      />
    </div>
  )
}