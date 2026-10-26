// קריאת יומן ICS (Outlook / Office 365) והפיכתו לרשימת מופעים בשבועות הקרובים.
// תומך באירועים חוזרים, חריגים (מופע שהוזז), תאריכים שבוטלו ומעבר שעון קיץ/חורף.

import ICAL from "ical.js";
import { TZ } from "./week";

export type IcsOccurrence = {
  uid: string;
  title: string;
  location: string;
  instructor: string;
  categories: string[];
  date: string;   // YYYY-MM-DD לפי שעון ישראל
  start: string;  // HH:MM
  end: string;    // HH:MM
};

const fmtDate = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const fmtTime = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

function hm(d: Date) {
  const s = fmtTime.format(d);
  return s.startsWith("24") ? "00" + s.slice(2) : s;
}

/** זמן "צף" (בלי אזור זמן) מתפרש כשעון ישראל */
function toInstant(t: InstanceType<typeof ICAL.Time>): Date {
  if (t.zone && t.zone.tzid !== "floating") return t.toJSDate();
  // צף: בונים את התאריך כאילו הוא בשעון ישראל
  const guess = new Date(Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second));
  const asIsrael = new Date(guess.toLocaleString("en-US", { timeZone: TZ }));
  const asUtc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (asIsrael.getTime() - asUtc.getTime()));
}

function text(comp: InstanceType<typeof ICAL.Component>, name: string): string {
  const v = comp.getFirstPropertyValue(name);
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function instructorOf(comp: InstanceType<typeof ICAL.Component>, description: string): string {
  // "מפעיל: אלדד" / "מדריכה - מרינה" בתיאור האירוע
  const m = description.match(/(?:מפעיל|מפעילה|מדריך|מדריכה|מנחה|מנחה\/ת)\s*[:\-–]\s*([^\n\r,;]+)/);
  if (m) return m[1].trim();
  // אחרת — המשתתף הראשון שאינו המארגן
  const organizer = String(comp.getFirstPropertyValue("organizer") ?? "").toLowerCase();
  for (const att of comp.getAllProperties("attendee")) {
    const cn = att.getParameter("cn");
    const addr = String(att.getFirstValue() ?? "").toLowerCase();
    if (cn && addr !== organizer) return String(cn).trim();
  }
  return "";
}

export function parseIcs(ics: string, fromISO: string, toISO: string): IcsOccurrence[] {
  const root = new ICAL.Component(ICAL.parse(ics));

  for (const tz of root.getAllSubcomponents("vtimezone")) {
    try { ICAL.TimezoneService.register(tz); } catch { /* אזור זמן לא תקין — מדלגים */ }
  }

  const rangeStart = new Date(fromISO + "T00:00:00Z").getTime() - 36 * 3600 * 1000;
  const rangeEnd = new Date(toISO + "T23:59:59Z").getTime() + 36 * 3600 * 1000;

  const vevents = root.getAllSubcomponents("vevent");
  const masters = new Map<string, InstanceType<typeof ICAL.Event>>();
  const exceptions: InstanceType<typeof ICAL.Component>[] = [];
  for (const ve of vevents) {
    if (ve.hasProperty("recurrence-id")) exceptions.push(ve);
    else {
      const ev = new ICAL.Event(ve);
      masters.set(ev.uid || Math.random().toString(36), ev);
    }
  }
  for (const ex of exceptions) {
    const uid = text(ex, "uid");
    const master = masters.get(uid);
    if (master) master.relateException(ex);
    else masters.set(uid + "#" + text(ex, "recurrence-id"), new ICAL.Event(ex));
  }

  const out: IcsOccurrence[] = [];
  const push = (
    item: InstanceType<typeof ICAL.Event>,
    startT: InstanceType<typeof ICAL.Time>,
    endT: InstanceType<typeof ICAL.Time>,
    key: string,
    master?: InstanceType<typeof ICAL.Event>,
  ) => {
    if (startT.isDate) return; // אירוע של יום שלם — לא פעילות עם שעה
    const comp = item.component;
    if (text(comp, "status").toUpperCase() === "CANCELLED") return;
    if (/^\s*(בוטל|מבוטל|canceled|cancelled)\s*[:\-]/i.test(item.summary || "")) return;
    const s = toInstant(startT);
    const e = toInstant(endT);
    const date = fmtDate.format(s);
    if (date < fromISO || date > toISO) return;
    const description = text(comp, "description");
    const cats: string[] = [];
    for (const p of comp.getAllProperties("categories")) for (const v of p.getValues()) cats.push(String(v).trim());
    out.push({
      uid: key,
      title: (item.summary || "").trim(),
      location: (item.location || master?.location || "").trim(),
      instructor: instructorOf(comp, description) || (master && master !== item ? instructorOf(master.component, text(master.component, "description")) : ""),
      categories: cats.filter(Boolean),
      date,
      start: hm(s),
      end: e.getTime() > s.getTime() ? hm(e) : "",
    });
  };

  for (const [uid, ev] of masters) {
    try {
      if (ev.isRecurring()) {
        const it = ev.iterator();
        let next: InstanceType<typeof ICAL.Time> | null;
        let guard = 0;
        while ((next = it.next()) && guard++ < 20000) {
          const t = toInstant(next).getTime();
          if (t > rangeEnd) break;
          if (t < rangeStart) continue;
          const d = ev.getOccurrenceDetails(next);
          push(d.item, d.startDate, d.endDate, uid + "@" + fmtDate.format(toInstant(d.recurrenceId)), ev);
        }
      } else {
        const t = toInstant(ev.startDate).getTime();
        if (t < rangeStart || t > rangeEnd) continue;
        push(ev, ev.startDate, ev.endDate, uid + "@" + fmtDate.format(toInstant(ev.startDate)));
      }
    } catch {
      // אירוע פגום — מדלגים עליו ולא מפילים את כל היומן
    }
  }

  out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return out;
}
