"use client";

// פיזיותרפיה: מי מוזמן היום לטיפול ומתי.
// PhysioBoard — המסך לחדר הפיזיותרפיה (כל המחלקות, או מחלקה אחת).
// PhysioSummary ו-PhysioList — משמשים גם במסך המחלקה.

import React, { useEffect, useRef, useState } from "react";
import { EshkolotLogo, Pin, BRAND } from "@/components/orientation/eshkolot-logo";
import { DAY_NAMES, dayIndexOf, israelDateISO, israelTimeHM, toMinutes } from "@/lib/week";
import { useFillScale } from "./use-fill";
import styles from "./board.module.css";

export type PhysioAppt = {
  id: string;
  time: string;
  end?: string | null;
  name: string;
  department?: string | null;
  departmentColor?: string | null;
  note?: string | null;
};

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

/** עכשיו בטיפול / הבא בתור / כבר היה — לכל שורה ברשימה (ממוינת לפי שעה) */
type PhysioState = "now" | "next" | "past" | "";
export function physioStates(list: PhysioAppt[], nowMin: number, isToday: boolean): PhysioState[] {
  const states: PhysioState[] = list.map((a, i): PhysioState => {
    if (!isToday || nowMin < 0) return "";
    const start = toMinutes(a.time);
    const nextStart = i + 1 < list.length ? toMinutes(list[i + 1].time) : Infinity;
    const end = a.end && toMinutes(a.end) > start
      ? toMinutes(a.end)
      : Math.min(start + SLOT_MINUTES, Math.max(nextStart, start + 10));
    if (nowMin >= start && nowMin < end) return "now";
    if (nowMin >= end) return "past";
    return "";
  });
  const firstUpcoming = isToday ? states.findIndex((s, i) => s === "" && toMinutes(list[i].time) > nowMin) : -1;
  if (firstUpcoming >= 0 && !states.includes("now")) states[firstUpcoming] = "next";
  return states;
}

/** כמה מוזמנים, ובכל המחלקות — כמה מכל מחלקה */
export function PhysioSummary({ appts, isToday, nowMin, showDepartments }: {
  appts: PhysioAppt[]; isToday: boolean; nowMin: number; showDepartments: boolean;
}) {
  const n = appts.length;
  const left = isToday && nowMin >= 0 ? appts.filter(a => toMinutes(a.time) > nowMin).length : n;
  const byDept = new Map<string, { count: number; color: string | null }>();
  for (const a of appts) {
    const k = a.department || "בלי מחלקה";
    const cur = byDept.get(k) ?? { count: 0, color: a.departmentColor ?? null };
    byDept.set(k, { count: cur.count + 1, color: cur.color });
  }
  const sorted = Array.from(byDept.entries()).sort((x, y) => y[1].count - x[1].count);

  return (
    <div className={styles.physioSummary}>
      <span className={styles.physioCount}>
        <b>{n}</b> {n === 1 ? "מוזמן/ת" : "מוזמנים"} {isToday ? "היום" : "ביום הזה"}
        {isToday && left > 0 && left < n && <span className={styles.physioLeft}>עוד {left} {left === 1 ? "מחכה" : "מחכים"}</span>}
      </span>
      {showDepartments && sorted.length > 0 && (
        <span className={styles.physioDepts}>
          {sorted.map(([name, { count, color }]) => (
            <span key={name} className={styles.physioDept}>
              <span className={styles.dot} style={{ backgroundColor: color || BRAND.sage }} aria-hidden="true" />
              {name} <b>{count}</b>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/** רשימת המוזמנים לפי שעה, שממלאת את המקום (גדלה כשיש מעט ומתכווצת כשיש הרבה) */
export function PhysioList({ appts, isToday, nowMin, showDepartments, emptyText }: {
  appts: PhysioAppt[]; isToday: boolean; nowMin: number; showDepartments: boolean; emptyText: string;
}) {
  const list = [...appts].sort((a, b) => a.time.localeCompare(b.time));
  const states = physioStates(list, nowMin, isToday);
  const n = list.length;
  const cols = n <= 7 ? 1 : n <= 14 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(n / cols));
  const listRef = useRef<HTMLOListElement>(null);
  const appliedRef = useRef(1);
  const bs = useFillScale(listRef, appliedRef, JSON.stringify(list) + "|" + cols);
  appliedRef.current = bs;

  if (n === 0) {
    return (
      <div className={styles.physioList} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className={styles.physioEmpty}>
          <Pin color={BRAND.sage} className={styles.physioEmptyPin} />
          <div>{emptyText}</div>
        </div>
      </div>
    );
  }

  return (
    <ol ref={listRef} className={styles.physioList} style={{ "--rows": rows, "--bs": bs } as React.CSSProperties}>
      {list.map((a, i) => {
        const s = states[i];
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
              {((showDepartments && a.department) || a.note) && (
                <div className={styles.apptSub}>
                  {showDepartments && a.department && (
                    <span className={styles.apptDept}>
                      <span className={styles.dot} style={{ backgroundColor: a.departmentColor || BRAND.sage }} aria-hidden="true" />
                      {a.department}
                    </span>
                  )}
                  {a.note}
                </div>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function PhysioBoard({ appts, dateISO, embeddedCu, title = "פיזיותרפיה", showDepartments = true }: {
  appts: PhysioAppt[];
  /** היום שמוצג (בעורך אפשר להציג יום אחר) */
  dateISO?: string;
  embeddedCu?: number;
  title?: string;
  /** כל המחלקות — מציגים את המחלקה של כל דייר ואת הספירה לפי מחלקה */
  showDepartments?: boolean;
}) {
  const now = useNow();
  const todayISO = now ? israelDateISO(now) : "";
  const shownISO = dateISO ?? todayISO;
  const isToday = !!shownISO && shownISO === todayISO;
  const hm = now ? israelTimeHM(now) : "";
  const nowMin = now ? toMinutes(hm) : -1;

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
            {appts.length > 0 && <PhysioSummary appts={appts} isToday={isToday} nowMin={nowMin} showDepartments={showDepartments} />}
            <PhysioList appts={appts} isToday={isToday} nowMin={nowMin} showDepartments={showDepartments}
              emptyText={`אין טיפולים מתוכננים ${isToday ? "היום" : "ביום הזה"}`} />
          </div>
        </main>
      </div>
    </div>
  );
}
