import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/admin/brand-ui";
import ScreensPanel, { type ScreenItem } from "@/components/admin/screens-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "מסכי מחלקות" };

export default async function AdminDisplayPage() {
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, code, color")
    .order("name", { ascending: true });

  const items: ScreenItem[] = (departments ?? [])
    .filter(d => d.code)
    .map(d => ({
      id: d.id,
      name: d.name,
      color: d.color,
      screenPath: `/display/${d.code}`,
      settingsHref: `/admin/display-settings/${d.code}`,
    }));

  return (
    <PageShell
      title="מסכי מחלקות"
      subtitle="איזו טלוויזיה מחוברת בכל מחלקה, הקישור שמכניסים בה, ורענון מרחוק."
    >
      {items.length === 0
        ? <p className="rounded-2xl bg-white p-6 text-center text-[#3F2F2D]/60">אין מחלקות עדיין</p>
        : <ScreensPanel kind="department" items={items} otherKinds={["physio"]} />}
    </PageShell>
  );
}
