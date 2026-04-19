import React from "react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock3, MapPin, Sun, Coffee, Music2, Dumbbell, Megaphone, Sparkles, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import DisplayScreenWrapper from "@/components/display/display-screen-wrapper";

export const revalidate = 0;

const hebrewDayNames = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
const dayCodeMap: Record<number, string> = { 0:"א'", 1:"ב'", 2:"ג'", 3:"ד'", 4:"ה'", 5:"ו'", 6:"ש'" };
const dayOrder = ["א'","ב'","ג'","ד'","ה'","ו'","ש'"];
const dayNames: Record<string, string> = { "א'":"ראשון","ב'":"שני","ג'":"שלישי","ד'":"רביעי","ה'":"חמישי","ו'":"שישי","ש'":"שבת" };

function formatShortDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(2);
  return `${dd}.${mm}.${yy}`;
}
function formatHebrewDate(date: Date) {
  return `${hebrewDayNames[date.getDay()]} | ${formatShortDate(date)}`;
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
    case "music": return "מוזיקה";
    case "coffee": return "הפסקה";
    case "exercise": return "התעמלות";
    default: return "פעילות";
  }
}
function parseTodayTimeToDate(timeValue: string, baseDate = new Date()) {
  const [hours = "0", minutes = "0"] = timeValue.split(":");
  const date = new Date(baseDate);
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}
function getWeekDates(now: Date): Record<string, string> {
  const day = now.getDay();
  const dates: Record<string, string> = {};
  const codes = ["א'","ב'","ג'","ד'","ה'","ו'","ש'"];
  codes.forEach((code, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - day + i);
    dates[code] = formatShortDate(d);
  });
  return dates;
}

const DEFAULT_DISPLAY_SETTINGS = {
  show_daily: true,
  show_weekly: true,
  show_media: true,
  show_ticker: true,
  show_announcements: true,
  view_interval_seconds: 20,
};

async function getDisplayData(code: string) {
  const supabase = await createClient();
  const now = new Date();
  const { data: department } = await supabase
    .from("departments")
    .select("id, name, code, color, emergency_active, emergency_message, emergency_display")
    .eq("code", code)
    .single();
  if (!department) return null;

  const { data: activitiesRaw } = await supabase.from("activities").select("*").eq("department_id", department.id).eq("is_active", true).order("start_time", { ascending: true });
  const { data: announcementsRaw } = await supabase.from("announcements").select("*").eq("department_id", department.id).eq("is_active", true);
  const { data: tickerRaw } = await supabase.from("ticker_messages").select("*").or(`department_id.eq.${department.id},is_global.eq.true`).eq("is_active", true).order("display_order", { ascending: true });
  const { data: settingsRaw } = await supabase.from("screen_settings").select("*").eq("department_id", department.id).single();
  const { data: mediaItemsRaw } = await supabase.from("department_media").select("*").eq("department_id", department.id).eq("is_active", true).order("display_order", { ascending: true }).limit(10);

  const displaySettings = { ...DEFAULT_DISPLAY_SETTINGS, ...(settingsRaw?.display_settings ?? {}) };

  const todayCode = dayCodeMap[now.getDay()];
  const todayActivities = (activitiesRaw || []).filter(a => {
    if (a.activity_date) return new Date(a.activity_date).toDateString() === now.toDateString();
    return a.day_of_week === todayCode;
  });
  const currentActivity = todayActivities.find(a => {
    const start = parseTodayTimeToDate(a.start_time, now);
    const end = parseTodayTimeToDate(a.end_time || "23:59", now);
    return now >= start && now <= end;
  }) || null;
  const nextActivities = todayActivities.filter(a => parseTodayTimeToDate(a.start_time, now) > now);
  const weeklyActivities: Record<string, typeof activitiesRaw> = {};
  for (const day of dayOrder) {
    weeklyActivities[day] = (activitiesRaw || []).filter(a => a.day_of_week === day);
  }
  const weekDates = getWeekDates(now);
  const { data: weeklyTopic } = await supabase.from("weekly_topics").select("*").eq("department_id", department.id).eq("is_active", true).lte("week_start", now.toISOString().split("T")[0]).order("week_start", { ascending: false }).limit(1).single();

  return {
    department, currentActivity, nextActivities, weeklyActivities,
    todayCode, weekDates, weeklyTopic: weeklyTopic || null,
    announcements: announcementsRaw || [],
    tickerMessages: tickerRaw || [],
    settings: settingsRaw,
    displaySettings,
    mediaItems: mediaItemsRaw || [],
    now
  };
}

export default async function DisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await getDisplayData(code);
  if (!data) notFound();

  const { department, currentActivity, nextActivities, weeklyActivities, todayCode, weekDates, weeklyTopic, announcements, tickerMessages, settings, displaySettings, mediaItems, now } = data;
  const CurrentIcon = getActivityIcon(currentActivity?.category);
  const greeting = getGreeting(now.getHours());
  const tickerItems = tickerMessages.length > 0 ? tickerMessages : announcements;
  const displaySeconds = displaySettings.view_interval_seconds * 1000;

  const allMediaSlides: { url: string; type: string }[] = [];
  if (mediaItems.length > 0) {
    mediaItems.forEach((item: any) => allMediaSlides.push({ url: item.media_url, type: item.media_type || "image" }));
  } else if (settings?.media_url) {
    allMediaSlides.push({ url: settings.media_url, type: settings.media_type || "image" });
  }

  const viewsList: string[] = [];
  if (displaySettings.show_daily)   viewsList.push("daily");
  if (displaySettings.show_weekly)  viewsList.push("weekly");
  if (displaySettings.show_media && allMediaSlides.length > 0) {
    allMediaSlides.forEach(() => viewsList.push("media"));
  }
  if (viewsList.length === 0) viewsList.push("daily");

  return (
    <DisplayScreenWrapper
      departmentId={department.id}
      initialEmergencyActive={department.emergency_active && department.emergency_display}
      initialEmergencyMessage={department.emergency_message ?? ""}
    >
      <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900" dir="rtl">

        {/* מדיה מסך מלא */}
        {displaySettings.show_media && allMediaSlides.length > 0 && (
          <div id="media-fullscreen" style={{ display: "none", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999, backgroundColor: "#000" }}>
            {allMediaSlides.map((slide, index) => (
              <div key={index} id={`media-slide-${index}`} style={{ display: index === 0 ? "block" : "none", width: "100%", height: "100%" }}>
                {slide.type === "pdf" ? (
                  <iframe src={slide.url} style={{ width: "100%", height: "100%", border: "none" }} title={`מסך ${index + 1}`} />
                ) : (
                  <img src={slide.url} alt={`מסך ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                )}
              </div>
            ))}
            {allMediaSlides.length > 1 && (
              <div style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", zIndex: 10000 }}>
                {allMediaSlides.map((_, i) => (
                  <div key={i} id={`dot-${i}`} style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: i === 0 ? department.color : "#cbd5e1", transition: "all 0.3s" }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* תצוגה רגילה */}
        <div id="normal-screen" className="h-full w-full">
          <div className="mx-auto flex h-full w-full max-w-none flex-col gap-4 p-4 md:gap-5 md:p-6 lg:p-8">

            {/* Header */}
            <header className="daily-header grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
              <Card className="rounded-3xl border-0 bg-white/95 shadow-xl">
                <CardContent className="flex items-center justify-between gap-4 p-5 xl:p-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-2xl font-semibold text-slate-600">
                      <Sun className="h-7 w-7" /><span>יום נעים במחלקה</span>
                    </div>
                    <h1 className="text-5xl font-bold tracking-tight xl:text-6xl">{greeting}</h1>
                    <p className="text-2xl text-slate-600 xl:text-3xl">{department.name}</p>
                    {settings?.welcome_message && <p className="text-xl text-slate-500">{settings.welcome_message}</p>}
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-semibold text-slate-600 xl:text-4xl">{formatHebrewDate(now)}</div>
                    <div className="mt-1 flex items-center justify-end gap-2 text-5xl font-bold xl:text-6xl">
                      <Clock3 className="h-12 w-12 xl:h-14 xl:w-14" />
                      <span>{formatClock(now)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-3xl border-0 shadow-xl" style={{ backgroundColor: department.color + "20" }}>
                <CardContent className="flex h-full flex-col justify-center gap-3 p-5 xl:p-6">
                  <Badge className="w-fit rounded-full px-5 py-1.5 text-xl font-semibold text-white" style={{ backgroundColor: department.color }}>היום במחלקה</Badge>
                  <div className="text-3xl font-bold xl:text-4xl">{department.name}</div>
                  <p className="text-xl leading-relaxed text-slate-700 xl:text-2xl">מסך ברור, קבוע ורגוע כדי לעזור בהתמצאות ובהרגשת ביטחון.</p>
                </CardContent>
              </Card>
            </header>

            {/* תוכן */}
            <div className="view-container flex-1 min-h-0 overflow-hidden">

              {/* תצוגה יומית */}
              <div className="daily-view h-full overflow-hidden" style={{ display: displaySettings.show_daily ? "flex" : "none", flexDirection: "column" }}>
                <main className="grid flex-1 min-h-0 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[1.6fr_0.95fr]">
                  <section>
                    <Card className="flex h-full flex-col rounded-[2rem] border-0 bg-white shadow-2xl">
                      <CardHeader className="pb-2 pt-6 px-7">
                        <Badge className="w-fit rounded-full px-5 py-1.5 text-2xl font-semibold text-white" style={{ backgroundColor: department.color }}>עכשיו</Badge>
                      </CardHeader>
                      <CardContent className="flex flex-1 min-h-0 flex-col justify-center gap-4 p-7 pt-2">
                        {currentActivity ? (
                          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex items-center gap-5">
                              <div className="flex h-28 w-28 items-center justify-center rounded-3xl xl:h-32 xl:w-32" style={{ backgroundColor: department.color + "20" }}>
                                <CurrentIcon className="h-14 w-14 xl:h-16 xl:w-16" style={{ color: department.color }} />
                              </div>
                              <div className="space-y-2">
                                <p className="text-2xl font-semibold text-slate-500 xl:text-3xl">{getActivityLabel(currentActivity.category)}</p>
                                <h2 className="text-5xl font-bold leading-tight xl:text-6xl">{currentActivity.title}</h2>
                                {currentActivity.instructor_name && (
                                  <div className="flex items-center gap-2 text-2xl text-slate-600">
                                    <User className="h-6 w-6" /><span>{currentActivity.instructor_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="rounded-3xl bg-slate-50 px-6 py-5 text-right shadow-sm">
                              {currentActivity.location && (
                                <div className="mb-2 flex items-center gap-2 text-2xl font-semibold text-slate-600">
                                  <MapPin className="h-7 w-7" /><span>{currentActivity.location}</span>
                                </div>
                              )}
                              <div className="text-3xl font-bold" dir="ltr">
                                {currentActivity.start_time?.slice(0,5)} - {currentActivity.end_time?.slice(0,5)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-3xl bg-slate-50 p-7 text-center">
                            <p className="text-4xl font-bold xl:text-5xl">כרגע אין פעילות מתוזמנת</p>
                            <p className="mt-3 text-2xl text-slate-600">אפשר לנוח, לשתות משהו חם או להצטרף בהמשך.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </section>
                  <aside className="grid gap-3 content-start">
                    <Card className="rounded-[2rem] border-0 shadow-xl" style={{ backgroundColor: department.color + "15" }}>
                      <CardHeader className="pb-2 pt-6 px-7"><CardTitle className="text-3xl font-bold">בהמשך</CardTitle></CardHeader>
                      <CardContent className="space-y-3 pb-6 px-7">
                        {nextActivities.length > 0 ? nextActivities.slice(0, 2).map((activity, index) => {
                          const NextIcon = getActivityIcon(activity.category);
                          return (
                            <div key={activity.id} className="rounded-3xl bg-white p-5 shadow-sm">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <Badge variant="secondary" className="rounded-full px-4 py-1 text-xl">{index === 0 ? "עוד מעט" : "אחר כך"}</Badge>
                                <span className="text-2xl font-bold text-slate-600" dir="ltr">{activity.start_time?.slice(0,5)}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                                  <NextIcon className="h-7 w-7 text-slate-700" />
                                </div>
                                <div>
                                  <div className="text-3xl font-bold leading-tight">{activity.title}</div>
                                  {activity.location && <div className="mt-1 text-xl text-slate-600">{activity.location}</div>}
                                </div>
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="rounded-3xl bg-white p-5 text-2xl font-semibold text-slate-600">אין פעילויות נוספות להיום.</div>
                        )}
                      </CardContent>
                    </Card>

                    {displaySettings.show_announcements && (
                      <Card className="rounded-[2rem] border-0 bg-white shadow-xl">
                        <CardHeader className="pb-2 pt-6 px-7">
                          <CardTitle className="flex items-center gap-2 text-3xl font-bold">
                            <Megaphone className="h-8 w-8" />הודעות חשובות
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pb-6 px-7">
                          {announcements.length > 0 ? announcements.slice(0, 3).map((ann) => (
                            <div key={ann.id} className="rounded-3xl bg-slate-50 p-5">
                              <p className="text-2xl font-semibold leading-relaxed text-slate-800">{ann.content || ann.title}</p>
                            </div>
                          )) : (
                            <div className="rounded-3xl bg-slate-50 p-5 text-2xl text-slate-600">אין הודעות כרגע.</div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </aside>
                </main>
              </div>

              {/* תצוגה שבועית */}
              {displaySettings.show_weekly && (
                <div className="weekly-view h-full overflow-hidden" style={{ display: "none", flexDirection: "column" }}>
                  <div className="mb-2 flex items-center justify-between gap-4 px-2">
                    <h1 className="text-4xl font-bold text-slate-900 xl:text-5xl">לוח פעילויות שבועי</h1>
                    <div className="text-2xl font-semibold text-slate-600 xl:text-3xl">{department.name}</div>
                  </div>
                  {weeklyTopic && (
                    <Card className="mb-3 rounded-2xl border-0 bg-white shadow-lg">
                      <CardContent className="flex items-center gap-4 p-4">
                        {weeklyTopic.image_url && (
                          <img
                            src={weeklyTopic.image_url}
                            alt={weeklyTopic.title}
                            className="h-28 w-28 rounded-2xl object-cover shadow-sm shrink-0"
                          />
                        )}
                        <Badge className="rounded-full px-4 py-1 text-xl font-semibold text-white whitespace-nowrap" style={{ backgroundColor: department.color }}>נושא השבוע</Badge>
                        <div className="flex-1 min-w-0">
                          <h2 className="truncate text-3xl font-bold text-slate-800">{weeklyTopic.title}</h2>
                          {weeklyTopic.description && <p className="truncate text-xl text-slate-600 mt-1">{weeklyTopic.description}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <div className="grid flex-1 min-h-0 grid-cols-7 gap-2">
                    {dayOrder.map((dayCode) => {
                      const isToday = dayCode === todayCode;
                      const acts = weeklyActivities[dayCode] || [];
                      return (
                        <div key={dayCode} className="flex flex-col overflow-hidden rounded-2xl p-3 shadow-sm" style={{ backgroundColor: isToday ? department.color + "20" : "#ffffff", border: isToday ? `3px solid ${department.color}` : "2px solid #e2e8f0" }}>
                          <div className="text-center mb-3 shrink-0">
                            <div className="text-3xl font-bold xl:text-4xl" style={{ color: isToday ? department.color : "#334155" }}>{dayNames[dayCode]}</div>
                            <div className="text-base font-medium text-slate-500 mt-1 xl:text-lg" dir="ltr">{weekDates[dayCode]}</div>
                            {isToday && <Badge className="mt-1 text-base" style={{ backgroundColor: department.color }}>היום</Badge>}
                          </div>
                          <div className="flex-1 min-h-0 space-y-2 overflow-hidden">
                            {acts.length > 0 ? acts.map((act) => {
                              const Icon = getActivityIcon(act.category);
                              return (
                                <div key={act.id} className="rounded-lg p-2.5 bg-slate-50 shadow-sm">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Icon className="h-5 w-5 text-slate-500 shrink-0" />
                                    <span className="truncate text-base font-semibold text-slate-500">{getActivityLabel(act.category)}</span>
                                  </div>
                                  <div className="text-xl font-bold leading-tight text-slate-800 xl:text-2xl">{act.title}</div>
                                  <div className="text-base text-slate-500 mt-1" dir="ltr">{act.start_time?.slice(0,5)}{act.end_time && ` - ${act.end_time?.slice(0,5)}`}</div>
                                  {act.location && <div className="truncate text-base text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="h-4 w-4 shrink-0" />{act.location}</div>}
                                </div>
                              );
                            }) : (
                              <div className="text-center text-slate-400 text-base py-2">אין פעילויות</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Footer - Ticker */}
            {displaySettings.show_ticker && tickerItems.length > 0 && (
              <footer className="shrink-0">
                <Card className="overflow-hidden rounded-2xl border-0 bg-slate-900 text-white shadow-xl">
                  <CardContent className="flex items-center gap-3 p-0">
                    <Badge className="ms-4 shrink-0 rounded-full bg-white/15 px-4 py-1 text-lg text-white hover:bg-white/15">הודעות</Badge>
                    <div className="relative flex-1 overflow-hidden py-3">
                      <div className="ticker-track flex w-max items-center gap-8">
                        {[...tickerItems, ...tickerItems].map((item, index) => (
                          <div key={`${item.id}-${index}`} className="flex items-center gap-3 whitespace-nowrap">
                            <Megaphone className="h-6 w-6 text-emerald-300" />
                            <span className="text-2xl font-semibold xl:text-3xl">{item.message || item.content || item.title}</span>
                            <Separator orientation="vertical" className="mx-2 h-6 bg-white/20" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </footer>
            )}

          </div>
        </div>

        <style>{`
          .ticker-track { animation: tickerMove 28s linear infinite; }
          @keyframes tickerMove { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        `}</style>

        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var displaySeconds = ${displaySeconds};
            var mediaCount = ${allMediaSlides.length};
            var showMedia = ${displaySettings.show_media};
            var currentMediaIdx = 0;
            var departmentColor = '${department.color}';

            var normalScreen    = document.getElementById('normal-screen');
            var mediaFullscreen = document.getElementById('media-fullscreen');
            var daily  = document.querySelector('.daily-view');
            var weekly = document.querySelector('.weekly-view');

            var views = ${JSON.stringify(viewsList)};
            var currentViewIdx = 0;

            function showMediaSlide(idx) {
              for (var i = 0; i < mediaCount; i++) {
                var slide = document.getElementById('media-slide-' + i);
                if (slide) slide.style.display = (i === idx) ? 'block' : 'none';
              }
              for (var d = 0; d < mediaCount; d++) {
                var dot = document.getElementById('dot-' + d);
                if (dot) dot.style.backgroundColor = (d === idx) ? departmentColor : '#cbd5e1';
              }
            }

            function showView(viewName) {
              if (viewName === 'media' && showMedia && mediaCount > 0) {
                normalScreen.style.display = 'none';
                if (mediaFullscreen) {
                  mediaFullscreen.style.display = 'block';
                  showMediaSlide(currentMediaIdx);
                  currentMediaIdx = (currentMediaIdx + 1) % mediaCount;
                }
              } else {
                if (mediaFullscreen) mediaFullscreen.style.display = 'none';
                normalScreen.style.display = 'block';
                if (daily)  daily.style.display  = viewName === 'daily'  ? 'flex' : 'none';
                if (weekly) weekly.style.display = viewName === 'weekly' ? 'flex' : 'none';
                var header = document.querySelector('.daily-header');
                if (header) header.style.display = viewName === 'weekly' ? 'none' : 'grid';
              }
            }

            function nextStep() {
              currentViewIdx = (currentViewIdx + 1) % views.length;
              showView(views[currentViewIdx]);
            }

            showView(views[0] || 'daily');
            if (views.length > 1) setInterval(nextStep, displaySeconds);
          })();
        `}} />
      </div>
    </DisplayScreenWrapper>
  );
}