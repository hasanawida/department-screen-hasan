"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { israelDateISO } from "@/lib/week";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/**
 * שומר על מסך הטלוויזיה מעודכן:
 * - מרענן את הנתונים מהשרת כל כמה דקות (פעילויות, תפריט, חדשות, יומן)
 * - מרענן מיד כשמתחלף היום
 * - "רענון מסך" מהניהול (force_refresh) טוען מחדש את הדף
 */
export default function DisplayRuntime({ departmentId, refreshMinutes = 5, watchTable }: {
  departmentId?: string;
  refreshMinutes?: number;
  watchTable?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    let day = israelDateISO();
    const refreshId = setInterval(() => router.refresh(), refreshMinutes * 60 * 1000);
    const dayId = setInterval(() => {
      const d = israelDateISO();
      if (d !== day) { day = d; router.refresh(); }
    }, 60 * 1000);

    // מסך מלא בלחיצה הראשונה, בלי גלילה
    const goFullscreen = () => document.documentElement.requestFullscreen?.().catch(() => {});
    document.addEventListener("click", goFullscreen, { once: true });
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.background = "#F6F2EE";

    const channels: ReturnType<typeof supabase.channel>[] = [];
    if (departmentId) {
      channels.push(
        supabase
          .channel("display-dept-" + departmentId)
          .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "departments", filter: `id=eq.${departmentId}` },
            (payload: any) => { if (payload.new?.force_refresh) window.location.reload(); })
          .subscribe(),
      );
    }
    if (watchTable) {
      channels.push(
        supabase
          .channel("display-watch-" + watchTable)
          .on("postgres_changes" as any, { event: "*", schema: "public", table: watchTable }, () => router.refresh())
          .subscribe(),
      );
    }

    return () => {
      clearInterval(refreshId);
      clearInterval(dayId);
      document.removeEventListener("click", goFullscreen);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.background = "";
      channels.forEach(c => supabase.removeChannel(c));
    };
  }, [router, departmentId, refreshMinutes, watchTable]);

  return null;
}
