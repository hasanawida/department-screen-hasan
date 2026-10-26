import { createClient } from "@/lib/supabase/server";
import { StaffShell } from "@/components/admin/brand-ui";
import MenuEditor from "@/components/staff/menu-editor";
import PhysioEditor from "@/components/staff/physio-editor";
import { roleForToken } from "@/lib/staff-links";

export const dynamic = "force-dynamic";
export const metadata = { title: "אשכולות — עמוד צוות", robots: { index: false, follow: false } };

export default async function StaffPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const role = await roleForToken(supabase, decodeURIComponent(token));

  if (role === "dietitian") {
    return (
      <StaffShell title="תפריט שבועי" subtitle="כותבים את התפריט, והוא מופיע במסכים של כל המחלקות. הכול נשמר לבד.">
        <MenuEditor />
      </StaffShell>
    );
  }
  if (role === "physio") {
    return (
      <StaffShell title="פיזיותרפיה" subtitle="מי מוזמן לטיפול ומתי. מה שנשמר כאן מופיע מיד במסך הפיזיותרפיה.">
        <PhysioEditor screenUrl="/physio" />
      </StaffShell>
    );
  }
  return (
    <StaffShell title="הקישור לא פעיל">
      <div className="rounded-2xl bg-white p-6 text-[17px] leading-relaxed">
        {role === "missing"
          ? "המערכת עוד לא הוגדרה לעמודי צוות. מבקשים מהמנהל להריץ את עדכון מסד הנתונים."
          : "הקישור הזה לא קיים או שהוחלף בקישור חדש. מבקשים מהמנהל את הקישור העדכני."}
      </div>
    </StaffShell>
  );
}
