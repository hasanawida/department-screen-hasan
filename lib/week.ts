// עזרים לתאריכים ושבועות — תמיד לפי שעון ישראל (השרת של Vercel עובד ב-UTC)

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
  show_topic: boolean;
  dim_past_days: boolean;
  text_size: "s" | "m" | "l";
};

export const DEFAULT_WEEKLY_BOARD: WeeklyBoardSettings = {
  title: "לוח פעילויות שבועי",
  days: [0, 1, 2, 3, 4, 5, 6],
  hide_empty_days: true,
  show_location: true,
  show_instructor: true,
  show_end_time: false,
  show_topic: true,
  dim_past_days: true,
  text_size: "m",
};

export function weeklyBoardSettings(raw: unknown): WeeklyBoardSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<WeeklyBoardSettings>;
  const merged = { ...DEFAULT_WEEKLY_BOARD, ...r };
  if (!Array.isArray(merged.days) || merged.days.length === 0) merged.days = DEFAULT_WEEKLY_BOARD.days;
  return merged;
}

/* ───────────── הגדרות מסך מחלקה ───────────── */

export type TickerSource = "both" | "news" | "messages";

export type DisplaySettings = {
  show_daily: boolean;
  show_weekly: boolean;
  show_menu: boolean;        // תפריט שבועי
  show_menu_today?: boolean; // תפריט היום, בגדול
  show_media: boolean;
  show_ticker: boolean;
  show_announcements: boolean;
  ticker_source: TickerSource;
  view_interval_seconds: number;
  weekly_board?: Partial<WeeklyBoardSettings>;
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  show_daily: true,
  show_weekly: true,
  show_menu: true,
  show_menu_today: true,
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
