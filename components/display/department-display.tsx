"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Clock3, MapPin, User, Utensils, Megaphone, HeartPulse } from "lucide-react";
import { EshkolotLogo, Pin, BRAND } from "@/components/orientation/eshkolot-logo";
import WeeklyBoard, { type WeeklyTopic } from "./weekly-board";
import {
  DAY_NAMES, MEAL_SHORT, dayIndexOf, israelDateISO, israelTimeHM, shortDate, toMinutes,
  type BoardActivity, type DisplaySettings, type WeekMenu, type WeeklyBoardSettings,
} from "@/lib/week";
import { TodayMenu, WeeklyMenu, nextMealsSummary } from "./menu-views";
import { PhysioList, PhysioSummary, type PhysioAppt } from "./physio-board";
import styles from "./board.module.css";

export type DepartmentDisplayProps = {
  department: { id: string; name: string; color: string | null };
  weekDates: string[];
  days: BoardActivity[][];
  settings: DisplaySettings;
  board: WeeklyBoardSettings;
  topic: WeeklyTopic;
  menu: WeekMenu;
  /** הערות לתפריט של השבוע (מהדיאטנית) */
  menuNotes?: string[];
  /** בעורך התפריט: איזה יום להציג ב"תפריט היום" (במסך — היום עצמו) */
  menuDayIndex?: number;
  messages: string[];
  news: string[];
  media: { url: string; type: string }[];
  /** מי מהמחלקה מוזמן היום לפיזיותרפיה */
  physio?: PhysioAppt[];
  /** בתוך העורך: --cu נקבע לפי המסגרת ולא לפי החלון */
  embeddedCu?: number;
  /** בעורך: להציג תצוגה מסוימת ולא לסובב */
  fixedView?: ViewKind;
  /** בעורך: לחיצה על פעילות בלוח השבועי */
  editor?: { selectedId?: string | null; onSelect: (a: BoardActivity) => void; onAdd: (dayIndex: number) => void };
};

export type ViewKind = "weekly" | "daily" | "physio" | "menuToday" | "menu" | "media";
type View = { kind: ViewKind; media?: { url: string; type: string } };

const VIEW_LABEL: Record<ViewKind, string> = { weekly: "לוח שבועי", daily: "היום", physio: "פיזיותרפיה", menuToday: "תפריט היום", menu: "תפריט שבועי", media: "תמונות" };

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
  const menuNotes = props.menuNotes ?? [];
  const physio = props.physio ?? [];
  const now = useNow();

  const todayISO = now ? israelDateISO(now) : "";
  const todayIndex = weekDates.indexOf(todayISO);
  const hm = now ? israelTimeHM(now) : "";
  const nowMinutes = now ? toMinutes(hm) : -1;

  const hasMenu = Object.values(menu).some(d => Object.values(d ?? {}).some(l => (l?.length ?? 0) > 0));
  const todayHasMenu = todayIndex >= 0 && Object.values(menu[todayIndex] ?? {}).some(l => (l?.length ?? 0) > 0);

  /* ── סבב התצוגות: לוח שבועי ← היום ← תפריט ← תמונות ── */
  const views = useMemo<View[]>(() => {
    const v: View[] = [];
    if (settings.show_weekly) v.push({ kind: "weekly" });
    if (settings.show_daily) v.push({ kind: "daily" });
    if (settings.show_physio !== false && physio.length > 0) v.push({ kind: "physio" });
    if (settings.show_menu_today !== false && todayHasMenu) v.push({ kind: "menuToday" });
    if (settings.show_menu && hasMenu) v.push({ kind: "menu" });
    if (settings.show_media) for (const m of media) v.push({ kind: "media", media: m });
    if (v.length === 0) v.push({ kind: "weekly" });
    return v;
  }, [settings.show_weekly, settings.show_daily, settings.show_physio, settings.show_menu, settings.show_menu_today, settings.show_media, hasMenu, todayHasMenu, media, physio.length]);

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
              messages={settings.show_announcements ? messages : []} board={board}
              physio={settings.show_physio !== false ? physio : []} />
          )}

          {view.kind === "physio" && (
            <div className={styles.physio}>
              {physio.length > 0 && <PhysioSummary appts={physio} isToday nowMin={nowMinutes} showDepartments={false} />}
              <PhysioList appts={physio} isToday nowMin={nowMinutes} showDepartments={false} emptyText="אין היום טיפולי פיזיותרפיה במחלקה" />
            </div>
          )}

          {view.kind === "menuToday" && (
            <TodayMenu meals={menu[props.menuDayIndex ?? todayIndex] ?? {}} notes={menuNotes}
              nowMinutes={props.menuDayIndex === undefined || props.menuDayIndex === todayIndex ? nowMinutes : -1} />
          )}

          {view.kind === "menu" && (
            <WeeklyMenu menu={menu} weekDates={weekDates} todayIndex={todayIndex} notes={menuNotes} allDays={!!fixedView} />
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

function DailyView({ today, nowMinutes, menu, messages, board, physio }: {
  today: BoardActivity[];
  nowMinutes: number;
  menu?: WeekMenu[number];
  messages: string[];
  board: WeeklyBoardSettings;
  physio: PhysioAppt[];
}) {
  const end = (a: BoardActivity) => (a.end ? toMinutes(a.end) : toMinutes(a.start) + 60);
  const current = today.find(a => nowMinutes >= toMinutes(a.start) && nowMinutes < end(a));
  const upcoming = today.filter(a => toMinutes(a.start) > nowMinutes).slice(0, current ? 4 : 3);
  const nextOne = !current ? upcoming[0] : undefined;
  const nextMeals = nextMealsSummary(menu, nowMinutes);
  // פיזיותרפיה: מי עוד מוזמן היום (לפי שעה)
  const physioNext = [...physio].sort((a, b) => a.time.localeCompare(b.time))
    .filter(a => toMinutes(a.end || a.time) + (a.end ? 0 : 30) > nowMinutes).slice(0, 3);

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

        {physioNext.length > 0 && (
          <section className={styles.panel}>
            <span className={styles.panelTitle}><HeartPulse aria-hidden="true" />פיזיותרפיה היום</span>
            {physioNext.map(a => (
              <div key={a.id} className={styles.mealRow}>
                <span className={styles.mealLabel} dir="ltr">{a.time}</span>
                <span className={styles.mealItems}>{a.name}</span>
              </div>
            ))}
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

        {nextMeals.length > 0 && (
          <section className={styles.panel}>
            <span className={styles.panelTitle}><Utensils aria-hidden="true" />הארוחה הבאה</span>
            {nextMeals.map(({ meal, text }) => (
              <div key={meal} className={styles.mealRow}>
                <span className={styles.mealLabel}>{MEAL_SHORT[meal]}</span>
                <span className={styles.mealItems}>{text}</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
