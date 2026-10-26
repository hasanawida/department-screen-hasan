// מצב המסכים: כל טלוויזיה מדווחת כל דקה (screen_ping), והניהול מציג מי מחובר ומרענן מרחוק.

export type ScreenKind = "department" | "orientation" | "physio";

export type DeviceInfo = {
  platform?: string;
  browser?: string;
  screen?: string;
  view?: string;
  portrait?: boolean;
};

export type ScreenDevice = {
  id: string;
  device_id: string;
  kind: ScreenKind;
  department_id: string | null;
  label: string | null;
  path: string | null;
  info: DeviceInfo | null;
  first_seen: string;
  loaded_at: string;
  last_seen: string;
  reload_requested_at: string | null;
};

/** מסך שדיווח בשלוש הדקות האחרונות נחשב מחובר (הדיווח הוא כל דקה) */
export const ONLINE_MS = 3 * 60 * 1000;
/** כל כמה זמן המסך מדווח */
export const PING_MS = 60 * 1000;

export const isOnline = (d: Pick<ScreenDevice, "last_seen">, now: number) => now - new Date(d.last_seen).getTime() < ONLINE_MS;

/** מזהה השורה: אותו מכשיר יכול להציג מסך מחלקה במחלקה אחת, ומסך התמצאות באחרת */
export const deviceRowId = (device: string, kind: ScreenKind, departmentId: string | null | undefined) =>
  `${device}_${kind}_${departmentId || "all"}`;

/** "לפני 3 דקות", "היום 07:42", "אתמול 18:10", "12.10 09:00" */
export function whenText(iso: string | null | undefined, now: number): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  if (diff < 60 * 1000) return "עכשיו";
  if (diff < 60 * 60 * 1000) {
    const m = Math.round(diff / 60000);
    return m === 1 ? "לפני דקה" : `לפני ${m} דקות`;
  }
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", ...o }).format(new Date(t));
  const dayKey = (x: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(x));
  const time = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
  if (dayKey(t) === dayKey(now)) return "היום " + time;
  if (dayKey(t) === dayKey(now - 24 * 60 * 60 * 1000)) return "אתמול " + time;
  return fmt({ day: "numeric", month: "numeric" }) + " " + time;
}

/** שם ברירת מחדל למכשיר: "Android TV · Fully Kiosk" */
export function deviceName(d: Pick<ScreenDevice, "label" | "info">): string {
  if (d.label?.trim()) return d.label.trim();
  const i = d.info ?? {};
  return [i.platform, i.browser].filter(Boolean).join(" · ") || "מסך";
}

/** מה המכשיר, לפי הדפדפן שלו (רק להצגה בניהול) */
export function readDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") return {};
  const ua = navigator.userAgent || "";
  const platform =
    /AFT|Fire ?TV/i.test(ua) ? "Fire TV"
    : /Android/i.test(ua) ? (/\bTV\b|GoogleTV|BRAVIA|SMART-TV|AndroidTV|Chromecast|MiBOX|SHIELD/i.test(ua) ? "Android TV" : "Android")
    : /Tizen/i.test(ua) ? "Samsung TV"
    : /Web0S|webOS/i.test(ua) ? "LG TV"
    : /CrOS/i.test(ua) ? "ChromeOS"
    : /Windows/i.test(ua) ? "Windows"
    : /iPhone|iPad/i.test(ua) ? "iPhone / iPad"
    : /Mac OS X/i.test(ua) ? "Mac"
    : /Linux/i.test(ua) ? (/aarch64|armv7|armv8|arm64/i.test(ua) ? "Raspberry Pi / Linux" : "Linux")
    : "";
  const browser =
    (window as unknown as { fully?: unknown }).fully || /Fully/i.test(ua) ? "Fully Kiosk"
    : /SamsungBrowser/i.test(ua) ? "Samsung Internet"
    : /Edg\//i.test(ua) ? "Edge"
    : /Silk/i.test(ua) ? "Silk"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Firefox/i.test(ua) ? "Firefox"
    : /Safari/i.test(ua) ? "Safari"
    : "";
  const w = window.innerWidth, h = window.innerHeight;
  return {
    platform,
    browser,
    screen: window.screen ? `${window.screen.width}×${window.screen.height}` : undefined,
    view: `${w}×${h}`,
    portrait: h > w,
  };
}
