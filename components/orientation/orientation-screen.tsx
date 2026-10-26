"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Sun, CloudSun, Sunset, MoonStar, HeartHandshake,
  Moon, CloudMoon, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning,
} from "lucide-react";
import { EshkolotLogo, BRAND } from "./eshkolot-logo";
import styles from "./orientation-screen.module.css";

/* ───────────── טיפוסים ───────────── */

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

export type WeatherNow = { temp: number; code: number; isDay: boolean };

type OrientationProps = {
  departmentName: string;
  departmentNameAr?: string;
  departmentNameRu?: string;
  departmentNameEn?: string;
  departmentColor?: string;
  activities?: unknown[];
  settings?: Partial<OrientationSettings>;
  isPortrait?: boolean;
  /** אם לא מועבר — המסך מביא לבד את מזג האוויר בגדרה */
  weather?: WeatherNow | null;
};

type Lang = "he" | "ar" | "ru" | "en";
type TimeOfDay = "morning" | "noon" | "evening" | "night";
type SeasonKey = "spring" | "summer" | "autumn" | "winter";
type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

/* ───────────── מיקום (מזג אוויר) ───────────── */

// אשכולות אורנים, גדרה
const LOCATION = { lat: 31.8136, lon: 34.7792 };
const WEATHER_REFRESH_MS = 20 * 60 * 1000;

/* ───────────── תרגומים ───────────── */

type Copy = {
  dir: "rtl" | "ltr";
  department: string;
  now: string;
  weather: string;
  tod: Record<TimeOfDay, string>;
  day: string;
  time: string;
  date: string;
  month: string;
  year: string;
  season: string;
  days: string[];
  seasons: Record<SeasonKey, string>;
  weatherKinds: Record<WeatherKind, string>;
  calming: string;
};

const T: Record<Lang, Copy> = {
  he: {
    dir: "rtl",
    department: "מחלקה",
    now: "עכשיו",
    weather: "מזג אוויר",
    tod: { morning: "בוקר", noon: "צהריים", evening: "ערב", night: "לילה" },
    day: "יום",
    time: "שעה",
    date: "תאריך",
    month: "חודש",
    year: "שנה",
    season: "עונה",
    days: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
    seasons: { spring: "אביב", summer: "קיץ", autumn: "סתיו", winter: "חורף" },
    weatherKinds: { clear: "בהיר", partly: "מעונן חלקית", cloudy: "מעונן", fog: "ערפל", drizzle: "טפטוף", rain: "גשם", snow: "שלג", storm: "סופת רעמים" },
    calming: "אתם נמצאים במקום בטוח. הצוות כאן איתכם.",
  },
  ar: {
    dir: "rtl",
    department: "القسم",
    now: "الآن",
    weather: "الطقس",
    tod: { morning: "الصباح", noon: "الظهر", evening: "المساء", night: "الليل" },
    day: "اليوم",
    time: "الساعة",
    date: "التاريخ",
    month: "الشهر",
    year: "السنة",
    season: "الفصل",
    days: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    seasons: { spring: "الربيع", summer: "الصيف", autumn: "الخريف", winter: "الشتاء" },
    weatherKinds: { clear: "صافٍ", partly: "غائم جزئياً", cloudy: "غائم", fog: "ضباب", drizzle: "رذاذ", rain: "ماطر", snow: "ثلج", storm: "عاصفة رعدية" },
    calming: "أنتم في مكان آمن. الطاقم هنا معكم.",
  },
  ru: {
    dir: "ltr",
    department: "Отделение",
    now: "Сейчас",
    weather: "Погода",
    tod: { morning: "Утро", noon: "День", evening: "Вечер", night: "Ночь" },
    day: "День",
    time: "Время",
    date: "Число",
    month: "Месяц",
    year: "Год",
    season: "Время года",
    days: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    seasons: { spring: "Весна", summer: "Лето", autumn: "Осень", winter: "Зима" },
    weatherKinds: { clear: "Ясно", partly: "Переменная облачность", cloudy: "Облачно", fog: "Туман", drizzle: "Морось", rain: "Дождь", snow: "Снег", storm: "Гроза" },
    calming: "Вы в безопасном месте. Персонал рядом с вами.",
  },
  en: {
    dir: "ltr",
    department: "Department",
    now: "Now",
    weather: "Weather",
    tod: { morning: "Morning", noon: "Afternoon", evening: "Evening", night: "Night" },
    day: "Day",
    time: "Time",
    date: "Date",
    month: "Month",
    year: "Year",
    season: "Season",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    seasons: { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" },
    weatherKinds: { clear: "Clear", partly: "Partly cloudy", cloudy: "Cloudy", fog: "Fog", drizzle: "Drizzle", rain: "Rain", snow: "Snow", storm: "Thunderstorm" },
    calming: "You are in a safe place. The staff are here with you.",
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

/* ───────────── עזרים ───────────── */

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

function formatClock(date: Date) {
  return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

function monthName(date: Date, lang: Lang) {
  const locales: Record<Lang, string> = { he: "he-IL", ar: "ar-u-nu-latn", ru: "ru-RU", en: "en-GB" };
  const name = new Intl.DateTimeFormat(locales[lang], { month: "long" }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// קודי מזג אוויר של WMO (Open-Meteo)
function weatherKind(code: number): WeatherKind {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

function WeatherIcon({ kind, isDay, className }: { kind: WeatherKind; isDay: boolean; className?: string }) {
  const p = { className, "aria-hidden": true } as const;
  switch (kind) {
    case "clear": return isDay ? <Sun {...p} /> : <Moon {...p} />;
    case "partly": return isDay ? <CloudSun {...p} /> : <CloudMoon {...p} />;
    case "fog": return <CloudFog {...p} />;
    case "drizzle": return <CloudDrizzle {...p} />;
    case "rain": return <CloudRain {...p} />;
    case "snow": return <CloudSnow {...p} />;
    case "storm": return <CloudLightning {...p} />;
    default: return <Cloud {...p} />;
  }
}

function useWeather(enabled: boolean, override: WeatherNow | null | undefined) {
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const useOverride = override !== undefined;

  useEffect(() => {
    if (useOverride || !enabled) return;
    let cancelled = false;
    async function load() {
      try {
        const url =
          "https://api.open-meteo.com/v1/forecast?latitude=" + LOCATION.lat +
          "&longitude=" + LOCATION.lon +
          "&current=temperature_2m,weather_code,is_day&timezone=Asia%2FJerusalem";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const c = json?.current;
        if (!cancelled && c && typeof c.temperature_2m === "number") {
          setWeather({ temp: Math.round(c.temperature_2m), code: Number(c.weather_code) || 0, isDay: c.is_day === 1 });
        }
      } catch {
        // בלי אינטרנט — פשוט לא מציגים מזג אוויר (לא מציגים מידע לא נכון)
      }
    }
    load();
    const id = setInterval(load, WEATHER_REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [enabled, useOverride]);

  return useOverride ? override : weather;
}

function useViewportPortrait() {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return portrait;
}

/** טקסט בשורה אחת שמקטין את עצמו אם הוא ארוך מהמקום */
function FitText({ base, className, children, watch }: { base: number; className?: string; children: React.ReactNode; watch: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => { setScale(1); }, [watch, base]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.scrollWidth > el.clientWidth + 1) {
      setScale(s => Math.max(0.4, s * (el.clientWidth / el.scrollWidth) * 0.98));
    }
  });

  return (
    <span ref={ref} className={styles.fit + (className ? " " + className : "")} style={{ "--fs": base * scale } as React.CSSProperties}>
      {children}
    </span>
  );
}

/* ───────────── המסך ───────────── */

export default function OrientationScreen({
  departmentName, departmentNameAr, departmentNameRu, departmentNameEn,
  departmentColor,
  settings: settingsProp,
  isPortrait: isPortraitProp,
  weather: weatherProp,
}: OrientationProps) {
  const s = { ...DEFAULT_SETTINGS, ...settingsProp };
  const viewportPortrait = useViewportPortrait();
  // לאורך: אם נבחר בהגדרות, או אם המסך עצמו עומד לאורך
  const portrait = !!isPortraitProp || s.display_orientation === "portrait" || viewportPortrait;
  const layout = portrait ? "portrait" : "landscape";

  const langs = useMemo(() => {
    const valid = (s.languages ?? []).filter((l): l is Lang => ["he", "ar", "ru", "en"].includes(l));
    return valid.length > 0 ? valid : (["he"] as Lang[]);
  }, [s.languages]);

  // השעון מתחיל רק בדפדפן — כך השעה תמיד לפי השעון של המסך עצמו
  const [now, setNow] = useState<Date | null>(null);
  const [langIndex, setLangIndex] = useState(0);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => {
      setNow(prev => {
        const d = new Date();
        return prev && prev.getMinutes() === d.getMinutes() && prev.getHours() === d.getHours() ? prev : d;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setLangIndex(0);
    if (langs.length <= 1) return;
    const seconds = Math.max(5, Number(s.lang_interval_seconds) || 20);
    const id = setInterval(() => setLangIndex(i => (i + 1) % langs.length), seconds * 1000);
    return () => clearInterval(id);
  }, [langs.length, s.lang_interval_seconds]);

  const weather = useWeather(s.show_weather, weatherProp);

  const lang: Lang = langs[langIndex % langs.length] ?? "he";
  const t = T[lang];

  const deptNameByLang: Record<Lang, string> = {
    he: departmentName,
    ar: departmentNameAr || departmentName,
    ru: departmentNameRu || departmentName,
    en: departmentNameEn || departmentName,
  };

  /* ── התאמה למסך: אם משהו גולש לגובה — מקטינים הכול יחד, בלי גלילה ── */
  const mainRef = useRef<HTMLElement>(null);
  const [fit, setFit] = useState(1);
  const minuteKey = now ? now.getHours() * 60 + now.getMinutes() : -1;
  const fitKey = lang + "|" + layout + "|" + minuteKey + "|" + (weather ? weather.temp + "/" + weather.code : "-");

  useLayoutEffect(() => { setFit(1); }, [fitKey]);
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    let over = main.scrollHeight - main.clientHeight;
    for (const child of Array.from(main.children) as HTMLElement[]) {
      over = Math.max(over, child.scrollHeight - child.clientHeight);
    }
    if (over > 1) {
      const ratio = main.clientHeight / (main.clientHeight + over);
      setFit(f => Math.max(0.7, f * ratio * 0.99));
    }
  });

  const stageStyle = { "--fit": fit } as React.CSSProperties;

  if (!now) {
    return (
      <div className={styles.stage} data-layout={layout} style={stageStyle} dir="rtl">
        <EshkolotLogo className={styles.logo} />
      </div>
    );
  }

  const tod = getTimeOfDay(now.getHours());
  const TodIcon = tod === "morning" ? Sun : tod === "noon" ? CloudSun : tod === "evening" ? Sunset : MoonStar;
  const kind = weather ? weatherKind(weather.code) : null;

  const rows: { key: string; label: string; value: string; ltr?: boolean }[] = [
    { key: "day", label: t.day, value: t.days[now.getDay()] },
    { key: "time", label: t.time, value: formatClock(now), ltr: true },
    { key: "date", label: t.date, value: String(now.getDate()), ltr: true },
    { key: "month", label: t.month, value: monthName(now, lang) },
    { key: "year", label: t.year, value: String(now.getFullYear()), ltr: true },
    { key: "season", label: t.season, value: t.seasons[getSeason(now.getMonth() + 1)] },
  ];

  // עמודת הכותרות (יום, שעה, תאריך…) ברוחב של הכותרת הארוכה בשפה הנוכחית
  const labelChars = Math.max(...rows.map(r => r.label.length));

  const rowSize = portrait ? 11.5 : 9.5;
  const topSize = portrait ? 7.4 : 6.2;
  const showWeather = s.show_weather && !!weather && !!kind;

  return (
    <div className={styles.stage} data-layout={layout} style={stageStyle} dir="rtl">
      <div className={styles.canvas}>

        {/* לוגו ושם המחלקה */}
        <header className={styles.header}>
          <EshkolotLogo className={styles.logo} />
          <span className={styles.headerRule} aria-hidden="true" />
          <div className={styles.dept} dir={t.dir} lang={lang}>
            <span className={styles.label}>{t.department}</span>
            <span className={styles.deptValue}>
              <span className={styles.deptDot} style={{ backgroundColor: departmentColor || BRAND.sage }} aria-hidden="true" />
              {deptNameByLang[lang]}
            </span>
          </div>
          {langs.length > 1 && (
            <div className={styles.langDots} aria-hidden="true">
              {langs.map((l, i) => (
                <span key={l} className={styles.langDot + (i === langIndex % langs.length ? " " + styles.langDotOn : "")} />
              ))}
            </div>
          )}
        </header>

        <main key={lang} ref={mainRef} className={styles.main} dir={t.dir} lang={lang}>

          {/* למעלה: בוקר / צהריים / ערב / לילה  +  מזג אוויר */}
          {/* המיקום של כל חלק קבוע (מימין לשמאל) — רק הטקסט מתחלף בין השפות */}
          <section className={styles.top} data-tod={tod} data-single={showWeather ? undefined : ""} dir="rtl">
            <div className={styles.topCell} dir={t.dir}>
              <TodIcon className={styles.todIcon} aria-hidden="true" />
              <div className={styles.topText}>
                <span className={styles.label}>{t.now}</span>
                <FitText base={topSize} className={styles.value + " " + styles.topValue} watch={lang + tod + layout}>
                  {t.tod[tod]}
                </FitText>
              </div>
            </div>

            {showWeather && weather && kind && (
              <div className={styles.topCell} dir={t.dir}>
                <WeatherIcon kind={kind} isDay={weather.isDay} className={styles.weatherIcon} />
                <div className={styles.topText}>
                  <span className={styles.label}>{t.weather}</span>
                  <FitText base={topSize} className={styles.value + " " + styles.topValue} watch={lang + weather.temp + kind + layout}>
                    <span className={styles.temp}>{weather.temp}°</span>
                    <span className={styles.weatherDesc}>{t.weatherKinds[kind]}</span>
                  </FitText>
                </div>
              </div>
            )}
          </section>

          {/* לוח ההתמצאות */}
          <dl className={styles.board} dir="rtl" style={{ "--lw": labelChars } as React.CSSProperties}>
            {rows.map(row => (
              <div key={row.key} className={styles.row} dir={t.dir}>
                <dt className={styles.label}>{row.label}</dt>
                <dd className={styles.rowValue}>
                  <FitText base={rowSize} className={styles.value} watch={lang + row.value + layout}>
                    {row.ltr ? <bdi dir="ltr">{row.value}</bdi> : row.value}
                  </FitText>
                </dd>
              </div>
            ))}
          </dl>
        </main>

        {s.show_calming && (
          <footer className={styles.calm} dir={t.dir} lang={lang}>
            <HeartHandshake aria-hidden="true" />
            <span>{t.calming}</span>
          </footer>
        )}
      </div>
    </div>
  );
}
