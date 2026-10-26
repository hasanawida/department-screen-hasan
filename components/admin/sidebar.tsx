"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Building2, Calendar, CalendarDays, CalendarSync, Compass, GraduationCap, HeartPulse, LayoutDashboard,
  LogOut, Megaphone, Menu, MessageSquare, Monitor, ShieldCheck, Sparkles, UserRound, Users, UtensilsCrossed, X,
} from "lucide-react"
import { EshkolotLogo } from "@/components/orientation/eshkolot-logo"
import { cn } from "@/lib/utils"

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }

const GROUPS: { title?: string; items: Item[] }[] = [
  { items: [{ href: "/admin", label: "לוח בקרה", icon: LayoutDashboard }] },
  {
    title: "מסכים",
    items: [
      { href: "/admin/weekly", label: "לוח שבועי", icon: CalendarDays },
      { href: "/admin/display", label: "מסכי מחלקות", icon: Monitor },
      { href: "/admin/orientation", label: "מסכי התמצאות", icon: Compass },
      { href: "/admin/menu", label: "תפריט שבועי", icon: UtensilsCrossed },
      { href: "/admin/physio", label: "פיזיותרפיה", icon: HeartPulse },
    ],
  },
  {
    title: "תוכן",
    items: [
      { href: "/admin/activities", label: "פעילויות", icon: Calendar },
      { href: "/admin/import", label: "ייבוא מהיומן", icon: CalendarSync },
      { href: "/admin/announcements", label: "הודעות חשובות", icon: Megaphone },
      { href: "/admin/ticker", label: "שורת רצה", icon: MessageSquare },
      { href: "/admin/topics", label: "תוכנית נושאים", icon: Sparkles },
    ],
  },
  {
    title: "אנשים ומחלקות",
    items: [
      { href: "/admin/departments", label: "מחלקות", icon: Building2 },
      { href: "/admin/residents", label: "דיירים", icon: UserRound },
      { href: "/admin/instructors", label: "מפעילים", icon: Users },
      { href: "/admin/occupation", label: "מדריכות תעסוקה", icon: GraduationCap },
      { href: "/admin/users", label: "מנהלי מערכת", icon: ShieldCheck },
    ],
  },
]

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  const handleSignOut = async () => {
    await createClient().auth.signOut()
    router.push("/auth/login")
  }

  const isActive = (href: string) => pathname === href || (href !== "/admin" && pathname.startsWith(href + "/")) || (href !== "/admin" && pathname === href)

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="ניהול">
      {GROUPS.map((g, gi) => (
        <div key={gi} className={gi ? "mt-4" : "mt-1"}>
          {g.title && <div className="mb-1.5 px-3 text-[13px] font-semibold text-[#5A826F]">{g.title}</div>}
          <ul className="space-y-0.5">
            {g.items.map(item => {
              const on = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-[7px] text-[15px] transition-colors",
                      on ? "bg-[#3F2F2D] font-semibold text-[#F6F2EE]" : "text-[#3F2F2D]/80 hover:bg-[#E3ECE7] hover:text-[#3F2F2D]",
                    )}
                  >
                    <item.icon className={cn("h-[18px] w-[18px] shrink-0", on ? "text-[#FAB822]" : "text-[#5A826F]")} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )

  const footer = (
    <div className="flex items-center gap-2 border-t border-[#3F2F2D]/10 px-4 py-3">
      <div className="min-w-0 flex-1 truncate text-sm text-[#3F2F2D]/60" dir="ltr" title={userEmail}>{userEmail}</div>
      <button type="button" onClick={handleSignOut}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#3F2F2D]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#3F2F2D] hover:bg-[#F6F2EE]">
        <LogOut className="h-4 w-4" />
        התנתקות
      </button>
    </div>
  )

  return (
    <>
      {/* טלפון / מסך צר */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#3F2F2D]/10 bg-white px-4 py-2.5 md:hidden">
        <Link href="/admin" aria-label="לוח בקרה"><EshkolotLogo className="h-8 w-auto" /></Link>
        <button type="button" aria-label="תפריט" aria-expanded={open} onClick={() => setOpen(true)} className="rounded-xl p-2 hover:bg-[#E3ECE7]">
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="תפריט ניהול">
          <button type="button" aria-label="סגירה" className="absolute inset-0 bg-[#3F2F2D]/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-[280px] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <EshkolotLogo className="h-9 w-auto" />
              <button type="button" aria-label="סגירה" onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-[#E3ECE7]"><X className="h-5 w-5" /></button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* מחשב */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-l border-[#3F2F2D]/10 bg-white md:flex">
        <Link href="/admin" className="block px-6 pb-3 pt-5" aria-label="לוח בקרה">
          <EshkolotLogo className="h-10 w-auto" />
          <div className="mt-1.5 text-sm font-semibold text-[#3F2F2D]/60">ניהול המסכים</div>
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  )
}
