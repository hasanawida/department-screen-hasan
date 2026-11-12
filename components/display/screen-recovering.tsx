"use client";

// מה שמסך טלוויזיה מציג כשהדף שלו לא נטען (תקלה זמנית בשרת או במסד הנתונים):
// שעון ותאריך, ובדיקה כל חצי דקה אם אפשר לחזור — ואז הדף נטען מחדש לבד.
// בלי הודעות שגיאה (הן מבהילות דיירים, ואף אחד לא עומד ליד המסך כדי לקרוא אותן).

import { useEffect, useState } from "react";
import { registerScreenWorker, serverReady } from "@/lib/screen-recovery";

export default function ScreenRecovering({ note = "המסך יתעדכן מעצמו בעוד רגע", retrySeconds = 30 }: { note?: string; retrySeconds?: number }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    registerScreenWorker();
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 10_000);
    let busy = false;
    const retry = setInterval(async () => {
      if (busy) return;
      busy = true;
      const ok = await serverReady();
      busy = false;
      if (ok) window.location.reload();
    }, retrySeconds * 1000);
    return () => { clearInterval(clock); clearInterval(retry); };
  }, [retrySeconds]);

  const time = now ? now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }) : "";
  const date = now ? now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" }) : "";

  return (
    <div dir="rtl" style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "#F6F2EE", color: "#3F2F2D", overflow: "hidden" }}>
      <div style={{ fontSize: "24vh", fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{time}</div>
      <div style={{ fontSize: "6.5vh", marginTop: "4vh" }}>{date}</div>
      <div style={{ fontSize: "3vh", marginTop: "9vh", opacity: 0.55 }}>{note}</div>
    </div>
  );
}
