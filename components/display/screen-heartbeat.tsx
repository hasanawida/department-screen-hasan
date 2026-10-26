"use client";

// כל מסך מדווח כל דקה שהוא דולק (לעמודי "מסכי מחלקות" ו"מסכי התמצאות"),
// ונטען מחדש כשלוחצים "רענון" בניהול — מיד, או לכל היותר בדיווח הבא.
// כשפותחים את המסך מהניהול לתצוגה (?preview=1) הוא לא נרשם כמסך.

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { PING_MS, deviceRowId, readDeviceInfo, type ScreenKind } from "@/lib/screen-devices";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const DEVICE_KEY = "eshkolot-screen-device";
const random = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

/** מזהה קבוע למכשיר, שנשמר בדפדפן שלו */
function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = random();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    // בלי אחסון בדפדפן — מזהה לפי סוג המכשיר וגודל המסך (עדיף על מסך חדש בכל טעינה)
    const s = navigator.userAgent + "|" + (window.screen ? window.screen.width + "x" + window.screen.height : "");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return "ua" + Math.abs(h).toString(36);
  }
}

export default function ScreenHeartbeat({ kind, departmentId }: { kind: ScreenKind; departmentId?: string | null }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("preview") || window.self !== window.top) return;

    const device = deviceId();
    const rowId = deviceRowId(device, kind, departmentId);
    const session = random();
    let stopped = false;
    let busy = false;
    let again = false; // ביקשו רענון בזמן שדיווח היה בדרך — מדווחים שוב מיד
    let timer: ReturnType<typeof setTimeout> | undefined;

    const ping = async () => {
      if (stopped || busy) return;
      busy = true;
      const { data, error } = await supabase.rpc("screen_ping", {
        p_id: rowId,
        p_device: device,
        p_kind: kind,
        p_department: departmentId || null,
        p_path: window.location.pathname + window.location.search,
        p_info: readDeviceInfo(),
        p_session: session,
      });
      busy = false;
      if (stopped) return;
      if (again) { again = false; ping(); return; }
      if (error) {
        // עוד לא הריצו את scripts/015 — מנסים שוב בעוד עשר דקות, בלי להפריע למסך
        timer = setTimeout(ping, 10 * 60 * 1000);
        return;
      }
      // השרת מחליט אם לרענן (לפי השעון שלו, לא של הטלוויזיה)
      if ((data as { reload?: boolean } | null)?.reload) { window.location.reload(); return; }
      timer = setTimeout(ping, PING_MS);
    };
    ping();

    // רענון מיידי מהניהול: כשבקשת הרענון משתנה — מדווחים מיד, והשרת עונה אם לטעון מחדש
    let lastRequest: string | null = null;
    const channel = supabase
      .channel("screen-device-" + rowId)
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "screen_devices", filter: `id=eq.${rowId}` },
        (payload: any) => {
          const req: string | null = payload.new?.reload_requested_at ?? null;
          if (req === lastRequest) return;
          lastRequest = req;
          if (!req) return;
          if (busy) { again = true; return; }
          if (timer) clearTimeout(timer);
          ping();
        })
      .subscribe();

    // חזרה מהמתנה / מסך כבוי — מדווחים מיד
    const onVisible = () => {
      if (document.visibilityState !== "visible" || busy) return;
      if (timer) clearTimeout(timer);
      ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [kind, departmentId]);

  return null;
}
