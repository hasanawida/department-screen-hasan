import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AttendancePortal from "@/components/view/attendance-portal"

export const dynamic = "force-dynamic"
export const metadata = { title: "הפעילויות שלי — אשכולות", robots: { index: false, follow: false } }

/** העמוד האישי של מפעיל (או של מדריכת התעסוקה במחלקה): פעילויות השבוע וסימון נוכחות */
export default async function ViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  // תקלת חיבור היא לא "קישור לא קיים": עמוד התקלה מציע ניסיון נוסף (ולא "הדף לא נמצא", שנראה כאילו הקישור בוטל)
  const { data: instructor, error: e1 } = await supabase.from("instructors").select("name").eq("view_token", token).maybeSingle()
  if (e1) throw new Error(e1.message)
  if (instructor?.name) return <AttendancePortal mode="instructor" name={instructor.name} />

  const { data: department, error: e2 } = await supabase.from("departments").select("id, name").eq("view_token", token).maybeSingle()
  if (e2) throw new Error(e2.message)
  if (department) return <AttendancePortal mode="department" name={department.name} departmentId={department.id} />

  notFound()
}
