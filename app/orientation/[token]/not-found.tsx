import ScreenRecovering from "@/components/display/screen-recovering";

// אין מחלקה עם הקישור הזה. בודקים שוב כל שתי דקות
export default function NotFound() {
  return <ScreenRecovering note="המסך הזה לא מחובר למחלקה. פותחים אותו מחדש מעמוד מסכי ההתמצאות בניהול" retrySeconds={120} />;
}
