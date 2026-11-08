import { createClient } from "@/lib/supabase/server"
import { ResidentsList, type Registration, type LeisureOption } from "@/components/admin/residents-list"
import { cleanName, nameKey } from "@/lib/participants"

/** כל השורות של שאילתה, בדפים של 1000 (המגבלה של שאילתה אחת) */
async function allPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < 50; i++) {
    const { data } = await page(i * 1000, i * 1000 + 999)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

export default async function ResidentsPage() {
  const supabase = await createClient()
  const [{ data: residents }, { data: departments }, participants, activities, { data: instructors }] = await Promise.all([
    supabase.from("residents").select("*, departments(name)").order("name"),
    supabase.from("departments").select("id, name, code").order("name"),
    allPages<any>((from, to) => supabase.from("activity_participants").select("activity_id, resident_id").order("activity_id").order("resident_id").range(from, to)),
    allPages<any>((from, to) => supabase.from("activities").select("id, title, instructor_name, day_of_week, activity_date, department_id").eq("is_active", true).is("parent_id", null).order("id").range(from, to)),
    supabase.from("instructors").select("*"),
  ])

  // פנאי: כל מפעיל/ה (גם חדש/ה, בלי פעילות עדיין) הוא אפשרות לסימון V בכרטיס הדייר, עם הפעילויות שלו/ה
  const leisure = new Map<string, LeisureOption>()
  for (const i of instructors || []) {
    const name = cleanName((i as any).name ?? "")
    if (!name || (i as any).is_active === false) continue
    leisure.set(nameKey(name), { name, titlesByDept: {} })
  }
  for (const a of activities || []) {
    const name = cleanName((a as any).instructor_name ?? "")
    if (!name) continue
    const k = nameKey(name)
    if (!leisure.has(k)) leisure.set(k, { name, titlesByDept: {} })
    const o = leisure.get(k)!
    const list = (o.titlesByDept[(a as any).department_id] ??= [])
    const title = cleanName((a as any).title ?? "")
    if (title && !list.includes(title)) list.push(title)
  }
  const leisureOptions = Array.from(leisure.values()).sort((x, y) => x.name.localeCompare(y.name, "he"))

  // לכל דייר: הפעילויות שהוא/היא רשום/ה אליהן בפועל (רק במחלקה שלו/ה)
  const byId = new Map((activities || []).map((a: any) => [String(a.id), a]))
  const deptOf = new Map((residents || []).map((r: any) => [String(r.id), r.department_id]))
  const registrations: Record<string, Registration[]> = {}
  for (const p of participants || []) {
    const a: any = byId.get(String(p.activity_id))
    const rid = String(p.resident_id)
    if (!a || a.department_id !== deptOf.get(rid)) continue
    ;(registrations[rid] ??= []).push({
      title: a.title,
      instructor: a.instructor_name ?? null,
      day: a.activity_date ? null : a.day_of_week ?? null,
      date: a.activity_date ?? null,
    })
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">דיירים</h1>
          <p className="text-muted-foreground mt-1">{residents?.length || 0} דיירים במערכת</p>
        </div>
      </div>
      <ResidentsList residents={residents || []} departments={departments || []} registrations={registrations} leisureOptions={leisureOptions} />
    </div>
  )
}
