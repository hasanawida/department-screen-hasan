
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sun, CloudSun, Sunset, MoonStar, Clock3, CalendarDays,
  Utensils, Users, Bell, ShieldCheck, Flower2, Brain,
} from "lucide-react";

type ActivityCategory = "meal" | "group" | "rest" | "therapy" | "free";

type Activity = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category?: ActivityCategory;
  isActive: boolean;
};

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
  display_orientation?: "landscape" | "portrait";
};

type OrientationProps = {
  departmentName: string;
  departmentNameAr?: string;
  departmentNameRu?: string;
  departmentNameEn?: string;
  departmentColor?: string;
  activities: Activity[];
  staffToday?: string[];
  menuToday?: string;
  announcementText?: string;
  weatherText?: string;
  settings?: Partial<OrientationSettings>;
  isPortrait?: boolean;
};

type Lang = "he" | "ar" | "ru" | "en";
type TimeOfDay = "morning" | "noon" | "evening" | "night";
type SeasonKey = "spring" | "summer" | "autumn" | "winter";

const HEBREW_MONTHS: Record<Lang, string[]> = {
  he: ["תשרי","חשון","כסלו","טבת","שבט","אדר","ניסן","אייר","סיון","תמוז","אב","אלול","אדר א׳","אדר ב׳"],
  ar: ["تشري","حشوان","كسليو","طيبت","شباط","أدار","نيسان","إيار","سيفان","تموز","آب","إيلول","أدار أ","أدار ب"],
  ru: ["Тишрей","Хешван","Кислев","Тевет","Шват","Адар","Нисан","Ияр","Сиван","Таммуз","Ав","Элул","Адар I","Адар II"],
  en: ["Tishrei","Cheshvan","Kislev","Tevet","Shevat","Adar","Nisan","Iyar","Sivan","Tammuz","Av","Elul","Adar I","Adar II"],
};

const CALMING: Record<Lang, string> = {
  he: "אתם נמצאים במקום בטוח, הצוות כאן איתכם.",
  ar: "أنتم في مكان آمن، الفريق هنا معكم.",
  ru: "Вы находитесь в безопасном месте, персонал здесь с вами.",
  en: "You are in a safe place, the staff is here with you.",
};

const WEATHER_MAP: Record<string, Record<Lang, string>> = {
  "נעים":  { he: "נעים",  ar: "لطيف",  ru: "Приятно",  en: "Pleasant" },
  "חם":    { he: "חם",    ar: "حار",   ru: "Жарко",    en: "Hot" },
  "קר":    { he: "קר",    ar: "بارد",  ru: "Холодно",  en: "Cold" },
  "גשום":  { he: "גשום",  ar: "ممطر",  ru: "Дождливо", en: "Rainy" },
  "מעונן": { he: "מעונן", ar: "غائم",  ru: "Облачно",  en: "Cloudy" },
};

const T: Record<Lang, {
  dir: "rtl" | "ltr";
  greetings: Record<TimeOfDay, string>;
  phases: Record<TimeOfDay, string>;
  fallback: Record<TimeOfDay, string>;
  days: string[];
  date: string; hebrewDate: string; season: string;
  seasons: Record<SeasonKey, string>;
  timeNow: string; now: string; next: string;
  noNext: string; noNextTime: string;
  dailyInfo: string; weather: string; staff: string; menu: string; noMenu: string;
  announcement: string; noAnnouncement: string;
  anchors: string; anchorsDesc: string;
  calmingTitle: string; at: string; noChange: string;
}> = {
  he: {
    dir: "rtl",
    greetings: { morning: "בוקר טוב", noon: "צהריים טובים", evening: "ערב טוב", night: "לילה טוב" },
    phases:    { morning: "עכשיו בוקר", noon: "עכשיו צהריים", evening: "עכשיו ערב", night: "עכשיו לילה" },
    fallback:  { morning: "כעת זמן בוקר רגוע", noon: "כעת זמן צהריים רגוע", evening: "כעת זמן ערב נעים", night: "כעת זמן לילה שקט" },
    days: ["יום ראשון","יום שני","יום שלישי","יום רביעי","יום חמישי","יום שישי","שבת"],
    date: "תאריך", hebrewDate: "תאריך עברי", season: "עונה",
    seasons: { spring: "אביב", summer: "קיץ", autumn: "סתיו", winter: "חורף" },
    timeNow: "השעה עכשיו", now: "עכשיו", next: "בהמשך הקרוב",
    noNext: "בהמשך היום זמן נעים ושקט", noNextTime: "אין שינוי מיוחד כרגע",
    dailyInfo: "מידע יומי", weather: "מזג אוויר", staff: "הצוות היום", menu: "בתפריט", noMenu: "לא הוזן תפריט",
    announcement: "הודעה חשובה", noAnnouncement: "אין הודעות מיוחדות להיום",
    anchors: "עוגנים קבועים", anchorsDesc: "מסך זה בנוי כדי לתת התמצאות ברורה, תחושת ביטחון, והכוונה למה שקורה עכשיו ובהמשך הקרוב.",
    calmingTitle: "מסר מרגיע", at: "בשעה", noChange: "היום ממשיך בצורה רגועה ונעימה",
  },
  ar: {
    dir: "rtl",
    greetings: { morning: "صباح الخير", noon: "نهار سعيد", evening: "مساء الخير", night: "تصبح على خير" },
    phases:    { morning: "الآن صباح", noon: "الآن ظهر", evening: "الآن مساء", night: "الآن ليل" },
    fallback:  { morning: "وقت صباح هادئ", noon: "وقت غداء هادئ", evening: "وقت مساء لطيف", night: "وقت ليل هادئ" },
    days: ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],
    date: "التاريخ", hebrewDate: "التاريخ العبري", season: "الفصل",
    seasons: { spring: "ربيع", summer: "صيف", autumn: "خريف", winter: "شتاء" },
    timeNow: "الساعة الآن", now: "الآن", next: "القادم قريباً",
    noNext: "بقية اليوم وقت هادئ وممتع", noNextTime: "لا تغيير خاص الآن",
    dailyInfo: "معلومات اليوم", weather: "الطقس", staff: "الفريق اليوم", menu: "القائمة", noMenu: "لم يُدخل قائمة",
    announcement: "إعلان مهم", noAnnouncement: "لا إعلانات خاصة اليوم",
    anchors: "ثوابت اليوم", anchorsDesc: "هذه الشاشة مصممة لتوفير التوجه الواضح والشعور بالأمان.",
    calmingTitle: "رسالة مطمئنة", at: "الساعة", noChange: "اليوم يسير بهدوء ولطف",
  },
  ru: {
    dir: "ltr",
    greetings: { morning: "Доброе утро", noon: "Добрый день", evening: "Добрый вечер", night: "Доброй ночи" },
    phases:    { morning: "Сейчас утро", noon: "Сейчас полдень", evening: "Сейчас вечер", night: "Сейчас ночь" },
    fallback:  { morning: "Спокойное утреннее время", noon: "Спокойное дневное время", evening: "Приятный вечер", night: "Тихая ночь" },
    days: ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"],
    date: "Дата", hebrewDate: "Еврейская дата", season: "Сезон",
    seasons: { spring: "Весна", summer: "Лето", autumn: "Осень", winter: "Зима" },
    timeNow: "Сейчас", now: "Сейчас", next: "Следующее",
    noNext: "Остаток дня — тихое время", noNextTime: "Изменений нет",
    dailyInfo: "Информация дня", weather: "Погода", staff: "Персонал сегодня", menu: "Меню", noMenu: "Меню не указано",
    announcement: "Важное объявление", noAnnouncement: "Нет особых объявлений на сегодня",
    anchors: "Ориентиры", anchorsDesc: "Этот экран создан для чёткой ориентации и ощущения безопасности.",
    calmingTitle: "Успокоительное сообщение", at: "в", noChange: "День проходит спокойно и приятно",
  },
  en: {
    dir: "ltr",
    greetings: { morning: "Good Morning", noon: "Good Afternoon", evening: "Good Evening", night: "Good Night" },
    phases:    { morning: "It's Morning", noon: "It's Noon", evening: "It's Evening", night: "It's Night" },
    fallback:  { morning: "Calm morning time", noon: "Calm afternoon time", evening: "Pleasant evening", night: "Quiet night" },
    days: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    date: "Date", hebrewDate: "Hebrew Date", season: "Season",
    seasons: { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" },
    timeNow: "Time Now", now: "Now", next: "Coming Up",
    noNext: "A peaceful rest of the day", noNextTime: "No changes soon",
    dailyInfo: "Daily Info", weather: "Weather", staff: "Staff Today", menu: "Menu", noMenu: "No menu entered",
    announcement: "Important Notice", noAnnouncement: "No special announcements today",
    anchors: "Daily Anchors", anchorsDesc: "This screen provides clear orientation, safety and guidance for what's happening now and next.",
    calmingTitle: "Calming Message", at: "at", noChange: "The day continues calmly and pleasantly",
  },
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
};

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function formatGregorianDate(date: Date, lang: Lang) {
  const locales: Record<Lang, string> = { he: "he-IL", ar: "ar-IL", ru: "ru-RU", en: "en-IL" };
  return new Intl.DateTimeFormat(locales[lang], { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "noon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function getSeason(month: number): SeasonKey {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function getHebrewDateText(date: Date, lang: Lang): string {
  const numericDay = new Intl.DateTimeFormat("he-u-ca-hebrew", { day: "numeric" }).format(date);
  const monthName  = new Intl.DateTimeFormat("he-u-ca-hebrew", { month: "long" }).format(date);
  const heYear     = new Intl.DateTimeFormat("en-u-ca-hebrew", { year: "numeric" }).format(date);
  const monthIndex = HEBREW_MONTHS.he.findIndex(m => monthName.includes(m));
  const translated = monthIndex >= 0 ? HEBREW_MONTHS[lang][monthIndex] : monthName;
  if (lang === "he") return numericDay + " ב" + monthName + " " + heYear;
  return numericDay + " " + translated + " " + heYear;
}

function TimeIcon({ tod }: { tod: TimeOfDay }) {
  const cls = "h-10 w-10";
  if (tod === "morning") return <Sun className={cls} />;
  if (tod === "noon")    return <CloudSun className={cls} />;
  if (tod === "evening") return <Sunset className={cls} />;
  return <MoonStar className={cls} />;
}

function ActivityIcon({ category }: { category?: ActivityCategory }) {
  const cls = "h-8 w-8";
  if (category === "meal")    return <Utensils className={cls} />;
  if (category === "group")   return <Brain className={cls} />;
  if (category === "therapy") return <ShieldCheck className={cls} />;
  return <Clock3 className={cls} />;
}

function InfoRow({ icon, label, value, color, small }: { icon: React.ReactNode; label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border bg-white/70 p-4 shadow-sm">
      <div className="mt-1" style={{ color }}>{icon}</div>
      <div className="flex-1">
        <div className={small ? "text-xl font-semibold text-slate-700" : "text-2xl font-semibold text-slate-700"}>{label}</div>
        <div className={small ? "mt-1 text-2xl font-bold text-slate-900" : "mt-1 text-3xl font-bold text-slate-900"}>{value}</div>
      </div>
    </div>
  );
}

export default function OrientationScreen({
  departmentName, departmentNameAr, departmentNameRu, departmentNameEn,
  departmentColor = "#10B981",
  activities, staffToday = [], menuToday, announcementText = "",
  weatherText = "נעים", settings: settingsProp,
  isPortrait: isPortraitProp,
}: OrientationProps) {
  const s = { ...DEFAULT_SETTINGS, ...settingsProp };
  const isPortrait = isPortraitProp ?? s.display_orientation === "portrait";

  const activeLangs = (s.languages.filter(l => ["he","ar","ru","en"].includes(l)) as Lang[]);
  const langs = activeLangs.length > 0 ? activeLangs : ["he" as Lang];

  const [now, setNow] = useState(new Date());
  const [langIndex, setLangIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (langs.length <= 1) return;
    const id = setInterval(() => setLangIndex(i => (i + 1) % langs.length), s.lang_interval_seconds * 1000);
    return () => clearInterval(id);
  }, [langs.length, s.lang_interval_seconds]);

  const lang = langs[langIndex] ?? "he";
  const t    = T[lang];

  const deptNameByLang: Record<Lang, string> = {
    he: departmentName,
    ar: departmentNameAr || departmentName,
    ru: departmentNameRu || departmentName,
    en: departmentNameEn || departmentName,
  };

  const currentTime    = formatTime(now);
  const tod            = getTimeOfDay(now.getHours());
  const dayName        = t.days[now.getDay()];
  const gregorianTxt   = formatGregorianDate(now, lang);
  const hebrewDateTxt  = getHebrewDateText(now, lang);
  const season         = t.seasons[getSeason(now.getMonth() + 1)];
  const nowMinutes     = now.getHours() * 60 + now.getMinutes();
  const weatherDisplay = WEATHER_MAP[weatherText]?.[lang] ?? weatherText;

  const currentActivity = useMemo(
    () => activities.find(a => a.isActive && nowMinutes >= toMinutes(a.startTime) && nowMinutes <= toMinutes(a.endTime)),
    [activities, nowMinutes],
  );
  const nextActivity = useMemo(
    () => activities.filter(a => a.isActive).find(a => toMinutes(a.startTime) > nowMinutes),
    [activities, nowMinutes],
  );

  const hasRightColumn = !isPortrait && (s.show_weather || s.show_staff || s.show_menu || s.show_announcement || s.show_anchors);
  const colorLight = departmentColor + "20";

  // גדלי טקסט — portrait קטן יותר
  const G = isPortrait ? {
    greeting: "text-5xl",
    day: "text-3xl",
    dept: "text-xl",
    time: "text-5xl",
    timeLabel: "text-lg",
    actMain: "text-4xl",
    actSub: "text-xl",
    phase: "text-xl",
    info: "text-2xl",
    calming: "text-2xl",
    pad: "p-5",
    badge: "px-4 py-2 text-xl",
  } : {
    greeting: "text-6xl md:text-7xl",
    day: "text-4xl md:text-5xl",
    dept: "text-2xl md:text-3xl",
    time: "text-6xl md:text-7xl",
    timeLabel: "text-2xl",
    actMain: "text-5xl md:text-6xl",
    actSub: "text-2xl",
    phase: "text-2xl",
    info: "text-3xl",
    calming: "text-3xl md:text-4xl",
    pad: "p-8 md:p-10",
    badge: "px-5 py-3 text-2xl",
  };

  const sideInfo = (
    <div className="space-y-4">
      {(s.show_weather || s.show_staff || s.show_menu) && (
        <Card className="rounded-[2rem] border-0 shadow-xl">
          <CardContent className={G.pad}>
            <div className={"mb-4 font-black text-slate-900 " + G.info}>{t.dailyInfo}</div>
            <div className="space-y-3">
              {s.show_weather && <InfoRow icon={<CloudSun className="h-6 w-6" />} label={t.weather} value={weatherDisplay} color={departmentColor} small={isPortrait} />}
              {s.show_staff && staffToday.length > 0 && <InfoRow icon={<Users className="h-6 w-6" />} label={t.staff} value={staffToday.join(", ")} color={departmentColor} small={isPortrait} />}
              {s.show_menu && <InfoRow icon={<Utensils className="h-6 w-6" />} label={t.menu} value={menuToday || t.noMenu} color={departmentColor} small={isPortrait} />}
            </div>
          </CardContent>
        </Card>
      )}
      {s.show_announcement && (
        <Card className="rounded-[2rem] border-0 shadow-xl">
          <CardContent className={G.pad}>
            <div className={"mb-4 flex items-center gap-3 text-amber-700"}>
              <Bell className="h-6 w-6" />
              <div className={"font-bold " + G.info}>{t.announcement}</div>
            </div>
            <div className={"rounded-2xl bg-amber-50 p-4 font-bold leading-relaxed text-slate-900 " + (isPortrait ? "text-xl" : "text-2xl")}>
              {announcementText || t.noAnnouncement}
            </div>
          </CardContent>
        </Card>
      )}
      {s.show_anchors && (
        <Card className="rounded-[2rem] border-0 shadow-xl">
          <CardContent className={G.pad}>
            <div className={"mb-3 font-black text-slate-900 " + G.info}>{t.anchors}</div>
            <div className="flex flex-wrap gap-2">
              <Badge className={"rounded-full text-white " + G.badge} style={{ backgroundColor: departmentColor }}>{dayName}</Badge>
              <Badge className={"rounded-full text-white " + G.badge} style={{ backgroundColor: departmentColor }}>{season}</Badge>
              <Badge className={"rounded-full text-white " + G.badge} style={{ backgroundColor: departmentColor }}>{currentTime}</Badge>
            </div>
            {!isPortrait && <p className={"mt-4 leading-relaxed text-slate-600 " + G.actSub}>{t.anchorsDesc}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div
      dir={t.dir}
      className="min-h-screen transition-all duration-700"
      style={{
        background: "linear-gradient(to bottom, " + departmentColor + "15, white, #f8fafc)",
        padding: isPortrait ? "16px" : "24px 32px",
      }}
    >
      {langs.length > 1 && (
        <div className="mb-3 flex justify-center gap-2">
          {langs.map((l, i) => (
            <div
              key={l}
              className={"h-2 rounded-full transition-all duration-500 " + (i === langIndex ? "w-6" : "w-2 bg-slate-300")}
              style={i === langIndex ? { backgroundColor: departmentColor } : {}}
            />
          ))}
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div className={isPortrait ? "flex flex-col gap-4" : "grid gap-6 " + (hasRightColumn ? "xl:grid-cols-[1.35fr_0.85fr]" : "")}>

          {/* עמודה ראשית */}
          <div className="space-y-4">

            {/* Header */}
            <Card className="rounded-[2rem] border-0 shadow-xl">
              <CardContent className={G.pad}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={"mb-3 inline-flex items-center gap-2 rounded-full font-semibold " + G.phase}
                      style={{ backgroundColor: colorLight, color: departmentColor, padding: "6px 14px" }}
                    >
                      <TimeIcon tod={tod} />
                      <span>{t.phases[tod]}</span>
                    </div>
                    <h1 className={"font-black tracking-tight text-slate-900 " + G.greeting}>{t.greetings[tod]}</h1>
                    <p className={"mt-2 font-bold text-slate-700 " + G.day}>{dayName}</p>
                    <p className={"mt-3 text-slate-600 " + G.dept}>{deptNameByLang[lang]}</p>
                  </div>
                  <div
                    className="rounded-[2rem] px-4 py-4 text-center shadow-inner flex-shrink-0"
                    style={{ backgroundColor: colorLight }}
                  >
                    <div className={"font-semibold text-slate-600 " + G.timeLabel}>{t.timeNow}</div>
                    <div className={"mt-1 font-black " + G.time} style={{ color: departmentColor }}>{currentTime}</div>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className={"grid gap-3 " + (s.show_hebrew_date ? "grid-cols-3" : "grid-cols-2")}>
                  <InfoRow icon={<CalendarDays className="h-6 w-6" />} label={t.date} value={gregorianTxt} color={departmentColor} small={isPortrait} />
                  {s.show_hebrew_date && (
                    <InfoRow icon={<Flower2 className="h-6 w-6" />} label={t.hebrewDate} value={hebrewDateTxt} color={departmentColor} small={isPortrait} />
                  )}
                  <InfoRow icon={<CloudSun className="h-6 w-6" />} label={t.season} value={season} color={departmentColor} small={isPortrait} />
                </div>
              </CardContent>
            </Card>

            {/* Activities */}
            {s.show_activities && (
              <div className={"grid gap-4 " + (isPortrait ? "grid-cols-1" : "lg:grid-cols-2")}>
                <Card className="rounded-[2rem] border-0 shadow-xl">
                  <CardContent className={G.pad}>
                    <div className={"mb-4 flex items-center gap-3 " + G.info} style={{ color: departmentColor }}>
                      <ActivityIcon category={currentActivity?.category} />
                      <span className="font-bold">{t.now}</span>
                    </div>
                    <div className={"font-black leading-tight text-slate-900 " + G.actMain}>
                      {currentActivity?.title ?? t.fallback[tod]}
                    </div>
                    <div className={"mt-3 text-slate-600 " + G.actSub}>
                      {currentActivity ? currentActivity.startTime + " - " + currentActivity.endTime : t.noChange}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-0 shadow-xl">
                  <CardContent className={G.pad}>
                    <div className={"mb-4 flex items-center gap-3 " + G.info} style={{ color: departmentColor }}>
                      <Clock3 className="h-8 w-8" />
                      <span className="font-bold">{t.next}</span>
                    </div>
                    <div className={"font-black leading-tight text-slate-900 " + (isPortrait ? "text-3xl" : "text-4xl md:text-5xl")}>
                      {nextActivity?.title ?? t.noNext}
                    </div>
                    <div className={"mt-3 text-slate-600 " + G.actSub}>
                      {nextActivity ? t.at + " " + nextActivity.startTime : t.noNextTime}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Calming */}
            {s.show_calming && (
              <Card className="rounded-[2rem] border-0 text-white shadow-xl" style={{ backgroundColor: departmentColor }}>
                <CardContent className={G.pad}>
                  <div className="flex items-start gap-4">
                    <ShieldCheck className="mt-1 h-8 w-8 shrink-0" />
                    <div>
                      <div className={"font-bold " + G.info}>{t.calmingTitle}</div>
                      <p className={"mt-3 leading-relaxed " + G.calming}>{CALMING[lang]}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* בתצוגת portrait — מידע נוסף בתחתית */}
            {isPortrait && (s.show_weather || s.show_staff || s.show_menu || s.show_announcement || s.show_anchors) && sideInfo}
          </div>

          {/* עמודה ימנית — רק ב-landscape */}
          {hasRightColumn && sideInfo}

        </div>
      </div>
    </div>
  );
}
