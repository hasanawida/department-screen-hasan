// אייקונים במסכים: לכל ארוחה, ולכל פעילות לפי השם שלה (בלי לבחור ידנית)

import React from "react";
import {
  Apple, BookOpen, Brain, ChefHat, Coffee, Cookie, Dices, Dumbbell, EggFried, Film, Flame, Lightbulb, MessageCircle, Moon,
  Music, Newspaper, Palette, PartyPopper, PawPrint, ScrollText, Shapes, Soup, Sparkles, Sprout, Sunrise, User, Users,
  type LucideIcon,
} from "lucide-react";
import type { Meal } from "@/lib/week";

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
const ACTIVITY_RULES: [RegExp, LucideIcon][] = [
  [/בינגו|משחק|חידון|טריוויה|קלפים|שבץ/, Dices],
  [/גרי[יה]|סנוזלן|חוש/, Sparkles],
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

export function activityIcon(title: string): LucideIcon {
  const t = title.trim();
  for (const [re, icon] of ACTIVITY_RULES) if (re.test(t)) return icon;
  return Shapes;
}

export function ActivityIcon({ title, className }: { title: string; className?: string }) {
  const Icon = activityIcon(title);
  return <Icon className={className} aria-hidden="true" />;
}
