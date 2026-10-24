// s9 — one careless movement → bruise → hematoma → even a fracture (real thumbnails).
import { AN, caption, headline } from '../lib/ui.js';

function card(ctx, X, cx, cy, k, label, col, img, fx, fy, s, hot) {
  if (k <= 0) return;
  const W = 250, H = 420, sc = 0.94 + 0.06 * k + 0.05 * hot;
  X.save(); X.globalAlpha *= k; X.translate(cx, cy + (1 - k) * 50); X.scale(sc, sc);
  X.beginPath(); X.roundRect(-W / 2, -H / 2, W, H, 30); X.save(); X.clip();
  X.drawImage(ctx.img(img), 0, 0, 1080, 1920, -fx * s, -fy * s, 1080 * s, 1920 * s);
  const g = X.createLinearGradient(0, H / 2 - 150, 0, H / 2); g.addColorStop(0, 'rgba(11,22,38,0)'); g.addColorStop(1, 'rgba(11,22,38,0.95)'); X.fillStyle = g; X.fillRect(-W / 2, H / 2 - 150, W, 150);
  X.restore(); X.strokeStyle = col; X.lineWidth = 3 + 3 * hot; X.stroke();
  ctx.text(X, label, 0, H / 2 - 40, { family: 'display', weight: 700, size: 54, color: col, dir: 'rtl' });
  X.restore();
}

MOTION.scene({
  id: 's9',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const t1 = w('l21', 6).s, t2 = w('l21', 7).s, t3 = w('l21', 9).s, y = 960;
    const kl = at(t, t1, t3 + 0.3, 'cubicInOut');
    if (kl > 0) { ctx.drawPath(X, [[930, y + 270], [150, y + 270]], kl, { width: 6, color: P.clay }); if (kl > 0.97) { X.save(); X.fillStyle = P.clay; X.beginPath(); X.moveTo(120, y + 270); X.lineTo(156, y + 250); X.lineTo(156, y + 290); X.closePath(); X.fill(); X.restore(); } }
    card(ctx, X, 820, y, at(t, t1 - 0.1, t1 + 0.5, 'expoOut'), 'חבורה', AN.bruiseLight, 'bruises', 530, 1040, 0.62, 0);
    card(ctx, X, 540, y, at(t, t2 - 0.1, t2 + 0.5, 'expoOut'), 'המטומה', AN.bruiseLight, 'hem', 560, 980, 0.55, 0);
    card(ctx, X, 260, y, at(t, t3 - 0.1, t3 + 0.5, 'expoOut'), 'שבר', P.clay, 'spiral', 560, 970, 0.6, at(t, t3, t3 + 0.6));
    headline(ctx, t, 'תנועה אחת לא זהירה', 540, 320, { size: 96, maxWidth: 1000, times: [w('l21', 0).s, w('l21', 1).s, w('l21', 2).s, w('l21', 3).s] });
    headline(ctx, t, 'יכולה לגרום', 540, 450, { size: 70, family: 'body', weight: 700, times: [w('l21', 4).s, w('l21', 5).s], color: P.mut });
    caption(ctx, t);
  },
});
