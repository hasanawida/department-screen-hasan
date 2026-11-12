import ScreenRecovering from "@/components/display/screen-recovering";

// אין מחלקה עם הקוד שבכתובת (‎/o/קוד). בודקים שוב כל שתי דקות
export default function NotFound() {
  return <ScreenRecovering note="אין מחלקה עם הקוד שבכתובת. בודקים בניהול: מסכי התמצאות ← הכתובת של המסך" retrySeconds={120} />;
}
