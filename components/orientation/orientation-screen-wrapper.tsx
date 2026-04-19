"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import OrientationScreen from "./orientation-screen";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

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
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [color, setColor] = useState(departmentColor ?? "#10B981");
  const [currentSettings, setCurrentSettings] = useState(settings);

  const isPortrait = currentSettings?.display_orientation === "portrait";

  useEffect(() => {
    // מסך מלא אוטומטי
    const goFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    // נסה fullscreen בלחיצה על המסך
    document.addEventListener("click", goFullscreen, { once: true });

    // CSS לכיסוי מלא
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.width = "100vw";
    document.body.style.height = "100vh";

    return () => {
      document.removeEventListener("click", goFullscreen);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.margin = "";
      document.body.style.padding = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, []);

  useEffect(() => {
    async function checkState() {
      const { data } = await supabase
        .from("departments")
        .select("*")
        .eq("id", departmentId)
        .single();

      if (data) {
        const d = data as any;
        if (d.orientation_color) setColor(d.orientation_color);
        if (d.orientation_settings) {
          setCurrentSettings((prev: any) => ({ ...prev, ...d.orientation_settings }));
        }
        if (d.emergency_active && d.emergency_orientation) {
          setEmergencyActive(true);
          setEmergencyMessage(d.emergency_message ?? "");
        } else {
          setEmergencyActive(false);
          setEmergencyMessage("");
        }
      }
    }

    checkState();
    const interval = setInterval(checkState, 5000);

    const channel = supabase
      .channel("emergency-" + departmentId)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "departments",
          filter: `id=eq.${departmentId}`,
        },
        (payload: any) => {
          const n = payload.new;
          if (n.force_refresh) {
            window.location.reload();
          }
          if (n.orientation_color) setColor(n.orientation_color);
          if (n.orientation_settings) {
            setCurrentSettings((prev: any) => ({ ...prev, ...n.orientation_settings }));
          }
          if (n.emergency_active && n.emergency_orientation) {
            setEmergencyActive(true);
            setEmergencyMessage(n.emergency_message ?? "");
          } else {
            setEmergencyActive(false);
            setEmergencyMessage("");
          }
        }
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
      }}
    >
      {emergencyActive && emergencyMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-600/95">
          <div className="text-center p-10">
            <div className="text-8xl mb-6">🚨</div>
            <div className="text-5xl font-black text-white leading-tight" dir="rtl">
              {emergencyMessage}
            </div>
          </div>
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
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
    </div>
  );
}