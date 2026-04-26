"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Building2, Calendar, Monitor, LogOut, Home, LayoutDashboard, Upload, Users, UserRound, GraduationCap, AlertTriangle, Volume2, ShieldCheck, Palette } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminSidebarProps {
  userEmail: string
}

const navItems = [
  { href: "/admin", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/admin/departments", label: "מחלקות", icon: Building2 },
  { href: "/admin/activities", label: "פעילויות", icon: Calendar },
  { href: "/admin/import", label: "ייבוא מתמונה", icon: Upload },
  { href: "/admin/instructors", label: "מפעילים", icon: Users },
  { href: "/admin/occupation", label: "מדריכות תעסוקה", icon: GraduationCap },
  { href: "/admin/residents", label: "דיירים", icon: UserRound },
  { href: "/admin/orientation", label: "מסכי התמצאות", icon: Monitor },
  { href: "/admin/voice-reminders", label: "תזכורת קולית", icon: Volume2 },
  { href: "/admin/users", label: "מנהלי מערכת", icon: ShieldCheck },
  { href: "/admin/layout-demo", label: "עורך עיצוב (Demo)", icon: Palette },
  { href: "/admin/emergency", label: "הודעת חירום", icon: AlertTriangle },
]

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <aside className="w-64 bg-card border-l flex flex-col">
      <div className="p-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          <span className="font-semibold">מסך המחלקה</span>
        </Link>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
            const isEmergency = item.href === "/admin/emergency"
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? isEmergency
                        ? "bg-red-600 text-white"
                        : "bg-primary text-primary-foreground"
                      : isEmergency
                        ? "text-red-600 hover:bg-red-50 font-bold"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <div className="text-sm text-muted-foreground mb-2 truncate">{userEmail}</div>
        <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          התנתק
        </Button>
      </div>
    </aside>
  )
}