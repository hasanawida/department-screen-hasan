"use client";

// מתאים את גודל התוכן כך שימלא את המקום שיש לו:
// מגדיל כשיש מקום פנוי, ומקטין כשהתוכן לא נכנס.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export const FILL_MAX = 1.6;
export const FILL_MIN = 0.5;

/** גובה התוכן בפועל בתוך האלמנט (גם כשהוא קטן מהאלמנט) */
function contentHeight(el: HTMLElement) {
  const top = el.getBoundingClientRect().top;
  let bottom = top;
  for (const child of Array.from(el.children)) bottom = Math.max(bottom, child.getBoundingClientRect().bottom);
  const pb = parseFloat(getComputedStyle(el).paddingBottom) || 0;
  return bottom - top + pb;
}

/**
 * מחזיר את קנה המידה שבו התוכן ממלא את האלמנט.
 * appliedRef — קנה המידה שמוצג עכשיו בפועל (לפיו מודדים). מתעדכן בכל רינדור.
 * key — כשהתוכן משתנה מתחילים מדידה מחדש.
 */
export function useFillScale(ref: RefObject<HTMLElement | null>, appliedRef: { current: number }, key: string, max = FILL_MAX, min = FILL_MIN) {
  const [desired, setDesired] = useState(1);
  const tries = useRef(0);
  // מה כבר ידוע: הגודל הגדול ביותר שנכנס, והקטן ביותר שלא נכנס (כדי לא לקפוץ הלוך ושוב כשטקסט נשבר לשורה חדשה)
  const fitMax = useRef(0);
  const overMin = useRef(Infinity);
  const [, setTick] = useState(0);

  const restart = () => { tries.current = 0; fitMax.current = 0; overMin.current = Infinity; };

  useLayoutEffect(() => { restart(); }, [key]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let last = el.clientHeight;
    const ro = new ResizeObserver(() => {
      if (Math.abs(el.clientHeight - last) < 2) return;
      last = el.clientHeight;
      restart();
      setTick(t => t + 1);
    });
    ro.observe(el);
    // כשהגופן נטען הגבהים משתנים — מודדים שוב
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) { restart(); setTick(t => t + 1); } });
    return () => { alive = false; ro.disconnect(); };
  }, [ref]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || tries.current > 20) return;
    const content = contentHeight(el);
    const avail = el.clientHeight;
    if (!content || !avail) return;
    const s = appliedRef.current;
    const ratio = avail / content;
    if (ratio >= 1) fitMax.current = Math.max(fitMax.current, s);
    else overMin.current = Math.min(overMin.current, s);
    // נכנס, ונשאר מעט מקום — מספיק טוב
    if (ratio >= 1 && ratio <= 1.05) return;

    let next = s * ratio * 0.98;
    if (ratio > 1) {
      // לא מגדילים מעבר לגודל שכבר ידוע שלא נכנס
      if (overMin.current < Infinity) next = Math.min(next, (s + overMin.current) / 2);
      if (next - s < 0.01) return;
    } else if (fitMax.current > 0) {
      // מקטינים, אבל לא מתחת לגודל שכבר ידוע שנכנס
      next = Math.max(next, fitMax.current);
    }
    next = Math.max(min, Math.min(max, next));
    if (Math.abs(next - desired) > 0.004) {
      tries.current++;
      setDesired(next);
    }
  });

  return desired;
}

/**
 * גודל אחיד לכמה עמודות (ימים): כולן גדלות יחד כל עוד יש מקום בכולן.
 * עמודה עמוסה מתכווצת לבד ולא מקטינה את האחרות.
 */
export function useUniformGrow(max = FILL_MAX) {
  const [map, setMap] = useState<Record<string, number>>({});
  const report = useCallback((id: string, value: number | null) => {
    setMap(m => {
      if (value === null) {
        if (!(id in m)) return m;
        const { [id]: _, ...rest } = m;
        return rest;
      }
      return Math.abs((m[id] ?? -1) - value) < 0.004 ? m : { ...m, [id]: value };
    });
  }, []);
  const values = Object.values(map);
  const grow = Math.min(max, Math.max(1, values.length ? Math.min(...values) : 1));
  return { grow, report };
}
