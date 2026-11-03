// אייקונים במסכים: לכל ארוחה, ולכל פעילות לפי השם שלה (בלי לבחור ידנית)

import React, { createContext, useContext, useState } from "react";
import {
  Apple, BookOpen, Brain, ChefHat, Coffee, Cookie, Dices, Dumbbell, Ear, EggFried, Eye, Film, Flame, Hand, Lightbulb,
  MessageCircle, Moon, Music, Newspaper, Palette, PartyPopper, PawPrint, ScrollText, Shapes, Soup, Sprout, Sunrise, User, Users, Wind,
  type LucideIcon,
} from "lucide-react";
import type { Meal } from "@/lib/week";
import { activityImage, mealImage, titleMatchesWords, type IconConfig } from "@/lib/icon-config";
import { dishImage, dishKey } from "@/lib/dishes";

/** הגדרות האייקונים (תמונות, מילים, בחירה לפי שם) — מגיעות מהניהול */
export const IconConfigContext = createContext<IconConfig>({});

type IconComponent = React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

/**
 * גרייה חושית: ארבעת החושים יחד באייקון אחד — ראייה (עין), שמיעה (אוזן), מגע (יד) וריח (גלי ריח).
 * ארבעה אייקונים קטנים בריבוע, באותו עובי קו כמו שאר האייקונים.
 * מעט גדול יותר משאר האייקונים, כדי שכל חוש ייראה (data-senses ב-CSS).
 */
export function SensesIcon({ className, ...rest }: { className?: string; "aria-hidden"?: boolean | "true" | "false" }) {
  const cell = 12, far = 24 - cell;
  const part = (Icon: LucideIcon, x: number, y: number) => (
    <Icon x={x} y={y} width={cell} height={cell} strokeWidth={2.8} />
  );
  return (
    <svg viewBox="0.5 0.5 23 23" fill="none" className={className} data-senses="" {...rest}>
      {part(Eye, far, 0)}
      {part(Ear, 0, 0)}
      {part(Hand, far, far)}
      {part(Wind, 0, far)}
    </svg>
  );
}

export const MEAL_ICONS: Record<Meal, LucideIcon> = {
  wake: Sunrise,
  breakfast: EggFried,
  snack_am: Apple,
  lunch: Soup,
  snack_pm: Cookie,
  dinner: Moon,
};

export function MealIcon({ meal, className }: { meal: Meal; className?: string }) {
  const Icon = MEAL_ICONS[meal];
  return <Icon className={className} aria-hidden="true" />;
}

/**
 * תמונה אמיתית של הארוחה (עיגול עם צילום), מתוך public/meals.
 * אם אין תמונה או שהיא לא נטענת — האייקון הרגיל.
 */
export function MealPhoto({ meal, className, fallbackClassName }: { meal: Meal; className?: string; fallbackClassName?: string }) {
  const cfg = useContext(IconConfigContext);
  const src = mealImage(meal, cfg);
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return <MealIcon meal={meal} className={fallbackClassName ?? className} />;
  return <img src={src} alt="" aria-hidden="true" className={className} onError={() => setFailed(src)} />;
}

/**
 * צילום של המנה לפי השם שלה בתפריט (שניצל, מרק עדשים...).
 * אם אין מנה מתאימה או שהתמונה לא נטענת — לא מציגים כלום (עדיף מתמונה לא נכונה).
 */
export function DishPhoto({ line, className }: { line: string; className?: string }) {
  const cfg = useContext(IconConfigContext);
  const key = dishKey(line, cfg);
  const src = key ? dishImage(key, cfg) : null;
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return null;
  return <img src={src} alt="" aria-hidden="true" className={className} onError={() => setFailed(src)} />;
}

/** מילה שלמה בעברית (גבול מילה רגיל לא עובד עם אותיות עבריות) */
const word = (w: string) => `(^|[\\s,/(])${w}($|[\\s,/)])`;

/**
 * מילים בשם הפעילות ← אייקון. הסדר חשוב: הראשון שמתאים קובע
 * ("בינגו / משחק קבוצתי / פרטני" = משחק, "משולבת התעמלות סיפור" = התעמלות).
 */
const ACTIVITY_RULES: [RegExp, IconComponent, string][] = [
  [/בינגו|משחק|חידון|טריוויה|קלפים|שבץ/, Dices, "game"],
  [/גרי[יה]|סנוזלן|חוש/, SensesIcon, "senses"],
  [/בע"ח|בע״ח|בעלי חיים|חיות|כלב/, PawPrint, "animals"],
  [new RegExp(`מוזיק|שירה|שירים|זמר|צליל|מקהלה|נגינ|תופים|${word("שיר")}`), Music, "music"],
  [/התעמלות|כושר|ספורט|יוגה|פילאטיס|תנועה|ריקוד|מחול|הליכה/, Dumbbell, "exercise"],
  [/אקטואליה|עיתון|חדשות/, Newspaper, "news"],
  [/מסיב|יום הולדת|חגיג|הופעה/, PartyPopper, "party"],
  [/שבת|נרות|הבדלה|ערב חג|חגים/, Flame, "shabbat"],
  [new RegExp(`${word("רב")}|${word("הרב")}|תפיל|תורה|פרשה`), ScrollText, "torah"],
  [/יציר|ציור|אומנות|אמנות|מלאכ|צביע|קרמיק/, Palette, "art"],
  [/אפי[יה]|בישול|מטבח|עוגי/, ChefHat, "baking"],
  [/סרט|קולנוע|הקרנה/, Film, "movie"],
  [/סיפור|קריא|ספר|הקראה/, BookOpen, "story"],
  [/קפה/, Coffee, "coffee"],
  [/גינ|חצר|טיול|השקי|צמחים|טבע/, Sprout, "garden"],
  [/זיכרון|קוגניטיב|מוח/, Brain, "memory"],
  [/נושא|דיון|הרצאה/, Lightbulb, "topic"],
  [/שיחה|שיח|מפגש/, MessageCircle, "conversation"],
  [/פרטני|פרטנית|אישי|אישית/, User, "individual"],
  [/קבוצ/, Users, "group"],
];

const BUILTIN_ICON: Record<string, IconComponent> = Object.fromEntries(ACTIVITY_RULES.map(([, icon, key]) => [key, icon]));

/**
 * איזה סוג אייקון מתאים לשם הפעילות:
 * בחירה ידנית לשם הזה ← סוגים שנוספו בניהול ← הסוגים המובנים (עם המילים שנערכו, אם נערכו) ← ברירת מחדל
 */
export function activityKey(title: string, cfg?: IconConfig): string {
  const t = title.trim();
  const manual = cfg?.titles?.[t];
  if (manual) return manual;
  for (const c of cfg?.custom ?? []) if (c.words?.length && titleMatchesWords(t, c.words)) return c.key;
  for (const [re, , key] of ACTIVITY_RULES) {
    const words = cfg?.types?.[key]?.words;
    if (words ? titleMatchesWords(t, words) : re.test(t)) return key;
  }
  return "other";
}

function activityRule(title: string, cfg?: IconConfig): [IconComponent, string] {
  const key = activityKey(title, cfg);
  return [BUILTIN_ICON[key] ?? Shapes, key];
}

export function activityIcon(title: string): IconComponent {
  return activityRule(title)[0];
}

/**
 * אייקון לפעילות לפי השם שלה. עם photoClassName — צילום אמיתי (public/activities),
 * ואם אין צילום או שהוא לא נטען — האייקון הקווי.
 */
export function ActivityIcon({ title, className, photoClassName }: { title: string; className?: string; photoClassName?: string }) {
  const cfg = useContext(IconConfigContext);
  const [Icon, key] = activityRule(title, cfg);
  const src = activityImage(key, cfg);
  const [failed, setFailed] = useState<string | null>(null);
  if (photoClassName && failed !== src) {
    return <img src={src} alt="" aria-hidden="true" className={photoClassName} onError={() => setFailed(src)} />;
  }
  return <Icon className={className} aria-hidden="true" />;
}

/* ── שבת: הדלקת נרות וצאת שבת ── */

type SvgIconProps = { className?: string };

/** שני נרות דולקים — כניסת שבת/חג */
export function ShabbatCandlesIcon({ className }: SvgIconProps) {
  const flame = (x: number) => `M${x} 2.6c1.7 1.9 2.4 3.2 2.4 4.4a2.4 2.4 0 0 1-4.8 0c0-1.2.7-2.5 2.4-4.4z`;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true" focusable="false">
      <path d={flame(8)} fill="var(--sun, #fab822)" />
      <path d={flame(16)} fill="var(--sun, #fab822)" />
      <rect x="6" y="11.5" width="4" height="9.5" rx="1" />
      <rect x="14" y="11.5" width="4" height="9.5" rx="1" />
      <path d="M3.5 21.5h17" />
    </svg>
  );
}

/** שלושה כוכבים — צאת שבת/חג */
export function HavdalahStarsIcon({ className }: SvgIconProps) {
  const star = (cx: number, cy: number, r: number) =>
    `M${cx} ${cy - r}L${cx + r * 0.3} ${cy - r * 0.3}L${cx + r} ${cy}L${cx + r * 0.3} ${cy + r * 0.3}L${cx} ${cy + r}L${cx - r * 0.3} ${cy + r * 0.3}L${cx - r} ${cy}L${cx - r * 0.3} ${cy - r * 0.3}Z`;
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round"
      className={className} aria-hidden="true" focusable="false">
      <path d={star(7, 8, 5)} fill="var(--sun, #fab822)" />
      <path d={star(17.5, 6, 3.6)} fill="var(--sun, #fab822)" />
      <path d={star(14.5, 17, 4.4)} fill="var(--sun, #fab822)" />
    </svg>
  );
}

/* ── חגים: אייקון לפי מהות החג (ערב החג מקבל את אייקון החג) ── */

const holidaySvg = (className: string | undefined, children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden="true" focusable="false">
    {children}
  </svg>
);

/** ראש השנה: תפוח */
function AppleIcon({ className }: SvgIconProps) {
  return holidaySvg(className, <>
    <path d="M12 7.5c-2.2-1.6-5.8-1-6.8 2.1-1.2 3.7.9 9 3.6 10.6 1.1.6 2.1.2 3.2-.3 1.1.5 2.1.9 3.2.3 2.7-1.6 4.8-6.9 3.6-10.6-1-3.1-4.6-3.7-6.8-2.1z" fill="var(--coral, #f6977e)" />
    <path d="M12 7.5c0-2.1.5-3.4 1.6-4.4" />
    <path d="M13.2 5c1.5-1.4 3.6-1.5 4.7-.6-1.1 1.4-3.2 1.7-4.7.6z" fill="var(--sage, #5a826f)" />
  </>);
}

/** יום כיפור: שופר */
function ShofarIcon({ className }: SvgIconProps) {
  return holidaySvg(className, <>
    <path d="M3 14.5c4.4 1.4 9.3.4 12.4-2.7C18 9.2 19.2 6 20 3.2l1.8.8c-.7 3.6-2.2 7.6-5.3 10.6-3.6 3.4-9 5-13.6 3.7z" fill="var(--sun-tint, #fdf0cc)" />
    <ellipse cx="3.4" cy="16.4" rx="1.1" ry="1.9" fill="var(--sun, #fab822)" />
    <path d="M7.4 16.3c.4-.9.4-1.8.1-2.6M11.2 15c.5-.8.6-1.7.4-2.5M14.6 12.9c.5-.7.7-1.5.6-2.3" />
  </>);
}

/** סוכות: סוכה עם סכך */
function SukkahIcon({ className }: SvgIconProps) {
  return holidaySvg(className, <>
    <path d="M4.5 21V11.5h15V21" />
    <path d="M10 21v-5h4v5" />
    <path d="M2.5 11.5c1.6-2.4 3.3-2.4 4.9 0 1.6-2.4 3.3-2.4 4.9 0 1.6-2.4 3.3-2.4 4.9 0 1.6-2.4 3.3-2.4 4.9 0" fill="var(--sage-soft, #a9c8b8)" />
    <path d="M2.5 21h19" />
  </>);
}

/** הושענא רבה: לולב וערבות */
function LulavIcon({ className }: SvgIconProps) {
  return holidaySvg(className, <>
    <path d="M12 22V2.5" />
    <path d="M12 6.5 9 4.5M12 6.5l3-2M12 10.5 8.5 8M12 10.5 15.5 8M12 14.5 8 12M12 14.5l4-2.5" stroke="var(--sage, #5a826f)" />
    <path d="M9.5 21c-.8-2.4-.6-4.8.6-6.6M14.5 21c.8-2.4.6-4.8-.6-6.6" />
  </>);
}

/** שמחת תורה: ספר תורה */
function TorahIcon({ className }: SvgIconProps) {
  return holidaySvg(className, <>
    <rect x="7" y="5.5" width="10" height="13" fill="var(--paper, #f6f2ee)" />
    <rect x="3.5" y="4" width="3.5" height="16" rx="1.75" fill="var(--sun, #fab822)" />
    <rect x="17" y="4" width="3.5" height="16" rx="1.75" fill="var(--sun, #fab822)" />
    <path d="M5.25 2v2M5.25 20v2M18.75 2v2M18.75 20v2M9.5 9h5M9.5 12h5M9.5 15h3" />
  </>);
}

/** פסח: מצה */
function MatzahIcon({ className }: SvgIconProps) {
  return holidaySvg(className, <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2.2" fill="var(--sun-tint, #fdf0cc)" />
    <path d="M7 8h10M7 12h10M7 16h10" strokeDasharray="0.1 2.6" strokeWidth={2.2} />
  </>);
}

/** שביעי של פסח: קריעת ים סוף — גלים */
function WavesIcon({ className }: SvgIconProps) {
  return holidaySvg(className, <>
    <path d="M2 7.5c1.7-1.8 3.3-1.8 5 0s3.3 1.8 5 0 3.3-1.8 5 0 3.3 1.8 5 0" />
    <path d="M2 12.5c1.7-1.8 3.3-1.8 5 0s3.3 1.8 5 0 3.3-1.8 5 0 3.3 1.8 5 0" stroke="var(--sage, #5a826f)" />
    <path d="M2 17.5c1.7-1.8 3.3-1.8 5 0s3.3 1.8 5 0 3.3-1.8 5 0 3.3 1.8 5 0" />
  </>);
}

/** שבועות: שיבולת חיטה */
function WheatIcon({ className }: SvgIconProps) {
  const grain = (y: number, side: 1 | -1) =>
    `M12 ${y}c${-2.6 * side} -.4 ${-3.8 * side} -2.2 ${-3.8 * side} -4.4 ${2.6 * side} .4 ${3.8 * side} 2.2 ${3.8 * side} 4.4z`;
  return holidaySvg(className, <>
    <path d="M12 22V3" />
    {[8, 12.5, 17].map(y => <path key={"r" + y} d={grain(y, 1)} fill="var(--sun, #fab822)" />)}
    {[8, 12.5, 17].map(y => <path key={"l" + y} d={grain(y, -1)} fill="var(--sun, #fab822)" />)}
  </>);
}

const HOLIDAY_ICONS: [RegExp, (p: SvgIconProps) => React.ReactElement][] = [
  [/ראש השנה/, AppleIcon],
  [/כיפור/, ShofarIcon],
  [/הושענא/, LulavIcon],
  [/שמחת תורה/, TorahIcon],
  [/סוכות/, SukkahIcon],
  [/שביעי של פסח/, WavesIcon],
  [/פסח/, MatzahIcon],
  [/שבועות/, WheatIcon],
];

/** אייקון שמתאים לחג לפי השם שלו; null אם אין אייקון מיוחד */
export function HolidayIcon({ name, className }: { name: string; className?: string }) {
  const hit = HOLIDAY_ICONS.find(([re]) => re.test(name));
  if (!hit) return null;
  const Icon = hit[1];
  return <Icon className={className} />;
}
