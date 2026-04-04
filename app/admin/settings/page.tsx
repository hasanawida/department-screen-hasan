import { createClient } from "@/lib/supabase/server"
import { SettingsForm } from "@/components/admin/settings-form"

export default async function SettingsPage() {
  const supabase = await createClient()
  
  const [departmentsResult, settingsResult] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true }),
    supabase
      .from("screen_settings")
      .select("*, departments(name)"),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">הגדרות מסך</h1>
        <p className="text-muted-foreground mt-1">התאמה אישית של הגדרות מסך התצוגה</p>
      </div>

      <SettingsForm 
        departments={departmentsResult.data || []} 
        settings={settingsResult.data || []}
      />
    </div>
  )
}
