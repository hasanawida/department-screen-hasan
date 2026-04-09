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
          setEmergencyActive(payload.new.emergency_active ?? false);
          setEmergencyMessage(payload.new.emergency_message ?? "");
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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