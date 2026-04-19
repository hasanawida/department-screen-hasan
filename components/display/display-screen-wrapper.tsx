"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import VoiceRemindersPlayer from "@/components/voice-reminders-player";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface Props {
  departmentId: string;
  initialEmergencyActive: boolean;
  initialEmergencyMessage: string;
  children: React.ReactNode;
}

export default function DisplayScreenWrapper({
  departmentId,
  initialEmergencyActive,
  initialEmergencyMessage,
  children,
}: Props) {
  const [emergencyActive, setEmergencyActive] = useState(initialEmergencyActive);
  const [emergencyMessage, setEmergencyMessage] = useState(initialEmergencyMessage);
  const [bgColor, setBgColor] = useState("#DC2626");
  const [fgColor, setFgColor] = useState("#FFFFFF");

  useEffect(() => {
    async function checkEmergency() {
      const { data } = await supabase
        .from("departments")
        .select("emergency_active, emergency_message, emergency_display, emergency_bg_color, emergency_text_color")
        .eq("id", departmentId)
        .single();
      if (data) {
        if (data.emergency_active && data.emergency_display) {
          setEmergencyActive(true);
          setEmergencyMessage(data.emergency_message ?? "");
          setBgColor((data as any).emergency_bg_color || "#DC2626");
          setFgColor((data as any).emergency_text_color || "#FFFFFF");
        } else {
          setEmergencyActive(false);
          setEmergencyMessage("");
        }
      }
    }

    checkEmergency();
    const interval = setInterval(checkEmergency, 5000);

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
          if (payload.new.force_refresh) {
            window.location.reload();
          }
          if (payload.new.emergency_active && payload.new.emergency_display) {
            setEmergencyActive(true);
            setEmergencyMessage(payload.new.emergency_message ?? "");
            setBgColor(payload.new.emergency_bg_color || "#DC2626");
            setFgColor(payload.new.emergency_text_color || "#FFFFFF");
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
      <VoiceRemindersPlayer departmentId={departmentId} />
      {emergencyActive && emergencyMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: bgColor + "F2" }}
        >
          <div className="text-center p-10">
            <div className="text-8xl mb-6">🚨</div>
            <div className="text-5xl font-black leading-tight" style={{ color: fgColor }} dir="rtl">
              {emergencyMessage}
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}