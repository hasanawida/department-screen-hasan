"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import VoiceRemindersPlayer from "@/components/voice-reminders-player";
import EmergencyOverlay from "@/components/emergency-overlay";

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
  const [translations, setTranslations] = useState<Record<string, string> | null>(null);
  const [languages, setLanguages] = useState<string[] | null>(null);
  const [speakAloud, setSpeakAloud] = useState(false);

  useEffect(() => {
    async function checkEmergency() {
      let row: any = null;
      const full = await supabase
        .from("departments")
        .select("emergency_active, emergency_message, emergency_display, emergency_bg_color, emergency_text_color, emergency_translations, emergency_languages, emergency_speak")
        .eq("id", departmentId)
        .single();
      if (full.error) {
        const fallback = await supabase
          .from("departments")
          .select("emergency_active, emergency_message, emergency_display")
          .eq("id", departmentId)
          .single();
        row = fallback.data;
      } else {
        row = full.data;
      }

      if (row && row.emergency_active && row.emergency_display) {
        setEmergencyActive(true);
        setEmergencyMessage(row.emergency_message ?? "");
        setBgColor(row.emergency_bg_color || "#DC2626");
        setFgColor(row.emergency_text_color || "#FFFFFF");
        setTranslations(row.emergency_translations || null);
        setLanguages(row.emergency_languages || null);
        setSpeakAloud(!!row.emergency_speak);
      } else {
        setEmergencyActive(false);
        setEmergencyMessage("");
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
            setTranslations(payload.new.emergency_translations || null);
            setLanguages(payload.new.emergency_languages || null);
            setSpeakAloud(!!payload.new.emergency_speak);
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
      <VoiceRemindersPlayer departmentId={departmentId} screenType="display" />
      <EmergencyOverlay
        active={emergencyActive && !!emergencyMessage}
        message={emergencyMessage}
        translations={translations}
        languages={languages}
        bgColor={bgColor}
        fgColor={fgColor}
        speakAloud={speakAloud}
      />
      {children}
    </>
  );
}
