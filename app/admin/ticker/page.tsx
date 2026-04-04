import { createClient } from "@/lib/supabase/server"
import { TickerTable } from "@/components/admin/ticker-table"
import { AddTickerDialog } from "@/components/admin/add-ticker-dialog"

export default async function TickerPage() {
  const supabase = await createClient()
  
  const [tickerResult, departmentsResult] = await Promise.all([
    supabase
      .from("ticker_messages")
      .select("*, departments(name)")
      .order("display_order", { ascending: true }),
    supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true }),
  ])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">שורת רצה</h1>
          <p className="text-muted-foreground mt-1">ניהול הודעות שורת הרצה</p>
        </div>
        <AddTickerDialog departments={departmentsResult.data || []} />
      </div>

      <TickerTable 
        messages={tickerResult.data || []} 
        departments={departmentsResult.data || []}
      />
    </div>
  )
}
