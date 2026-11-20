import { createClient } from "@/lib/supabase/server";
import { loadWeekMenu } from "@/lib/department-data";
import { displaySettings, weeklyBoardSettings } from "@/lib/week";
import PrintSheet from "@/components/print/print-sheet";

// הדפסת התפריט השבועי (משותף לכל המחלקות): /print/menu?week=YYYY-MM-DD
export const dynamic = "force-dynamic";
export const metadata = { title: "הדפסת תפריט שבועי" };

export default async function PrintMenuPage({ searchParams }: { searchParams: Promise<{ week?: string; auto?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const m = await loadWeekMenu(supabase, sp.week);
  const hasMenu = Object.values(m.menu).some(d => Object.values(d ?? {}).some(l => (l?.length ?? 0) > 0));
  return (
    <PrintSheet
      data={{
        department: { id: "", name: "", color: null },
        weekDates: m.weekDates,
        days: [[], [], [], [], [], [], []],
        settings: displaySettings({}),
        board: weeklyBoardSettings({}),
        topic: null,
        menu: m.menu,
        menuNotes: m.menuNotes,
        news: [],
        media: [],
        iconConfig: m.iconConfig,
      }}
      view="menu"
      title="תפריט שבועי"
      heading="תפריט שבועי"
      hideDepartment
      basePath="/print/menu"
      autoPrint={sp.auto === "1"}
      emptyText={hasMenu ? undefined : "עוד אין תפריט לשבוע הזה."}
    />
  );
}
