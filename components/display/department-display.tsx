"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, MapPin, User, Utensils, Megaphone } from "lucide-react";
import { EshkolotLogo, Pin, BRAND } from "@/components/orientation/eshkolot-logo";
import WeeklyBoard, { type WeeklyTopic } from "./weekly-board";
import {
  DAY_NAMES, MEALS, MEAL_SHORT, dayIndexOf, israelDateISO, israelTimeHM, shortDate, toMinutes,
  type BoardActivity, type DisplaySettings, type WeekMenu, type WeeklyBoardSettings,
} from "@/lib/week";
import { useFillScale, useUniformGrow } from "./use-fill";
import styles from "./board.module.css";

export type DepartmentDisplayProps = {
  department: { id: string; name: string; color: string | null };
  weekDates: string[];
  days: BoardActivity[][];
  settings: DisplaySettings;
  board: WeeklyBoardSettings;
  topic: WeeklyTopic;
  menu: WeekMenu;
  messages: string[];
  news: string[];
  media: { url: string; type: string }[];
  /** בתוך העורך: --cu נקבע לפי המסגרת ולא לפי החלון */
  embeddedCu?: number;
  /** בעורך: להציג תצוגה מסוימת ולא לסובב */
  fixedView?: ViewKind;
  /** בעורך: לחיצה על פעילות בלוח השבועי */
  editor?: { selectedId?: string | null; onSelect: (a: BoardActivity) => void; onAdd: (dayIndex: number) => void };
};

export type ViewKind = "weekly" | "daily" | "menu" | "media";
type View = { kind: ViewKind; media?: { url: string; type: string } };

const VIEW_LABEL: Record<ViewKind, string> = { weekly: "לוח שבועי", daily: "היום", menu: "תפריט", media: "תמונות" };

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => {
      setNow(prev => {
        const d = new Date();
        return prev && prev.getMinutes() === d.getMinutes() && prev.getHours() === d.getHours() ? prev : d;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function DepartmentDisplay(props: DepartmentDisplayProps) {
  const { department, weekDates, days, settings, board, topic, menu, messages, news, media, embeddedCu, fixedView, editor } = props;
  const now = useNow();

  const todayISO = now ? israelDateISO(now) : "";
  const todayIndex = weekDates.indexOf(todayISO);
  const hm = now ? israelTimeHM(now) : "";
  const nowMinutes = now ? toMinutes(hm) : -1;

  const hasMenu = Object.values(menu).some(d => Object.values(d ?? {}).some(l => (l?.length ?? 0) > 0));

  /* ── סבב התצוגות: לוח שבועי ← היום ← תפריט ← תמונות ── */
  const views = useMemo<View[]>(() => {
    const v: View[] = [];
    if (settings.show_weekly) v.push({ kind: "weekly" });
    if (settings.show_daily) v.push({ kind: "daily" });
    if (settings.show_menu && hasMenu) v.push({ kind: "menu" });
    if (settings.show_media) for (const m of media) v.push({ kind: "media", media: m });
    if (v.length === 0) v.push({ kind: "weekly" });
    return v;
  }, [settings.show_weekly, settings.show_daily, settings.show_menu, settings.show_media, hasMenu, media]);

  const [viewIndex, setViewIndex] = useState(0);
  useEffect(() => {
    if (fixedView || views.length <= 1) return;
    const ms = Math.max(5, Math.min(120, Number(settings.view_interval_seconds) || 20)) * 1000;
    const id = setInterval(() => setViewIndex(i => (i + 1) % views.length), ms);
    return () => clearInterval(id);
  }, [views.length, settings.view_interval_seconds, fixedView]);

  const view: View = fixedView ? { kind: fixedView, media: media[0] } : views[viewIndex % views.length];
  const kindsInRotation = Array.from(new Set(views.map(v => v.kind)));

  /* ── שורת רצה ── */
  const tickerItems = useMemo(() => {
    const src = settings.ticker_source;
    const msgs = src === "news" ? [] : messages.map(t => ({ tag: "msg" as const, text: t }));
    const nws = src === "messages" ? [] : news.map(t => ({ tag: "news" as const, text: t }));
    if (msgs.length === 0) return nws;
    // הודעות חשובות קודם, ושוב אחרי כל ארבע כותרות
    const out: { tag: "msg" | "news"; text: string }[] = [...msgs];
    nws.forEach((n, i) => {
      out.push(n);
      if ((i + 1) % 4 === 0 && i < nws.length - 1) out.push(...msgs);
    });
    return out;
  }, [messages, news, settings.ticker_source]);
  const tickerChars = tickerItems.reduce((n, it) => n + it.text.length + 8, 0);
  const tickerDuration = Math.max(25, Math.round(tickerChars * 0.22)) + "s";

  const stageStyle = embeddedCu ? ({ "--frame-cu": embeddedCu + "px" } as React.CSSProperties) : undefined;
  const today = todayIndex >= 0 ? days[todayIndex] : [];

  const dateText = now
    ? "יום " + DAY_NAMES[dayIndexOf(todayISO)] + ", " + new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long" }).format(now)
    : "";

  return (
    <div className={styles.stage} data-embedded={embeddedCu ? "" : undefined} style={stageStyle} dir="rtl">
      <div className={styles.canvas}>
        {/* כותרת */}
        <header className={styles.header}>
          <EshkolotLogo className={styles.logo} />
          <span className={styles.rule} aria-hidden="true" />
          <div className={styles.dept}>
            <span className={styles.label}>מחלקה</span>
            <span className={styles.deptName}>
              <span className={styles.dot} style={{ backgroundColor: department.color || BRAND.sage }} aria-hidden="true" />
              {department.name}
            </span>
          </div>

          {kindsInRotation.length > 1 && !fixedView && (
            <nav className={styles.views} aria-label="מה מוצג">
              {kindsInRotation.map(k => (
                <span key={k} className={styles.viewPill + (view.kind === k ? " " + styles.viewPillOn : "")}>{VIEW_LABEL[k]}</span>
              ))}
            </nav>
          )}

          <div className={styles.when} style={kindsInRotation.length > 1 && !fixedView ? undefined : { marginInlineStart: "auto" }}>
            <span className={styles.whenDate}>{dateText}</span>
            <span className={styles.whenClock}>{hm}</span>
          </div>
        </header>

        {/* תצוגה */}
        <main key={view.kind + (view.media?.url ?? "")} className={styles.view}>
          {view.kind === "weekly" && (
            <WeeklyBoard days={days} weekDates={weekDates} todayIndex={todayIndex} nowMinutes={nowMinutes} settings={board} topic={topic}
              editable={!!editor} selectedId={editor?.selectedId} onSelect={editor?.onSelect} onAdd={editor?.onAdd} />
          )}

          {view.kind === "daily" && (
            <DailyView today={today} nowMinutes={nowMinutes} menu={todayIndex >= 0 ? menu[todayIndex] : undefined}
              messages={settings.show_announcements ? messages : []} board={board} />
          )}

          {view.kind === "menu" && (
            <MenuBoard menu={menu} weekDates={weekDates} todayIndex={todayIndex} allDays={!!fixedView} />
          )}

          {view.kind === "media" && view.media && (
            <div className={styles.media}>
              {view.media.type === "pdf"
                ? <iframe src={view.media.url} title="מסמך" />
                : <img src={view.media.url} alt="" />}
            </div>
          )}
        </main>

        {/* שורת רצה */}
        {settings.show_ticker && tickerItems.length > 0 ? (
          <footer className={styles.ticker} aria-label="חדשות והודעות">
            <div className={styles.tickerViewport}>
              <div className={styles.tickerTrack} style={{ "--ticker-duration": tickerDuration } as React.CSSProperties}>
                {[0, 1].map(copy => (
                  <React.Fragment key={copy}>
                    {tickerItems.map((it, i) => (
                      <span key={copy + "-" + i} className={styles.tickerItem} aria-hidden={copy === 1 ? true : undefined}>
                        <span className={styles.tag + " " + (it.tag === "news" ? styles.tagNews : styles.tagMsg)}>
                          {it.tag === "news" ? "N12" : "הודעה"}
                        </span>
                        {it.text}
                      </span>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </footer>
        ) : <div />}
      </div>
    </div>
  );
}

/* ───────────── היום ───────────── */

function DailyView({ today, nowMinutes, menu, messages, board }: {
  today: BoardActivity[];
  nowMinutes: number;
  menu?: WeekMenu[number];
  messages: string[];
  board: WeeklyBoardSettings;
}) {
  const end = (a: BoardActivity) => (a.end ? toMinutes(a.end) : toMinutes(a.start) + 60);
  const current = today.find(a => nowMinutes >= toMinutes(a.start) && nowMinutes < end(a));
  const upcoming = today.filter(a => toMinutes(a.start) > nowMinutes).slice(0, current ? 4 : 3);
  const nextOne = !current ? upcoming[0] : undefined;
  const meals = MEALS.filter(m => (menu?.[m]?.length ?? 0) > 0);

  return (
    <div className={styles.daily}>
      <div className={styles.dailyCol}>
        <section className={styles.nowPanel}>
          <span className={styles.panelTitle}><Pin color={BRAND.sun} className={styles.dayPin} />עכשיו</span>
          {current ? (
            <>
              <span className={styles.nowTime}>{current.start}{current.end ? "–" + current.end : ""}</span>
              <span className={styles.nowTitle}>{current.title}</span>
              {(current.location || current.instructor) && (
                <span className={styles.nowMeta}>
                  {board.show_location && current.location && <span><MapPin aria-hidden="true" />{current.location}</span>}
                  {board.show_instructor && current.instructor && <span><User aria-hidden="true" />{current.instructor}</span>}
                </span>
              )}
            </>
          ) : (
            <>
              <span className={styles.nowQuiet}>זמן חופשי ומנוחה</span>
              {nextOne && <span className={styles.nowMeta}><span><Clock3 aria-hidden="true" />הפעילות הבאה בשעה {nextOne.start}: {nextOne.title}</span></span>}
            </>
          )}
        </section>

        {messages.length > 0 && (
          <section className={styles.panel + " " + styles.notice}>
            <span className={styles.panelTitle}><Megaphone aria-hidden="true" />הודעה חשובה</span>
            {messages.slice(0, 2).map((m, i) => <div key={i} className={styles.noticeText}>{m}</div>)}
          </section>
        )}
      </div>

      <div className={styles.dailyCol}>
        <section className={styles.panel + " " + styles.panelGrow}>
          <span className={styles.panelTitle}><Clock3 aria-hidden="true" />בהמשך היום</span>
          {upcoming.length === 0 && <div className={styles.nextSub}>אין עוד פעילויות היום</div>}
          {upcoming.map(a => (
            <div key={a.id} className={styles.nextRow}>
              <span className={styles.nextTime}>{a.start}</span>
              <div>
                <div className={styles.nextTitle}>{a.title}</div>
                {((board.show_location && a.location) || (board.show_instructor && a.instructor)) && (
                  <div className={styles.nextSub}>{[board.show_location ? a.location : "", board.show_instructor ? a.instructor : ""].filter(Boolean).join(", ")}</div>
                )}
              </div>
            </div>
          ))}
        </section>

        {meals.length > 0 && (
          <section className={styles.panel}>
            <span className={styles.panelTitle}><Utensils aria-hidden="true" />תפריט היום</span>
            {meals.map(m => (
              <div key={m} className={styles.mealRow}>
                <span className={styles.mealLabel}>{MEAL_SHORT[m]}</span>
                <span className={styles.mealItems}>{menu![m]!.join(", ")}</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

/* ───────────── תפריט שבועי ───────────── */

function MenuBoard({ menu, weekDates, todayIndex, allDays }: { menu: WeekMenu; weekDates: string[]; todayIndex: number; allDays?: boolean }) {
  const shown = [0, 1, 2, 3, 4, 5, 6].filter(i => allDays || MEALS.some(m => (menu[i]?.[m]?.length ?? 0) > 0) || i === todayIndex);
  const { grow, report } = useUniformGrow();
  return (
    <div className={styles.board} style={{ "--size": 1 } as React.CSSProperties}>
      <div className={styles.days}>
        {shown.map(i => (
          <MenuDay key={i} dayIndex={i} date={weekDates[i]} isToday={i === todayIndex} meals={menu[i] ?? {}} grow={grow} report={report} />
        ))}
      </div>
    </div>
  );
}

function MenuDay({ dayIndex, date, isToday, meals, grow, report }: {
  dayIndex: number; date: string; isToday: boolean; meals: Partial<Record<(typeof MEALS)[number], string[]>>;
  grow: number; report: (id: string, value: number | null) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const appliedRef = useRef(1);
  const has = MEALS.some(m => (meals[m]?.length ?? 0) > 0);
  const desired = useFillScale(listRef, appliedRef, JSON.stringify(meals));
  const applied = Math.min(desired, grow);
  appliedRef.current = applied;
  const id = "menu" + dayIndex;
  useEffect(() => { report(id, has ? desired : null); }, [report, id, desired, has]);
  useEffect(() => () => report(id, null), [report, id]);

  return (
    <section className={styles.day + " " + styles.menuDay + (isToday ? " " + styles.dayToday : "")} style={{ "--bs": applied } as React.CSSProperties}>
      <header className={styles.dayHead}>
        <span className={styles.dayName}>
          {isToday && <Pin color={BRAND.sun} className={styles.dayPin} />}
          {DAY_NAMES[dayIndex]}
        </span>
        <span className={styles.dayDate}>{shortDate(date)}</span>
      </header>
      <div ref={listRef} className={styles.list}>
        {MEALS.map(m => (meals[m]?.length ?? 0) > 0 && (
          <div key={m} className={styles.meal}>
            <div className={styles.mealName}>{MEAL_SHORT[m]}</div>
            <ul className={styles.mealList}>
              {meals[m]!.map((item, k) => <li key={k}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
