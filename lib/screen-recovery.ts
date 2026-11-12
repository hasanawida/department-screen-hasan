// שמירה על מסכי הטלוויזיה דולקים 24/7: מרעננים וטוענים מחדש רק כשהשרת באמת זמין.
//
// בלי זה, רענון שנופל על הפסקת רשת קצרה מחליף את הלוח בדף שגיאה של הדפדפן (או בדף 404) —
// ודף כזה לא חוזר לבד, עד שמישהו ניגש לטלוויזיה עם שלט.

/** האם השרת והמסד עונים עכשיו */
export async function serverReady(timeoutMs = 8000): Promise<boolean> {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), timeoutMs);
  try {
    const res = await fetch("/api/health", { cache: "no-store", signal: ctrl?.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

let reloading = false;

/** טעינה מחדש של הדף — רק כשהשרת זמין. עד אז הלוח הקיים נשאר על המסך, ומנסים שוב כל חצי דקה */
export async function safeReload(retryMs = 30_000): Promise<void> {
  if (reloading) return;
  reloading = true;
  while (!(await serverReady())) await new Promise(resolve => setTimeout(resolve, retryMs));
  window.location.reload();
}

/**
 * דף המתנה (שעון ותאריך) במקום דף השגיאה של הדפדפן, כשאין רשת בדיוק בזמן טעינת הדף —
 * למשל אחרי הפסקת חשמל, כשהטלוויזיה עולה לפני הראוטר. ראו public/sw.js
 */
export function registerScreenWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
