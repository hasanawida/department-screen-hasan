import { PageShell } from "@/components/admin/brand-ui";
import HouseCalendar from "@/components/admin/house-calendar";

export const metadata = { title: "יומן" };

export default function AdminCalendarPage() {
  return (
    <PageShell title="יומן" subtitle="יומן אחד לכל המחלקות. אירוע שמוסיפים כאן מופיע לבד בלוחות של המחלקות שנבחרו.">
      <HouseCalendar />
    </PageShell>
  );
}
