"use client";

// התפריט במסך המחלקה: "תפריט היום" בגדול, ו"תפריט שבועי" מסודר
// (מנות שחוזרות בכל יום מוצגות פעם אחת, תחת "בכל יום")

import React, { useContext, useEffect, useMemo, useRef } from "react";
import { Pin, BRAND } from "@/components/orientation/eshkolot-logo";
import {
  DAY_NAMES, MAIN_MEALS, MEALS, MEAL_LABELS, MEAL_SHORT, MEAL_TIME, SNACK_MEALS, commonMenuLines, bigTextLevel, shortDate, splitMenuLine, toMinutes,
  type Meal, type WeekMenu,
} from "@/lib/week";
import { fitForText, useFillScale, useUniformGrow } from "./use-fill";
import { DishPhoto, IconConfigContext, MealPhoto, SnackMealPhoto } from "./icons";
import { menuLinePhotos } from "@/lib/icon-config";
import styles from "./board.module.css";

type DayMeals = Partial<Record<Meal, string[]>>;

const isSpecial = (label: string | null) => !!label && /טחונ/.test(label);

/** שורה בתפריט: כותרת קטנה (אם יש) והמנה. photo — צילום המנה ליד השורה (בתפריט השבועי) */
function MenuLine({ line, className, photo = true }: { line: string; className?: string; photo?: boolean }) {
  const { label, text } = splitMenuLine(line);
  return (
    <li className={(className ?? "") + (isSpecial(label) ? " " + styles.menuSpecial : "")}>
      {photo && <DishPhoto line={line} className={styles.dishPhoto} />}
      {label && <span className={styles.menuLineLabel}>{label}</span>}
      <span>{text}</span>
    </li>
  );
}

/** המנות של הארוחה בלי המנה הטחונה */
const plainLines = (lines: string[]) => lines.filter(l => !isSpecial(splitMenuLine(l).label));

/**
 * התמונה בכותרת של ארוחה: בארוחות העיקריות — צילום של כל הארוחה,
 * ובהשכמה/עשר/ארבע — המנה שמוגשת בה לפי התפריט (תפוח אפוי, עוגה...)
 */
function MealHeadPhoto({ meal, lines, className, fallbackClassName }: { meal: Meal; lines: string[]; className?: string; fallbackClassName?: string }) {
  return SNACK_MEALS.includes(meal)
    ? <SnackMealPhoto meal={meal} lines={plainLines(lines)} className={className} fallbackClassName={fallbackClassName} />
    : <MealPhoto meal={meal} className={className} fallbackClassName={fallbackClassName} />;
}

/** הארוחה שמתקיימת עכשיו (עד 45 דקות מתחילתה) או הבאה בתור, לפי השעות המשוערות */
export function currentMealIndex(meals: Meal[], nowMinutes: number): number {
  if (nowMinutes < 0) return -1;
  return meals.findIndex(m => nowMinutes < toMinutes(MEAL_TIME[m]) + 45);
}

/* ───────────── תפריט היום ───────────── */

type Look = { text: number; icons: number };

/** כתב גדול מ-100%: כל צעד מצמצם עוד רווחים, כדי שהכתב יגדל בלי לוותר על ימים או מנות */
const bigMenuClasses = (text: number) => {
  const level = bigTextLevel(text);
  return level ? " " + [styles.big1, styles.big2, styles.big3].slice(0, level).join(" ") : "";
};
const NORMAL: Look = { text: 1, icons: 1 };

export function TodayMenu({ meals, notes, nowMinutes, look = NORMAL }: { meals: DayMeals; notes: string[]; nowMinutes: number; look?: Look }) {
  const main = MAIN_MEALS.filter(m => (meals[m]?.length ?? 0) > 0);
  const snacks = SNACK_MEALS.filter(m => (meals[m]?.length ?? 0) > 0);
  const present = MEALS.filter(m => (meals[m]?.length ?? 0) > 0);
  const nowIdx = currentMealIndex(present, nowMinutes);
  const nowMeal = nowIdx >= 0 ? present[nowIdx] : null;
  // תמונה ליד כל מנה בפירוט — לפי ההגדרה (ברירת מחדל: רק בכותרת)
  const linePhotos = menuLinePhotos(useContext(IconConfigContext), "today");
  const fit = fitForText(look.text);

  const areaRef = useRef<HTMLDivElement>(null);
  const appliedRef = useRef(1);
  const bs = useFillScale(areaRef, appliedRef, JSON.stringify(meals) + notes.join("|") + linePhotos + "|" + look.icons, fit.max, fit.min, fit.target);
  appliedRef.current = bs;

  return (
    <div className={styles.todayMenu + (look.icons > 0 ? "" : " " + styles.noIcons) + bigMenuClasses(look.text)} style={{ "--bs": bs, "--ic": look.icons || 1 } as React.CSSProperties}>
      <div ref={areaRef} className={styles.tmArea}>
        {snacks.length > 0 && (
          <div className={styles.tmSnacks}>
            {snacks.map(m => (
              <div key={m} className={styles.tmSnack + (m === nowMeal ? " " + styles.tmNow : "")}>
                <span className={styles.tmSnackName}><MealHeadPhoto meal={m} lines={meals[m]!} className={styles.tmSnackPhoto} fallbackClassName={styles.mealIcon} />{MEAL_LABELS[m]}</span>
                <span className={styles.tmSnackText}>
                  {meals[m]!.map(l => splitMenuLine(l)).filter(x => !isSpecial(x.label)).map(x => x.text).join(", ")}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className={styles.tmMeals} style={{ gridTemplateColumns: `repeat(${Math.max(1, main.length)}, minmax(0, 1fr))` }}>
          {main.map(m => (
            <section key={m} className={styles.tmMeal + (m === nowMeal ? " " + styles.tmNow : "")}>
              {/* בתפריט היום: צילום של כל הארוחה בכותרת; ליד השורות — רק אם הופעל בהגדרות */}
              <header className={styles.tmMealHead}>
                <span className={styles.tmMealName}><MealHeadPhoto meal={m} lines={meals[m]!} className={styles.tmMealPhoto} fallbackClassName={styles.tmMealIcon} />{MEAL_LABELS[m]}</span>
                {m === nowMeal && <span className={styles.tmTag}>{nowMinutes >= toMinutes(MEAL_TIME[m]) ? "עכשיו" : "הארוחה הבאה"}</span>}
              </header>
              <ul className={styles.tmList}>
                {meals[m]!.map((l, k) => <MenuLine key={k} line={l} photo={linePhotos} />)}
              </ul>
            </section>
          ))}
        </div>
        {notes.length > 0 && (
          <div className={styles.tmNotes}>{notes.join(" ")}</div>
        )}
      </div>
    </div>
  );
}

/* ───────────── תפריט שבועי ───────────── */

export function WeeklyMenu({ menu, weekDates, todayIndex, notes, allDays, look = NORMAL }: {
  menu: WeekMenu; weekDates: string[]; todayIndex: number; notes: string[]; allDays?: boolean; look?: Look;
}) {
  // מנות שחוזרות בכל ימי השבוע — פעם אחת למעלה
  const common = useMemo(() => {
    const out: Partial<Record<Meal, { lines: string[]; except: number | null }>> = {};
    for (const m of MEALS) { const c = commonMenuLines(menu, m); if (c.lines.length) out[m] = c; }
    return out;
  }, [menu]);
  const commonMeals = MEALS.filter(m => (common[m]?.lines.length ?? 0) > 0);

  const shown = [0, 1, 2, 3, 4, 5, 6].filter(i => allDays || MEALS.some(m => (menu[i]?.[m]?.length ?? 0) > 0) || i === todayIndex);
  const fit = fitForText(look.text);
  const { grow, report } = useUniformGrow(fit.max);

  return (
    <div className={styles.board + (look.icons > 0 ? "" : " " + styles.noIcons) + bigMenuClasses(look.text)} style={{ "--size": 1, "--ic": look.icons || 1 } as React.CSSProperties}>
      {(commonMeals.length > 0 || notes.length > 0) && (
        <div className={styles.menuCommon}>
          <span className={styles.menuCommonTitle}>בכל יום</span>
          <div className={styles.menuCommonBody}>
            {commonMeals.map(m => (
              <CommonRow key={m} meal={m} lines={common[m]!.lines} except={common[m]!.except} />
            ))}
            {notes.length > 0 && <div className={styles.menuCommonNote}>{notes[0]}</div>}
          </div>
        </div>
      )}
      <div className={styles.days}>
        {shown.map(i => {
          const day: DayMeals = {};
          for (const m of MEALS) {
            const rest = (menu[i]?.[m] ?? []).filter(l => !(common[m]?.lines ?? []).includes(l));
            if (rest.length) day[m] = rest;
          }
          return <MenuDay key={i} dayIndex={i} date={weekDates[i]} isToday={i === todayIndex} meals={day} grow={grow} report={report} look={look} />;
        })}
      </div>
    </div>
  );
}

/** שורה בפס "בכל יום": המנות, ובסוף בקטן המנה הטחונה */
function CommonRow({ meal, lines, except }: { meal: Meal; lines: string[]; except: number | null }) {
  // בהשכמה/עשר/ארבע התמונה כבר בכותרת — ליד המנות רק בארוחות העיקריות (ואם הופעל)
  const linePhotos = menuLinePhotos(useContext(IconConfigContext), "week") && !SNACK_MEALS.includes(meal);
  const parts = lines.map(l => splitMenuLine(l));
  const plain = parts.filter(x => !isSpecial(x.label));
  const special = parts.filter(x => isSpecial(x.label)).map(x => x.text);
  return (
    <div className={styles.menuCommonRow}>
      <span className={styles.menuCommonMeal}><MealHeadPhoto meal={meal} lines={lines} className={styles.mealPhoto} fallbackClassName={styles.mealIcon} />{MEAL_SHORT[meal]}</span>
      <span>
        {plain.map((x, k) => (
          <React.Fragment key={k}>
            {k > 0 && ", "}
            {linePhotos && <DishPhoto line={lines.filter(l => !isSpecial(splitMenuLine(l).label))[k]} className={styles.dishPhoto} />}
            {x.label && <span className={styles.menuLineLabel}>{x.label}</span>}
            {x.text}
          </React.Fragment>
        ))}
        {special.length > 0 && <span className={styles.menuSpecial}> (טחונה: {special.join(", ")})</span>}
        {except !== null && <span className={styles.menuSpecial}> (לא ביום {DAY_NAMES[except]})</span>}
      </span>
    </div>
  );
}

function MenuDay({ dayIndex, date, isToday, meals, grow, report, look }: {
  dayIndex: number; date: string; isToday: boolean; meals: DayMeals;
  grow: number; report: (id: string, value: number | null) => void; look: Look;
}) {
  const fit = fitForText(look.text);
  const linePhotos = menuLinePhotos(useContext(IconConfigContext), "week");
  const listRef = useRef<HTMLDivElement>(null);
  const appliedRef = useRef(1);
  const has = MEALS.some(m => (meals[m]?.length ?? 0) > 0);
  const desired = useFillScale(listRef, appliedRef, JSON.stringify(meals) + linePhotos + "|" + look.icons, fit.max, fit.min, fit.target);
  const applied = Math.min(desired, grow);
  appliedRef.current = applied;
  const id = "menu" + dayIndex;
  useEffect(() => { report(id, has ? desired : null); }, [report, id, desired, has]);
  useEffect(() => () => report(id, null), [report, id]);

  return (
    <section className={styles.day + " " + styles.menuDay + (isToday ? " " + styles.dayToday : "")} style={{ "--bs": applied } as React.CSSProperties}>
      <header className={styles.dayHead}>
        <span className={styles.dayName}>
          {isToday && <Pin color={BRAND.sun} className={styles.dayPin} />}
          {DAY_NAMES[dayIndex]}
        </span>
        <span className={styles.dayDate}>{shortDate(date)}</span>
      </header>
      <div ref={listRef} className={styles.list}>
        {MEALS.map(m => (meals[m]?.length ?? 0) > 0 && (
          SNACK_MEALS.includes(m) ? (
            <div key={m} className={styles.meal + " " + styles.mealSnack}>
              <span className={styles.mealName}><MealHeadPhoto meal={m} lines={meals[m]!} className={styles.mealPhoto} fallbackClassName={styles.mealIcon} />{MEAL_SHORT[m]}</span>{" "}
              <span className={styles.mealSnackText}>{meals[m]!.map(l => splitMenuLine(l)).filter(x => !isSpecial(x.label)).map(x => x.text).join(", ")}</span>
            </div>
          ) : (
            <div key={m} className={styles.meal}>
              <div className={styles.mealName}><MealHeadPhoto meal={m} lines={meals[m]!} className={styles.mealPhoto} fallbackClassName={styles.mealIcon} />{MEAL_SHORT[m]}</div>
              <ul className={styles.mealList}>
                {meals[m]!.map((item, k) => <MenuLine key={k} line={item} className={styles.mealItem} photo={linePhotos} />)}
              </ul>
            </div>
          )
        ))}
      </div>
    </section>
  );
}

/** לתצוגת "היום": הארוחה הבאה (ואחריה) בקצרה */
export function nextMealsSummary(meals: DayMeals | undefined, nowMinutes: number, count = 2): { meal: Meal; text: string }[] {
  if (!meals) return [];
  const present = MEALS.filter(m => (meals[m]?.length ?? 0) > 0);
  let idx = currentMealIndex(present, nowMinutes);
  if (idx < 0) idx = present.length; // אחרי ארוחת הערב — אין עוד
  return present.slice(idx, idx + count).map(m => ({
    meal: m,
    text: meals[m]!.map(l => splitMenuLine(l)).filter(x => !isSpecial(x.label) && !/^(דייסה|גבינ|מעדנים|ממרחים)/.test(x.label ?? "")).map(x => x.text).join(", "),
  })).filter(x => x.text);
}
