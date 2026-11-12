"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { CheckCircle, Settings, Monitor, Smartphone } from "lucide-react";
import { ORIENTATION_DEFAULT_COLOR, orientationColor } from "@/lib/orientation-color";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type OrientationSettings = {
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
  display_orientation: "landscape" | "portrait";
  show_logo: boolean;
  show_department: boolean;
};

const DEFAULT_SETTINGS: OrientationSettings = {
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
  display_orientation: "landscape",
  show_logo: true,
  show_department: true,
};

const LANG_LABELS: Record<string, string> = {
  he: "עברית", ar: "ערבית", ru: "רוסית", en: "אנגלית",
};
const ALL_LANGS = ["he", "ar", "ru", "en"];

const SECTION_LABELS: { key: keyof OrientationSettings; label: string }[] = [
  { key: "show_logo",         label: "הלוגו של אשכולות (למעלה)" },
  { key: "show_department",   label: "שם המחלקה (למעלה)" },
  { key: "show_calming",      label: "מסר מרגיע" },
  { key: "show_weather",      label: "מזג אוויר" },
];

// צבעים כהים מספיק לכותרות על רקע קרם ולכתב לבן בפס המסר
const QUICK_COLORS = [
  "#5A826F", "#3F2F2D", "#2F6690", "#1F7A7A",
  "#4F7A3A", "#8E5A9B", "#6366F1", "#B56262",
  "#C2410C", "#B5651D", "#A16207", "#BE185D",
];

export default function OrientationSettingsPage() {
  const params = useParams();
  const token = params.token as string;

  const [deptName, setDeptName] = useState("");
  const [color, setColor] = useState(ORIENTATION_DEFAULT_COLOR);
  const [settings, setSettings] = useState<OrientationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  async function loadData() {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, orientation_color, orientation_settings")
      .eq("view_token", token)
      .maybeSingle();

    // תקלת חיבור היא לא "מחלקה לא נמצאה"
    if (error) { setLoadFailed(true); setLoading(false); return; }
    setLoadFailed(false);
    if (!data) { setNotFound(true); setLoading(false); return; }
    setDeptName(data.name);
    setColor(orientationColor(data.orientation_color));
    setSettings({ ...DEFAULT_SETTINGS, ...(data.orientation_settings ?? {}) });
    setLoading(false);
  }

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  async function handleSave() {
    setSaveError("");
    const { data, error } = await supabase
      .from("departments")
      .update({
        orientation_color: color,
        orientation_settings: settings,
      })
      .eq("view_token", token)
      .select("id");

    if (error || !data?.length) {
      setSaveError("לא נשמר" + (error ? ": " + error.message : ". רעננו את העמוד ונסו שוב."));
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggleLang(lang: string) {
    setSettings((prev) => {
      const has = prev.languages.includes(lang);
      if (has && prev.languages.length === 1) return prev;
      return {
        ...prev,
        languages: has
          ? prev.languages.filter(l => l !== lang)
          : [...prev.languages, lang],
      };
    });
  }

  function toggleShow(key: keyof OrientationSettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center">
      <p className="text-2xl text-slate-500">טוען...</p>
    </div>
  );

  if (loadFailed) return (
    <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-2xl text-slate-700">ההגדרות לא נטענו. בדקו את החיבור לאינטרנט.</p>
      <Button onClick={() => { setLoading(true); loadData(); }}>ניסיון נוסף</Button>
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

        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-emerald-700" />
          <div>
            <h1 className="text-3xl font-black text-slate-900">הגדרות מסך התמצאות</h1>
            <p className="text-xl text-slate-500">{deptName}</p>
          </div>
        </div>

        {/* כיוון תצוגה */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">כיוון תצוגה</h2>
            <p className="text-slate-500">בחר איך המסך יוצג על הטלוויזיה או הטאבלט</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSettings(prev => ({ ...prev, display_orientation: "landscape" }))}
                className={"flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all " + (settings.display_orientation === "landscape" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white")}
              >
                <Monitor className={"h-12 w-12 " + (settings.display_orientation === "landscape" ? "text-emerald-600" : "text-slate-400")} />
                <div className="text-center">
                  <div className={"text-xl font-bold " + (settings.display_orientation === "landscape" ? "text-emerald-800" : "text-slate-600")}>
                    לרוחב
                  </div>
                  <div className="text-sm text-slate-400 mt-1">טלוויזיה רגילה</div>
                </div>
                {settings.display_orientation === "landscape" && (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                )}
              </button>

              <button
                onClick={() => setSettings(prev => ({ ...prev, display_orientation: "portrait" }))}
                className={"flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all " + (settings.display_orientation === "portrait" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white")}
              >
                <Smartphone className={"h-12 w-12 " + (settings.display_orientation === "portrait" ? "text-blue-600" : "text-slate-400")} />
                <div className="text-center">
                  <div className={"text-xl font-bold " + (settings.display_orientation === "portrait" ? "text-blue-800" : "text-slate-600")}>
                    לאורך
                  </div>
                  <div className="text-sm text-slate-400 mt-1">טלוויזיה אנכית / טאבלט</div>
                </div>
                {settings.display_orientation === "portrait" && (
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* צבע מסך התמצאות */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">צבע מסך התמצאות</h2>
            <p className="text-slate-500">הצבע של הכותרות הקטנות (יום, שעה, תאריך…) ושל פס המסר המרגיע — במקום הירוק. למסך ההתמצאות בלבד.</p>
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-2xl border-4 border-white shadow-lg flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-12 w-16 rounded-xl border border-slate-200 p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-4 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {QUICK_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={"h-8 w-8 rounded-full border-4 transition-transform hover:scale-110 " + (color === c ? "border-slate-800 scale-110" : "border-white shadow")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div
              className="rounded-2xl p-4 text-white text-center text-2xl font-bold"
              style={{ backgroundColor: color }}
            >
              כך ייראה פס המסר המרגיע
            </div>
          </CardContent>
        </Card>

        {/* שפות */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">שפות להצגה</h2>
            <p className="text-slate-500">בחר אילו שפות יופיעו במסך (לפחות אחת)</p>
            <div className="grid grid-cols-2 gap-3">
              {ALL_LANGS.map((lang) => (
                <button
                  key={lang}
                  onClick={() => toggleLang(lang)}
                  className={"flex items-center justify-between rounded-xl border-2 px-4 py-3 text-xl font-semibold transition-all " + (settings.languages.includes(lang) ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-400")}
                >
                  <span>{LANG_LABELS[lang]}</span>
                  <span className="text-2xl">
                    {lang === "he" ? "🇮🇱" : lang === "ar" ? "🌙" : lang === "ru" ? "🇷🇺" : "🇬🇧"}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* מהירות */}
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

        {/* מה להציג */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">מה להציג במסך</h2>
            <div className="space-y-3">
              {SECTION_LABELS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-xl font-medium text-slate-800">{label}</span>
                  <Switch
                    checked={settings[key] as boolean}
                    onCheckedChange={() => toggleShow(key)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {saveError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-center text-lg font-semibold text-red-700">{saveError}</p>}
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
          <a href={"/orientation/" + token + "?preview=1"} target="_blank" className="text-emerald-600 underline">
            /orientation/{token?.slice(0, 8)}...
          </a>
        </p>

      </div>
    </div>
  );
}