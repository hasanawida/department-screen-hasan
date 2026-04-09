// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { CheckCircle, Settings } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Settings = {
  languages: string[];
  lang_interval_seconds: number;
  show_activities: boolean;
  show_menu: boolean;
  show_staff: boolean;
  show_announcement: boolean;
  show_calming: boolean;
  show_hebrew_date: boolean;
  show_weather: boolean;
  show_anchors: boolean;
};

const DEFAULT_SETTINGS: Settings = {
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

const LANG_LABELS: Record<string, string> = {
  he: "עברית", ar: "ערבית", ru: "רוסית", en: "אנגלית",
};
const ALL_LANGS = ["he", "ar", "ru", "en"];

const SECTION_LABELS: { key: keyof Settings; label: string }[] = [
  { key: "show_activities",  label: "פעילויות (עכשיו / בהמשך הקרוב)" },
  { key: "show_menu",        label: "תפריט היום" },
  { key: "show_staff",       label: "הצוות היום" },
  { key: "show_announcement",label: "הודעה חשובה" },
  { key: "show_calming",     label: "מסר מרגיע" },
  { key: "show_hebrew_date", label: "תאריך עברי" },
  { key: "show_weather",     label: "מזג אוויר" },
  { key: "show_anchors",     label: "עוגנים קבועים" },
];

export default function OrientationSettingsPage({
  params,
}: {
  params: { token: string };
}) {
  const [deptName, setDeptName] = useState("");
  const [deptId, setDeptId] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, orientation_settings")
        .eq("view_token", params.token)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      setDeptId(data.id);
      setDeptName(data.name);
      setSettings({ ...DEFAULT_SETTINGS, ...(data.orientation_settings ?? {}) });
      setLoading(false);
    }
    load();
  }, [params.token]);

  async function handleSave() {
    await supabase
      .from("departments")
      .update({ orientation_settings: settings })
      .eq("id", deptId);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggleLang(lang: string) {
    setSettings((prev) => {
      const has = prev.languages.includes(lang);
      if (has && prev.languages.length === 1) return prev;
      return {
        ...prev,
        languages: has ? prev.languages.filter(l => l !== lang) : [...prev.languages, lang],
      };
    });
  }

  function toggleShow(key: keyof Settings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center">
      <p className="text-2xl text-slate-500">טוען...</p>
    </div>
  );

  if (notFound) return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center">
      <p className="text-2xl text-red-500">מחלקה לא נמצאה</p>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-emerald-700" />
          <div>
            <h1 className="text-3xl font-black text-slate-900">הגדרות מסך התמצאות</h1>
            <p className="text-xl text-slate-500">{deptName}</p>
          </div>
        </div>

        {/* Languages */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">שפות להצגה</h2>
            <p className="text-slate-500">בחר אילו שפות יופיעו במסך (לפחות אחת)</p>
            <div className="grid grid-cols-2 gap-3">
              {ALL_LANGS.map((lang) => (
                <button
                  key={lang}
                  onClick={() => toggleLang(lang)}
                  className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-xl font-semibold transition-all ${
                    settings.languages.includes(lang)
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  <span>{LANG_LABELS[lang]}</span>
                  <span className="text-2xl">{lang === "he" ? "🇮🇱" : lang === "ar" ? "🌙" : lang === "ru" ? "🇷🇺" : "🇬🇧"}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Language interval */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">מהירות החלפת שפות</h2>
            <p className="text-slate-500">כל כמה שניות המסך יעבור לשפה הבאה</p>
            <div className="flex items-center gap-4">
              <Slider
                min={5} max={60} step={5}
                value={[settings.lang_interval_seconds]}
                onValueChange={([v]) => setSettings(prev => ({ ...prev, lang_interval_seconds: v }))}
                className="flex-1"
              />
              <span className="w-20 text-center text-2xl font-bold text-emerald-700">
                {settings.lang_interval_seconds} שנ׳
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Show/hide sections */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">מה להציג במסך</h2>
            <div className="space-y-3">
              {SECTION_LABELS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-xl font-medium text-slate-800">{label}</span>
                  <Switch
                    checked={!!settings[key]}
                    onCheckedChange={() => toggleShow(key)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <Button
          onClick={handleSave}
          className="w-full rounded-2xl py-6 text-2xl font-bold bg-emerald-600 hover:bg-emerald-700"
        >
          {saved ? (
            <span className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6" /> נשמר בהצלחה!
            </span>
          ) : "שמור הגדרות"}
        </Button>

        <p className="text-center text-slate-400 text-lg">
          קישור למסך:{" "}
          <a href={`/orientation/${params.token}`} target="_blank" className="text-emerald-600 underline">
            /orientation/{params.token.slice(0, 8)}...
          </a>
        </p>

      </div>
    </div>
  );
}
