import { createClient } from "@/lib/supabase/server"
import { ResidentsList } from "@/components/admin/residents-list"

export default async function ResidentsPage() {
  const supabase = await createClient()
  const [{ data: residents }, { data: departments }] = await Promise.all([
    supabase.from("residents").select("*, departments(name)").order("name"),
    supabase.from("departments").select("id, name").order("name"),
  ])
  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">דיירים</h1>
          <p className="text-muted-foreground mt-1">{residents?.length || 0} דיירים במערכת</p>
        </div>
      </div>
      <ResidentsList residents={residents || []} departments={departments || []} />
    </div>
  )
}