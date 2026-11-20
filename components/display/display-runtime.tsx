"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { israelDateISO, weekStartISO } from "@/lib/week";
import { registerScreenWorker, safeReload, serverReady } from "@/lib/screen-recovery";
import { SCREENS_CHANNEL, SCREENS_REFRESH, type ScreensRefreshPayload } from "@/lib/screen-signals";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/**
 * שומר על מסך הטלוויזיה מעודכן:
 * - מרענן את הנתונים מהשרת כל כמה דקות (פעילויות, תפריט, חדשות, יומן)
 * - מרענן מיד כשמתחלף היום
 * - "רענון מסך" מהניהול (force_refresh) טוען מחדש את הדף
 * - watchMenu: שינוי בתפריט של השבוע (או בתמונות של המנות והפעילויות) מגיע תוך שניות —
 *   מרעננים רק את הנתונים, בלי לטעון מחדש את הדף
 *
 * כל רענון נעשה רק אחרי בדיקה שהשרת זמין. כשאין רשת — הלוח הקיים נשאר על המסך,
 * והרענון מנסה שוב כל דקה עד שהוא מצליח.
 */
export default function DisplayRuntime({ departmentId, refreshMinutes = 5, watchTable, watchMenu = false }: {
  departmentId?: string;
  refreshMinutes?: number;
  watchTable?: string;
  /** מסך שמציג את התפריט: מתעדכן תוך שניות כשהתפריט של השבוע משתנה */
  watchMenu?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    registerScreenWorker();

    let stopped = false;
    let checking = false;
    let behind = false; // רענון שלא יצא לפועל (אין רשת) — מנסים שוב כל דקה
    const refresh = async () => {
      if (checking || stopped) return;
      checking = true;
      const ok = await serverReady();
      checking = false;
      if (stopped) return;
      behind = !ok;
      if (ok) router.refresh();
    };

    // כמה שינויים ברצף (למשל דיאטנית שכותבת את התפריט) — רענון אחד, שתי שניות אחרי השינוי האחרון
    let soon: ReturnType<typeof setTimeout> | null = null;
    const refreshSoon = () => {
      if (soon) clearTimeout(soon);
      soon = setTimeout(() => { soon = null; refresh(); }, 2000);
    };
    // שינוי בתפריט של שבוע אחר (הדיאטנית מכינה את השבוע הבא) — לא נוגע במסך
    const shownWeek = (week: unknown) => typeof week !== "string" || week === weekStartISO(israelDateISO());

    let day = israelDateISO();
    const refreshId = setInterval(refresh, refreshMinutes * 60 * 1000);
    const minuteId = setInterval(() => {
      const d = israelDateISO();
      if (d !== day) { day = d; refresh(); }
      else if (behind) refresh();
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
            (payload: any) => { if (payload.new?.force_refresh) safeReload(); })
          .subscribe(),
      );
    }
    if (watchMenu) {
      channels.push(
        // שינוי בטבלת התפריט
        supabase
          .channel("display-menu-" + (departmentId ?? "screen"))
          .on("postgres_changes" as any, { event: "*", schema: "public", table: "weekly_menus" },
            (payload: any) => { if (shownWeek(payload.new?.week_start ?? payload.old?.week_start)) refreshSoon(); })
          .subscribe(),
        // אות מעמוד העריכה (התפריט, תמונות של מנות ופעילויות) — עובד גם כשהטבלה לא משודרת
        supabase
          .channel(SCREENS_CHANNEL)
          .on("broadcast" as any, { event: SCREENS_REFRESH }, (msg: any) => {
            const weeks = (msg?.payload as ScreensRefreshPayload | undefined)?.weeks;
            if (!Array.isArray(weeks) || weeks.some(w => shownWeek(w))) refreshSoon();
          })
          .subscribe(),
      );
    }
    if (watchTable) {
      channels.push(
        supabase
          .channel("display-watch-" + watchTable)
          .on("postgres_changes" as any, { event: "*", schema: "public", table: watchTable }, () => { refresh(); })
          .subscribe(),
      );
    }

    return () => {
      stopped = true;
      if (soon) clearTimeout(soon);
      clearInterval(refreshId);
      clearInterval(minuteId);
      document.removeEventListener("click", goFullscreen);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.background = "";
      channels.forEach(c => supabase.removeChannel(c));
    };
  }, [router, departmentId, refreshMinutes, watchTable, watchMenu]);

  return null;
}
