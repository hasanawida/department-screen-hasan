// אות למסכי הטלוויזיה: "הנתונים השתנו — לרענן". נשלח בשידור (Broadcast) של Supabase Realtime,
// ולכן לא תלוי בהגדרות השידור של הטבלאות במסד. המסך מרענן רק את הנתונים (בלי לטעון מחדש את הדף),
// כך שזה מתאים גם לשינויים ששייכים לכל המחלקות יחד — התפריט, התמונות של המנות והפעילויות.
// (מסך המחלקה מאזין גם לשינויים בטבלת התפריט עצמה — ראו display-runtime.)

import type { SupabaseClient } from "@supabase/supabase-js";

export const SCREENS_CHANNEL = "screens";
export const SCREENS_REFRESH = "refresh";

/** מה שמגיע עם האות: השבועות של התפריט שהשתנו. בלי — כל המסכים מתרעננים */
export type ScreensRefreshPayload = { weeks?: string[] };

// null = שינוי כללי (לא רק תפריט של שבועות מסוימים)
let pendingWeeks: Set<string> | null = new Set();
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * אחרי שמירה: אות לכל המסכים לרענן את הנתונים. כמה שמירות ברצף (הקלדה) — אות אחד, שנייה אחרי האחרונה.
 * weeks — כשהשתנה התפריט של שבועות מסוימים: מסך שמציג שבוע אחר לא מתרענן לחינם.
 */
export function signalScreens(supabase: SupabaseClient, weeks?: string[]) {
  if (!weeks) pendingWeeks = null;
  else if (pendingWeeks) for (const w of weeks) pendingWeeks.add(w);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const payload: ScreensRefreshPayload = pendingWeeks ? { weeks: Array.from(pendingWeeks) } : {};
    pendingWeeks = new Set();
    timer = null;
    try {
      const channel = supabase.channel(SCREENS_CHANNEL);
      // בלי להצטרף לערוץ — האות נשלח בבקשה רגילה לשרת, ומשם לכל המסכים שמאזינים
      channel.send({ type: "broadcast", event: SCREENS_REFRESH, payload })
        .catch(() => "error")
        .then(() => supabase.removeChannel(channel))
        .catch(() => undefined);
    } catch {
      /* המסכים יתעדכנו ברענון הקבוע שלהם */
    }
  }, 1000);
}
