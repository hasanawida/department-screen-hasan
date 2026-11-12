// שם המחלקה בשפות האחרות (מסך ההתמצאות): חילוץ התרגום מתשובת המודל

export type TranslatedNames = { name_ar: string; name_ru: string; name_en: string };

const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 80) : "");

/**
 * מוציא את שלושת השמות מתשובת המודל, או null כשאין תרגום מלא.
 * המודל מתבקש להחזיר JSON בלבד, אבל התשובה יכולה להגיע עם טקסט מסביב (הסבר, הערה, גדר קוד) —
 * ואז JSON.parse על כל התשובה נכשל והשם נשאר בעברית. לכן מחפשים את אובייקט ה-JSON בתוך הטקסט.
 * נשמר רק תרגום מלא (שלוש השפות): תשובה חלקית לא מחליפה את השם.
 */
export function parseTranslatedNames(text: string): TranslatedNames | null {
  for (const candidate of String(text ?? "").match(/\{[^{}]*\}/g) ?? []) {
    try {
      const parsed = JSON.parse(candidate);
      const names = { name_ar: clean(parsed?.name_ar), name_ru: clean(parsed?.name_ru), name_en: clean(parsed?.name_en) };
      if (names.name_ar && names.name_ru && names.name_en) return names;
    } catch {
      // לא JSON תקין — ממשיכים למועמד הבא
    }
  }
  return null;
}
