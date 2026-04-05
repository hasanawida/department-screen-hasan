import React from "react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock3,
  MapPin,
  Sun,
  Coffee,
  Music2,
  Dumbbell,
  Megaphone,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const hebrewMonths = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function formatHebrewDate(date: Date) {
  return `${hebrewDays[date.getDay()]} | ${date.getDate()} ב${hebrewMonths[date.getMonth()]}`;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function getGreeting(hour: number) {
  if (hour < 12) return "בוקר טוב";
  if (hour < 18) return "צהריים טובים";
  return "ערב טוב";
}

function getActivityIcon(category?: string | null) {
  switch (category) {
    case "music": return Music2;
    case "coffee": return Coffee;
    case "exercise": return Dumbbell;
    default: return Sparkles;
  }
}

function getActivityLabel(category?: string | null) {
  switch (category) {
    case "music": return "פעילות מוזיקה";
    case "coffee": return "הפסקה נעימה";
    case "exercise": return "תנועה והתעמלות";
    default: return "פעילות מחלקתית";
  }
}

function parseTodayTimeToDate(timeValue: string, baseDate = new Date()) {
  const [hours = "0", minutes = "0"] = timeValue.split(":");
  const date = new Date(baseDate);
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}

async function getDisplayData(code: string) {
  const supabase = await createClient();
  const now = new Date();

  const { data: department } = await supabase
    .from("departments")
    .select("id, name, code, color")
    .eq("code", code)
    .single();

  if (!department) return null;

  const { data: activitiesRaw } = await supabase
    .from("activities")
    .select("*")
    .eq("department_id", department.id)
    .eq("is_active", true)
    .order("start_time", { ascending: true });

  const { data: announcementsRaw } = await supabase
    .from("announcements")
    .select("*")
    .eq("department_id", department.id)
    .eq("is_active", true);

  const { data: tickerRaw } = await supabase
    .from("ticker_messages")
    .select("*")
    .or(`department_id.eq.${department.id},is_global.eq.true`)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const { data: settings } = await supabase
    .from("screen_settings")
    .select("*")
    .eq("department_id", department.id)
    .single();

  const activities = (activitiesRaw || []).filter(a => {
    if (a.activity_date) {
      const d = new Date(a.activity_date);
      return d.toDateString() === now.toDateString();
    }
    return a.day_of_week === hebrewDays[now.getDay()];
  });

  const currentActivity = activities.find(a => {
    const start = parseTodayTimeToDate(a.start_time, now);
    const end = parseTodayTimeToDate(a.end_time || "23:59", now);
    return now >= start && now <= end;
  }) || null;

  const nextActivities = activities.filter(a => {
    const start = parseTodayTimeToDate(a.start_time, now);
    return start > now;
  });

  return { department, currentActivity, nextActivities, announcements: announcementsRaw || [], tickerMessages: tickerRaw || [], settings, now };
}

export default async function DisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await getDisplayData(code);
  if (!data) notFound();

  const { department, currentActivity, nextActivities, announcements, tickerMessages, settings, now } = data;
  const CurrentIcon = getActivityIcon(currentActivity?.category);
  const greeting = getGreeting(now.getHours());
  const tickerItems = tickerMessages.length > 0 ? tickerMessages : announcements;

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900" dir="rtl">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-6 p-6 md:p-8 lg:p-10">
        <header className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Card className="rounded-3xl border-0 bg-white/95 shadow-xl">
            <CardContent className="flex items-center justify-between gap-6 p-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-2xl font-semibold text-slate-600">
                  <Sun className="h-7 w-7" />
                  <span>יום נעים במחלקה</span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl xl:text-6xl">{greeting}</h1>
                <p className="text-2xl text-slate-600 md:text-3xl">{department.name}</p>
                {settings?.welcome_message && (
                  <p className="text-xl text-slate-500">{settings.welcome_message}</p>
                )}
              </div>
              <div className="text-left">
                <div className="text-3xl font-semibold text-slate-600 md:text-4xl">{formatHebrewDate(now)}</div>
                <div className="mt-3 flex items-center justify-end gap-3 text-5xl font-bold md:text-6xl xl:text-7xl">
                  <Clock3 className="h-12 w-12 md:h-14 md:w-14" />
                  <span>{formatClock(now)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-xl" style={{ backgroundColor: department.color + "20" }}>
            <CardContent className="flex h-full flex-col justify-center gap-4 p-8">
              <Badge className="w-fit rounded-full px-5 py-2 text-xl font-semibold text-white" style={{ backgroundColor: department.color }}>
                היום במחלקה
              </Badge>
              <div className="text-3xl font-bold md:text-4xl">{department.name}</div>
              <p className="text-2xl leading-relaxed text-slate-700 md:text-3xl">
                מסך ברור, קבוע ורגוע כדי לעזור בהתמצאות ובהרגשת ביטחון.
              </p>
            </CardContent>
          </Card>
        </header>

        <main className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.95fr]">
          <section>
            <Card className="h-full rounded-[2rem] border-0 bg-white shadow-2xl">
              <CardHeader className="pb-2 pt-8">
                <Badge className="w-fit rounded-full px-5 py-2 text-2xl font-semibold text-white" style={{ backgroundColor: department.color }}>
                  עכשיו
                </Badge>
              </CardHeader>
              <CardContent className="flex h-full flex-col justify-between gap-8 p-8 pt-4 xl:p-10">
                {currentActivity ? (
                  <>
                    <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex h-28 w-28 items-center justify-center rounded-3xl md:h-36 md:w-36" style={{ backgroundColor: department.color + "20" }}>
                          <CurrentIcon className="h-14 w-14 md:h-20 md:w-20" style={{ color: department.color }} />
                        </div>
                        <div className="space-y-3">
                          <p className="text-2xl font-semibold text-slate-500 md:text-3xl">{getActivityLabel(currentActivity.category)}</p>
                          <h2 className="text-5xl font-bold leading-tight md:text-6xl xl:text-7xl">{currentActivity.title}</h2>
                          {currentActivity.instructor_name && (
                            <div className="flex items-center gap-2 text-2xl text-slate-600">
                              <User className="h-6 w-6" />
                              <span>{currentActivity.instructor_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="rounded-3xl bg-slate-50 px-6 py-5 text-right shadow-sm">
                        {currentActivity.location && (
                          <div className="mb-3 flex items-center gap-3 text-2xl font-semibold text-slate-600 md:text-3xl">
                            <MapPin className="h-7 w-7" />
                            <span>{currentActivity.location}</span>
                          </div>
                        )}
                        <div className="text-3xl font-bold md:text-4xl" dir="ltr">
                          {currentActivity.start_time?.slice(0,5)} - {currentActivity.end_time?.slice(0,5)}
                        </div>
                      </div>
                    </div>
                    {currentActivity.participants && (
                      <div className="rounded-3xl bg-slate-50 p-6 md:p-8">
                        <div className="flex items-center gap-3 text-2xl font-semibold text-slate-700 mb-3">
                          <Users className="h-6 w-6" />
                          <span>משתתפים</span>
                        </div>
                        <p className="text-2xl leading-relaxed text-slate-800">{currentActivity.participants}</p>
                      </div>
                    )}
                    {currentActivity.image_url && (
                      <img src={currentActivity.image_url} alt={currentActivity.title} className="rounded-3xl max-h-64 object-cover w-full" />
                    )}
                  </>
                ) : (
                  <div className="rounded-3xl bg-slate-50 p-8 text-center">
                    <p className="text-4xl font-bold md:text-5xl">כרגע אין פעילות מתוזמנת</p>
                    <p className="mt-4 text-2xl text-slate-600 md:text-3xl">אפשר לנוח, לשתות משהו חם או להצטרף בהמשך לפעילות הבאה.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="grid gap-6">
            <Card className="rounded-[2rem] border-0 shadow-xl" style={{ backgroundColor: department.color + "15" }}>
              <CardHeader>
                <CardTitle className="text-3xl font-bold md:text-4xl">בהמשך</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pb-8">
                {nextActivities.length > 0 ? (
                  nextActivities.slice(0, 2).map((activity, index) => {
                    const NextIcon = getActivityIcon(activity.category);
                    return (
                      <div key={activity.id} className="rounded-3xl bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <Badge variant="secondary" className="rounded-full px-4 py-1 text-xl">
                            {index === 0 ? "עוד מעט" : "אחר כך"}
                          </Badge>
                          <span className="text-2xl font-bold text-slate-600" dir="ltr">{activity.start_time?.slice(0,5)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                            <NextIcon className="h-8 w-8 text-slate-700" />
                          </div>
                          <div>
                            <div className="text-3xl font-bold leading-tight">{activity.title}</div>
                            {activity.location && <div className="mt-1 text-2xl text-slate-600">{activity.location}</div>}
                            {activity.instructor_name && (
                              <div className="mt-1 flex items-center gap-2 text-xl text-slate-500">
                                <User className="h-4 w-4" />
                                <span>{activity.instructor_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-3xl bg-white p-6 text-2xl font-semibold text-slate-600">אין כרגע פעילויות נוספות להיום.</div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-0 bg-white shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-3xl font-bold md:text-4xl">
                  <Megaphone className="h-8 w-8" />
                  הודעות חשובות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-8">
                {announcements.length > 0 ? (
                  announcements.slice(0, 3).map((ann) => (
                    <div key={ann.id} className="rounded-3xl bg-slate-50 p-5">
                      <p className="text-2xl font-semibold leading-relaxed text-slate-800 md:text-3xl">{ann.content || ann.title}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl bg-slate-50 p-5 text-2xl text-slate-600">אין הודעות כרגע.</div>
                )}
              </CardContent>
            </Card>
          </aside>
        </main>

        <footer>
          <Card className="overflow-hidden rounded-[2rem] border-0 bg-slate-900 text-white shadow-xl">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
                <Badge className="rounded-full bg-white/15 px-4 py-1 text-xl text-white hover:bg-white/15">הודעות מתחלפות</Badge>
              </div>
              <div className="relative overflow-hidden py-6">
                <div className="ticker-track flex w-max items-center gap-10 px-6">
                  {[...tickerItems, ...tickerItems].map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center gap-4 whitespace-nowrap">
                      <Megaphone className="h-7 w-7 text-emerald-300" />
                      <span className="text-3xl font-semibold md:text-4xl">{item.message || item.content || item.title}</span>
                      <Separator orientation="vertical" className="mx-2 h-8 bg-white/20" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </footer>
      </div>

      <style>{`
        .ticker-track { animation: tickerMove 28s linear infinite; }
        @keyframes tickerMove { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}