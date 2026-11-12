// לוח הבקרה של הניהול: המסכים של כל מחלקה ומצב התוכן של השבוע

import Link from "next/link"
import type { SupabaseClient } from "@supabase/supabase-js"
import { CalendarDays, CalendarRange, ExternalLink, HeartPulse, Settings2, UtensilsCrossed } from "lucide-react"
import { activitiesByDay, addDaysISO, israelDateISO, israelTimeHM, weekStartISO, type ActivityRow } from "@/lib/week"

type Dept = { id: string; name: string; code: string | null; color: string | null }

function greeting(hm: string) {
  const h = Number(hm.slice(0, 2))
  if (h >= 5 && h < 12) return "בוקר טוב"
  if (h >= 12 && h < 17) return "צהריים טובים"
  if (h >= 17 && h < 21) return "ערב טוב"
  return "לילה טוב"
}

export async function Dashboard({ supabase, email }: { supabase: SupabaseClient; email: string }) {
  const today = israelDateISO()
  const ws = weekStartISO(today)

  const [depts, acts, menus, physio] = await Promise.all([
    supabase.from("departments").select("id, name, code, color").order("name"),
    supabase.from("activities").select("*").neq("is_active", false),
    supabase.from("weekly_menus").select("day_index, meal, items").eq("week_start", ws),
    supabase.from("physio_appointments").select("id").eq("appt_date", today),
  ])

  const departments = (depts.data ?? []) as Dept[]
  const rows = (acts.data ?? []) as (ActivityRow & { department_id: string; source?: string })[]
  const perDept = new Map<string, { total: number }>()
  for (const d of departments) {
    const week = activitiesByDay(rows.filter(r => r.department_id === d.id), ws).flat()
    perDept.set(d.id, { total: week.length })
  }

  // אירועים ביומן השבוע: אירוע בכמה מחלקות נספר פעם אחת
  const weekEnd = addDaysISO(ws, 6)
  const eventKeys = new Set<string>()
  for (const r of rows) {
    const uid = String((r as { external_uid?: string | null }).external_uid ?? "")
    const group = uid.startsWith("evt:") ? uid : String(r.id)
    if (r.activity_date && r.activity_date >= ws && r.activity_date <= weekEnd) eventKeys.add(group + "@" + r.activity_date)
    else if (!r.activity_date && uid.startsWith("evt:")) eventKeys.add(group)
  }
  const eventsThisWeek = eventKeys.size

  const menuDays = new Set((menus.data ?? []).filter(m => m.meal !== "notes" && String(m.items ?? "").trim()).map(m => m.day_index)).size
  const physioToday = physio.error ? null : (physio.data ?? []).length

  const name = email ? email.split("@")[0] : ""
  const dateText = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" }).format(new Date())

  return (
    <div dir="rtl" className="mx-auto max-w-6xl px-6 py-8 text-[#3F2F2D]">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">{greeting(israelTimeHM())}{name ? `, ${name}` : ""}</h1>
        <p className="mt-1 text-[15px] text-[#3F2F2D]/65">{dateText}. כאן רואים מה מוצג עכשיו בכל מסך, ומשם נכנסים לעריכה.</p>
      </header>

      {/* מצב השבוע */}
      <section aria-label="מצב התוכן" className="mb-8 grid gap-4 md:grid-cols-3">
        <StatusCard href="/admin/calendar" icon={<CalendarRange className="h-5 w-5" />} title="יומן"
          tone={eventsThisWeek ? "ok" : "idle"}
          text={eventsThisWeek ? `${eventsThisWeek === 1 ? "אירוע אחד" : eventsThisWeek + " אירועים"} ביומן השבוע.` : "אין אירועים מיוחדים השבוע. מה שמוסיפים ביומן מופיע לבד בלוחות."} />
        <StatusCard href="/admin/menu" icon={<UtensilsCrossed className="h-5 w-5" />} title="תפריט השבוע"
          tone={menus.error ? "idle" : menuDays === 7 ? "ok" : menuDays ? "warn" : "idle"}
          text={menus.error ? "צריך להריץ את עדכון מסד הנתונים" : menuDays === 7 ? "כל ימי השבוע מלאים." : menuDays ? `${menuDays} מתוך 7 ימים מלאים.` : "עוד לא נכתב תפריט לשבוע הזה."} />
        <StatusCard href="/admin/physio" icon={<HeartPulse className="h-5 w-5" />} title="פיזיותרפיה היום"
          tone={physioToday ? "ok" : "idle"}
          text={physioToday === null ? "צריך להריץ את עדכון מסד הנתונים" : physioToday ? `${physioToday} דיירים מוזמנים לטיפול.` : "אין טיפולים מתוכננים להיום."} />
      </section>

      {/* מסכים */}
      <section aria-labelledby="screens-title">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="screens-title" className="text-xl font-bold">המסכים במחלקות</h2>
          <Link href="/physio" target="_blank" className="text-sm font-semibold text-[#5A826F] hover:underline">מסך הפיזיותרפיה</Link>
        </div>
        {departments.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-[15px]">עוד אין מחלקות. <Link href="/admin/departments" className="font-semibold text-[#5A826F] underline">מוסיפים מחלקה</Link> ומשם מקבלים קישור למסך.</div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {departments.map(d => {
              const c = perDept.get(d.id) ?? { total: 0 }
              const code = encodeURIComponent(d.code ?? "")
              return (
                <li key={d.id} className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-[#F6F2EE]" style={{ backgroundColor: d.color || "#5A826F" }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-bold">{d.name}</div>
                      <div className="text-sm text-[#3F2F2D]/65">
                        {c.total ? `${c.total} פעילויות השבוע` : "אין פעילויות השבוע"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/admin/weekly?dept=${code}`} className="inline-flex items-center gap-2 rounded-xl bg-[#3F2F2D] px-3.5 py-2 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90">
                      <CalendarDays className="h-4 w-4" /> עריכת הלוח
                    </Link>
                    <Link href={`/display/${code}?preview=1`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-[#3F2F2D]/15 px-3.5 py-2 text-sm font-semibold hover:bg-[#E3ECE7]">
                      <ExternalLink className="h-4 w-4" /> פתיחת המסך
                    </Link>
                    <Link href={`/admin/display-settings/${code}`} className="inline-flex items-center gap-2 rounded-xl border border-[#3F2F2D]/15 px-3.5 py-2 text-sm font-semibold hover:bg-[#E3ECE7]">
                      <Settings2 className="h-4 w-4" /> הגדרות ומודעה
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatusCard({ href, icon, title, text, tone }: { href: string; icon: React.ReactNode; title: string; text: string; tone: "ok" | "warn" | "bad" | "idle" }) {
  const dot = { ok: "bg-[#5A826F]", warn: "bg-[#FAB822]", bad: "bg-[#B56262]", idle: "bg-[#3F2F2D]/20" }[tone]
  return (
    <Link href={href} className="group rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(63,47,45,0.06)] transition-colors hover:bg-[#FBF9F7]">
      <div className="flex items-center gap-2 text-[#5A826F]">
        {icon}
        <span className="font-bold text-[#3F2F2D]">{title}</span>
        <span className={"mr-auto h-2.5 w-2.5 rounded-full " + dot} aria-hidden />
      </div>
      <p className="mt-2 text-[15px] leading-snug text-[#3F2F2D]/75">{text}</p>
    </Link>
  )
}
