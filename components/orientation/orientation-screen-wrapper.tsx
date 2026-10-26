"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import OrientationScreen from "./orientation-screen";
import ScreenHeartbeat from "@/components/display/screen-heartbeat";
import "./orientation-fonts.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// כל כמה זמן לרענן את הנתונים מהשרת (בלי טעינה מלאה של הדף)
const REFRESH_MS = 5 * 60 * 1000;

function israelDateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

export default function OrientationScreenWrapper({
  departmentId,
  departmentName,
  departmentNameAr,
  departmentNameRu,
  departmentNameEn,
  departmentColor,
  activities,
  settings,
}: any) {
  const router = useRouter();
  const [color, setColor] = useState(departmentColor);
  const [currentSettings, setCurrentSettings] = useState(settings);

  const isPortrait = currentSettings?.display_orientation === "portrait";

  // רענון מהשרת כל כמה דקות, ומיד כשמתחלף היום
  useEffect(() => {
    let lastDay = israelDateKey();
    const refreshId = setInterval(() => router.refresh(), REFRESH_MS);
    const dayId = setInterval(() => {
      const today = israelDateKey();
      if (today !== lastDay) {
        lastDay = today;
        router.refresh();
      }
    }, 60 * 1000);
    return () => {
      clearInterval(refreshId);
      clearInterval(dayId);
    };
  }, [router]);

  useEffect(() => {
    // מסך מלא בלחיצה הראשונה על המסך
    const goFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener("click", goFullscreen, { once: true });

    // המסך תמיד בגודל החלון — בלי גלילה
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.width = "100vw";
    document.body.style.height = "100vh";
    document.body.style.background = "#F6F2EE";

    return () => {
      document.removeEventListener("click", goFullscreen);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.margin = "";
      document.body.style.padding = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.background = "";
    };
  }, []);

  // שינויי הגדרות מהניהול מגיעים מיד (צבע, שפות, לרוחב/לאורך), ו"רענון מסך" טוען מחדש
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("departments")
        .select("orientation_color, orientation_settings")
        .eq("id", departmentId)
        .single();
      if (data) {
        const d = data as any;
        if (d.orientation_color) setColor(d.orientation_color);
        if (d.orientation_settings) setCurrentSettings((prev: any) => ({ ...prev, ...d.orientation_settings }));
      }
    }

    load();
    const interval = setInterval(load, 60 * 1000);

    const channel = supabase
      .channel("orientation-" + departmentId)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "departments", filter: `id=eq.${departmentId}` },
        (payload: any) => {
          const n = payload.new;
          if (n.force_refresh) window.location.reload();
          if (n.orientation_color) setColor(n.orientation_color);
          if (n.orientation_settings) setCurrentSettings((prev: any) => ({ ...prev, ...n.orientation_settings }));
        },
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [departmentId]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        background: "#F6F2EE",
      }}
    >
      <ScreenHeartbeat kind="orientation" departmentId={departmentId} />
      <OrientationScreen
        departmentName={departmentName}
        departmentNameAr={departmentNameAr}
        departmentNameRu={departmentNameRu}
        departmentNameEn={departmentNameEn}
        departmentColor={color}
        activities={activities}
        settings={currentSettings}
        isPortrait={isPortrait}
      />
    </div>
  );
}
