// s6 — the damage spreads to the front of the brain (prefrontal cortex): weighing, drawing conclusions, stopping
// reactions — the brain's brakes. Logic bounces off; an argument relies on exactly the part that is damaged.
import { headline, tag } from '../lib/ui.js';
import { kb, drawPhoto, shade, pill } from '../lib/photo.js';
import { cap, glow } from '../lib/dv.js';
const PFC = [338, 878];
MOTION.scene({
  id: 's6',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const K = kb({ s: 1.04 + 0.06 * at(t, sc.start, sc.end, 'sineInOut'), cx: 420, cy: 930 });
    drawPhoto(ctx, X, 'b2', K);
    const kF = at(t, w('l18', 5).s - 0.2, w('l18', 6).e + 0.4), dmg = at(t, w('l20', 0).s, w('l20', 1).e + 0.6);
    const flick = dmg > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.1)) : 1;
    X.save(); X.globalAlpha = kF * (1 - 0.55 * dmg * (1 - flick)); drawPhoto(ctx, X, 'b3', K); X.restore();
    shade(ctx, X, { topH: 430 });
    const [px, py] = [(PFC[0] - 420) * K.s + 420, (PFC[1] - 930) * K.s + 930];
    glow(ctx, X, px, py, 230, '245,194,107', kF * 0.5 * (1 - dmg * 0.6));
    tag(ctx, X, px, py, 560, 1300, 'קליפה קדם-מצחית', at(t, w('l18', 7).s, w('l18', 9).e) * (1 - at(t, w('l19', 0).s - 0.3, w('l19', 0).s)), { color: P.hi, size: 46 });
    // the three jobs
    const jobs = [['שוקל', w('l19', 2).s], ['מסיק מסקנות', w('l19', 3).s], ['עוצר תגובות', w('l19', 5).s]];
    const outJ = w('l20', 0).s - 0.3;
    jobs.forEach(([txt, t0], i) => pill(ctx, X, 760, 520 + i * 96, txt, at(t, t0, t0 + 0.5) * (1 - at(t, outJ, outJ + 0.3)), { color: P.hi, size: 46 }));
    // logic arrows bounce off the damaged area
    const tl = w('l20', 2).s;
    for (let i = 0; i < 3; i++) {
      const s = tl + i * 0.9, u = at(t, s, s + 0.7, 'cubicIn'), v = at(t, s + 0.7, s + 1.3, 'cubicOut'); if (u <= 0 || t > w('l21', 11).e) continue;
      const sx = 1000, sy = 560 + i * 120, ex = px + 80, ey = py - 60 + i * 60;
      const x = v > 0 ? ex + (ex + 160 - ex) * v : sx + (ex - sx) * u, y = v > 0 ? ey - 120 * v : sy + (ey - sy) * u;
      X.save(); X.globalAlpha = 1 - v; X.strokeStyle = P.acc; X.lineWidth = 6; X.setLineDash([16, 12]);
      X.beginPath(); X.moveTo(v > 0 ? ex : sx, v > 0 ? ey : sy); X.lineTo(x, y); X.stroke(); X.setLineDash([]);
      X.fillStyle = P.acc; X.beginPath(); X.arc(x, y, 12, 0, 6.283); X.fill(); X.restore();
    }
    pill(ctx, X, 760, 600, 'הסבר הגיוני', at(t, w('l20', 5).s, w('l20', 6).e) * (1 - at(t, w('l21', 0).s - 0.3, w('l21', 0).s)), { color: P.acc, size: 46 });
    const kHit = at(t, w('l21', 5).s, w('l21', 11).e);
    if (kHit > 0) { X.save(); X.globalCompositeOperation = 'source-atop'; X.restore(); } glow(ctx, X, px, py, 300, '229,72,77', kHit * (0.8 + 0.2 * Math.sin(t * 5))); glow(ctx, X, px, py, 160, '229,72,77', kHit * 0.7);
    headline(ctx, t, 'קדמת המוח', 540, 300, { size: 96, t0: w('l18', 5).s, out: w('l19', 7).s - 0.3 });
    headline(ctx, t, 'הבלמים של המוח', 540, 300, { size: 96, t0: w('l19', 7).s, out: w('l20', 2).s - 0.3, color: P.hi });
    headline(ctx, t, 'קשה לעקוב אחרי היגיון', 540, 300, { size: 84, t0: w('l20', 2).s, out: w('l21', 0).s - 0.3 });
    headline(ctx, t, 'ויכוח בנוי על היגיון', 540, 300, { size: 84, t0: w('l21', 0).s, out: w('l21', 5).s - 0.2 });
    headline(ctx, t, 'בדיוק החלק שנפגע', 540, 300, { size: 92, t0: w('l21', 5).s, color: P.clay });
    cap(ctx, t);
  },
});
