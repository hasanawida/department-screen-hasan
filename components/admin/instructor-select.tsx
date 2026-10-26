"use client";

// בחירת מפעיל/ה לפעילות — רק מהרשימה.
// מפעיל/ה חדש/ה נוסף/ה בעמוד "מפעילים" (שם, טלפון, קישור אישי), ומשם חוזרים לפעילות.

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/admin/brand-ui";
import { cleanName, nameKey } from "@/lib/participants";

const NEW = "__new";

/** השם לשמירה: בלי רווחים מיותרים, ובכתיב של מפעיל/ה שכבר קיים/ת */
export function resolveInstructorName(raw: string, choices: string[]): string {
  const name = cleanName(raw);
  return choices.find(n => nameKey(n) === nameKey(name)) ?? name;
}

/** כל שמות המפעילים: מטבלת המפעילים ומהפעילויות */
export function useInstructorNames(enabled = true): string[] {
  const supabase = useMemo(() => createClient(), []);
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    if (!enabled) return;
    Promise.all([
      supabase.from("instructors").select("name"),
      supabase.from("activities").select("instructor_name").not("instructor_name", "is", null),
    ]).then(([a, b]) => {
      const all = [...(a.data ?? []).map((r: any) => r.name), ...(b.data ?? []).map((r: any) => r.instructor_name)]
        .map((n: string) => cleanName(n ?? "")).filter(Boolean);
      const byKey = new Map<string, string>();
      for (const n of all) if (!byKey.has(nameKey(n))) byKey.set(nameKey(n), n);
      setNames(Array.from(byKey.values()).sort((x, y) => x.localeCompare(y, "he")));
    });
  }, [supabase, enabled]);
  return names;
}

export default function InstructorSelect({ value, onChange, onAddNew, choices, className }: {
  value: string;
  onChange: (v: string) => void;
  /** "+ מפעיל/ה חדש/ה" — מעבר לעמוד המפעילים. בלי זה: קישור רגיל לעמוד */
  onAddNew?: () => void;
  /** רשימת השמות; אם לא נשלחה — נטענת מהמערכת */
  choices?: string[];
  className?: string;
}) {
  const loaded = useInstructorNames(!choices);
  const list = choices ?? loaded;
  const clean = cleanName(value);
  const selected = list.find(n => nameKey(n) === nameKey(clean)) ?? "";
  // שם ישן שלא ברשימה — מוצג כמו שהוא, כדי לא למחוק אותו בטעות
  const options = clean && !selected ? [clean, ...list] : list;

  return (
    <select value={selected || clean} className={className ?? inputCls} aria-label="מפעיל/ה"
      onChange={e => {
        const v = e.target.value;
        if (v !== NEW) { onChange(v); return; }
        if (onAddNew) onAddNew();
        else window.location.href = "/admin/instructors?add=1";
      }}>
      <option value="">בלי מפעיל/ה (מדריכות התעסוקה)</option>
      {options.map(n => <option key={n} value={n}>{n}</option>)}
      <option value={NEW}>+ הוספת מפעיל/ה חדש/ה (בעמוד המפעילים)</option>
    </select>
  );
}
