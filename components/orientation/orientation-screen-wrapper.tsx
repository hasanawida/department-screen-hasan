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
  activities,
  settings,
  initialEmergencyActive,
  initialEmergencyMessage,
}: any) {
  const [emergencyActive, setEmergencyActive] = useState(initialEmergencyActive);
  const [emergencyMessage, setEmergencyMessage] = useState(initialEmergencyMessage);

  useEffect(() => {
    // בדיקה ראשונית מהמסד
    async function checkEmergency() {
      const { data } = await supabase
        .from("departments")
        .select("emergency_active, emergency_message, emergency_orientation")
        .eq("id", departmentId)
        .single();
      if (data) {
        if (data.emergency_active && data.emergency_orientation) {
          setEmergencyActive(true);
          setEmergencyMessage(data.emergency_message ?? "");
        } else {
          setEmergencyActive(false);
          setEmergencyMessage("");
        }
      }
    }
    checkEmergency();

    // polling כל 5 שניות כגיבוי ל-Realtime
    const interval = setInterval(checkEmergency, 5000);

    // Realtime
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
          if (payload.new.force_refresh) {
            supabase
              .from("departments")
              .update({ force_refresh: false })
              .eq("id", departmentId)
              .then(() => window.location.reload());
          }
          if (payload.new.emergency_active && payload.new.emergency_orientation) {
            setEmergencyActive(true);
            setEmergencyMessage(payload.new.emergency_message ?? "");
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
    <>
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
      <OrientationScreen
        departmentName={departmentName}
        departmentNameAr={departmentNameAr}
        departmentNameRu={departmentNameRu}
        departmentNameEn={departmentNameEn}
        activities={activities}
        settings={settings}
      />
    </>
  );
}