import { PageShell } from "@/components/admin/brand-ui";
import PhysioEditor from "@/components/staff/physio-editor";
import StaffLinkCard from "@/components/admin/staff-link-card";

export const metadata = { title: "פיזיותרפיה" };

export default function AdminPhysioPage() {
  return (
    <PageShell title="פיזיותרפיה" subtitle="מי מוזמן לטיפול ומתי, לפי מחלקה. מה שנשמר כאן מופיע במסך בחדר הפיזיותרפיה ובמסך של כל מחלקה.">
      <div className="space-y-6">
        <StaffLinkCard role="physio" to="לצוות הפיזיותרפיה" />
        <PhysioEditor screenUrl="/physio" />
      </div>
    </PageShell>
  );
}
