// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import OrientationScreen from "@/components/orientation/orientation-screen";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type ActivityCategory = "meal" | "group" | "rest" | "therapy" | "free";

const CATEGORY_MAP: Record<string, ActivityCategory> = {
  "ארוחה": "meal", "אוכל": "meal",
  "קבוצה": "group", "פעילות": "group",
  "מנוחה": "rest", "טיפול": "therapy",
};

function guessCategory(title: string): ActivityCategory | undefined {
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (title.includes(keyword)) return cat;
  }
  return undefined;
}

async function translateDepartmentName(
  deptId: string,
  nameHe: string,
): Promise<{ name_ar: string; name_ru: string; name_en: string }> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Translate this Hebrew nursing home department name to Arabic, Russian, and English.
Return ONLY a JSON object with keys: name_ar, name_ru, name_en.
No explanation, no markdown, just the JSON.
Hebrew name: "${nameHe}"`,
        }],
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    await supabase.from("departments").update({
      name_ar: parsed.name_ar,
      name_ru: parsed.name_ru,
      name_en: parsed.name_en,
    }).eq("id", deptId);
    return parsed;
  } catch {
    return { name_ar: nameHe, name_ru: nameHe, name_en: nameHe };
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
    .select("id, name, name_ar, name_ru, name_en, orientation_settings")
    .eq("view_token", token)
    .single();

  if (deptError || !dept) notFound();

  const settings = { ...DEFAULT_SETTINGS, ...(dept.orientation_settings ?? {}) };

  let translations = { name_ar: dept.name_ar, name_ru: dept.name_ru, name_en: dept.name_en };
  if (!dept.name_ar || !dept.name_ru || !dept.name_en) {
    translations = await translateDepartmentName(dept.id, dept.name);
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: rawActivities } = await supabase
    .from("activities")
    .select("id, title, start_time, end_time, is_active")
    .eq("department_id", dept.id)
    .eq("activity_date", today)
    .eq("is_active", true)
    .order("start_time", { ascending: true });

  const activities = (rawActivities ?? []).map((a) => ({
    id:        String(a.id),
    title:     a.title,
    startTime: a.start_time?.slice(0, 5) ?? "00:00",
    endTime:   a.end_time?.slice(0, 5)   ?? "00:00",
    category:  guessCategory(a.title),
    isActive:  a.is_active,
  }));

  return (
    <OrientationScreen
      departmentName={dept.name}
      departmentNameAr={translations.name_ar ?? dept.name}
      departmentNameRu={translations.name_ru ?? dept.name}
      departmentNameEn={translations.name_en ?? dept.name}
      activities={activities}
      settings={settings}
    />
  );
}

export const dynamic = "force-dynamic";
