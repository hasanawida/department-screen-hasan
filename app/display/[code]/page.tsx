import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DepartmentScreen } from "@/components/display/department-screen"
import type { DepartmentData } from "@/lib/types"

interface DisplayPageProps {
  params: Promise<{ code: string }>
}

async function getDepartmentData(code: string): Promise<DepartmentData | null> {
  const supabase = await createClient()

  // Fetch department by code
  const { data: department, error: deptError } = await supabase
    .from("departments")
    .select("*")
    .eq("code", code)
    .single()

  if (deptError || !department) {
    return null
  }

  // Fetch all related data in parallel
  const [settingsResult, activitiesResult, announcementsResult, tickerResult] = await Promise.all([
    supabase
      .from("screen_settings")
      .select("*")
      .eq("department_id", department.id)
      .single(),
    supabase
      .from("activities")
      .select("*")
      .eq("department_id", department.id)
      .eq("is_active", true)
      .order("start_time", { ascending: true }),
    supabase
      .from("announcements")
      .select("*")
      .eq("department_id", department.id)
      .eq("is_active", true)
      .order("priority", { ascending: false }),
    supabase
      .from("ticker_messages")
      .select("*")
      .or(`department_id.eq.${department.id},is_global.eq.true`)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ])

  return {
    department,
    settings: settingsResult.data,
    activities: activitiesResult.data || [],
    announcements: announcementsResult.data || [],
    tickerMessages: tickerResult.data || [],
  }
}

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { code } = await params
  const data = await getDepartmentData(code)

  if (!data) {
    notFound()
  }

  return <DepartmentScreen data={data} />
}

export async function generateMetadata({ params }: DisplayPageProps) {
  const { code } = await params
  const supabase = await createClient()
  
  const { data: department } = await supabase
    .from("departments")
    .select("name")
    .eq("code", code)
    .single()

  return {
    title: department ? `${department.name} - מסך המחלקה` : "מסך המחלקה",
    description: "מערכת תצוגת מידע למחלקות",
  }
}
