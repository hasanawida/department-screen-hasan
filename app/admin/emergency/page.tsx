import { redirect } from "next/navigation";

// התכונה בוטלה — הדף מפנה ללוח הבקרה
export default function RemovedFeaturePage() {
  redirect("/admin");
}
