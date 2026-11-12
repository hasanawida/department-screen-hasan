// מיזוג של עריכה בעמוד "אייקונים ותמונות" עם שינויים שנשמרו בינתיים ממקום אחר
// (למשל הדיאטנית בחרה תמונה למנה בזמן שהעמוד היה פתוח). בלי המיזוג, "שמירה" הייתה
// מחזירה את כל ההגדרות למצב שהיה כשהעמוד נטען.
//
// הכלל בכל שדה: לא נגענו בו כאן ← נשאר מה שנשמר בינתיים; שינינו אותו כאן ← השינוי שלנו.

import { ACTIVITY_TYPES, type CustomIconType, type IconConfig, type IconTypeOverride } from "./icon-config";

/** השוואה לפי תוכן. null, undefined ושדה חסר נחשבים זהים */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => sameValue(x, b[i]));
  }
  const ra = a as Record<string, unknown>, rb = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
  for (const k of keys) if (!sameValue(ra[k], rb[k])) return false;
  return true;
}

/** ערך אחד: שלנו אם שינינו אותו, אחרת העדכני */
const pick = <T,>(base: T | undefined, mine: T | undefined, latest: T | undefined): T | undefined =>
  sameValue(mine, base) ? latest : mine;

function mergeRecord<T>(
  base: Record<string, T> | undefined, mine: Record<string, T> | undefined, latest: Record<string, T> | undefined,
  mergeValue: (b: T | undefined, m: T | undefined, l: T | undefined) => T | undefined = pick,
): Record<string, T> {
  const out: Record<string, T> = {};
  const keys = new Set([...Object.keys(base ?? {}), ...Object.keys(mine ?? {}), ...Object.keys(latest ?? {})]);
  for (const k of keys) {
    const v = mergeValue(base?.[k], mine?.[k], latest?.[k]);
    if (v != null) out[k] = v;
  }
  return out;
}

/** תמונה ומילים של סוג — כל אחד בנפרד (מישהו החליף תמונה, ואנחנו ערכנו מילים) */
function mergeOverride(b?: IconTypeOverride, m?: IconTypeOverride, l?: IconTypeOverride): IconTypeOverride | undefined {
  const image = pick(b?.image, m?.image, l?.image) || null;
  const words = pick(b?.words, m?.words, l?.words);
  const list = words?.length ? words : null;
  return image || list ? { image, words: list } : undefined;
}

/** רשימת סוגים/מנות שנוספו (לפי key): הוספה, מחיקה ועריכה משני הצדדים */
function mergeList(base: CustomIconType[] | undefined, mine: CustomIconType[] | undefined, latest: CustomIconType[] | undefined): CustomIconType[] {
  const index = (list?: CustomIconType[]) => new Map((list ?? []).map(x => [x.key, x] as const));
  const B = index(base), M = index(mine), L = index(latest);
  const out: CustomIconType[] = [];
  const seen = new Set<string>();
  const add = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const b = B.get(key), m = M.get(key), l = L.get(key);
    if (b && m && l) {
      out.push({ key, label: pick(b.label, m.label, l.label) ?? m.label, image: pick(b.image, m.image, l.image) ?? m.image, words: pick(b.words, m.words, l.words) ?? m.words });
      return;
    }
    const v = pick(b, m, l);
    if (v) out.push(v);
  };
  for (const x of mine ?? []) add(x.key);
  for (const x of latest ?? []) add(x.key);
  return out;
}

/**
 * base — ההגדרה כפי שנטענה לעמוד; mine — אחרי העריכה בעמוד; latest — מה ששמור עכשיו במסד.
 */
export function mergeIconConfig(base: IconConfig, mine: IconConfig, latest: IconConfig): IconConfig {
  const custom = mergeList(base.custom, mine.custom, latest.custom);
  const known = new Set([...ACTIVITY_TYPES.map(t => t.key), ...custom.map(c => c.key)]);
  const titles = mergeRecord(base.titles, mine.titles, latest.titles);
  // בחירה ידנית שמצביעה על סוג שנמחק — חוזרת לזיהוי האוטומטי
  for (const t of Object.keys(titles)) if (!known.has(titles[t])) delete titles[t];
  return {
    types: mergeRecord(base.types, mine.types, latest.types, mergeOverride),
    custom,
    titles,
    meals: mergeRecord(base.meals as Record<string, string> | undefined, mine.meals as Record<string, string> | undefined, latest.meals as Record<string, string> | undefined) as IconConfig["meals"],
    dishes: {
      types: mergeRecord(base.dishes?.types, mine.dishes?.types, latest.dishes?.types, mergeOverride),
      custom: mergeList(base.dishes?.custom, mine.dishes?.custom, latest.dishes?.custom),
      lines: mergeRecord(base.dishes?.lines, mine.dishes?.lines, latest.dishes?.lines),
    },
    menu_lines: mergeRecord(
      base.menu_lines as Record<string, boolean> | undefined, mine.menu_lines as Record<string, boolean> | undefined, latest.menu_lines as Record<string, boolean> | undefined,
    ) as IconConfig["menu_lines"],
  };
}
