// הגדרות האייקונים והתמונות במסכים: אפשר להחליף תמונה לכל סוג פעילות ולכל ארוחה,
// לשנות אילו מילים בשם הפעילות בוחרות כל אייקון, להוסיף סוגים חדשים, ולקבוע אייקון לשם פעילות מסוים.
//
// ההגדרות נשמרות בתוך display_settings.icons של כל המחלקות (בלי טבלה חדשה).
// כשקוראים — לוקחים את הגרסה העדכנית ביותר (updated_at), כך שגם שורה ישנה של מחלקה לא דורסת.

import type { Meal } from "./week";

export type IconTypeOverride = {
  /** תמונה שהועלתה במקום תמונת ברירת המחדל */
  image?: string | null;
  /** מילים שבוחרות את האייקון (במקום מילות ברירת המחדל). מילה במירכאות "שיר" = מילה שלמה בלבד */
  words?: string[] | null;
};

export type CustomIconType = {
  key: string;
  label: string;
  image: string;
  words: string[];
};

export type IconConfig = {
  updated_at?: string;
  types?: Record<string, IconTypeOverride>;
  custom?: CustomIconType[];
  /** שם פעילות מדויק ← מפתח אייקון (בחירה ידנית שגוברת על הזיהוי האוטומטי) */
  titles?: Record<string, string>;
  /** תמונה לכל ארוחה במקום ברירת המחדל */
  meals?: Partial<Record<Meal, string>>;
  /** תמונות למנות בתפריט: החלפת תמונה/מילים למנה קיימת, ומנות חדשות */
  dishes?: {
    types?: Record<string, IconTypeOverride>;
    custom?: CustomIconType[];
  };
  /** תמונה ליד כל מנה בפירוט התפריט — בתפריט היום ובתפריט השבועי. ברירת המחדל: בלי (רק בכותרות) */
  menu_lines?: { today?: boolean; week?: boolean };
};

/** האם להציג תמונה ליד כל מנה בפירוט, בתפריט היום או בתפריט השבועי (ברירת מחדל: לא — רק בכותרות) */
export function menuLinePhotos(cfg: IconConfig | undefined, view: "today" | "week"): boolean {
  return cfg?.menu_lines?.[view] === true;
}

/** סוגי הפעילויות המובנים: מפתח, שם בעברית, ומה מזהה אותם כברירת מחדל (להצגה בניהול) */
export const ACTIVITY_TYPES: { key: string; label: string; defaultWords: string }[] = [
  { key: "game", label: "משחקים ובינגו", defaultWords: "בינגו, משחק, חידון, טריוויה, קלפים, שבץ" },
  { key: "senses", label: "גרייה חושית", defaultWords: "גרייה, סנוזלן, חוש" },
  { key: "dog", label: "כלבנות טיפולית", defaultWords: "כלבנות, כלב" },
  { key: "animals", label: "בעלי חיים", defaultWords: "בע״ח, בעלי חיים, חיות" },
  { key: "saxophone", label: "סקסופון", defaultWords: "סקסופון" },
  { key: "trumpet", label: "חצוצרה", defaultWords: "חצוצרה" },
  { key: "piano", label: "פסנתר", defaultWords: "פסנתר" },
  { key: "violin", label: "כינור", defaultWords: "כינור, כנר" },
  { key: "rhythm", label: "ריתמיקה ותופים", defaultWords: "ריתמיקה, תופים, תוף, כלי הקשה, דרבוקה" },
  { key: "sound", label: "תרפיה בצלילים", defaultWords: "צלילים, קערות" },
  { key: "calm-music", label: "מוזיקה שקטה", defaultWords: "מוזיקה שקטה, מוסיקה שקטה, רגיעה, תקליט" },
  { key: "singing", label: "שירה", defaultWords: "שירה, שירים, זמר, מקהלה, \"שיר\"" },
  { key: "music", label: "מוזיקה (כללי, גיטרה)", defaultWords: "גיטרה, מוזיקה, מוסיקה, נגינה, מנגן, אקורדיון" },
  { key: "dance", label: "ריקודים", defaultWords: "ריקוד, ריקודי עם, מחול" },
  { key: "taichi", label: "טאי צ'י וצ'י קונג", defaultWords: "טאי צ'י, צ'י קונג" },
  { key: "exercise", label: "התעמלות ותנועה", defaultWords: "התעמלות, כושר, ספורט, יוגה, פילאטיס, תנועה, הליכה" },
  { key: "news", label: "אקטואליה", defaultWords: "אקטואליה, עיתון, חדשות" },
  { key: "party", label: "מסיבה וחגיגה", defaultWords: "מסיבה, יום הולדת, חגיגה, הופעה" },
  { key: "shabbat", label: "שבת וחגים", defaultWords: "שבת, נרות, הבדלה, ערב חג, חגים" },
  { key: "torah", label: "שיעור תורה", defaultWords: "\"רב\", \"הרב\", תפילה, תורה, פרשה" },
  { key: "art", label: "יצירה ואמנות", defaultWords: "יצירה, ציור, אומנות, אמנות, מלאכה, צביעה, קרמיקה" },
  { key: "baking", label: "אפייה ובישול", defaultWords: "אפייה, בישול, מטבח, עוגיות" },
  { key: "movie", label: "סרט", defaultWords: "סרט, קולנוע, הקרנה" },
  { key: "story", label: "קריאה וסיפור", defaultWords: "סיפור, קריאה, ספר, הקראה" },
  { key: "coffee", label: "קפה", defaultWords: "קפה" },
  { key: "world", label: "טיול בעולם", defaultWords: "בעולם, עולמי, מסביב לעולם" },
  { key: "garden", label: "גינה וטבע", defaultWords: "גינה, חצר, טיול, השקיה, צמחים, טבע" },
  { key: "memory", label: "זיכרון ומוח", defaultWords: "זיכרון, קוגניטיבי, מוח, נוסטלגיה" },
  { key: "topic", label: "נושא ודיון", defaultWords: "נושא, דיון, הרצאה" },
  { key: "conversation", label: "שיחה ומפגש", defaultWords: "שיחה, שיח, מפגש, חברתי" },
  { key: "individual", label: "פעילות פרטנית", defaultWords: "פרטני, פרטנית, אישי, אישית" },
  { key: "grooming", label: "טיפוח", defaultWords: "טיפוח, מניקור, ציפורניים, איפור" },
  { key: "group", label: "פעילות קבוצתית", defaultWords: "קבוצה, קבוצתי, קבוצתית" },
  { key: "other", label: "ברירת מחדל (כל השאר)", defaultWords: "פעילות שלא זוהתה" },
];

export const activityTypeLabel = (key: string, cfg?: IconConfig) =>
  ACTIVITY_TYPES.find(t => t.key === key)?.label ?? cfg?.custom?.find(c => c.key === key)?.label ?? key;

export const defaultActivityImage = (key: string) => `/activities/${key}.jpg`;
export const defaultMealImage = (meal: string) => `/meals/${meal}.jpg`;

/** תמונה לסוג פעילות: מה שהועלה, תמונת סוג מותאם, או ברירת המחדל */
export function activityImage(key: string, cfg?: IconConfig): string {
  const custom = cfg?.custom?.find(c => c.key === key);
  if (custom?.image) return custom.image;
  return cfg?.types?.[key]?.image || defaultActivityImage(key);
}

export function mealImage(meal: Meal, cfg?: IconConfig): string {
  return cfg?.meals?.[meal] || defaultMealImage(meal);
}

/** "בינגו, משחק" ← ["בינגו", "משחק"] */
export function parseWords(text: string): string[] {
  return text.split(/[,\n]/).map(w => w.trim()).filter(Boolean);
}

const HEB_WORD_EDGE = "(^|[\\s,/()\\-])";
const HEB_WORD_END = "($|[\\s,/()\\-])";
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** האם שם הפעילות מתאים לאחת המילים. מילה במירכאות — רק כמילה שלמה */
export function titleMatchesWords(title: string, words: string[]): boolean {
  const t = title.trim();
  return words.some(raw => {
    const w = raw.trim();
    if (!w) return false;
    const quoted = w.match(/^["״'׳](.+)["״'׳]$/);
    if (quoted) return new RegExp(HEB_WORD_EDGE + escapeRe(quoted[1].trim()) + HEB_WORD_END).test(t);
    return t.includes(w);
  });
}

/** מבין כל השורות של המחלקות — ההגדרה העדכנית ביותר */
export function latestIconConfig(rows: { display_settings?: any }[] | null | undefined): IconConfig {
  let best: IconConfig = {};
  for (const r of rows ?? []) {
    const c = r?.display_settings?.icons as IconConfig | undefined;
    if (!c || typeof c !== "object") continue;
    if (!best.updated_at || (c.updated_at ?? "") > best.updated_at) best = c;
  }
  return best;
}
