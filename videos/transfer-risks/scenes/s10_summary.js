// s10 — one wrong transfer, two injured: caregiver vs. patient.
import { caption, headline, sub } from '../lib/ui.js';
import { pill } from '../lib/photo.js';

function card(ctx, X, cx, img, fx, fy, s, title, col, k) {
  if (k <= 0) return;
  const W = 470, H = 470, y = 650;
  X.save(); X.globalAlpha *= k; X.translate(cx, y + (1 - ctx.E.cubicOut(k)) * 50);
  X.beginPath(); X.roundRect(-W / 2, -H / 2, W, H, 30); X.save(); X.clip();
  const im = ctx.img(img), sh = s; X.drawImage(im, 0, 0, 1080, 1920, -fx * sh, -fy * sh, 1080 * sh, 1920 * sh);
  const g = X.createLinearGradient(0, H / 2 - 150, 0, H / 2); g.addColorStop(0, 'rgba(11,22,38,0)'); g.addColorStop(1, 'rgba(11,22,38,0.95)'); X.fillStyle = g; X.fillRect(-W / 2, H / 2 - 150, W, 150);
  X.restore(); X.strokeStyle = col; X.lineWidth = 4; X.stroke();
  ctx.text(X, title, 0, H / 2 - 36, { family: 'display', weight: 700, size: 64, color: col, dir: 'rtl' });
  X.restore();
}

MOTION.scene({
  id: 's10',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const g = X.createRadialGradient(540, 900, 50, 540, 900, 1100); g.addColorStop(0, 'rgba(229,72,77,0.08)'); g.addColorStop(1, 'rgba(229,72,77,0)'); X.fillStyle = g; X.fillRect(0, 0, ctx.W, ctx.H);
    card(ctx, X, 800, 'backpain', 470, 820, 0.72, 'מטפל', P.acc, at(t, w('l23', 0).s - 0.2, w('l23', 1).e, 'expoOut'));
    card(ctx, X, 280, 'fall', 470, 950, 0.62, 'מטופל', P.clay, at(t, w('l24', 0).s - 0.2, w('l24', 1).e, 'expoOut'));
    const A = [['פריצת דיסק', 2], ['פגיעות בגב', 4], ['נפילה', 6]];
    A.forEach(([s, i], j) => pill(ctx, X, 800, 960 + j * 76, s, at(t, w('l23', i).s, w('l23', i).s + 0.45), { color: P.acc, size: 44 }));
    const B = [['קרעי עור', 2], ['שריטות', 4], ['המטומות', 5], ['שברים', 6], ['פגיעות טראומטיות', 7]];
    B.forEach(([s, i], j) => pill(ctx, X, 280, 960 + j * 70, s, at(t, w('l24', i).s, w('l24', i).s + 0.45), { color: P.clay, size: 40 }));
    headline(ctx, t, 'מעבר אחד לא נכון', 540, 250, { size: 96, maxWidth: 1000, times: [w('l22', 0).s, w('l22', 1).s, w('l22', 2).s, w('l22', 3).s] });
    headline(ctx, t, 'שני נפגעים', 540, 370, { size: 96, times: [w('l22', 4).s, w('l22', 5).s], color: P.clay });
    caption(ctx, t);
  },
});
