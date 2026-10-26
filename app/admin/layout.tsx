import { AdminSidebar } from "@/components/admin/sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let email = ""
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    email = user?.email ?? ""
  } catch {
    // בלי חיבור — רק לא מציגים את כתובת המייל
  }

  return (
    <div className="min-h-screen bg-[#F6F2EE] text-[#3F2F2D] md:flex" dir="rtl">
      <AdminSidebar userEmail={email} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
