"use client";

import { useEffect, useRef, useState } from "react";

type Lang = "he" | "ar" | "ru" | "en";

const LANG_VOICE_MAP: Record<string, string> = {
  he: "he-IL",
  ar: "ar",
  ru: "ru-RU",
  en: "en-US",
};

const LANG_DIR: Record<string, "rtl" | "ltr"> = {
  he: "rtl",
  ar: "rtl",
  ru: "ltr",
  en: "ltr",
};

function pickVoice(lang: string) {
  const wanted = LANG_VOICE_MAP[lang] || lang;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === wanted.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase())) ||
    null
  );
}

function speak(text: string, lang: string) {
  if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_VOICE_MAP[lang] || lang;
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
}

interface Props {
  active: boolean;
  message: string;
  translations?: Record<string, string> | null;
  languages?: string[] | null;
  bgColor: string;
  fgColor: string;
  speakAloud?: boolean;
}

export default function EmergencyOverlay({
  active,
  message,
  translations,
  languages,
  bgColor,
  fgColor,
  speakAloud,
}: Props) {
  const [idx, setIdx] = useState(0);
  const lastSpokenRef = useRef<string>("");

  const langs: Lang[] = (languages && languages.length > 0
    ? languages
    : ["he"]
  ).filter((l): l is Lang => ["he", "ar", "ru", "en"].includes(l));

  const currentLang: Lang = langs[idx % langs.length] ?? ("he" as Lang);
  const currentText =
    (translations && translations[currentLang]) ||
    (currentLang === "he" ? message : translations?.he || message);

  useEffect(() => {
    if (!active) { setIdx(0); return; }
    if (langs.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % langs.length), 5000);
    return () => clearInterval(id);
  }, [active, langs.length]);

  useEffect(() => {
    if (!active || !speakAloud) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const key = `${currentLang}::${currentText}`;
    if (lastSpokenRef.current === key) return;
    lastSpokenRef.current = key;
    try { window.speechSynthesis.cancel(); } catch {}
    speak(currentText, currentLang);
  }, [active, speakAloud, currentLang, currentText]);

  useEffect(() => {
    if (!active && typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
      lastSpokenRef.current = "";
    }
  }, [active]);

  if (!active || !currentText) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: bgColor + "F2" }}
      dir={LANG_DIR[currentLang]}
    >
      <div className="text-center p-10 max-w-[90vw]">
        <div className="text-8xl mb-6">🚨</div>
        <div className="text-5xl font-black leading-tight" style={{ color: fgColor }}>
          {currentText}
        </div>
        {langs.length > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {langs.map((_, i) => (
              <div
                key={i}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === idx ? 24 : 8,
                  backgroundColor: fgColor,
                  opacity: i === idx ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
