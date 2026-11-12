// תמונה לכל מנה בתפריט, לפי המילים שבשורה (כמו האייקונים של הפעילויות).
// הסדר חשוב: הכללים הספציפיים קודם ("מרק אפונה" לפני "אפונה", "קציצות דגים" לפני "דג").
// אפשר להחליף תמונות, לשנות מילים ולהוסיף מנות בעמוד "אייקונים ותמונות".

import type { IconConfig } from "./icon-config";

/**
 * first — נבדק לפני כולם (למשל "ארוחת ליל שישי").
 * weak — רק אם שום מנה אחרת לא מתאימה (ביסקוויט, לחם, סלט כללי — מופיעים ליד מנות אחרות).
 */
export type DishType = { key: string; label: string; words: string[]; first?: boolean; weak?: boolean };

export const DISH_TYPES: DishType[] = [
  { key: "shabbat-dinner", label: "ארוחת ליל שישי", words: ["ליל שישי"], first: true },
  // מנות טחונות: פירות ומעדנים — לפי מה שהם; כל השאר — תמונת "מנה טחונה"
  { key: "fruit-puree", label: "רסק פירות", words: ["רסק"], first: true },
  // "מעדן" ביחיד נכתב בנ' סופית, ולכן הוא מילה נפרדת מ"מעדנ" (מעדנים, מעדני)
  { key: "dairy", label: "מעדנים ויוגורט", words: ["טחונה: מעדנ", "טחונה: מעדן"], first: true },
  { key: "dairy", label: "מעדנים ויוגורט", words: ["מעדנ", "מעדן", "יוגורט"] },
  { key: "pureed", label: "מנה טחונה", words: ["טחונ"] },
  // מרקים
  { key: "noodle-soup", label: "מרק אטריות", words: ["מרק אטריות"] },
  { key: "pea-soup", label: "מרק אפונה", words: ["מרק אפונה"] },
  { key: "barley-soup", label: "מרק גריסים", words: ["מרק גריסי", "גריסי", "גריסים"] },
  { key: "harira", label: "מרק חרירה", words: ["מרק חרירה", "חרירה"] },
  { key: "tomato-soup", label: "מרק עגבניות", words: ["מרק עגבניות"] },
  { key: "bean-soup", label: "מרק שעועית", words: ["מרק שעועית"] },
  { key: "clear-soup", label: "מרק צח", words: ["מרק צח", "מרק עוף"] },
  { key: "veg-soup", label: "מרק ירקות", words: ["מרק"] },
  // סלטים מיוחדים
  { key: "coleslaw", label: "קולסלאו", words: ["קולסלאו"] },
  { key: "mayo-salad", label: "סלט מיונז", words: ["מיונז"] },
  // מנות עיקריות
  { key: "chicken-balls", label: "קציצות עוף", words: ["קציצות עוף"] },
  { key: "fish-balls", label: "קציצות דגים", words: ["קציצות דג"] },
  { key: "beef-balls", label: "קציצות בקר", words: ["קציצות בקר", "קציצות"] },
  { key: "fried-fish", label: "דג", words: ["דג"] },
  { key: "tongue", label: "לשון", words: ["לשון"] },
  { key: "kreplach", label: "קרפלך", words: ["קרפלך"] },
  { key: "schnitzel", label: "שניצל", words: ["שניצל"] },
  { key: "chicken-breast", label: "חזה עוף", words: ["חזה עוף", "נתחוני חזה"] },
  { key: "chicken", label: "עוף", words: ["עוף", "פרגית"] },
  // ביצים ודייסות
  { key: "omelette", label: "חביתה", words: ["חביתה", "חביתת"] },
  { key: "eggs", label: "ביצים", words: ["ביצ"] },
  { key: "semolina", label: "דייסת סולת", words: ["סולת"] },
  { key: "oatmeal", label: "דייסת קוואקר", words: ["קוואקר", "שיבולת"] },
  { key: "oatmeal", label: "דייסת קוואקר", words: ["דייסה"], weak: true },
  { key: "cheeses", label: "גבינות", words: ["גבינ", "קוטג"] },
  { key: "jelly", label: "ג'לי", words: ["ג'לי", "ג׳לי", "גלי"] },
  // פחמימות
  { key: "rice", label: "אורז ומג'דרה", words: ["מג'דרה", "מג׳דרה", "מגדרה", "אורז"] },
  { key: "cholent", label: "חמין", words: ["חמין"] },
  { key: "quinoa", label: "קינואה", words: ["קינואה"] },
  { key: "buckwheat", label: "כוסמת", words: ["כוסמת"] },
  { key: "fries", label: "צ'יפס", words: ["צ'יפס", "צ׳יפס", "ציפס"] },
  { key: "gvetch", label: "תבשיל ירקות (גבץ')", words: ["ירקות לקוסקוס", "גבץ"] },
  { key: "couscous", label: "קוסקוס", words: ["קוסקוס"] },
  { key: "ptitim", label: "פתיתים", words: ["פתיתים"] },
  { key: "pasta", label: "פסטה", words: ["פסטה"] },
  { key: "pizza", label: "פיצה", words: ["פיצה"] },
  { key: "borekas", label: "בורקס", words: ["בורק"] },
  { key: "kugel", label: "פשטידה וקוגל", words: ["פשטיד", "קיגל", "קוגל"] },
  { key: "mashed", label: "פירה", words: ["פירה"] },
  // ירקות מבושלים
  { key: "peas", label: "אפונה", words: ["אפונה"] },
  { key: "green-beans", label: "שעועית ירוקה", words: ["שעועית ירוקה"] },
  { key: "yellow-beans", label: "שעועית צהובה", words: ["שעועית צהובה"] },
  { key: "cabbage", label: "כרוב מבושל", words: ["כרוב"] },
  { key: "salad", label: "סלט ירקות", words: ["סלט"], weak: true },
  { key: "spreads", label: "ממרחים", words: ["ממרח", "ריבה", "חומוס", "טחינה"] },
  // פירות וקינוחים
  { key: "compote", label: "לפתן", words: ["לפתן"] },
  { key: "baked-apple", label: "תפוח אפוי", words: ["תפו\"ע אפוי", "תפו״ע אפוי", "תפוח אפוי", "תפוחים אפויים"] },
  { key: "banana", label: "בננה", words: ["בננה"] },
  { key: "clementine", label: "קלמנטינה", words: ["קלמנטינ"] },
  { key: "pear", label: "אגס", words: ["אגס"] },
  { key: "krembo", label: "קרמבו", words: ["קרמבו"] },
  { key: "nougat", label: "חטיף נוגט", words: ["נוגט"] },
  { key: "peanut-puffs", label: "במבה", words: ["במבה"] },
  { key: "cake", label: "עוגה", words: ["עוגה", "עוגת"] },
  { key: "biscuits", label: "ביסקוויטים", words: ["ביסקוויט", "קרקר"], weak: true },
  { key: "challah", label: "חלה ולחם", words: ["חלה", "לחם"], weak: true },
];

/** הכלל הראשי של כל מנה: הרגיל (לא first ולא weak) אם יש כזה, אחרת היחיד שיש */
const MAIN_RULE = new Map<string, DishType>();
for (const d of DISH_TYPES) {
  const cur = MAIN_RULE.get(d.key);
  if (!cur || ((cur.first || cur.weak) && !d.first && !d.weak)) MAIN_RULE.set(d.key, d);
}

export const defaultDishImage = (key: string) => `/dishes/${key}.jpg`;

/** בחירה ידנית של "בלי תמונה" לשורה בתפריט */
export const DISH_NONE = "none";

/** הזיהוי האוטומטי בלבד (בלי הבחירה הידנית לשורה) — להצגה בבורר */
export function autoDishKey(line: string, cfg?: IconConfig): string | null {
  const lines = cfg?.dishes?.lines;
  if (!lines) return dishKey(line, cfg);
  return dishKey(line, { ...cfg, dishes: { ...cfg?.dishes, lines: {} } });
}

/** איזו מנה מתאימה לשורה בתפריט. null — אין תמונה מתאימה (עדיף בלי תמונה מאשר תמונה לא נכונה) */
export function dishKey(line: string, cfg?: IconConfig): string | null {
  const t = line.trim();
  if (!t) return null;
  // בחירה ידנית לשורה הזו (מהטופס של התפריט)
  const manual = cfg?.dishes?.lines?.[t];
  if (manual === DISH_NONE) return null;
  if (manual && (DISH_TYPES.some(d => d.key === manual) || cfg?.dishes?.custom?.some(c => c.key === manual))) return manual;
  for (const c of cfg?.dishes?.custom ?? []) if (c.words?.some(w => w.trim() && t.includes(w.trim()))) return c.key;
  const pos = (d: DishType) => {
    // מילים שנערכו בניהול מחליפות את המילים של הכלל הראשי של המנה. כללי עזר של אותה מנה
    // (first / weak — למשל "טחונה: מעדן", או "דייסה" סתם) נשארים עם המילים שלהם, אחרת העריכה הייתה משנה גם את סדר העדיפויות
    const edited = MAIN_RULE.get(d.key) === d ? cfg?.dishes?.types?.[d.key]?.words : null;
    const words = edited ?? d.words;
    let best = -1;
    for (const w of words) { const i = w.trim() ? t.indexOf(w.trim()) : -1; if (i >= 0 && (best < 0 || i < best)) best = i; }
    return best;
  };
  for (const d of DISH_TYPES) if (d.first && pos(d) >= 0) return d.key;
  // המנה שמופיעה ראשונה בשורה ("פרגית צלויה, ... קציצות עוף" — עוף); בתיקו — לפי הסדר ברשימה
  let pick: string | null = null, at = Infinity;
  for (const d of DISH_TYPES) {
    if (d.first || d.weak) continue;
    const i = pos(d);
    if (i >= 0 && i < at) { at = i; pick = d.key; }
  }
  if (pick) return pick;
  for (const d of DISH_TYPES) if (d.weak && pos(d) >= 0) return d.key;
  return null;
}

/** המנות לעריכה בניהול (בלי כפילויות של אותו מפתח) */
export const DISH_LIST: { key: string; label: string; words: string[] }[] = (() => {
  const out: { key: string; label: string; words: string[] }[] = [];
  for (const d of DISH_TYPES) {
    const cur = out.find(x => x.key === d.key);
    if (cur) cur.words.push(...d.words); else out.push({ key: d.key, label: d.label, words: [...d.words] });
  }
  return out;
})();

export function dishImage(key: string, cfg?: IconConfig): string {
  const custom = cfg?.dishes?.custom?.find(c => c.key === key);
  if (custom?.image) return custom.image;
  return cfg?.dishes?.types?.[key]?.image || defaultDishImage(key);
}

export const dishLabel = (key: string, cfg?: IconConfig) =>
  DISH_TYPES.find(d => d.key === key)?.label ?? cfg?.dishes?.custom?.find(c => c.key === key)?.label ?? key;
