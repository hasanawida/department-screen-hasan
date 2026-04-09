"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function DisplayScreenWrapper({
  departmentId,
  children,
}: {
  departmentId: string;
  children: React.ReactNode;
}) {
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState("");

  useEffect(() => {
    // טען מצב חירום נוכחי
    supabase
      .from("departments")
      .select("emergency_active, emergency_message, emergency_display")
      .eq("id", departmentId)
      .single()
      .then(({ data }) => {
        if (data?.emergency_active && data?.emergency_display) {
          setEmergencyActive(true);
          setEmergencyMessage(data.emergency_message ?? "");
        }
      });

    // האזן לשינויים בזמן אמת
    const channel = supabase
      .channel("display-emergency-" + departmentId)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "departments",
          filter: `id=eq.${departmentId}`,
        },
        (payload: any) => {
          // רענון מרחוק
          if (payload.new.force_refresh) {
            supabase
              .from("departments")
              .update({ force_refresh: false })
              .eq("id", departmentId)
              .then(() => window.location.reload());
          }
          // הודעת חירום — רק אם emergency_display פעיל
          if (payload.new.emergency_active && payload.new.emergency_display) {
            setEmergencyActive(true);
            setEmergencyMessage(payload.new.emergency_message ?? "");
          } else {
            setEmergencyActive(false);
            setEmergencyMessage("");
          }
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
      {children}
    </>
  );
}