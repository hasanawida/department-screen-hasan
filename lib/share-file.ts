// שמירה ושליחה של קובץ שנוצר בדפדפן: הורדה, העתקה של תמונה (להדבקה בוואטסאפ או במייל),
// ושליחה דרך תפריט השיתוף של המכשיר.
// אתר לא יכול לצרף קובץ בעצמו למייל או לוואטסאפ שהוא פותח (הגבלה של הדפדפנים) — הקובץ עובר רק דרך
// תפריט השיתוף של המכשיר, הדבקה (Ctrl+V) או צירוף ידני של קובץ שירד.

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

/** טלפון או טאבלט (מסך מגע) */
export function isPhone(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
}

/** ספארי, וכל דפדפן באייפון ובאייפד */
export function isApple(): boolean {
  return typeof navigator !== "undefined" && /apple/i.test(navigator.vendor || "");
}

/**
 * מה נשלח לתפריט השיתוף של המכשיר. באייפון ובספארי — רק הקובץ: כשיש איתו גם טקסט, וואטסאפ ואפליקציות נוספות
 * מוותרות על הקובץ ומקבלות רק את הטקסט (באג ידוע של WebKit). באנדרואיד ובמחשב — הקובץ עם ההודעה.
 */
export function fileShareData(file: File, text: string, title?: string): ShareData {
  if (isApple()) return { files: [file] };
  return title ? { files: [file], text, title } : { files: [file], text };
}

/** האם תפריט השיתוף של המכשיר (טלפון, Windows, מק) יכול לקבל את הקובץ */
export function canShareFiles(data: ShareData): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare(data);
  } catch {
    return false;
  }
}

/** קישורים שפותחים את וואטסאפ עם הודעה כתובה — בוחרים שיחה, וההודעה כבר בתיבה */
export function whatsappLinks(text: string) {
  const t = encodeURIComponent(text);
  return { web: `https://web.whatsapp.com/send?text=${t}`, app: `whatsapp://send?text=${t}` };
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
