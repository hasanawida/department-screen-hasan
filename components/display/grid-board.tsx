"use client";

// לוח פעילויות בסגנון טבלה: שורה לכל שעה בבוקר, רצועת מנוחת צהריים, ושורת אחר הצהריים;
// עמודה לכל יום. בכל משבצת — תמונה גדולה ושם הפעילות; שעה ומקום רק כשהם שונים מהשורה.
// קל לעין: מבנה קבוע, כל הימים מיושרים, והיום והפעילות של עכשיו מודגשים.

import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Moon } from "lucide-react";
import { Pin, BRAND } from "@/components/orientation/eshkolot-logo";
import {
  DAY_NAMES, GRID_LUNCH_MINUTES, gridRows, minutesToHM, parseSlots, shortDate, slotIndexFor, slotLabel, toMinutes, visibleActivities, withWeeklyTopic,
  type BoardActivity, type GridSlot, type WeeklyBoardSettings,
} from "@/lib/week";
import type { DayInfo } from "@/lib/jewish-calendar";
import type { WeeklyTopic } from "./weekly-board";
import { ActivityIcon, HavdalahStarsIcon, HolidayIcon, ShabbatCandlesIcon } from "./icons";
import { FILL_MAX } from "./use-fill";
import styles from "./board.module.css";

type Props = {
  days: BoardActivity[][];
  weekDates: string[];
  todayIndex: number;
  nowMinutes: number;
  settings: WeeklyBoardSettings;
  topic?: WeeklyTopic;
  dayInfos?: DayInfo[];
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (a: BoardActivity) => void;
  /** הוספה ידנית: יום, ושעות המשבצת שלחצו עליה */
  onAdd?: (dayIndex: number, start?: string, end?: string) => void;
  textScale?: number;
  iconScale?: number;
};

/** פעילויות עם אותו שם באותה משבצת (למשל גרייה חושית באשכול 1 ובאשכול 3) — פעם אחת, עם שתי השעות */
type Group = { title: string; items: BoardActivity[] };

const isPm = (a: BoardActivity) => !!a.start && toMinutes(a.start) >= GRID_LUNCH_MINUTES;
const isNowAt = (a: BoardActivity, now: number) => {
  const s = toMinutes(a.start);
  const e = a.end ? toMinutes(a.end) : s + 60;
  return now >= s && now < e;
};

/** כמה גדול הכתב: הכי גדול שעדיין נכנס בכל המשבצות (גם לרוחב וגם לגובה) */
function useGridFit(ref: React.RefObject<HTMLDivElement | null>, key: string, max: number, target: number) {
  const run = () => {
    const el = ref.current;
    if (!el) return;
    const cells = Array.from(el.querySelectorAll<HTMLElement>("[data-gfit]")) as HTMLElement[];
    const fits = () => cells.every(c => c.scrollHeight <= c.clientHeight + 1 && c.scrollWidth <= c.clientWidth + 1);
    let lo = 0.35, hi = max;
    for (let i = 0; i < 14; i++) {
      const m = (lo + hi) / 2;
      el.style.setProperty("--gs", String(m));
      if (fits()) lo = m; else hi = m;
    }
    el.style.setProperty("--gs", String(lo * target));
  };
  useLayoutEffect(run, [key, max, target]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let w = el.clientWidth, h = el.clientHeight;
    const ro = new ResizeObserver(() => {
      if (Math.abs(el.clientWidth - w) < 2 && Math.abs(el.clientHeight - h) < 2) return;
      w = el.clientWidth; h = el.clientHeight; run();
    });
    ro.observe(el);
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) run(); });
    return () => { alive = false; ro.disconnect(); };
  }, [ref, key, max, target]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function GridBoard(props: Props) {
  const { days, weekDates, todayIndex, nowMinutes, settings, topic, dayInfos, editable, selectedId, onSelect, onAdd, textScale = 1, iconScale = 1 } = props;
  const visible = days.map((list, i) => (editable ? list : visibleActivities(list, dayInfos?.[i])));
  const configured = settings.days.filter(i => i >= 0 && i <= 6).sort((a, b) => a - b);
  const holiday = (i: number) => (dayInfos?.[i]?.holidays.length ?? 0) > 0;
  const weekHasActivities = configured.some(i => visible[i].length > 0);
  // ימים בלי פעילויות (למשל שבת) לא מוצגים — חוץ מהיום, מחג, ובעורך
  const shown = configured.filter(i => editable || !settings.hide_empty_days || !weekHasActivities || visible[i].length > 0 || i === todayIndex || holiday(i));

  const all = shown.flatMap(i => visible[i]);
  let { morning, afternoon } = gridRows(all, settings);
  // בעורך תמיד יש משבצות להוספה — גם כשהשבוע ריק או שאין עדיין פעילויות אחר הצהריים
  if (editable) {
    if (!morning.length) morning = parseSlots("10:00-11:00, 11:00-12:00");
    if (!afternoon) afternoon = parseSlots(settings.grid_afternoon)[0] ?? { start: 16 * 60, end: 18 * 60 };
  }
  const pmAll = all.filter(isPm);
  const pmLocation = pmAll.length && pmAll.every(a => a.location && a.location === pmAll[0].location) ? pmAll[0].location : "";

  // תוכן כל משבצת: [יום][שורה]; השורה האחרונה — אחר הצהריים
  const rowCount = morning.length + (afternoon ? 1 : 0);
  const cells = shown.map(d => {
    const rows: BoardActivity[][] = Array.from({ length: rowCount }, () => []);
    for (const a of visible[d]) {
      if (!a.start) continue;
      if (isPm(a)) { if (afternoon) rows[rowCount - 1].push(a); else rows[Math.max(0, morning.length - 1)].push(a); continue; }
      const r = slotIndexFor(a, morning);
      if (r >= 0) rows[r].push(a);
    }
    return rows.map(list => list.sort((x, y) => toMinutes(x.start) - toMinutes(y.start)));
  });

  const level = textScale;
  const fitKey = JSON.stringify([shown, morning, afternoon, all.map(a => a.id + a.title + a.start + a.end + a.location + a.instructor), settings, topic?.title, iconScale, editable]);
  const gridRef = useRef<HTMLDivElement>(null);
  useGridFit(gridRef, fitKey, FILL_MAX * Math.max(1, level), Math.min(1, level));

  const groupsOf = (list: BoardActivity[]): Group[] => {
    if (editable) return list.map(a => ({ title: a.title, items: [a] }));
    const out: Group[] = [];
    for (const a of list) {
      const g = out.find(x => x.title === a.title);
      if (g) g.items.push(a); else out.push({ title: a.title, items: [a] });
    }
    return out;
  };

  /** השורות הקטנות מתחת לשם: שעה (כשהיא לא שעת השורה), מפעיל ומקום — לפי ההגדרות. כל שורה — רשימת חלקים */
  const subLines = (g: Group, slot: GridSlot | null, pm: boolean): string[][] => {
    // המקום מופיע בכל פעילות (כשהוא מסומן בהגדרות). רק אחר הצהריים, כשכולן באותו מקום — הוא כתוב פעם אחת ליד השעות
    const common = pm ? pmLocation : "";
    const loc = (a: BoardActivity) => (settings.show_location && a.location && a.location !== common ? a.location : "");
    const who = (a: BoardActivity) => (settings.show_instructor && a.instructor && !g.title.includes(a.instructor) ? "עם " + a.instructor : "");
    if (g.items.length > 1) {
      return g.items.map(a => [a.start, a.location && settings.show_location ? a.location : "", who(a)].filter(Boolean));
    }
    const a = g.items[0];
    let time = "";
    if (pm || !slot) time = a.start + (settings.show_end_time && a.end ? "–" + a.end : "");
    else if (toMinutes(a.start) !== slot.start) time = a.start + (settings.show_end_time && a.end ? "–" + a.end : "");
    else if (a.end && toMinutes(a.end) !== slot.end) time = "עד " + a.end;
    const parts = [time, who(a), loc(a)].filter(Boolean);
    return parts.length ? [parts] : [];
  };

  const timeBits = (line: string) =>
    line.split(/(\d{1,2}:\d{2}(?:–\d{1,2}:\d{2})?)/).map((part, i) => (/^\d{1,2}:\d{2}/.test(part) ? <bdi key={i} dir="ltr">{part}</bdi> : part));

  const entry = (g: Group, big: boolean, slot: GridSlot | null, pm: boolean) => {
    const a = g.items[0];
    const sel = editable && selectedId === a.id;
    const inner = (
      <>
        {iconScale > 0 && <ActivityIcon key={g.title} title={g.title} className={big ? styles.gIconSvg : styles.gIconSvgS} photoClassName={big ? styles.gIcon : styles.gIconS} />}
        <span className={styles.gText}>
          <span className={big ? styles.gTitle : styles.gTitleS}>{withWeeklyTopic(g.title, topic?.title)}</span>
          {subLines(g, slot, pm).map((parts, i) => (
            <span key={i} className={styles.gSub}>
              {/* כל חלק בשורה אחת (שעה, "עם ...", מקום) — השבירה רק בין החלקים */}
              {parts.map((p, k) => <React.Fragment key={k}>{k > 0 && " · "}<span className={styles.gPart}>{timeBits(p)}</span></React.Fragment>)}
            </span>
          ))}
        </span>
      </>
    );
    const cls = (big ? styles.gOne : styles.gRow) + (sel ? " " + styles.gSelected : "");
    return editable
      ? <button key={a.id} type="button" className={cls} onClick={() => onSelect?.(a)}>{inner}</button>
      : <div key={g.title + a.id} className={cls}>{inner}</div>;
  };

  const cell = (col: number, row: number) => {
    const d = shown[col];
    const list = cells[col][row];
    const pm = !!afternoon && row === rowCount - 1;
    const slot = pm ? afternoon : morning[row] ?? null;
    const isToday = d === todayIndex;
    const now = isToday && nowMinutes >= 0 && list.some(a => isNowAt(a, nowMinutes));
    const info = dayInfos?.[d];
    const groups = groupsOf(list);
    let content: React.ReactNode = null;
    if (groups.length === 1) content = entry(groups[0], true, slot, pm);
    else if (groups.length > 1) content = <div className={styles.gMany}>{groups.map(g => entry(g, false, slot, pm))}</div>;
    else if (row === 0 && info?.noRegularActivities && !editable) {
      const erev = info.holidays.some(h => h.kind === "erev") && !info.holidays.some(h => h.kind === "yomtov");
      content = <div className={styles.gOne}><span className={styles.gTitle}>{erev ? "ערב חג" : "חג שמח"}</span><span className={styles.gSub}>אין פעילויות</span></div>;
    } else if (pm && info?.sacred?.kind === "candles") {
      content = (
        <div className={styles.gOne}>
          <ShabbatCandlesIcon className={styles.gCandles} />
          <span className={styles.gText}><span className={styles.gTitle}>שבת שלום</span><span className={styles.gSub}>{info.sacred.label} <b><bdi dir="ltr">{info.sacred.time}</bdi></b></span></span>
        </div>
      );
    }
    const empty = !groups.length && !content;
    // בעורך: הוספה ידנית למשבצת — היום והשעה כבר ממולאים
    const add = editable && slot ? (
      <button type="button" className={empty ? styles.gCellAddEmpty : styles.gCellAdd}
        onClick={() => onAdd?.(d, minutesToHM(slot.start), pm ? "" : minutesToHM(slot.end))}
        aria-label={`הוספת פעילות ביום ${DAY_NAMES[d]} ב-${minutesToHM(slot.start)}`}>
        {empty ? "+ הוספה" : "+"}
      </button>
    ) : null;
    return (
      <div key={col + "-" + row} data-gfit=""
        className={styles.gCell + (isToday ? " " + styles.gToday : "") + (now ? " " + styles.gNow : "") + (empty ? " " + styles.gEmpty : "")}>
        {now && <span className={styles.gNowTag}>עכשיו</span>}
        {content}
        {add}
      </div>
    );
  };

  const cols = `calc(var(--cu) * 27) repeat(${shown.length}, minmax(0, 1fr))`;
  const rowsTpl = ["auto", ...morning.map(() => "minmax(0, 1fr)"), ...(afternoon ? ["calc(var(--cu) * 5)", "minmax(0, 1fr)"] : [])].join(" ");

  return (
    <div className={styles.board + " " + styles.gridBoard + (editable ? " " + styles.gEditing : "") + (iconScale > 0 ? "" : " " + styles.noIcons)}
      style={{ "--ic": iconScale || 1 } as React.CSSProperties}>
      <div ref={gridRef} className={styles.gGrid} style={{ gridTemplateColumns: cols, gridTemplateRows: rowsTpl }}>
        {/* פינה: נושא השבוע */}
        <div className={styles.gCorner}>
          {settings.show_topic && topic?.title ? (
            <>
              {topic.image_url && <img className={styles.gTopicImg} src={topic.image_url} alt="" />}
              <span className={styles.gTopicText}>
                <span className={styles.gTopicLabel}>נושא השבוע</span>
                <span className={styles.gTopicTitle}>{topic.title}</span>
              </span>
            </>
          ) : null}
        </div>

        {/* כותרות הימים */}
        {shown.map(d => {
          const info = dayInfos?.[d];
          const isToday = d === todayIndex;
          return (
            <div key={"h" + d} className={styles.gDay + (isToday ? " " + styles.gDayToday : "")} aria-current={isToday ? "date" : undefined}>
              <span className={styles.gDayName}>{isToday && <Pin color={BRAND.sun} className={styles.dayPin} />}{DAY_NAMES[d]}</span>
              <span className={styles.gDayDate}>{shortDate(weekDates[d])}</span>
              {info && info.holidays.length > 0 && (
                <span className={styles.gHoliday}><HolidayIcon name={info.holidays[0].name} className={styles.gHolidayIcon} />{info.holidays.map(h => h.name).join(" · ")}</span>
              )}
              {/* צאת שבת — תמיד בכותרת; כניסת שבת — במשבצת של אחר הצהריים, ואם אין שורה כזו — כאן */}
              {info?.sacred && (info.sacred.kind === "havdalah" || !afternoon) && (
                <span className={styles.gSacred}>
                  {info.sacred.kind === "havdalah" ? <HavdalahStarsIcon className={styles.gSacredIcon} /> : <ShabbatCandlesIcon className={styles.gSacredIcon} />}
                  {info.sacred.label} <bdi dir="ltr">{info.sacred.time}</bdi>
                </span>
              )}
            </div>
          );
        })}

        {/* בוקר */}
        {morning.map((slot, r) => (
          <React.Fragment key={"r" + r}>
            <div className={styles.gTime}><bdi dir="ltr">{slotLabel(slot)}</bdi></div>
            {shown.map((_, c) => cell(c, r))}
          </React.Fragment>
        ))}

        {/* מנוחת צהריים ואחר הצהריים */}
        {afternoon && (
          <>
            <div className={styles.gLunch}><Moon aria-hidden="true" />מנוחת צהריים</div>
            <div className={styles.gTime}>
              <bdi dir="ltr">{slotLabel(afternoon)}</bdi>
              {pmLocation && settings.show_location && <small>{pmLocation.startsWith("לובי") ? "ב" + pmLocation : pmLocation}</small>}
            </div>
            {shown.map((_, c) => cell(c, rowCount - 1))}
          </>
        )}
      </div>
    </div>
  );
}
