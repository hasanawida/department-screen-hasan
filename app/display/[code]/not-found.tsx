import ScreenRecovering from "@/components/display/screen-recovering";

// אין מחלקה עם הקוד הזה (למשל אחרי שינוי קוד המחלקה בניהול). בודקים שוב כל שתי דקות
export default function NotFound() {
  return <ScreenRecovering note="המסך הזה לא מחובר למחלקה. בודקים בניהול: מחלקות ← קוד המחלקה" retrySeconds={120} />;
}
