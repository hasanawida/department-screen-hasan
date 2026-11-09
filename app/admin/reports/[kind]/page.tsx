import { notFound } from "next/navigation"
import Reports from "@/components/admin/reports"
import { REPORT_KINDS } from "@/lib/report-kinds"

// נוכחות לפי תחום: /admin/reports/occupation · /admin/reports/instructors · /admin/reports/physio
export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  const meta = REPORT_KINDS.find(k => k.kind === kind)
  return { title: meta ? meta.title : "נוכחות" }
}

export default async function ReportKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  const meta = REPORT_KINDS.find(k => k.kind === kind)
  if (!meta) return notFound()
  return <Reports key={meta.kind} kind={meta.kind} />
}
