"use client";

// בחירת מפעיל/ה לפעילות — מהרשימה, ולא בהקלדה חופשית.
// מפעיל/ה חדש/ה: בודקים שאין כבר שם דומה ("אלדד" / "אלדד כהן"), כדי שלא ייווצרו שני קישורים אישיים.

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/admin/brand-ui";
import { cleanName, nameKey, similarNames } from "@/lib/participants";

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

export default function InstructorSelect({ value, onChange, choices, className }: {
  value: string;
  onChange: (v: string) => void;
  /** רשימת השמות; אם לא נשלחה — נטענת מהמערכת */
  choices?: string[];
  className?: string;
}) {
  const loaded = useInstructorNames(!choices);
  const list = choices ?? loaded;
  const clean = cleanName(value);
  const selected = list.find(n => nameKey(n) === nameKey(clean)) ?? "";
  // שם שלא ברשימה (למשל מפעילות ישנה) — מוצג כשם חדש
  const [adding, setAdding] = useState(false);
  const isAdding = adding || (!!clean && !selected && list.length > 0);

  const k = nameKey(clean);
  const exact = isAdding && clean ? list.find(n => nameKey(n) === k) : undefined;
  const similar = isAdding && !exact && k.length >= 2
    ? list.filter(n => similarNames(n, clean) || (k.length >= 3 && (nameKey(n).includes(k) || k.includes(nameKey(n)))))
    : [];
  const cls = className ?? inputCls;

  return (
    <div>
      <select value={isAdding ? NEW : selected} className={cls} aria-label="מפעיל/ה"
        onChange={e => {
          const v = e.target.value;
          if (v === NEW) { setAdding(true); onChange(""); }
          else { setAdding(false); onChange(v); }
        }}>
        <option value="">בלי מפעיל/ה (מדריכות התעסוקה)</option>
        {list.map(n => <option key={n} value={n}>{n}</option>)}
        <option value={NEW}>+ מפעיל/ה חדש/ה…</option>
      </select>
      {isAdding && (
        <div className="mt-2 space-y-1.5">
          <input autoFocus={adding} value={value} onChange={e => onChange(e.target.value)} className={cls}
            placeholder="שם מלא, למשל: אלדד כהן" aria-label="שם המפעיל/ה החדש/ה" />
          {exact && <p className="text-xs font-semibold text-[#5A826F]">«{exact}» כבר ברשימה. הפעילות תשויך אליו/ה.</p>}
          {similar.length > 0 && (
            <div className="rounded-lg bg-[#FDF0CC] p-2 text-sm">
              <div className="mb-1">כבר יש ברשימה שם דומה. אולי זה/זו:</div>
              <div className="flex flex-wrap gap-1.5">
                {similar.map(n => (
                  <button key={n} type="button" onClick={() => { setAdding(false); onChange(n); }}
                    className="rounded-full bg-white px-2.5 py-1 font-semibold hover:bg-[#E3ECE7]">{n}</button>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-[#3F2F2D]/55">אחרי השמירה נוצר קישור אישי לסימון נוכחות.</p>
        </div>
      )}
    </div>
  );
}
