// אייקונים במסכים: לכל ארוחה, ולכל פעילות לפי השם שלה (בלי לבחור ידנית)

import React from "react";
import {
  Apple, BookOpen, Brain, ChefHat, Coffee, Cookie, Dices, Dumbbell, Ear, EggFried, Eye, Film, Flame, Hand, Lightbulb,
  MessageCircle, Moon, Music, Newspaper, Palette, PartyPopper, PawPrint, ScrollText, Shapes, Soup, Sprout, Sunrise, User, Users, Wind,
  type LucideIcon,
} from "lucide-react";
import type { Meal } from "@/lib/week";

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

/** מילה שלמה בעברית (גבול מילה רגיל לא עובד עם אותיות עבריות) */
const word = (w: string) => `(^|[\\s,/(])${w}($|[\\s,/)])`;

/**
 * מילים בשם הפעילות ← אייקון. הסדר חשוב: הראשון שמתאים קובע
 * ("בינגו / משחק קבוצתי / פרטני" = משחק, "משולבת התעמלות סיפור" = התעמלות).
 */
const ACTIVITY_RULES: [RegExp, IconComponent][] = [
  [/בינגו|משחק|חידון|טריוויה|קלפים|שבץ/, Dices],
  [/גרי[יה]|סנוזלן|חוש/, SensesIcon],
  [/בע"ח|בע״ח|בעלי חיים|חיות|כלב/, PawPrint],
  [new RegExp(`מוזיק|שירה|שירים|זמר|צליל|מקהלה|נגינ|תופים|${word("שיר")}`), Music],
  [/התעמלות|כושר|ספורט|יוגה|פילאטיס|תנועה|ריקוד|מחול|הליכה/, Dumbbell],
  [/אקטואליה|עיתון|חדשות/, Newspaper],
  [/מסיב|יום הולדת|חגיג|הופעה/, PartyPopper],
  [/שבת|נרות|הבדלה|ערב חג|חגים/, Flame],
  [new RegExp(`${word("רב")}|${word("הרב")}|תפיל|תורה|פרשה`), ScrollText],
  [/יציר|ציור|אומנות|אמנות|מלאכ|צביע|קרמיק/, Palette],
  [/אפי[יה]|בישול|מטבח|עוגי/, ChefHat],
  [/סרט|קולנוע|הקרנה/, Film],
  [/סיפור|קריא|ספר|הקראה/, BookOpen],
  [/קפה/, Coffee],
  [/גינ|חצר|טיול|השקי|צמחים|טבע/, Sprout],
  [/זיכרון|קוגניטיב|מוח/, Brain],
  [/נושא|דיון|הרצאה/, Lightbulb],
  [/שיחה|שיח|מפגש/, MessageCircle],
  [/פרטני|פרטנית|אישי|אישית/, User],
  [/קבוצ/, Users],
];

export function activityIcon(title: string): IconComponent {
  const t = title.trim();
  for (const [re, icon] of ACTIVITY_RULES) if (re.test(t)) return icon;
  return Shapes;
}

export function ActivityIcon({ title, className }: { title: string; className?: string }) {
  const Icon = activityIcon(title);
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
