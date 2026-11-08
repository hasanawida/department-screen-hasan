// הצבע של מסך ההתמצאות (כותרות קטנות, נקודת השפה, פס המסר המרגיע).
// ברירת המחדל — המרווה של אשכולות. "#10B981" היה פעם ברירת המחדל של טופס ההגדרות
// ונשמר גם כשלא בחרו צבע, ולכן נחשב "לא נבחר".

export const ORIENTATION_DEFAULT_COLOR = "#5A826F";
const LEGACY_DEFAULT = "#10b981";

export function orientationColor(c: string | null | undefined): string {
  const v = String(c ?? "").trim();
  if (!/^#[0-9a-f]{6}$/i.test(v) || v.toLowerCase() === LEGACY_DEFAULT) return ORIENTATION_DEFAULT_COLOR;
  return v;
}

/** גוון בהיר של הצבע (לרקע הלילה): ערבוב עם לבן */
export function orientationTint(hex: string, keep = 0.16): string {
  const v = orientationColor(hex).slice(1);
  const ch = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
  const mixed = ch.map(c => Math.round(255 - (255 - c) * keep));
  return "#" + mixed.map(c => c.toString(16).padStart(2, "0")).join("");
}
