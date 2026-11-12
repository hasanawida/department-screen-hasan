/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { createAnonServerClient } from "@/lib/supabase/anon-server";
import OrientationScreenWrapper from "@/components/orientation/orientation-screen-wrapper";
import { orientationColor } from "@/lib/orientation-color";
import { parseTranslatedNames, type TranslatedNames } from "@/lib/orientation-names";

// תמיד הנתונים העדכניים מהמסד (בלי המטמון של Next) — אחרת שינוי שם של מחלקה לא מגיע למסך
export const fetchCache = "force-no-store";
const supabase = createAnonServerClient();

// מחלקה שהתרגום שלה נכשל לא נשלחת שוב לתרגום בכל טעינה של המסך — רק פעם בשעה (לכל שרת)
const lastFailure = new Map<string, number>();
const RETRY_AFTER_MS = 60 * 60 * 1000;

async function translateDepartmentName(
  deptId: string,
  nameHe: string,
): Promise<TranslatedNames> {
  const hebrew = { name_ar: nameHe, name_ru: nameHe, name_en: nameHe };
  if (!process.env.ANTHROPIC_API_KEY) return hebrew;
  if (Date.now() - (lastFailure.get(deptId) ?? 0) < RETRY_AFTER_MS) return hebrew;
  // הסיבה נרשמת ביומן של השרת (Vercel ← Logs), כדי שאפשר יהיה לראות למה שם נשאר בעברית
  const failed = (reason: string) => {
    lastFailure.set(deptId, Date.now());
    console.warn(`[orientation] תרגום שם המחלקה "${nameHe}" נכשל: ${reason}`);
    return hebrew;
  };
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      // שירות התרגום לא מעכב את טעינת המסך: אם הוא לא עונה מהר — השם מוצג בעברית, וננסה שוב בטעינה הבאה
      signal: AbortSignal.timeout(6000),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Translate this Hebrew nursing home department name to Arabic, Russian, and English.
If the name is a personal name or is already written in Latin letters, keep it as a name (transliterate it) instead of translating its meaning.
Return ONLY a JSON object with keys: name_ar, name_ru, name_en.
No explanation, no markdown, just the JSON.
Hebrew name: "${nameHe}"`,
        }],
      }),
    });
    if (!response.ok) return failed(`השירות ענה ${response.status}: ${(await response.text()).slice(0, 200)}`);
    const data = await response.json();
    // כל קטעי הטקסט בתשובה (לא רק הראשון), ומתוכם אובייקט ה-JSON — גם כשיש סביבו הסבר או גדר קוד
    const text = (Array.isArray(data?.content) ? data.content : [])
      .map((block: any) => (block?.type === "text" && typeof block.text === "string" ? block.text : ""))
      .join("\n");
    const names = parseTranslatedNames(text);
    // שומרים רק תרגום מלא (שלוש השפות); תשובה חלקית או שגויה לא נשמרת במקום השם
    if (!names) return failed(`אין בתשובה שלושה שמות: ${text.slice(0, 200) || "(בלי טקסט)"}`);
    const { error } = await supabase.from("departments").update(names).eq("id", deptId);
    if (error) console.warn(`[orientation] התרגום של "${nameHe}" לא נשמר: ${error.message}`);
    lastFailure.delete(deptId);
    return names;
  } catch (e) {
    return failed(e instanceof Error ? e.message : String(e));
  }
}

const DEFAULT_SETTINGS = {
  languages: ["he", "ar", "ru", "en"],
  lang_interval_seconds: 20,
  show_activities: true,
  show_menu: true,
  show_staff: true,
  show_announcement: true,
  show_calming: true,
  show_hebrew_date: true,
  show_weather: true,
  show_anchors: true,
};

export default async function OrientationPage({ params }: any) {
  const { token } = await params;

  const { data: dept, error: deptError } = await supabase
    .from("departments")
    .select("id, name, name_ar, name_ru, name_en, color, orientation_color, orientation_settings")
    .eq("view_token", token)
    .maybeSingle();

  // תקלה בקריאה היא לא "אין מחלקה כזו": זורקים, והמסך מציג דף המתנה ומנסה שוב לבד
  if (deptError) throw new Error("departments: " + deptError.message);
  if (!dept) notFound();

  const settings = { ...DEFAULT_SETTINGS, ...(dept.orientation_settings ?? {}) };

  // שם המחלקה בשפות האחרות — מתורגם פעם אחת ונשמר (רק כשהשם מוצג במסך)
  let translations = { name_ar: dept.name_ar, name_ru: dept.name_ru, name_en: dept.name_en };
  if ((settings as any).show_department !== false && (!dept.name_ar || !dept.name_ru || !dept.name_en)) {
    translations = await translateDepartmentName(dept.id, dept.name);
  }

  return (
    <OrientationScreenWrapper
      departmentId={dept.id}
      departmentName={dept.name}
      departmentNameAr={translations.name_ar ?? dept.name}
      departmentNameRu={translations.name_ru ?? dept.name}
      departmentNameEn={translations.name_en ?? dept.name}
      departmentColor={orientationColor(dept.orientation_color)}
      settings={settings}
    />
  );
}

export const dynamic = "force-dynamic";
