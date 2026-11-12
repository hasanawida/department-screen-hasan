// Service worker קטן למסכי הטלוויזיה (נרשם מ-lib/screen-recovery.ts).
//
// תפקיד יחיד: כשדף של מסך לא נטען (אין רשת, או שהשרת מחזיר שגיאה) — להציג דף המתנה
// עם שעון ותאריך שמנסה שוב לבד, במקום דף השגיאה של הדפדפן שנשאר תקוע עד שמישהו לוחץ "רענון".
// הוא לא שומר שום דבר במטמון, ולא נוגע בעמודי הניהול והצוות.

const SCREEN_PATHS = ["/display/", "/orientation/", "/physio", "/o/"];

const WAITING_PAGE = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>אשכולות אורנים</title>
<style>
  html, body { height: 100%; margin: 0; }
  body { background: #F6F2EE; color: #3F2F2D; font-family: system-ui, "Segoe UI", Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; overflow: hidden; }
  #time { font-size: 24vh; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
  #date { font-size: 6.5vh; margin-top: 4vh; }
  #note { font-size: 3vh; margin-top: 9vh; opacity: .55; }
</style>
</head>
<body>
<div id="time"></div>
<div id="date"></div>
<div id="note">המסך יתעדכן מעצמו בעוד רגע</div>
<script>
  function tick() {
    var now = new Date();
    try {
      document.getElementById("time").textContent = now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
      document.getElementById("date").textContent = now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" });
    } catch (e) {}
  }
  tick();
  setInterval(tick, 10000);
  var busy = false;
  function retry() {
    if (busy) return;
    busy = true;
    fetch("/api/health", { cache: "no-store" })
      .then(function (r) { busy = false; if (r.ok) location.reload(); })
      .catch(function () { busy = false; });
  }
  setInterval(retry, 20000);
</script>
</body>
</html>`;

const waiting = () => new Response(WAITING_PAGE, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
  // גרסאות ישנות של המערכת השתמשו ב-service worker אחר ששמר קבצים במטמון — מנקים מה שנשאר ממנו
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {}).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.mode !== "navigate") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !SCREEN_PATHS.some(p => url.pathname.startsWith(p))) return;
  event.respondWith(
    fetch(req).then(res => (res.status >= 500 ? waiting() : res)).catch(() => waiting()),
  );
});
