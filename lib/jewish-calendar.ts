// לוח עברי, חגים וזמני שבת — מחושבים מקומית, בלי שירות חיצוני ובלי אינטרנט.
// הלוח העברי לפי האלגוריתם הקלאסי (מולד ודחיות), השקיעה וצאת הכוכבים לפי נוסחאות NOAA.
// השעות מוצגות תמיד לפי שעון ישראל (כולל שעון קיץ).

/* ───────────── ערים ───────────── */

export type ShabbatCity = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** כמה דקות לפני השקיעה מדליקים נרות (המנהג המקומי) */
  candleMinutes: number;
};

export const SHABBAT_CITIES: ShabbatCity[] = [
  { id: "jerusalem", name: "ירושלים", lat: 31.769, lon: 35.216, candleMinutes: 40 },
  { id: "tel-aviv", name: "תל אביב", lat: 32.081, lon: 34.781, candleMinutes: 20 },
  { id: "haifa", name: "חיפה", lat: 32.794, lon: 34.989, candleMinutes: 30 },
  { id: "beer-sheva", name: "באר שבע", lat: 31.252, lon: 34.791, candleMinutes: 20 },
  { id: "petah-tikva", name: "פתח תקווה", lat: 32.087, lon: 34.886, candleMinutes: 20 },
  { id: "bnei-brak", name: "בני ברק", lat: 32.081, lon: 34.833, candleMinutes: 20 },
  { id: "ramat-gan", name: "רמת גן", lat: 32.068, lon: 34.824, candleMinutes: 20 },
  { id: "holon", name: "חולון", lat: 32.011, lon: 34.774, candleMinutes: 20 },
  { id: "rishon", name: "ראשון לציון", lat: 31.964, lon: 34.804, candleMinutes: 20 },
  { id: "rehovot", name: "רחובות", lat: 31.894, lon: 34.812, candleMinutes: 20 },
  { id: "ashdod", name: "אשדוד", lat: 31.804, lon: 34.655, candleMinutes: 20 },
  { id: "ashkelon", name: "אשקלון", lat: 31.669, lon: 34.571, candleMinutes: 20 },
  { id: "modiin", name: "מודיעין", lat: 31.899, lon: 35.010, candleMinutes: 20 },
  { id: "beit-shemesh", name: "בית שמש", lat: 31.747, lon: 34.989, candleMinutes: 30 },
  { id: "kfar-saba", name: "כפר סבא", lat: 32.175, lon: 34.907, candleMinutes: 20 },
  { id: "raanana", name: "רעננה", lat: 32.184, lon: 34.871, candleMinutes: 20 },
  { id: "herzliya", name: "הרצליה", lat: 32.166, lon: 34.843, candleMinutes: 20 },
  { id: "netanya", name: "נתניה", lat: 32.332, lon: 34.860, candleMinutes: 20 },
  { id: "hadera", name: "חדרה", lat: 32.434, lon: 34.919, candleMinutes: 20 },
  { id: "zichron", name: "זכרון יעקב", lat: 32.572, lon: 34.952, candleMinutes: 30 },
  { id: "afula", name: "עפולה", lat: 32.608, lon: 35.289, candleMinutes: 20 },
  { id: "nazareth-illit", name: "נוף הגליל", lat: 32.711, lon: 35.326, candleMinutes: 20 },
  { id: "karmiel", name: "כרמיאל", lat: 32.919, lon: 35.295, candleMinutes: 20 },
  { id: "nahariya", name: "נהריה", lat: 33.006, lon: 35.094, candleMinutes: 20 },
  { id: "tiberias", name: "טבריה", lat: 32.795, lon: 35.531, candleMinutes: 20 },
  { id: "safed", name: "צפת", lat: 32.965, lon: 35.496, candleMinutes: 20 },
  { id: "kiryat-shmona", name: "קריית שמונה", lat: 33.208, lon: 35.570, candleMinutes: 20 },
  { id: "eilat", name: "אילת", lat: 29.558, lon: 34.948, candleMinutes: 20 },
];

export const DEFAULT_SHABBAT_CITY = "tel-aviv";

export function shabbatCity(id: string | null | undefined): ShabbatCity {
  return SHABBAT_CITIES.find(c => c.id === id) ?? SHABBAT_CITIES.find(c => c.id === DEFAULT_SHABBAT_CITY)!;
}

/* ───────────── לוח עברי ───────────── */

// מספור חודשים: ניסן=1 ... אדר=12, אדר ב'=13 (בשנה מעוברת 12 = אדר א'). השנה מתחילה בתשרי=7.
const NISAN = 1, IYAR = 2, SIVAN = 3, AV = 5, ELUL = 6, TISHREI = 7, KISLEV = 9, TEVET = 10, SHVAT = 11, ADAR = 12, ADAR_II = 13;
const HEBREW_EPOCH = -1373427; // ימים מקובעים (R.D.)

const floor = Math.floor;
const mod = (a: number, b: number) => a - b * floor(a / b);

function isHebrewLeap(y: number) { return mod(7 * y + 1, 19) < 7; }
function lastMonthOfYear(y: number) { return isHebrewLeap(y) ? ADAR_II : ADAR; }

function elapsedDays(y: number) {
  const months = floor((235 * y - 234) / 19);
  const parts = 12084 + 13753 * months;
  const days = 29 * months + floor(parts / 25920);
  return mod(3 * (days + 1), 7) < 3 ? days + 1 : days;
}

const newYearCache = new Map<number, number>();
function newYear(y: number): number {
  const hit = newYearCache.get(y);
  if (hit !== undefined) return hit;
  const ny0 = elapsedDays(y - 1), ny1 = elapsedDays(y), ny2 = elapsedDays(y + 1);
  const delay = ny2 - ny1 === 356 ? 2 : ny1 - ny0 === 382 ? 1 : 0;
  const v = HEBREW_EPOCH + ny1 + delay;
  newYearCache.set(y, v);
  return v;
}

function daysInYear(y: number) { return newYear(y + 1) - newYear(y); }

function monthLength(y: number, m: number) {
  if (m === IYAR || m === 4 || m === ELUL || m === TEVET || m === ADAR_II) return 29;
  if (m === ADAR && !isHebrewLeap(y)) return 29;
  if (m === 8 && daysInYear(y) % 10 !== 5) return 29; // חשוון חסר
  if (m === KISLEV && daysInYear(y) % 10 === 3) return 29; // כסלו חסר
  return 30;
}

function fixedFromHebrew(y: number, m: number, d: number): number {
  let days = newYear(y) + d - 1;
  if (m < TISHREI) {
    for (let mm = TISHREI; mm <= lastMonthOfYear(y); mm++) days += monthLength(y, mm);
    for (let mm = NISAN; mm < m; mm++) days += monthLength(y, mm);
  } else {
    for (let mm = TISHREI; mm < m; mm++) days += monthLength(y, mm);
  }
  return days;
}

export type HebrewDate = { year: number; month: number; day: number };

function hebrewFromFixed(date: number): HebrewDate {
  let year = floor((date - HEBREW_EPOCH) / (35975351 / 98496));
  while (newYear(year + 1) <= date) year++;
  while (newYear(year) > date) year--;
  let month = date < fixedFromHebrew(year, NISAN, 1) ? TISHREI : NISAN;
  while (date > fixedFromHebrew(year, month, monthLength(year, month))) month++;
  return { year, month, day: date - fixedFromHebrew(year, month, 1) + 1 };
}

function isGregLeap(y: number) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

function fixedFromISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return 365 * (y - 1) + floor((y - 1) / 4) - floor((y - 1) / 100) + floor((y - 1) / 400)
    + floor((367 * m - 362) / 12) + (m <= 2 ? 0 : isGregLeap(y) ? -1 : -2) + d;
}

/** 0 = ראשון ... 6 = שבת */
const weekday = (fixed: number) => mod(fixed, 7);

export function hebrewDateOf(iso: string): HebrewDate {
  return hebrewFromFixed(fixedFromISO(iso));
}

/* ───────────── חגים ───────────── */

export type HolidayKind =
  | "yomtov"    // חג — אין פעילויות קבועות
  | "erev"      // ערב חג — אין פעילויות קבועות
  | "fast"      // צום / יום אבל — מציינים בלוח, הפעילויות כרגיל
  | "memorial"  // ימי זיכרון — מציינים בלוח, הפעילויות כרגיל
  | "minor";    // חול המועד, חנוכה, פורים... — מציינים בלוח, הפעילויות כרגיל

export type Holiday = { name: string; kind: HolidayKind };

/** כל החגים והמועדים של יום מסוים (לפי המנהג בארץ ישראל) */
export function holidaysOn(iso: string): Holiday[] {
  const fixed = fixedFromISO(iso);
  const { year, month: m, day: d } = hebrewFromFixed(fixed);
  const dow = weekday(fixed);
  const out: Holiday[] = [];
  const add = (name: string, kind: HolidayKind) => out.push({ name, kind });
  const adar = isHebrewLeap(year) ? ADAR_II : ADAR;

  // תשרי
  if (m === ELUL && d === 29) add("ערב ראש השנה", "erev");
  if (m === TISHREI) {
    if (d === 1 || d === 2) add("ראש השנה", "yomtov");
    if ((d === 3 && dow !== 6) || (d === 4 && dow === 0)) add("צום גדליה", "fast");
    if (d === 9) add("ערב יום כיפור", "erev");
    if (d === 10) add("יום כיפור", "yomtov");
    if (d === 14) add("ערב סוכות", "erev");
    if (d === 15) add("סוכות", "yomtov");
    if (d >= 16 && d <= 20) add("חול המועד סוכות", "minor");
    if (d === 21) add("הושענא רבה · ערב שמחת תורה", "erev");
    if (d === 22) add("שמחת תורה", "yomtov");
  }

  // חנוכה: 25 בכסלו ושמונה ימים
  if (m === KISLEV || m === TEVET) {
    const day = fixed - fixedFromHebrew(year, KISLEV, 25);
    if (day >= 0 && day < 8) add(`חנוכה · נר ${["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שביעי", "שמיני"][day]}`, "minor");
  }
  if (m === TEVET && d === 10) add("צום עשרה בטבת", "fast");
  if (m === SHVAT && d === 15) add("ט״ו בשבט", "minor");

  // פורים (תענית אסתר מוקדמת ליום חמישי כשי״ג באדר בשבת)
  if (m === adar) {
    if ((d === 13 && dow !== 6) || (d === 11 && dow === 4)) add("תענית אסתר", "fast");
    if (d === 14) add("פורים", "minor");
    if (d === 15) add("שושן פורים", "minor");
  }

  // ניסן
  if (m === NISAN) {
    if (d === 14) add("ערב פסח", "erev");
    if (d === 15) add("פסח", "yomtov");
    if (d >= 16 && d <= 19) add("חול המועד פסח", "minor");
    if (d === 20) add("ערב שביעי של פסח", "erev");
    if (d === 21) add("שביעי של פסח", "yomtov");
    // יום השואה: 27 בניסן, נדחה כשנופל ביום שישי או ראשון
    const shoah = fixedFromHebrew(year, NISAN, 27);
    const shoahDay = weekday(shoah) === 5 ? shoah - 1 : weekday(shoah) === 0 ? shoah + 1 : shoah;
    if (fixed === shoahDay) add("יום השואה", "memorial");
  }

  // יום הזיכרון ויום העצמאות: לפי הדחיות של חוק יום העצמאות
  if (m === NISAN || m === IYAR) {
    const iyar5 = fixedFromHebrew(year, IYAR, 5);
    const w = weekday(iyar5);
    const atzmaut = w === 5 ? iyar5 - 1 : w === 6 ? iyar5 - 2 : w === 1 ? iyar5 + 1 : iyar5;
    if (fixed === atzmaut - 1) add("יום הזיכרון", "memorial");
    if (fixed === atzmaut) add("יום העצמאות", "minor");
  }
  if (m === IYAR && d === 18) add("ל״ג בעומר", "minor");
  if (m === IYAR && d === 28) add("יום ירושלים", "minor");

  if (m === SIVAN && d === 5) add("ערב שבועות", "erev");
  if (m === SIVAN && d === 6) add("שבועות", "yomtov");

  // י״ז בתמוז ותשעה באב נדחים ליום ראשון כשהם בשבת
  if (m === 4 && ((d === 17 && dow !== 6) || (d === 18 && dow === 0))) add("צום י״ז בתמוז", "fast");
  if (m === AV && ((d === 9 && dow !== 6) || (d === 10 && dow === 0))) add("תשעה באב", "fast");
  if (m === AV && d === 15) add("ט״ו באב", "minor");

  return out;
}

/** חג (יום טוב) — יום שאסור בו במלאכה, כמו שבת */
function isYomTov(iso: string) { return holidaysOn(iso).some(h => h.kind === "yomtov"); }

/* ───────────── שקיעה וצאת הכוכבים (NOAA) ───────────── */

const rad = (x: number) => (x * Math.PI) / 180;
const deg = (x: number) => (x * 180) / Math.PI;

/** הרגע (UTC) שבו השמש בזווית zenith מעל קו הרוחב/אורך, אחר הצהריים של התאריך. null אם לא קורה */
function sunsetUTC(iso: string, lat: number, lon: number, zenith: number): Date | null {
  const [y, m, d] = iso.split("-").map(Number);
  const jd0 = Date.UTC(y, m - 1, d) / 86400000 + 2440587.5; // חצות UTC
  let minutes = 720 - 4 * lon; // ניחוש ראשון: הצהריים
  for (let i = 0; i < 3; i++) {
    const t = (jd0 + minutes / 1440 - 2451545) / 36525;
    const L0 = mod(280.46646 + t * (36000.76983 + t * 0.0003032), 360);
    const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    const C = Math.sin(rad(M)) * (1.914602 - t * (0.004817 + 0.000014 * t))
      + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * t) + Math.sin(rad(3 * M)) * 0.000289;
    const omega = 125.04 - 1934.136 * t;
    const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega));
    const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
    const eps = eps0 + 0.00256 * Math.cos(rad(omega));
    const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
    const yv = Math.tan(rad(eps / 2)) ** 2;
    const eqTime = 4 * deg(
      yv * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * yv * Math.sin(rad(M)) * Math.cos(2 * rad(L0))
      - 0.5 * yv * yv * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)),
    );
    const cosHA = Math.cos(rad(zenith)) / (Math.cos(rad(lat)) * Math.cos(rad(decl))) - Math.tan(rad(lat)) * Math.tan(rad(decl));
    if (cosHA < -1 || cosHA > 1) return null;
    const ha = deg(Math.acos(cosHA));
    minutes = 720 - 4 * lon - eqTime + 4 * ha;
  }
  return new Date((jd0 - 2440587.5) * 86400000 + minutes * 60000);
}

const hmFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** HH:MM בשעון ישראל. הדלקת נרות מעוגלת למטה (לא לאחר), צאת שבת למעלה */
function israelHM(date: Date, round: "down" | "up"): string {
  const ms = date.getTime();
  const minute = 60000;
  const rounded = round === "down" ? Math.floor(ms / minute) * minute : Math.ceil(ms / minute) * minute;
  return hmFormat.format(new Date(rounded));
}

/** שקיעה רגילה: מרכז השמש 0.833° מתחת לאופק */
const ZENITH_SUNSET = 90.833;
/** צאת הכוכבים: השמש 8.5° מתחת לאופק (כמו ב-Hebcal ובלוחות המקובלים) */
const ZENITH_TZEIT = 98.5;

export function candleLightingTime(iso: string, city: ShabbatCity): string | null {
  const s = sunsetUTC(iso, city.lat, city.lon, ZENITH_SUNSET);
  return s ? israelHM(new Date(s.getTime() - city.candleMinutes * 60000), "down") : null;
}

export function havdalahTime(iso: string, city: ShabbatCity): string | null {
  const s = sunsetUTC(iso, city.lat, city.lon, ZENITH_TZEIT);
  return s ? israelHM(s, "up") : null;
}

/* ───────────── מה מציינים בכל יום בלוח ───────────── */

export type SacredTime = {
  kind: "candles" | "havdalah";
  /** "כניסת שבת", "צאת החג", "כניסת שבת וחג"... */
  label: string;
  time: string;
};

export type DayInfo = {
  /** החגים והמועדים של היום (יכול להיות יותר מאחד) */
  holidays: Holiday[];
  /** חג או ערב חג: הפעילויות הקבועות לא מוצגות, רק מה שהוכנס ידנית לתאריך הזה */
  noRegularActivities: boolean;
  /** כניסת שבת/חג (ביום שלפני) או צאת שבת/חג (ביום האחרון) */
  sacred: SacredTime | null;
};

function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** מה לציין בלוח ביום מסוים: חגים, ערבי חג, כניסת שבת/חג וצאת שבת/חג */
export function dayInfo(iso: string, city: ShabbatCity): DayInfo {
  const holidays = holidaysOn(iso);
  const noRegularActivities = holidays.some(h => h.kind === "yomtov" || h.kind === "erev");

  const isShabbat = (x: string) => weekday(fixedFromISO(x)) === 6;
  const holyToday = isShabbat(iso) || isYomTov(iso);
  const tomorrow = addDays(iso, 1);
  const holyTomorrow = isShabbat(tomorrow) || isYomTov(tomorrow);

  const what = (x: string) => {
    const s = isShabbat(x), y = isYomTov(x);
    return s && y ? "שבת וחג" : s ? "שבת" : "החג";
  };

  let sacred: SacredTime | null = null;
  if (!holyToday && holyTomorrow) {
    const time = candleLightingTime(iso, city);
    if (time) sacred = { kind: "candles", label: "כניסת " + what(tomorrow), time };
  } else if (holyToday && !holyTomorrow) {
    const time = havdalahTime(iso, city);
    if (time) sacred = { kind: "havdalah", label: "צאת " + what(iso), time };
  }

  return { holidays, noRegularActivities, sacred };
}
