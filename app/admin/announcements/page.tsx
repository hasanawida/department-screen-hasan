import { createClient } from "@/lib/supabase/server"
import { AnnouncementsTable } from "@/components/admin/announcements-table"
import { AddAnnouncementDialog } from "@/components/admin/add-announcement-dialog"

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  
  const [announcementsResult, departmentsResult] = await Promise.all([
    supabase
      .from("announcements")
      .select("*, departments(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true }),
  ])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">הודעות</h1>
          <p className="text-muted-foreground mt-1">ניהול הודעות ועדכונים</p>
        </div>
        <AddAnnouncementDialog departments={departmentsResult.data || []} />
      </div>

      <AnnouncementsTable 
        announcements={announcementsResult.data || []} 
        departments={departmentsResult.data || []}
      />
    </div>
  )
}
