"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { CheckCircle, Settings } from "lucide-react";
import { use } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type DisplaySettings = {
  show_daily: boolean;
  show_weekly: boolean;
  show_media: boolean;
  show_ticker: boolean;
  show_announcements: boolean;
  view_interval_seconds: number;
};

const DEFAULT: DisplaySettings = {
  show_daily: true,
  show_weekly: true,
  show_media: true,
  show_ticker: true,
  show_announcements: true,
  view_interval_seconds: 20,
};

const SECTION_LABELS: { key: keyof DisplaySettings; label: string; desc: string }[] = [
  { key: "show_daily",         label: "תצוגה יומית",    desc: "עכשיו / בהמשך היום" },
  { key: "show_weekly",        label: "תצוגה שבועית",   desc: "לוח פעילויות שבועי" },
  { key: "show_media",         label: "מדיה",           desc: "תמונות ו-PDF" },
  { key: "show_ticker",        label: "שורת רצה",       desc: "הודעות מתחלפות בתחתית" },
  { key: "show_announcements", label: "הודעות חשובות",  desc: "הודעות מחלקה" },
];

export default function DisplaySettingsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const [deptName, setDeptName] = useState("");
  const [settingsId, setSettingsId] = useState("");
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: dept, error: deptErr } = await supabase
        .from("departments")
        .select("id, name")
        .eq("code", code)
        .single();

      if (deptErr || !dept) { setNotFound(true); setLoading(false); return; }
      setDeptName(dept.name);

      const { data: ss } = await supabase
        .from("screen_settings")
        .select("id, display_settings")
        .eq("department_id", dept.id)
        .single();

      if (ss) {
        setSettingsId(ss.id);
        setSettings({ ...DEFAULT, ...(ss.display_settings ?? {}) });
      }
      setLoading(false);
    }
    load();
  }, [code]);

  async function handleSave() {
    if (!settingsId) return;
    await supabase
      .from("screen_settings")
      .update({ display_settings: settings })
      .eq("id", settingsId);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggle(key: keyof DisplaySettings) {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
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

        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-emerald-700" />
          <div>
            <h1 className="text-3xl font-black text-slate-900">הגדרות מסך מחלקה</h1>
            <p className="text-xl text-slate-500">{deptName}</p>
          </div>
        </div>

        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">מה להציג במסך</h2>
            <div className="space-y-3">
              {SECTION_LABELS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <Switch
                    checked={!!settings[key]}
                    onCheckedChange={() => toggle(key)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">מהירות החלפת תצוגות</h2>
            <p className="text-slate-500">כל כמה שניות המסך עובר לתצוגה הבאה</p>
            <div className="flex items-center gap-4">
              <Slider
                min={5} max={60} step={5}
                value={[settings.view_interval_seconds]}
                onValueChange={([v]) => setSettings(prev => ({ ...prev, view_interval_seconds: v }))}
                className="flex-1"
              />
              <span className="w-20 text-center text-2xl font-bold text-emerald-700">
                {settings.view_interval_seconds} שנ׳
              </span>
            </div>
          </CardContent>
        </Card>

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
          <a href={`/display/${code}`} target="_blank" className="text-emerald-600 underline">
            /display/{code}
          </a>
        </p>

      </div>
    </div>
  );
}
