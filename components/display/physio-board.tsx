"use client";

// מסך הפיזיותרפיה: מי מוזמן היום לטיפול ומתי

import React, { useEffect, useRef, useState } from "react";
import { EshkolotLogo, Pin, BRAND } from "@/components/orientation/eshkolot-logo";
import { DAY_NAMES, dayIndexOf, israelDateISO, israelTimeHM, toMinutes } from "@/lib/week";
import { useFillScale } from "./use-fill";
import styles from "./board.module.css";

export type PhysioAppt = { id: string; time: string; end?: string | null; name: string; department?: string | null; note?: string | null };

/** משך משוער של טיפול כשלא נכתבה שעת סיום, כדי לדעת מי בטיפול עכשיו */
const SLOT_MINUTES = 30;

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function PhysioBoard({ appts, dateISO, embeddedCu, title = "פיזיותרפיה" }: {
  appts: PhysioAppt[];
  /** היום שמוצג (בעורך אפשר להציג יום אחר) */
  dateISO?: string;
  embeddedCu?: number;
  title?: string;
}) {
  const now = useNow();
  const todayISO = now ? israelDateISO(now) : "";
  const shownISO = dateISO ?? todayISO;
  const isToday = !!shownISO && shownISO === todayISO;
  const hm = now ? israelTimeHM(now) : "";
  const nowMin = now ? toMinutes(hm) : -1;

  const list = [...appts].sort((a, b) => a.time.localeCompare(b.time));
  const state = (a: PhysioAppt, i: number): "now" | "next" | "past" | "" => {
    if (!isToday || nowMin < 0) return "";
    const start = toMinutes(a.time);
    const nextStart = i + 1 < list.length ? toMinutes(list[i + 1].time) : Infinity;
    const end = a.end && toMinutes(a.end) > start
      ? toMinutes(a.end)
      : Math.min(start + SLOT_MINUTES, Math.max(nextStart, start + 10));
    if (nowMin >= start && nowMin < end) return "now";
    if (nowMin >= end) return "past";
    return "";
  };
  const states = list.map(state);
  const firstUpcoming = isToday ? states.findIndex((s, i) => s === "" && toMinutes(list[i].time) > nowMin) : -1;
  if (firstUpcoming >= 0 && !states.includes("now")) states[firstUpcoming] = "next";

  const n = list.length;
  const cols = n <= 7 ? 1 : n <= 14 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(n / cols));
  // הרשימה ממלאת את המסך: גדלה כשיש מעט מוזמנים ומתכווצת כשיש הרבה
  const listRef = useRef<HTMLOListElement>(null);
  const appliedRef = useRef(1);
  const bs = useFillScale(listRef, appliedRef, JSON.stringify(list) + "|" + cols);
  appliedRef.current = bs;

  const shownDate = shownISO ? new Date(shownISO + "T12:00:00") : null;
  const dateText = shownDate
    ? (isToday ? "היום, " : "") + "יום " + DAY_NAMES[dayIndexOf(shownISO)] + ", " +
      new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long" }).format(shownDate)
    : "";

  const stageStyle = embeddedCu ? ({ "--frame-cu": embeddedCu + "px" } as React.CSSProperties) : undefined;

  return (
    <div className={styles.stage} data-embedded={embeddedCu ? "" : undefined} style={stageStyle} dir="rtl">
      <div className={styles.canvas} style={{ gridTemplateRows: "auto minmax(0, 1fr)" }}>
        <header className={styles.header}>
          <EshkolotLogo className={styles.logo} />
          <span className={styles.rule} aria-hidden="true" />
          <div className={styles.dept}>
            <span className={styles.label}>{title}</span>
            <span className={styles.deptName}>
              <span className={styles.dot} style={{ backgroundColor: BRAND.sage }} aria-hidden="true" />
              מוזמנים לטיפול
            </span>
          </div>
          <div className={styles.when} style={{ marginInlineStart: "auto" }}>
            <span className={styles.whenDate}>{dateText}</span>
            {isToday && <span className={styles.whenClock}>{hm}</span>}
          </div>
        </header>

        <main className={styles.view}>
          <div className={styles.physio}>
            {n === 0 ? (
              <div className={styles.physioList} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className={styles.physioEmpty}>
                  <Pin color={BRAND.sage} className={styles.physioEmptyPin} />
                  <div>אין טיפולים מתוכננים {isToday ? "היום" : "ביום הזה"}</div>
                </div>
              </div>
            ) : (
              <ol ref={listRef} className={styles.physioList} style={{ "--rows": rows, "--bs": bs } as React.CSSProperties}>
                {list.map((a, i) => {
                  const s = states[i];
                  const sub = [a.department, a.note].filter(Boolean).join(", ");
                  return (
                    <li key={a.id} className={styles.appt + (i % rows === 0 ? " " + styles.apptFirst : "") + (s === "now" ? " " + styles.apptNow : "") + (s === "past" ? " " + styles.apptPast : "")}>
                      <span className={styles.apptTime}>
                        {a.time}
                        {a.end && <span className={styles.apptEnd} dir="rtl">עד {a.end}</span>}
                      </span>
                      <span>
                        <span className={styles.apptName}>
                          {a.name}
                          {s === "now" && <span className={styles.apptTag}>עכשיו</span>}
                          {s === "next" && <span className={styles.apptTag} style={{ background: "#A9C8B8" }}>הבא בתור</span>}
                        </span>
                        {sub && <div className={styles.apptSub}>{sub}</div>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
