"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Reminder = {
  id: string;
  title: string | null;
  messages: Record<string, string>;
  scheduled_time: string;
  days_of_week: string[];
  repetitions: number;
  languages: string[];
  is_active: boolean;
  department_id: string | null;
  play_on?: string[];
};

type ScreenType = "display" | "orientation";

const DAY_CODES = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

const LANG_TO_VOICE: Record<string, string> = {
  he: "he-IL",
  ar: "ar",
  ru: "ru-RU",
  en: "en-US",
};

function pickVoice(lang: string) {
  const wanted = LANG_TO_VOICE[lang] || lang;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === wanted.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase())) ||
    null
  );
}

async function speak(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_TO_VOICE[lang] || lang;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.rate = 0.95;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

export default function VoiceRemindersPlayer({ departmentId, screenType }: { departmentId: string; screenType: ScreenType }) {
  const firedKeysRef = useRef<Set<string>>(new Set());
  const playingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (playingRef.current) return;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const nowHm = `${hh}:${mm}`;
      const todayCode = DAY_CODES[now.getDay()];
      const dateKey = now.toISOString().slice(0, 10);

      const { data } = await supabase
        .from("voice_reminders")
        .select("*")
        .or(`department_id.eq.${departmentId},department_id.is.null`)
        .eq("is_active", true);

      if (cancelled || !data) return;

      for (const r of data as Reminder[]) {
        const t = (r.scheduled_time || "").slice(0, 5);
        if (t !== nowHm) continue;
        if (r.days_of_week && r.days_of_week.length > 0 && !r.days_of_week.includes(todayCode)) continue;
        if (r.play_on && r.play_on.length > 0 && !r.play_on.includes(screenType)) continue;
        const fireKey = `${r.id}-${dateKey}-${t}`;
        if (firedKeysRef.current.has(fireKey)) continue;
        firedKeysRef.current.add(fireKey);

        playingRef.current = true;
        try {
          const langs = (r.languages && r.languages.length > 0) ? r.languages : ["he"];
          const reps = Math.max(1, Math.min(5, r.repetitions || 1));
          for (let i = 0; i < reps; i++) {
            for (const lang of langs) {
              const text = (r.messages && r.messages[lang]) || r.messages?.he || r.title || "";
              if (text) await speak(text, lang);
            }
          }
        } finally {
          playingRef.current = false;
        }
      }
    }

    const id = setInterval(tick, 15_000);
    tick();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [departmentId, screenType]);

  return null;
}
