"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, MapPin, User } from "lucide-react";
import { Pin, BRAND } from "@/components/orientation/eshkolot-logo";
import { DAY_NAMES, shortDate, toMinutes, type BoardActivity, type WeeklyBoardSettings } from "@/lib/week";
import styles from "./board.module.css";

export type WeeklyTopic = { title: string; description?: string | null; image_url?: string | null } | null;

type Props = {
  days: BoardActivity[][];        // 7 ימים, 0=ראשון
  weekDates: string[];            // 7 תאריכים ISO
  todayIndex: number;             // -1 אם זה לא השבוע הנוכחי
  nowMinutes: number;
  settings: WeeklyBoardSettings;
  topic?: WeeklyTopic;
  /** עורך: לחיצה על פעילות / הוספה ליום */
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (a: BoardActivity) => void;
  onAdd?: (dayIndex: number) => void;
};

const SIZE: Record<WeeklyBoardSettings["text_size"], number> = { s: 0.88, m: 1, l: 1.14 };

/** הלוח השבועי — אותו רכיב במסך במחלקה ובעורך */
export default function WeeklyBoard(props: Props) {
  const { days, weekDates, todayIndex, settings, topic, editable } = props;
  const shown = settings.days
    .filter(i => i >= 0 && i <= 6)
    .sort((a, b) => a - b)
    .filter(i => editable || !settings.hide_empty_days || days[i].length > 0 || i === todayIndex);

  return (
    <div
      className={styles.board + (editable ? " " + styles.editable : "")}
      style={{ "--size": SIZE[settings.text_size] ?? 1 } as React.CSSProperties}
    >
      {settings.show_topic && topic?.title && (
        <div className={styles.topic}>
          {topic.image_url && <img className={styles.topicImg} src={topic.image_url} alt="" />}
          <span className={styles.topicLabel}>נושא השבוע</span>
          <span className={styles.topicTitle}>{topic.title}</span>
          {topic.description && <span className={styles.topicDesc}>{topic.description}</span>}
        </div>
      )}

      <div className={styles.days}>
        {shown.map(i => (
          <DayColumn key={i} {...props} dayIndex={i} date={weekDates[i]} isToday={i === todayIndex}
            isPast={settings.dim_past_days && todayIndex >= 0 && i < todayIndex} />
        ))}
      </div>
    </div>
  );
}

/** יום אחד בלוח. יום עמוס מתכווץ לבד כדי להיכנס, בלי להקטין את שאר הימים */
function DayColumn({
  days, dayIndex, date, isToday, isPast, nowMinutes, settings, editable, selectedId, onSelect, onAdd,
}: Props & { dayIndex: number; date: string; isToday: boolean; isPast: boolean }) {
  const list = days[dayIndex];
  const listRef = useRef<HTMLDivElement>(null);
  // יום עמוס: קודם מקטינים עד 75%, ואם עדיין לא נכנס — מסתירים מיקום/מפעיל ומקטינים עוד
  const [fit, setFit] = useState({ scale: 1, compact: false });
  const key = JSON.stringify([list.map(a => a.id + a.title + a.start + a.end + a.location + a.instructor), settings]);

  useLayoutEffect(() => { setFit({ scale: 1, compact: false }); }, [key]);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || el.scrollHeight <= el.clientHeight + 1) return;
    const ratio = (el.clientHeight / el.scrollHeight) * 0.985;
    setFit(f => {
      const next = f.scale * ratio;
      if (!f.compact && next < 0.75 && !editable) return { scale: 1, compact: true };
      return { ...f, scale: Math.max(0.5, next) };
    });
  });
  const scale = fit.scale;
  const showMeta = !fit.compact;

  return (
    <section
      className={styles.day + (isToday ? " " + styles.dayToday : "") + (isPast && !editable ? " " + styles.dayPast : "")}
      aria-current={isToday ? "date" : undefined}
      style={{ "--bs": scale } as React.CSSProperties}
    >
      <header className={styles.dayHead}>
        <span className={styles.dayName}>
          {isToday && <Pin color={BRAND.sun} className={styles.dayPin} />}
          {DAY_NAMES[dayIndex]}
        </span>
        <span className={styles.dayDate}>{shortDate(date)}</span>
      </header>

      <div ref={listRef} className={styles.list}>
        {list.length === 0 && !editable && <div className={styles.empty}>אין פעילויות מתוכננות</div>}
        {list.map(a => {
          const isNow = isToday && !!a.start && nowMinutes >= toMinutes(a.start) && nowMinutes < (a.end ? toMinutes(a.end) : toMinutes(a.start) + 60);
          const cls = styles.act + (isNow ? " " + styles.actNow : "") + (selectedId === a.id ? " " + styles.actSelected : "");
          const body = (
            <>
              <span className={styles.actTime}>
                <bdi>{a.start}{settings.show_end_time && a.end ? "–" + a.end : ""}</bdi>
                {isNow && <span className={styles.nowTag}>עכשיו</span>}
              </span>
              <span className={styles.actTitle}>{a.title}</span>
              {showMeta && ((settings.show_location && a.location) || (settings.show_instructor && a.instructor)) && (
                <span className={styles.actMeta}>
                  {settings.show_location && a.location && <span><MapPin aria-hidden="true" />{a.location}</span>}
                  {settings.show_instructor && a.instructor && <span><User aria-hidden="true" />{a.instructor}</span>}
                </span>
              )}
              {editable && a.fromCalendar && <CalendarDays className={styles.calIcon} aria-label="מהיומן" />}
            </>
          );
          return editable ? (
            <button key={a.id} type="button" className={cls} onClick={() => onSelect?.(a)}>{body}</button>
          ) : (
            <div key={a.id} className={cls}>{body}</div>
          );
        })}
        {editable && (
          <button type="button" className={styles.addBtn} onClick={() => onAdd?.(dayIndex)}>+ הוספה ל{DAY_NAMES[dayIndex]}</button>
        )}
      </div>
    </section>
  );
}
