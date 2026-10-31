"use client";

import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, Flame, MapPin, Star, User } from "lucide-react";
import { Pin, BRAND } from "@/components/orientation/eshkolot-logo";
import { DAY_NAMES, isManualActivity, shortDate, toMinutes, visibleActivities, type BoardActivity, type WeeklyBoardSettings } from "@/lib/week";
import type { DayInfo, HolidayKind } from "@/lib/jewish-calendar";
import { useFillScale, useUniformGrow } from "./use-fill";
import { ActivityIcon, HavdalahStarsIcon, HolidayIcon as FestivalIcon, ShabbatCandlesIcon } from "./icons";
import styles from "./board.module.css";

export type WeeklyTopic = { title: string; description?: string | null; image_url?: string | null } | null;

type Props = {
  days: BoardActivity[][];        // 7 ימים, 0=ראשון
  weekDates: string[];            // 7 תאריכים ISO
  todayIndex: number;             // -1 אם זה לא השבוע הנוכחי
  nowMinutes: number;
  settings: WeeklyBoardSettings;
  topic?: WeeklyTopic;
  /** חגים וזמני שבת לכל אחד משבעת הימים */
  dayInfos?: DayInfo[];
  /** עורך: לחיצה על פעילות / הוספה ליום */
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (a: BoardActivity) => void;
  onAdd?: (dayIndex: number) => void;
};

const SIZE: Record<WeeklyBoardSettings["text_size"], number> = { s: 0.88, m: 1, l: 1.14 };

/** הלוח השבועי — אותו רכיב במסך במחלקה ובעורך */
export default function WeeklyBoard(props: Props) {
  const { days, weekDates, todayIndex, settings, topic, editable, dayInfos } = props;
  // בחג ובערב חג מוצגות במסך רק פעילויות שהוכנסו ידנית לתאריך
  const visible = days.map((list, i) => visibleActivities(list, dayInfos?.[i]));
  // יום עם חג או זמני שבת מוצג תמיד, גם בלי פעילויות — כדי שיראו אותו
  const marked = (i: number) => !!dayInfos?.[i] && (dayInfos[i].holidays.length > 0 || !!dayInfos[i].sacred);
  // ימים בלי פעילויות לא מוצגים (חוץ מהיום עצמו). בעורך מוצגים כולם, כדי שאפשר יהיה להוסיף.
  // שבוע שאין בו פעילויות בכלל — מציגים את כל הימים, כדי שלא יישאר עמוד ריק אחד ענק.
  const configured = settings.days.filter(i => i >= 0 && i <= 6).sort((a, b) => a - b);
  const weekHasActivities = configured.some(i => visible[i].length > 0);
  const hideEmpty = settings.hide_empty_days && weekHasActivities;
  const shown = configured.filter(i => editable || !hideEmpty || visible[i].length > 0 || i === todayIndex || marked(i));

  // כל הימים גדלים יחד כדי למלא את המסך; יום עמוס מתכווץ לבד
  const { grow, report } = useUniformGrow();

  return (
    <div
      className={styles.board + " " + styles.activityBoard + (editable ? " " + styles.editable : "")}
      style={{ "--size": SIZE[settings.text_size] ?? 1 } as React.CSSProperties}
    >
      {settings.show_topic && topic?.title && (
        <div className={styles.topic}>
          {topic.image_url && <img className={styles.topicImg} src={topic.image_url} alt="" />}
          <div className={styles.topicText}>
            <span className={styles.topicLabel}>נושא השבוע</span>
            <span className={styles.topicTitle}>{topic.title}</span>
            {topic.description && <span className={styles.topicDesc}>{topic.description}</span>}
          </div>
        </div>
      )}

      {/* היום רחב יותר משאר הימים — העין מוצאת אותו מיד */}
      <div className={styles.days} style={{ gridTemplateColumns: shown.map(i => (i === todayIndex ? "1.6fr" : "1fr")).map(f => `minmax(0, ${f})`).join(" ") }}>
        {shown.map(i => (
          <DayColumn key={i} {...props} dayIndex={i} date={weekDates[i]} isToday={i === todayIndex}
            info={dayInfos?.[i]}
            isPast={settings.dim_past_days && todayIndex >= 0 && i < todayIndex}
            hiddenOnScreen={!!editable && hideEmpty && visible[i].length === 0 && i !== todayIndex && !marked(i)}
            grow={grow} report={report} />
        ))}
      </div>
    </div>
  );
}

/** יום אחד בלוח: גדל עם שאר הימים כשיש מקום, ומתכווץ לבד כשהוא עמוס */
function DayColumn({
  days, dayIndex, date, isToday, isPast, hiddenOnScreen, info, nowMinutes, settings, editable, selectedId, onSelect, onAdd, grow, report,
}: Props & {
  dayIndex: number; date: string; isToday: boolean; isPast: boolean; hiddenOnScreen?: boolean;
  info?: DayInfo;
  grow: number; report: (id: string, value: number | null) => void;
}) {
  // במסך: רק מה שמוצג (בחג — רק פעילויות ידניות). בעורך: הכול, והפעילויות שלא יוצגו בחג — בצבע חלש
  const list = editable ? days[dayIndex] : visibleActivities(days[dayIndex], info);
  const holidayHides = (a: BoardActivity) => !!info?.noRegularActivities && !isManualActivity(a);
  const listRef = useRef<HTMLDivElement>(null);
  const contentKey = JSON.stringify([list.map(a => a.id + a.title + a.start + a.end + a.location + a.instructor), settings, info]);

  // יום עמוס מאוד: מסתירים מיקום ומפעיל כדי שיהיה מקום לשעה ולשם הפעילות
  const [compact, setCompact] = useState(false);
  useEffect(() => { setCompact(false); }, [contentKey]);

  const appliedRef = useRef(1);
  const desired = useFillScale(listRef, appliedRef, contentKey + (compact ? "|c" : ""));
  const applied = Math.min(desired, grow);
  appliedRef.current = applied;

  useEffect(() => {
    if (!compact && !editable && desired < 0.72) setCompact(true);
  }, [desired, compact, editable]);

  // רק ימים עם פעילויות קובעים כמה הלוח יכול לגדול
  const id = String(dayIndex);
  useEffect(() => { report(id, list.length ? desired : null); }, [report, id, desired, list.length]);
  useEffect(() => () => report(id, null), [report, id]);

  const showMeta = !compact;
  const holidays = info?.holidays ?? [];
  const mainKind = holidayKindOrder(holidays.map(h => h.kind));
  const isErev = holidays.some(h => h.kind === "erev") && !holidays.some(h => h.kind === "yomtov");
  const emptyText = info?.noRegularActivities
    ? <><span className={styles.emptyHolidayTitle}>{isErev ? "ערב חג" : "חג שמח"}</span><span>אין פעילויות</span></>
    : "אין פעילויות מתוכננות";

  return (
    <section
      className={styles.day + (isToday ? " " + styles.dayToday : "") + (isPast && !editable ? " " + styles.dayPast : "") + (hiddenOnScreen ? " " + styles.dayHiddenPreview : "")}
      aria-current={isToday ? "date" : undefined}
      style={{ "--bs": applied } as React.CSSProperties}
    >
      <header className={styles.dayHead}>
        <span className={styles.dayName}>
          {isToday && <Pin color={BRAND.sun} className={styles.dayPin} />}
          {DAY_NAMES[dayIndex]}
        </span>
        <span className={styles.dayDate}>{shortDate(date)}</span>
      </header>

      {holidays.length > 0 && mainKind && (
        <div className={styles.dayHoliday + " " + HOLIDAY_CLASS[mainKind]}>
          {(mainKind === "yomtov" || mainKind === "erev")
            ? <FestivalIcon name={holidays[0].name} className={styles.holidayIcon} />
            : <HolidayIcon kind={mainKind} />}
          <span className={styles.holidayNames}>{holidays.map(h => <span key={h.name}>{h.name}</span>)}</span>
        </div>
      )}

      <div ref={listRef} className={styles.list}>
        {list.length === 0 && !editable && (
          <div className={styles.empty + (info?.noRegularActivities ? " " + styles.emptyHoliday : "")}>{emptyText}</div>
        )}
        {hiddenOnScreen && <div className={styles.empty}>יום בלי פעילויות לא מוצג במסך</div>}
        {editable && info?.noRegularActivities && (
          <div className={styles.holidayNote}>{isErev ? "ערב חג" : "חג"}: במסך מוצגות רק פעילויות שהוכנסו לתאריך הזה או מהיומן</div>
        )}
        {list.map(a => {
          const isNow = isToday && !!a.start && nowMinutes >= toMinutes(a.start) && nowMinutes < (a.end ? toMinutes(a.end) : toMinutes(a.start) + 60);
          const cls = styles.act + (isNow ? " " + styles.actNow : "") + (selectedId === a.id ? " " + styles.actSelected : "")
            + (editable && holidayHides(a) ? " " + styles.actHolidayHidden : "");
          const body = (
            <>
              <span className={styles.actTime}>
                <bdi>{a.start}{settings.show_end_time && a.end ? "–" + a.end : ""}</bdi>
                {isNow && <span className={styles.nowTag}>עכשיו</span>}
              </span>
              <span className={styles.actTitle}>
                {settings.show_icons !== false && <ActivityIcon title={a.title} className={styles.actIcon} />}
                {a.title}
              </span>
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

      {info?.sacred && (
        <footer className={styles.daySacred + (info.sacred.kind === "havdalah" ? " " + styles.daySacredOut : "")}>
          <span className={styles.sacredHead}>
            {info.sacred.kind === "candles"
              ? <ShabbatCandlesIcon className={styles.sacredIcon} />
              : <HavdalahStarsIcon className={styles.sacredIcon} />}
            <span className={styles.sacredLabel}>{info.sacred.label}</span>
          </span>
          <bdi className={styles.sacredTime}>{info.sacred.time}</bdi>
        </footer>
      )}
    </section>
  );
}

/* ── חגים ── */

const HOLIDAY_CLASS: Record<HolidayKind, string> = {
  yomtov: styles.holidayMain,
  erev: styles.holidayMain,
  minor: styles.holidayMinor,
  memorial: styles.holidaySolemn,
  fast: styles.holidaySolemn,
};

/** כשיש כמה מועדים באותו יום — הצבע והאייקון לפי החשוב שבהם */
function holidayKindOrder(kinds: HolidayKind[]): HolidayKind | null {
  for (const k of ["yomtov", "erev", "memorial", "fast", "minor"] as const) if (kinds.includes(k)) return k;
  return null;
}

function HolidayIcon({ kind }: { kind: HolidayKind }) {
  if (kind === "memorial") return <Flame className={styles.holidayIcon} aria-hidden="true" />;
  if (kind === "fast") return null;
  return <Star className={styles.holidayIcon} aria-hidden="true" />;
}
