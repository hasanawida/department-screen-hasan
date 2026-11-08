// עזרים לתאריכים ושבועות — תמיד לפי שעון ישראל (השרת של Vercel עובד ב-UTC)

import { dayInfo, shabbatCity, DEFAULT_SHABBAT_CITY, type DayInfo } from "./jewish-calendar";

export const TZ = "Asia/Jerusalem";
export const DAY_CODES = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"] as const;
export const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** תאריך YYYY-MM-DD של רגע מסוים לפי שעון ישראל */
export function israelDateISO(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** שעה HH:MM לפי שעון ישראל */
export function israelTimeHM(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const h = parts.find(p => p.type === "hour")?.value ?? "00";
  const m = parts.find(p => p.type === "minute")?.value ?? "00";
  return (h === "24" ? "00" : h) + ":" + m;
}

/** יום בשבוע (0=ראשון) של תאריך ISO */
export function dayIndexOf(iso: string): DayIndex {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as DayIndex;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** יום ראשון של השבוע שבו נמצא התאריך */
export function weekStartISO(iso: string): string {
  return addDaysISO(iso, -dayIndexOf(iso));
}

export function weekDatesISO(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
}

/** 26.10 */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return Number(d) + "." + Number(m);
}

export function toMinutes(hm: string): number {
  const [h, m] = (hm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** כמה זמן לפני פעילות היא מודגשת כ"בקרוב" — רק כשבאותו רגע לא מתקיימת שום פעילות */
export const SOON_MINUTES = 60;
export type NowMark = "now" | "soon";

/**
 * מה מודגש בצהוב בלוח של היום: הפעילויות שמתקיימות עכשיו (בלי שעת סיום — שעה מההתחלה).
 * ואם כרגע אין פעילות (בין פעילויות, או לפני הראשונה) — הפעילות הבאה, אם היא מתחילה בתוך שעה,
 * כדי שתמיד יהיה ברור מה עכשיו/מה הבא.
 */
export function nowMarks<T extends { id: string; start: string; end?: string }>(day: T[], nowMinutes: number): Map<string, NowMark> {
  const marks = new Map<string, NowMark>();
  if (nowMinutes < 0) return marks;
  const timed = day.filter(a => !!a.start);
  for (const a of timed) {
    const s = toMinutes(a.start);
    const e = a.end ? toMinutes(a.end) : s + 60;
    if (nowMinutes >= s && nowMinutes < e) marks.set(a.id, "now");
  }
  if (marks.size) return marks;
  const later = timed.map(a => toMinutes(a.start)).filter(m => m > nowMinutes);
  if (!later.length) return marks;
  const next = Math.min(...later);
  if (next - nowMinutes <= SOON_MINUTES) for (const a of timed) if (toMinutes(a.start) === next) marks.set(a.id, "soon");
  return marks;
}

/* ───────────── פעילויות לשבוע ───────────── */

export type ActivityRow = {
  id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  location?: string | null;
  instructor_name?: string | null;
  day_of_week?: string | null;
  activity_date?: string | null;
  is_recurring?: boolean | null;
  is_active?: boolean | null;
  source?: string | null;
  external_uid?: string | null;
  /** פעילות קבועה: שבועות (יום ראשון של השבוע) שבהם היא לא מתקיימת או הוחלפה בשינוי "רק השבוע" */
  skip_dates?: string[] | null;
  /** העתק של פעילות קבועה לשבוע אחד */
  parent_id?: string | null;
};

export type BoardActivity = {
  id: string;
  title: string;
  start: string;        // HH:MM
  end: string;          // HH:MM או ""
  location: string;
  instructor: string;
  dayIndex: DayIndex;
  date: string | null;  // אם זו פעילות של שבוע מסוים
  recurring: boolean;   // חוזרת כל שבוע
  fromCalendar: boolean;
  parentId: string | null; // שינוי לשבוע אחד של פעילות קבועה
};

/** קוד יום ("ב'", "שבת", "יום שני"...) ← מספר היום, 0 = ראשון. -1 אם לא מזוהה */
export function dayCodeIndex(code: string): number {
  const c = code.trim().replace(/^יום\s+/, "").replace(/[׳`]/g, "'");
  const i = DAY_CODES.indexOf(c as (typeof DAY_CODES)[number]);
  if (i >= 0) return i;
  if (c === "שבת") return 6;
  return DAY_NAMES.indexOf(c as (typeof DAY_NAMES)[number]);
}

/** התאריך של פעילות קבועה בשבוע מסוים */
export function occurrenceDate(dayCode: string, weekStart: string): string | null {
  const i = dayCodeIndex(dayCode);
  return i >= 0 ? addDaysISO(weekStart, i) : null;
}

export function normalizeActivity(row: ActivityRow, dayIndex: DayIndex): BoardActivity {
  return {
    id: String(row.id),
    title: row.title ?? "",
    start: (row.start_time ?? "").slice(0, 5),
    end: (row.end_time ?? "").slice(0, 5),
    location: row.location ?? "",
    instructor: row.instructor_name ?? "",
    dayIndex,
    date: row.activity_date ?? null,
    recurring: !row.activity_date,
    fromCalendar: !!row.external_uid,
    parentId: row.parent_id ? String(row.parent_id) : null,
  };
}

/**
 * "קבוצת נושא" היא פעילות קבועה, והנושא מתחלף כל שבוע לפי התוכנית השנתית —
 * לכן במסך מוסיפים לה את נושא השבוע: "קבוצת נושא ואקטואליה" ← "קבוצת נושא: זכוכית ואקטואליה".
 * אם כבר כתוב נושא אחרי נקודתיים, או שאין נושא לשבוע — השם נשאר כמו שהוא.
 */
export function withWeeklyTopic(title: string, topic?: string | null): string {
  const t = topic?.trim();
  if (!t) return title;
  return title.replace(/^(\s*קבוצת נושא)(?!\s*:)/, `$1: ${t}`);
}

/**
 * מחלק פעילויות לשבעה ימים:
 * פעילות עם תאריך — רק בשבוע של התאריך; פעילות בלי תאריך — חוזרת כל שבוע לפי היום,
 * חוץ מהשבועות שבהם בוטלה או הוחלפה לשבוע אחד (skip_dates).
 */
export function activitiesByDay(rows: ActivityRow[], weekStart: string): BoardActivity[][] {
  const dates = weekDatesISO(weekStart);
  const days: BoardActivity[][] = [[], [], [], [], [], [], []];
  for (const row of rows) {
    if (row.is_active === false) continue;
    if (row.activity_date) {
      const idx = dates.indexOf(row.activity_date);
      if (idx >= 0) days[idx].push(normalizeActivity(row, idx as DayIndex));
    } else if (row.day_of_week) {
      const idx = dayCodeIndex(row.day_of_week);
      if (idx >= 0 && !(row.skip_dates ?? []).includes(weekStart)) days[idx].push(normalizeActivity(row, idx as DayIndex));
    }
  }
  for (const d of days) d.sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || a.title.localeCompare(b.title, "he"));
  return days;
}

/* ───────────── הגדרות לוח שבועי ───────────── */

export type WeeklyBoardSettings = {
  title: string;
  days: number[];             // אילו ימים להציג
  hide_empty_days: boolean;
  show_location: boolean;
  show_instructor: boolean;
  show_end_time: boolean;
  show_icons?: boolean;       // אייקון ליד כל פעילות (לפי השם שלה)
  show_topic: boolean;
  dim_past_days: boolean;
  text_size: "s" | "m" | "l";
  /** חגים וערבי חג בלוח. ביום כזה הפעילויות הקבועות לא מוצגות, רק מה שהוכנס ידנית לתאריך */
  show_holidays?: boolean;
  /** כניסת שבת/חג ביום שישי וערב חג, וצאת שבת/חג בשבת ובחג */
  show_shabbat_times?: boolean;
  /** העיר שלפיה מחושבים זמני השבת (id מתוך SHABBAT_CITIES) */
  shabbat_city?: string;
  /** סגנון הלוח: עמודה לכל יום (columns), או טבלה של שעות × ימים (grid) */
  layout?: "columns" | "grid";
  /** בטבלה: שעות השורות בבוקר, למשל "09:30-10:30, 10:30-11:00". ריק = לפי הפעילויות */
  grid_slots?: string;
  /** בטבלה: שעות אחר הצהריים, למשל "16:00-18:00". ריק = לפי הפעילויות */
  grid_afternoon?: string;
};

export const DEFAULT_WEEKLY_BOARD: WeeklyBoardSettings = {
  title: "לוח פעילויות שבועי",
  days: [0, 1, 2, 3, 4, 5, 6],
  hide_empty_days: true,
  show_location: true,
  show_instructor: true,
  show_end_time: false,
  show_icons: true,
  show_topic: true,
  dim_past_days: true,
  text_size: "m",
  show_holidays: true,
  show_shabbat_times: true,
  shabbat_city: DEFAULT_SHABBAT_CITY,
};

export function weeklyBoardSettings(raw: unknown): WeeklyBoardSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<WeeklyBoardSettings>;
  const merged = { ...DEFAULT_WEEKLY_BOARD, ...r };
  if (!Array.isArray(merged.days) || merged.days.length === 0) merged.days = DEFAULT_WEEKLY_BOARD.days;
  return merged;
}

/* ───────────── חגים וזמני שבת בלוח ───────────── */

/** פעילות שמוצגת גם בחג: הוכנסה ידנית לתאריך מסוים, או יובאה מהיומן (מה ששובץ ביומן — מתקיים) */
export function isManualActivity(a: BoardActivity): boolean {
  return !!a.date || a.fromCalendar;
}

/** מה לציין בכל אחד משבעת ימי השבוע, לפי ההגדרות של הלוח */
export function boardDayInfos(weekDates: string[], settings: WeeklyBoardSettings): DayInfo[] {
  const city = shabbatCity(settings.shabbat_city);
  return weekDates.map(iso => {
    const info = dayInfo(iso, city);
    return {
      // בלוח מסמנים רק חגים וערבי חג (לא חול המועד, חנוכה, ימי זיכרון וכו')
      holidays: settings.show_holidays !== false ? info.holidays.filter(h => h.kind === "yomtov" || h.kind === "erev") : [],
      noRegularActivities: settings.show_holidays !== false && info.noRegularActivities,
      sacred: settings.show_shabbat_times !== false ? info.sacred : null,
    };
  });
}

/** הפעילויות שמוצגות במסך ביום מסוים: בחג ובערב חג — רק מה שהוכנס ידנית */
export function visibleActivities(list: BoardActivity[], info: DayInfo | undefined): BoardActivity[] {
  return info?.noRegularActivities ? list.filter(isManualActivity) : list;
}

/* ───────────── הגדרות מסך מחלקה ───────────── */

export type TickerSource = "both" | "news" | "messages";

export type DisplaySettings = {
  show_daily: boolean;
  show_weekly: boolean;
  show_menu: boolean;        // תפריט שבועי
  show_menu_today?: boolean; // תפריט היום, בגדול
  show_physio?: boolean;     // מי מהמחלקה מוזמן היום לפיזיותרפיה
  show_media: boolean;
  show_ticker: boolean;
  show_announcements: boolean;
  ticker_source: TickerSource;
  view_interval_seconds: number;
  weekly_board?: Partial<WeeklyBoardSettings>;
  /** גודל הכתב והאייקונים בכל תצוגה (לכל מחלקה בנפרד) */
  view_style?: Partial<Record<StyledView, ViewStyle>>;
  /** מסך "מודעה": כתב מימין ותמונות מתחלפות משמאל */
  show_notice?: boolean;
  notice?: NoticeContent;
};

/* ───────────── מסך מודעה ───────────── */

/** מודעה כתובה עם עד 8 תמונות שמתחלפות */
export type NoticeContent = { title?: string; text?: string; images?: string[] };
export const NOTICE_MAX_IMAGES = 8;
/** כל כמה שניות מתחלפת תמונה במודעה */
export const NOTICE_IMAGE_SECONDS = 6;

export function noticeImages(n?: NoticeContent | null): string[] {
  return (n?.images ?? []).filter(u => typeof u === "string" && !!u.trim()).slice(0, NOTICE_MAX_IMAGES);
}
export function hasNotice(n?: NoticeContent | null): boolean {
  return !!(n && (String(n.title ?? "").trim() || String(n.text ?? "").trim() || noticeImages(n).length));
}

/* ───────────── גודל כתב ואייקונים בכל תצוגה ───────────── */

export type StyledView = "weekly" | "daily" | "menuToday" | "menu";
/** text — גודל הכתב ביחס לרגיל (1); icons — גודל האייקונים ביחס לרגיל, 0 = בלי אייקונים */
export type ViewStyle = { text?: number; icons?: number };

/**
 * max — הכתב הכי גדול בתצוגה. בלוח ובתפריטים הכתב ממלא את המסך לבד, וכל צעד מעל 100%
 * מצמצם רווחים ומסדר מחדש כדי לפנות לו מקום — בלי להסתיר ימים או פרטים.
 */
export const STYLED_VIEWS: { key: StyledView; label: string; max: number }[] = [
  { key: "weekly", label: "לוח שבועי", max: 1.5 },
  { key: "daily", label: "היום", max: 1.8 },
  { key: "menuToday", label: "תפריט היום", max: 1.3 },
  { key: "menu", label: "תפריט שבועי", max: 1.3 },
];

/** כמה צעדים מעל 100% (0–5): כל צעד מפנה עוד מקום לכתב */
export const bigTextLevel = (text: number) => (text > 1 ? Math.max(1, Math.min(5, Math.round((text - 1) * 10))) : 0);
export const TEXT_SCALE_MIN = 0.7;
export const TEXT_SCALE_MAX = 2.5;
export const TEXT_SCALE_STEP = 0.1;
export const textScaleMax = (view: StyledView) => STYLED_VIEWS.find(v => v.key === view)?.max ?? TEXT_SCALE_MAX;
export const ICON_SCALES: { value: number; label: string }[] = [
  { value: 0, label: "בלי" },
  { value: 0.75, label: "קטן" },
  { value: 1, label: "רגיל" },
  { value: 1.3, label: "גדול" },
  { value: 1.6, label: "גדול מאוד" },
];

const OLD_TEXT_SIZE = { s: 0.9, m: 1, l: 1.1 } as const;

/** גודל הכתב והאייקונים בתצוגה. בלוח (ובתצוגת היום) — גם לפי ההגדרות הישנות של הלוח, אם לא נקבע אחרת */
export function viewStyle(settings: DisplaySettings, board: WeeklyBoardSettings, view: StyledView): { text: number; icons: number } {
  const s = settings.view_style?.[view] ?? {};
  const boardIcons = board.show_icons === false ? 0 : 1;
  const text = s.text ?? (view === "weekly" ? OLD_TEXT_SIZE[board.text_size] ?? 1 : 1);
  const icons = s.icons ?? (view === "weekly" || view === "daily" ? boardIcons : 1);
  return { text: clampScale(text, textScaleMax(view)), icons: Math.max(0, Math.min(2, icons)) };
}

export const clampScale = (v: number, max = TEXT_SCALE_MAX) =>
  Math.round(Math.max(TEXT_SCALE_MIN, Math.min(max, Number(v) || 1)) * 100) / 100;

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  show_daily: true,
  show_weekly: true,
  show_menu: true,
  show_menu_today: true,
  show_physio: true,
  show_media: true,
  show_ticker: true,
  show_announcements: true,
  ticker_source: "both",
  view_interval_seconds: 20,
};

export function displaySettings(raw: unknown): DisplaySettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<DisplaySettings>;
  return { ...DEFAULT_DISPLAY_SETTINGS, ...r };
}

/* ───────────── תפריט ───────────── */

/** הארוחות לפי סדר היום (כמו בתפריט של הדיאטנית) */
export const MEALS = ["wake", "breakfast", "snack_am", "lunch", "snack_pm", "dinner"] as const;
export type Meal = (typeof MEALS)[number];
export const MAIN_MEALS: Meal[] = ["breakfast", "lunch", "dinner"];
export const SNACK_MEALS: Meal[] = ["wake", "snack_am", "snack_pm"];
export const MEAL_LABELS: Record<Meal, string> = {
  wake: "השכמה", breakfast: "ארוחת בוקר", snack_am: "ארוחת עשר", lunch: "ארוחת צהריים", snack_pm: "ארוחת ארבע", dinner: "ארוחת ערב",
};
export const MEAL_SHORT: Record<Meal, string> = {
  wake: "השכמה", breakfast: "בוקר", snack_am: "עשר", lunch: "צהריים", snack_pm: "ארבע", dinner: "ערב",
};
/** שעה משוערת של כל ארוחה — כדי להציג את "הארוחה הבאה" */
export const MEAL_TIME: Record<Meal, string> = {
  wake: "06:30", breakfast: "08:00", snack_am: "10:00", lunch: "12:30", snack_pm: "16:00", dinner: "18:00",
};
/** הערות לכל השבוע נשמרות כשורה עם meal = "notes" ו-day_index = 0 */
export const MENU_NOTES = "notes";

export type MenuRow = { week_start: string; day_index: number; meal: Meal | typeof MENU_NOTES; items: string };
/** menu[dayIndex][meal] = רשימת מנות */
export type WeekMenu = Record<number, Partial<Record<Meal, string[]>>>;

const lines = (text: string) => (text || "").split("\n").map(s => s.trim()).filter(Boolean);

export function menuFromRows(rows: MenuRow[]): WeekMenu {
  const menu: WeekMenu = {};
  for (const r of rows) {
    if (r.meal === MENU_NOTES || !(MEALS as readonly string[]).includes(r.meal)) continue;
    const items = lines(r.items);
    if (items.length === 0) continue;
    (menu[r.day_index] ??= {})[r.meal as Meal] = items;
  }
  return menu;
}

export function menuNotesFromRows(rows: MenuRow[]): string[] {
  return lines(rows.find(r => r.meal === MENU_NOTES)?.items ?? "");
}

export function menuHasContent(menu: WeekMenu): boolean {
  return Object.values(menu).some(day => Object.values(day ?? {}).some(list => (list?.length ?? 0) > 0));
}

/** "מרק: ירקות" ← כותרת קטנה ומנה. שורה בלי נקודתיים — רק מנה */
export function splitMenuLine(line: string): { label: string | null; text: string } {
  const m = line.match(/^([^:]{1,16}):\s*(.+)$/);
  return m ? { label: m[1].trim(), text: m[2].trim() } : { label: null, text: line };
}

/**
 * מנות שחוזרות בכל הימים של אותה ארוחה (למשל "דייסה: סולת" בכל בוקר).
 * בתפריט השבועי הן מוצגות פעם אחת, תחת "בכל יום".
 */
export function commonMenuLines(menu: WeekMenu, meal: Meal, minDays = 4): { lines: string[]; except: number | null } {
  const days = [0, 1, 2, 3, 4, 5, 6].filter(i => (menu[i]?.[meal]?.length ?? 0) > 0);
  if (days.length < minDays) return { lines: [], except: null };
  const has = (i: number, line: string) => menu[i]![meal]!.includes(line);
  const order: string[] = [];
  for (const i of days) for (const l of menu[i]![meal]!) if (!order.includes(l)) order.push(l);
  // מה שמוגש בכל הימים
  const all = order.filter(l => days.every(i => has(i, l)));
  // ואולי עם יום אחד חריג (למשל ליל שישי) — רק אם זה מוסיף שורות, וכולן חסרות באותו יום
  const nearly = order.filter(l => days.filter(i => has(i, l)).length >= Math.max(minDays, days.length - 1));
  const missing = Array.from(new Set(nearly.flatMap(l => days.filter(i => !has(i, l)))));
  if (nearly.length > all.length && missing.length === 1) return { lines: nearly, except: missing[0] };
  return { lines: all, except: null };
}


/* ───────────── לוח בסגנון טבלה: שורות של שעות × עמודות של ימים ───────────── */

/** מכאן ואילך — אחר הצהריים (אחרי מנוחת הצהריים) */
export const GRID_LUNCH_MINUTES = 13 * 60;

export type GridSlot = { start: number; end: number };

/** דקות מתחילת היום ← "09:30" */
export const minutesToHM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hm = minutesToHM;
export const slotLabel = (s: GridSlot) => `${hm(s.start)}–${hm(s.end)}`;

/** "09:30-10:30, 10:30-11:00" ← משבצות */
export function parseSlots(text: string | undefined | null): GridSlot[] {
  const out: GridSlot[] = [];
  for (const m of String(text ?? "").matchAll(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/g)) {
    const start = Number(m[1]) * 60 + Number(m[2]);
    const end = Number(m[3]) * 60 + Number(m[4]);
    if (end > start) out.push({ start, end });
  }
  return out.sort((a, b) => a.start - b.start);
}
export const formatSlots = (slots: GridSlot[]) => slots.map(slotLabel).join(", ");

const actRange = (a: BoardActivity) => {
  const s = toMinutes(a.start);
  const e = a.end ? toMinutes(a.end) : s + 60;
  return { s, e: e > s ? e : s + 60 };
};

/**
 * שעות השורות בבוקר לפי הפעילויות: הטווחים (התחלה–סיום) שחוזרים הכי הרבה, בלי חפיפה.
 * למשל 10:00–11:00 ו-11:00–12:00. אם אין לפעילויות שעת סיום — שורה לכל שעה עגולה.
 */
export function autoMorningSlots(acts: BoardActivity[]): GridSlot[] {
  const morning = acts.filter(a => a.start && toMinutes(a.start) < GRID_LUNCH_MINUTES);
  const count = new Map<string, { slot: GridSlot; n: number }>();
  for (const a of morning) {
    if (!a.end) continue;
    const s = toMinutes(a.start), e = toMinutes(a.end);
    if (e <= s) continue;
    const k = s + "-" + e;
    const cur = count.get(k) ?? { slot: { start: s, end: e }, n: 0 };
    cur.n++; count.set(k, cur);
  }
  const ranked = Array.from(count.values()).sort((x, y) => y.n - x.n || (y.slot.end - y.slot.start) - (x.slot.end - x.slot.start) || x.slot.start - y.slot.start);
  const picked: GridSlot[] = [];
  for (const { slot } of ranked) {
    if (picked.some(p => slot.start < p.end && p.start < slot.end)) continue;
    picked.push(slot);
  }
  if (!picked.length) {
    const hours = Array.from(new Set(morning.map(a => Math.floor(toMinutes(a.start) / 60)))).sort((a, b) => a - b);
    return hours.map(h => ({ start: h * 60, end: h * 60 + 60 }));
  }
  return picked.sort((a, b) => a.start - b.start);
}

/** שעות אחר הצהריים לפי הפעילויות: מההתחלה המוקדמת ועד הסיום המאוחר */
export function autoAfternoonSlot(acts: BoardActivity[]): GridSlot | null {
  const pm = acts.filter(a => a.start && toMinutes(a.start) >= GRID_LUNCH_MINUTES).map(actRange);
  if (!pm.length) return null;
  return { start: Math.min(...pm.map(r => r.s)), end: Math.max(...pm.map(r => r.e)) };
}

/** לאיזו שורה שייכת פעילות: השורה שהכי חופפת לזמן שלה (בתיקו — זו שהפעילות מתחילה בה) */
export function slotIndexFor(a: BoardActivity, slots: GridSlot[]): number {
  if (!slots.length) return -1;
  const { s, e } = actRange(a);
  let best = -1, bestOverlap = 0;
  slots.forEach((slot, i) => {
    const overlap = Math.min(e, slot.end) - Math.max(s, slot.start);
    const starts = s >= slot.start && s < slot.end;
    if (overlap > bestOverlap || (overlap === bestOverlap && overlap > 0 && starts)) { best = i; bestOverlap = overlap; }
  });
  if (best >= 0) return best;
  // לא חופף לשום שורה — הקרובה ביותר
  let near = 0;
  slots.forEach((slot, i) => { if (Math.abs(s - slot.start) < Math.abs(s - slots[near].start)) near = i; });
  return near;
}

/** השורות של הלוח: בוקר (לפי ההגדרה או אוטומטי) ואחר הצהריים */
export function gridRows(acts: BoardActivity[], settings: WeeklyBoardSettings): { morning: GridSlot[]; afternoon: GridSlot | null } {
  const manual = parseSlots(settings.grid_slots);
  const morning = manual.length ? manual : autoMorningSlots(acts);
  const hasPm = acts.some(a => a.start && toMinutes(a.start) >= GRID_LUNCH_MINUTES);
  const manualPm = parseSlots(settings.grid_afternoon)[0];
  const afternoon = hasPm ? (manualPm ?? autoAfternoonSlot(acts)) : null;
  return { morning, afternoon };
}
