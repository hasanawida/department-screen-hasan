import { redirect } from "next/navigation"

// הפעילויות מנוהלות בלוח השבועי של כל מחלקה (עם תצוגה של המסך)
export default function ActivitiesPage() {
  redirect("/admin/weekly")
}
