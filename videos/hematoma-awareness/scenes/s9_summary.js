// s9 — one careless movement → bruise → hematoma → even a fracture.
import { AN, caption, headline, bg } from '../lib/ui.js';
import { drawBruise } from '../lib/arm.js';

function card(ctx, X, cx, cy, k, label, col, icon, hot) {
  if (k <= 0) return;
  const W = 250, H = 420, s = 0.94 + 0.06 * k + 0.05 * hot;
  X.save(); X.globalAlpha *= k; X.translate(cx, cy + (1 - k) * 50); X.scale(s, s);
  X.fillStyle = 'rgba(18,34,56,0.92)'; X.beginPath(); X.roundRect(-W / 2, -H / 2, W, H, 32); X.fill();
  X.strokeStyle = col; X.lineWidth = 3 + 3 * hot; X.stroke();
  X.save(); X.translate(0, -50); icon(X); X.restore();
  ctx.text(X, label, 0, 140, { family: 'display', weight: 700, size: 54, color: col, dir: 'rtl' });
  X.restore();
}

MOTION.scene({
  id: 's9',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    bg(ctx, X, { cy: 950 });
    const t1 = w('l21', 6).s, t2 = w('l21', 7).s, t3 = w('l21', 9).s, tEven = w('l21', 8).s;
    const y = 960;
    const iconBruise = X => {
      X.fillStyle = AN.skin; X.beginPath(); X.roundRect(-100, -80, 200, 160, 40); X.fill();
      X.save(); X.beginPath(); X.roundRect(-100, -80, 200, 160, 40); X.clip(); drawBruise(ctx, X, 0, 0, 70, 50, 1, 0.9, 3); X.restore();
    };
    const iconHem = X => {
      const bands = [[AN.epi, 18], [AN.dermis, 62], [AN.fat, 70]]; let yy = -75;
      X.save(); X.beginPath(); X.roundRect(-100, -75, 200, 150, 20); X.clip();
      for (const [c, h] of bands) { X.fillStyle = c; X.fillRect(-100, yy, 200, h); yy += h; }
      const g = X.createRadialGradient(0, 10, 0, 0, 10, 80); g.addColorStop(0, 'rgba(120,16,34,0.95)'); g.addColorStop(0.65, 'rgba(110,30,70,0.6)'); g.addColorStop(1, 'rgba(110,30,70,0)');
      X.fillStyle = g; X.beginPath(); X.ellipse(0, 10, 90, 55, 0, 0, 6.283); X.fill(); X.restore();
    };
    const iconBone = X => {
      X.save(); X.rotate(-0.7);
      X.fillStyle = AN.bone; X.beginPath(); X.roundRect(-22, -95, 44, 190, 18); X.fill();
      for (const sy of [-1, 1]) { X.beginPath(); X.arc(-20, sy * 98, 26, 0, 6.283); X.arc(20, sy * 98, 26, 0, 6.283); X.fill(); }
      X.restore();
      ctx.drawPath(X, [[-40, -40], [-8, -14], [-22, 6], [14, 24], [34, 50]], at(t, t3, t3 + 0.4), { width: 7, color: P.clay, smooth: false });
    };
    // severity line behind the cards (right → left)
    const kl = at(t, t1, t3 + 0.3, 'cubicInOut');
    if (kl > 0) {
      ctx.drawPath(X, [[930, y + 270], [150, y + 270]], kl, { width: 6, color: P.clay });
      if (kl > 0.97) { X.save(); X.fillStyle = P.clay; X.beginPath(); X.moveTo(120, y + 270); X.lineTo(156, y + 250); X.lineTo(156, y + 290); X.closePath(); X.fill(); X.restore(); }
    }
    card(ctx, X, 820, y, at(t, t1 - 0.1, t1 + 0.5, 'expoOut'), 'חבורה', AN.bruiseLight, iconBruise, 0);
    card(ctx, X, 540, y, at(t, t2 - 0.1, t2 + 0.5, 'expoOut'), 'המטומה', AN.bruiseLight, iconHem, 0);
    card(ctx, X, 260, y, at(t, t3 - 0.1, t3 + 0.5, 'expoOut'), 'שבר', P.clay, iconBone, at(t, t3, t3 + 0.6));
    headline(ctx, t, 'תנועה אחת לא זהירה', 540, 320, { size: 96, maxWidth: 1000, times: [w('l21', 0).s, w('l21', 1).s, w('l21', 2).s, w('l21', 3).s] });
    headline(ctx, t, 'יכולה לגרום', 540, 450, { size: 70, family: 'body', weight: 700, times: [w('l21', 4).s, w('l21', 5).s], color: P.mut });
    caption(ctx, t);
  },
});
