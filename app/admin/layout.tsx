import { AdminSidebar } from "@/components/admin/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex" dir="rtl">
      <AdminSidebar userEmail="admin@test.com" />
      <main className="flex-1 bg-muted/30">
        {children}
      </main>
    </div>
  )
}
