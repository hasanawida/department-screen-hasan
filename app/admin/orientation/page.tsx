import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Monitor, Settings, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default async function AdminOrientationPage() {
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, color, view_token, orientation_settings")
    .order("name", { ascending: true });

  // יצירת view_token אוטומטית לכל מחלקה שאין לה
  if (departments) {
    for (const dept of departments) {
      if (!dept.view_token) {
        const newToken = uuidv4();
        await supabase
          .from("departments")
          .update({ view_token: newToken })
          .eq("id", dept.id);
        dept.view_token = newToken;
      }
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900">מסכי התמצאות</h1>
            <p className="mt-1 text-lg text-slate-500">ניהול מסכי ההתמצאות לכל המחלקות</p>
          </div>
          <Badge className="rounded-full px-4 py-2 text-lg bg-emerald-100 text-emerald-800">
            {departments?.length ?? 0} מחלקות
          </Badge>
        </div>

        {/* Departments list */}
        <div className="space-y-3">
          {(departments ?? []).map((dept) => {
            const langs: string[] = dept.orientation_settings?.languages ?? ["he", "ar", "ru", "en"];
            const interval: number = dept.orientation_settings?.lang_interval_seconds ?? 20;

            return (
              <Card key={dept.id} className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">

                    {/* Department info */}
                    <div className="flex items-center gap-4">
                      <div
                        className="h-10 w-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dept.color ?? "#e2e8f0" }}
                      />
                      <div>
                        <div className="text-xl font-bold text-slate-900">{dept.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                          <span>שפות: {langs.map(l =>
                            ({ he: "עב׳", ar: "ערב׳", ru: "רוס׳", en: "אנג׳" }[l] ?? l)
                          ).join(" · ")}</span>
                          <span>·</span>
                          <span>כל {interval} שנ׳</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/orientation/${dept.view_token}`}
                        target="_blank"
                        className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-base font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <Monitor className="h-4 w-4" />
                        מסך
                      </Link>
                      <Link
                        href={`/settings/${dept.view_token}`}
                        target="_blank"
                        className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-base font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        הגדרות
                      </Link>
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state */}
        {(departments ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Plus className="h-12 w-12 mb-4" />
            <p className="text-xl">אין מחלקות עדיין</p>
          </div>
        )}

      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";