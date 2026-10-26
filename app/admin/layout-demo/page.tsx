import { redirect } from "next/navigation";

// עורך העיצוב הישן הוחלף בעורך הלוח השבועי (עם תצוגה חיה של המסך)
export default function LayoutDemoPage() {
  redirect("/admin/weekly");
}
