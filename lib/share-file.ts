// שמירה ושליחה של קובץ שנוצר בדפדפן: הורדה, העתקה של תמונה (להדבקה בוואטסאפ או במייל),
// ושליחה דרך תפריט השיתוף של הטלפון.

/** הורדה של הקובץ למכשיר (לתיקיית ההורדות) */
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * טלפון או טאבלט שיכול לשלוח את הקובץ דרך תפריט השיתוף של המכשיר (וואטסאפ, מייל...).
 * במחשב לא משתמשים בזה: שם תפריט השיתוף של Windows לא מכיר את וואטסאפ ברשת או Gmail.
 */
export function canShareFile(file: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  if (!window.matchMedia?.("(pointer: coarse)").matches) return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * העתקת תמונה (PNG) ללוח — כדי להדביק אותה בשיחה בוואטסאפ או במייל.
 * חייבים לקרוא לזה מיד בלחיצה (ספארי דורש), ולכן התמונה עצמה מגיעה כהבטחה.
 */
export async function copyImage(png: Promise<Blob>): Promise<boolean> {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    return true;
  } catch {
    return false;
  }
}

/** ⌘V במק, Ctrl+V בשאר */
export function pasteKeys(): string {
  const p = typeof navigator === "undefined" ? "" : navigator.platform || navigator.userAgent;
  return /Mac|iPhone|iPad/i.test(p) ? "⌘V" : "Ctrl+V";
}

/** שם קובץ בלי תווים שאסורים ב-Windows */
export function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

/** קישורים לפתיחת מייל חדש עם נושא וגוף מוכנים */
export function mailLinks(subject: string, body: string) {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return {
    app: `mailto:?subject=${s}&body=${b}`,
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&su=${s}&body=${b}`,
    outlook: `https://outlook.office.com/mail/deeplink/compose?subject=${s}&body=${b}`,
  };
}
