import { redirect } from "next/navigation"

// הנוכחות מחולקת לפי תחום — כל אחד בעמוד משלו
export default function ReportsPage() {
  redirect("/admin/reports/occupation")
}
