// קוד המחלקה הוא חלק מהכתובת של המסך שלה: ‎/display/<קוד>‎ ו-‎/o/<קוד>‎.
// לכן הוא חייב להיות קל להקלדה בשלט של טלוויזיה: אותיות באנגלית, ספרות ומקף.

/** מה שהוקלד ← קוד: בלי רווחים בקצוות, ורווחים באמצע הופכים למקף */
export function cleanDepartmentCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "-");
}

/** מה לא בסדר בקוד (הודעה בעברית), או null אם הוא תקין */
export function departmentCodeProblem(code: string): string | null {
  if (!code) return "צריך קוד למחלקה";
  if (!/^[A-Za-z0-9-]+$/.test(code)) return "הקוד יכול לכלול רק אותיות באנגלית, ספרות ומקף (הוא חלק מהכתובת של המסך)";
  if (code.length < 2 || code.length > 30) return "הקוד צריך להיות באורך 2 עד 30 תווים";
  return null;
}

/** הודעה בעברית לשגיאות הנפוצות של המסד בשמירה/מחיקה של מחלקה */
export function departmentErrorText(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "כבר יש מחלקה עם הקוד הזה. בוחרים קוד אחר.";
  if (error.code === "23503") return "אי אפשר למחוק מחלקה שיש בה דיירים. מעבירים קודם את הדיירים למחלקה אחרת (בעמוד הדיירים), ואז מוחקים.";
  return error.message || "שגיאה";
}
