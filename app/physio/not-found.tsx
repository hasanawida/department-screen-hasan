import ScreenRecovering from "@/components/display/screen-recovering";

// אין מחלקה עם הקוד שבכתובת (‎/physio?dept=קוד). בודקים שוב כל שתי דקות
export default function NotFound() {
  return <ScreenRecovering note="אין מחלקה עם הקוד שבכתובת. פותחים את המסך מחדש מעמוד הפיזיותרפיה בניהול" retrySeconds={120} />;
}
