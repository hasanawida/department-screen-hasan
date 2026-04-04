import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/admin/sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <AdminSidebar userEmail={user.email || ""} />
      <main className="flex-1 bg-muted/30">
        {children}
      </main>
    </div>
  )
}
