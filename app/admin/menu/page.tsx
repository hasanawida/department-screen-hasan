import { PageShell } from "@/components/admin/brand-ui";
import MenuEditor from "@/components/staff/menu-editor";
import StaffLinkCard from "@/components/admin/staff-link-card";

export const metadata = { title: "תפריט שבועי" };

export default function AdminMenuPage() {
  return (
    <PageShell title="תפריט שבועי" subtitle="התפריט מופיע במסכי כל המחלקות. הדיאטנית יכולה לעדכן אותו בעצמה דרך הקישור שלה.">
      <div className="space-y-6">
        <StaffLinkCard role="dietitian" to="לדיאטנית" />
        <MenuEditor />
      </div>
    </PageShell>
  );
}
