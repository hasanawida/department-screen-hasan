"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, MapPin, User, Utensils, Megaphone, HeartPulse } from "lucide-react";
import { EshkolotLogo, Pin, BRAND } from "@/components/orientation/eshkolot-logo";
import WeeklyBoard, { type WeeklyTopic } from "./weekly-board";
import GridBoard from "./grid-board";
import {
  DAY_NAMES, MEAL_SHORT, NOTICE_IMAGE_SECONDS, boardDayInfos, dayIndexOf, hasNotice, israelDateISO, israelTimeHM, noticeImages, shortDate, toMinutes,
  viewStyle, visibleActivities, withWeeklyTopic,
  type BoardActivity, type DisplaySettings, type NoticeContent, type WeekMenu, type WeeklyBoardSettings,
} from "@/lib/week";
import { useFillScale } from "./use-fill";
import { TodayMenu, WeeklyMenu, nextMealsSummary } from "./menu-views";
import { PhysioList, PhysioSummary, type PhysioAppt } from "./physio-board";
import { ActivityIcon, DishPhoto, IconConfigContext, MealIcon } from "./icons";
import type { IconConfig } from "@/lib/icon-config";
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
  /** אייקונים ותמונות שנערכו בניהול */
  iconConfig?: IconConfig;
  /** בעורך: לחיצה על פעילות בלוח השבועי */
  editor?: { selectedId?: string | null; onSelect: (a: BoardActivity) => void; onAdd: (dayIndex: number, start?: string, end?: string) => void };
};

export type ViewKind = "weekly" | "daily" | "notice" | "physio" | "menuToday" | "menu" | "media";
type View = { kind: ViewKind; media?: { url: string; type: string } };

const VIEW_LABEL: Record<ViewKind, string> = { weekly: "לוח שבועי", daily: "היום", notice: "מודעה", physio: "פיזיותרפיה", menuToday: "תפריט היום", menu: "תפריט שבועי", media: "תמונות" };

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

  const notice = settings.notice;
  const showNotice = settings.show_notice !== false && hasNotice(notice);
  const noticeImageCount = noticeImages(notice).length;

  /* ── סבב התצוגות: לוח שבועי ← היום ← מודעה ← תפריט ← תמונות ── */
  const views = useMemo<View[]>(() => {
    const v: View[] = [];
    if (settings.show_weekly) v.push({ kind: "weekly" });
    if (settings.show_daily) v.push({ kind: "daily" });
    if (showNotice) v.push({ kind: "notice" });
    if (settings.show_physio !== false && physio.length > 0) v.push({ kind: "physio" });
    if (settings.show_menu_today !== false && todayHasMenu) v.push({ kind: "menuToday" });
    if (settings.show_menu && hasMenu) v.push({ kind: "menu" });
    if (settings.show_media) for (const m of media) v.push({ kind: "media", media: m });
    if (v.length === 0) v.push({ kind: "weekly" });
    return v;
  }, [settings.show_weekly, settings.show_daily, settings.show_physio, settings.show_menu, settings.show_menu_today, settings.show_media, showNotice, hasMenu, todayHasMenu, media, physio.length]);

  // הודעות חשובות בלוח "היום": שתיים בכל פעם
  const dailyMessages = settings.show_announcements ? messages : [];
  const messagePages = Math.ceil(dailyMessages.length / MESSAGES_PER_PAGE);

  const [viewIndex, setViewIndex] = useState(0);
  const currentKind = views[viewIndex % views.length]?.kind;
  // כמה פעמים כבר הוצג לוח "היום" — כל פעם ממשיכים מההודעות הבאות, כך שכולן מוצגות
  const [dailyVisits, setDailyVisits] = useState(0);
  useEffect(() => { if (currentKind === "daily") setDailyVisits(v => v + 1); }, [viewIndex, currentKind]);
  useEffect(() => {
    if (fixedView || views.length <= 1) return;
    const base = Math.max(5, Math.min(120, Number(settings.view_interval_seconds) || 20)) * 1000;
    // במודעה — זמן לראות את כל התמונות, וב"היום" — את כל ההודעות (עד דקה)
    const ms = currentKind === "notice" ? Math.max(base, Math.min(60, noticeImageCount * NOTICE_IMAGE_SECONDS) * 1000)
      : currentKind === "daily" && messagePages > 1 ? Math.max(base, Math.min(60, messagePages * MESSAGE_PAGE_SECONDS) * 1000)
      : base;
    const id = setTimeout(() => setViewIndex(i => (i + 1) % views.length), ms);
    return () => clearTimeout(id);
  }, [viewIndex, currentKind, views.length, settings.view_interval_seconds, fixedView, noticeImageCount, messagePages]);

  const view: View = fixedView ? { kind: fixedView, media: media[0] } : views[viewIndex % views.length];
  const kindsInRotation = Array.from(new Set(views.map(v => v.kind)));

  /* ── שורת רצה: רק חדשות. ההודעות החשובות מוצגות בלוח "היום" ── */
  const tickerItems = useMemo(() => news.map(t => ({ tag: "news" as const, text: t })), [news]);
  const tickerChars = tickerItems.reduce((n, it) => n + it.text.length + 8, 0);
  const tickerDuration = Math.max(25, Math.round(tickerChars * 0.22)) + "s";

  /* ── חגים וזמני שבת (מחושבים מקומית לפי העיר שנבחרה) ── */
  const dayInfos = useMemo(() => boardDayInfos(weekDates, board), [weekDates, board]);

  const stageStyle = embeddedCu ? ({ "--frame-cu": embeddedCu + "px" } as React.CSSProperties) : undefined;
  // בחג ובערב חג גם "היום" מציג רק פעילויות שהוכנסו ידנית
  const today = todayIndex >= 0 ? visibleActivities(days[todayIndex], dayInfos[todayIndex]) : [];

  const dateText = now
    ? "יום " + DAY_NAMES[dayIndexOf(todayISO)] + ", " + new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long" }).format(now)
    : "";

  return (
    <IconConfigContext.Provider value={props.iconConfig ?? EMPTY_ICONS}>
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
          {view.kind === "weekly" && board.layout === "grid" && (
            <GridBoard days={days} weekDates={weekDates} todayIndex={todayIndex} nowMinutes={nowMinutes} settings={board} topic={topic} dayInfos={dayInfos}
              textScale={viewStyle(settings, board, "weekly").text} iconScale={viewStyle(settings, board, "weekly").icons}
              editable={!!editor} selectedId={editor?.selectedId} onSelect={editor?.onSelect} onAdd={editor?.onAdd} />
          )}
          {view.kind === "weekly" && board.layout !== "grid" && (
            <WeeklyBoard days={days} weekDates={weekDates} todayIndex={todayIndex} nowMinutes={nowMinutes} settings={board} topic={topic} dayInfos={dayInfos}
              textScale={viewStyle(settings, board, "weekly").text} iconScale={viewStyle(settings, board, "weekly").icons}
              editable={!!editor} selectedId={editor?.selectedId} onSelect={editor?.onSelect} onAdd={editor?.onAdd} />
          )}

          {view.kind === "daily" && (
            <DailyView today={today} nowMinutes={nowMinutes} menu={todayIndex >= 0 ? menu[todayIndex] : undefined}
              messages={dailyMessages} messageStart={dailyVisits * Math.ceil(60 / MESSAGE_PAGE_SECONDS)} board={board}
              physio={settings.show_physio !== false ? physio : []} topic={topic} look={viewStyle(settings, board, "daily")} />
          )}

          {view.kind === "notice" && <NoticeView notice={notice ?? {}} />}

          {view.kind === "physio" && (
            <div className={styles.physio}>
              {physio.length > 0 && <PhysioSummary appts={physio} isToday nowMin={nowMinutes} showDepartments={false} />}
              <PhysioList appts={physio} isToday nowMin={nowMinutes} showDepartments={false} emptyText="אין היום טיפולי פיזיותרפיה במחלקה" />
            </div>
          )}

          {view.kind === "menuToday" && (
            <TodayMenu meals={menu[props.menuDayIndex ?? todayIndex] ?? {}} notes={menuNotes}
              nowMinutes={props.menuDayIndex === undefined || props.menuDayIndex === todayIndex ? nowMinutes : -1}
              look={viewStyle(settings, board, "menuToday")} />
          )}

          {view.kind === "menu" && (
            <WeeklyMenu menu={menu} weekDates={weekDates} todayIndex={todayIndex} notes={menuNotes} allDays={!!fixedView}
              look={viewStyle(settings, board, "menu")} />
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
        {settings.show_ticker && settings.ticker_source !== "messages" && tickerItems.length > 0 ? (
          <footer className={styles.ticker} aria-label="חדשות">
            <div className={styles.tickerViewport}>
              <div className={styles.tickerTrack} style={{ "--ticker-duration": tickerDuration } as React.CSSProperties}>
                {[0, 1].map(copy => (
                  <React.Fragment key={copy}>
                    {tickerItems.map((it, i) => (
                      <span key={copy + "-" + i} className={styles.tickerItem} aria-hidden={copy === 1 ? true : undefined}>
                        <span className={styles.tag + " " + styles.tagNews}>N12</span>
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
    </IconConfigContext.Provider>
  );
}

const EMPTY_ICONS: IconConfig = {};
/** הודעות חשובות בלוח "היום": כמה בכל פעם, וכל כמה שניות מתחלפות */
const MESSAGES_PER_PAGE = 2;
const MESSAGE_PAGE_SECONDS = 8;

/* ───────────── מודעה: כתב מימין, תמונות מתחלפות משמאל ───────────── */

export function NoticeView({ notice }: { notice: NoticeContent }) {
  const images = noticeImages(notice);
  const title = String(notice.title ?? "").trim();
  const text = String(notice.text ?? "").trim();
  const hasText = !!(title || text);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (images.length <= 1) return;
    const id = setInterval(() => setShown(i => (i + 1) % images.length), NOTICE_IMAGE_SECONDS * 1000);
    return () => clearInterval(id);
  }, [images.length]);

  // הכתב בגודל הכי גדול שנכנס
  const copyRef = useRef<HTMLDivElement>(null);
  const appliedRef = useRef(1);
  const ns = useFillScale(copyRef, appliedRef, title + "|" + text + "|" + images.length, 1.5, 0.45, 1);
  appliedRef.current = ns;

  return (
    <div className={styles.bulletin + (images.length ? "" : " " + styles.bulletinNoImages) + (hasText ? "" : " " + styles.bulletinNoText)}>
      {hasText && (
        <section ref={copyRef} className={styles.bulletinCopy} style={{ "--ns": ns } as React.CSSProperties}>
          <span className={styles.bulletinKicker}><Megaphone aria-hidden="true" />מודעה</span>
          {title && <h2 className={styles.bulletinTitle}>{title}</h2>}
          {text && text.split(/\n+/).map((p, i) => <p key={i} className={styles.bulletinText}>{p}</p>)}
        </section>
      )}
      {images.length > 0 && (
        <section className={styles.bulletinGallery} aria-label="תמונות">
          {images.map((src, i) => (
            <img key={src + i} src={src} alt="" className={styles.bulletinImg + (i === shown % images.length ? " " + styles.bulletinImgOn : "")} />
          ))}
          {images.length > 1 && (
            <span className={styles.bulletinDots} aria-hidden="true">
              {images.map((_, i) => <span key={i} className={styles.bulletinDot + (i === shown % images.length ? " " + styles.bulletinDotOn : "")} />)}
            </span>
          )}
        </section>
      )}
    </div>
  );
}

/* ───────────── היום ───────────── */

function DailyView({ today, nowMinutes, menu, messages, messageStart = 0, board, physio, topic, look = { text: 1, icons: 1 } }: {
  today: BoardActivity[];
  nowMinutes: number;
  menu?: WeekMenu[number];
  messages: string[];
  /** מאיזה עמוד הודעות להתחיל (כל הצגה של "היום" ממשיכה מאיפה שהקודמת עצרה) */
  messageStart?: number;
  board: WeeklyBoardSettings;
  physio: PhysioAppt[];
  topic?: WeeklyTopic;
  /** גודל הכתב והאייקונים (מהגדרות המחלקה) */
  look?: { text: number; icons: number };
}) {
  const end = (a: BoardActivity) => (a.end ? toMinutes(a.end) : toMinutes(a.start) + 60);
  const current = today.find(a => nowMinutes >= toMinutes(a.start) && nowMinutes < end(a));
  // בכתב גדול — פחות פעילויות בהמשך היום, כדי שהכול ייכנס
  const upcoming = today.filter(a => toMinutes(a.start) > nowMinutes).slice(0, look.text > 1.3 ? 2 : current ? 4 : 3);
  const nextOne = !current ? upcoming[0] : undefined;
  const nextMeals = nextMealsSummary(menu, nowMinutes);
  // הודעות חשובות: שתיים בכל פעם, ואם יש יותר — מתחלפות
  const msgPages = Math.ceil(messages.length / MESSAGES_PER_PAGE);
  const [msgPage, setMsgPage] = useState(() => (msgPages ? messageStart % msgPages : 0));
  useEffect(() => {
    if (msgPages <= 1) { setMsgPage(0); return; }
    const id = setInterval(() => setMsgPage(p => (p + 1) % msgPages), MESSAGE_PAGE_SECONDS * 1000);
    return () => clearInterval(id);
  }, [msgPages]);
  const page = msgPages ? msgPage % msgPages : 0;
  const shownMessages = messages.slice(page * MESSAGES_PER_PAGE, page * MESSAGES_PER_PAGE + MESSAGES_PER_PAGE);
  // פיזיותרפיה: מי עוד מוזמן היום (לפי שעה)
  const physioNext = [...physio].sort((a, b) => a.time.localeCompare(b.time))
    .filter(a => toMinutes(a.end || a.time) + (a.end ? 0 : 30) > nowMinutes).slice(0, 3);

  return (
    <div className={styles.daily + (look.icons > 0 ? "" : " " + styles.noIcons)}
      style={{ "--cu": `calc(var(--cu0) * ${look.text})`, "--ic": look.icons || 1 } as React.CSSProperties}>
      <div className={styles.dailyCol}>
        <section className={styles.nowPanel}>
          <span className={styles.panelTitle}><Pin color={BRAND.sun} className={styles.dayPin} />עכשיו</span>
          {current ? (
            <>
              <span className={styles.nowTime}>{current.start}{current.end ? "–" + current.end : ""}</span>
              <span className={styles.nowTitle}>
                {look.icons > 0 && <ActivityIcon key={current.title} title={current.title} className={styles.nowIcon} photoClassName={styles.nowPhoto} />}
                {withWeeklyTopic(current.title, topic?.title)}
              </span>
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
              {nextOne && <span className={styles.nowMeta}><span><Clock3 aria-hidden="true" />הפעילות הבאה בשעה {nextOne.start}: {withWeeklyTopic(nextOne.title, topic?.title)}</span></span>}
            </>
          )}
        </section>

        {messages.length > 0 && (
          <section className={styles.panel + " " + styles.notice}>
            <span className={styles.panelTitle}><Megaphone aria-hidden="true" />{messages.length > 1 ? "הודעות חשובות" : "הודעה חשובה"}</span>
            {shownMessages.map((m, i) => <div key={msgPage + "-" + i} className={styles.noticeText}>{m}</div>)}
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
                <div className={styles.nextTitle}>
                  {look.icons > 0 && <ActivityIcon key={a.title} title={a.title} className={styles.actIcon} photoClassName={styles.actPhoto} />}
                  {withWeeklyTopic(a.title, topic?.title)}
                </div>
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
                <span className={styles.mealLabel}><MealIcon meal={meal} className={styles.mealIcon} />{MEAL_SHORT[meal]}</span>
                <span className={styles.mealItems}><DishPhoto line={text.split(",")[0]} className={styles.dishPhoto} />{text}</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
