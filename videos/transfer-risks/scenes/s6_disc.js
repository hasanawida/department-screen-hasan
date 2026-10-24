// s6 — pressure + twist on the disc → herniation pressing on the nerve (real medical renders).
import { caption, headline, sub } from '../lib/ui.js';
import { kb, mapper, drawPhoto, shade, heat, arrow, pill, stepper, ring } from '../lib/photo.js';

MOTION.scene({
  id: 's6',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tP = w('l14', 0).s, tR = w('l14', 2).s, tH = w('l15', 2).s, tN = w('l15', 5).s, tName = w('l15', 7).s;
    const K = kb({ s: 1.0 + 0.1 * at(t, sc.start, sc.end, 'sineInOut'), cx: 420, cy: 960 }), M = mapper(K);
    drawPhoto(ctx, X, 'disc', K);
    X.save(); X.globalAlpha = at(t, tH - 0.1, tH + 0.9, 'cubicInOut'); drawPhoto(ctx, X, 'hern', K); X.restore();
    shade(ctx, X);
    const kP = at(t, tP - 0.1, tP + 0.5) * (1 - at(t, tH - 0.4, tH));
    arrow(ctx, X, [M([370, 360]), M([370, 560])], kP, { color: P.clay, width: 14, smooth: false });
    arrow(ctx, X, [M([385, 1540]), M([385, 1360])], kP, { color: P.clay, width: 14, smooth: false });
    const kR = at(t, tR - 0.1, tR + 0.7) * (1 - at(t, tH - 0.4, tH));
    if (kR > 0) {
      const [cx, cy] = M([380, 955]);
      X.save(); X.globalAlpha = 0.35 * kR; X.strokeStyle = P.clay; X.lineWidth = 10; X.beginPath(); X.ellipse(cx, cy, 300, 70, 0, Math.PI * 0.05, Math.PI * 0.95); X.stroke(); X.restore();
      arrow(ctx, X, [[cx + 290, cy - 20], [cx, cy - 72], [cx - 290, cy - 20]], kR, { color: P.clay, width: 12 });
    }
    heat(ctx, X, ...M([590, 990]), 190 * K.s, at(t, tN - 0.3, tN + 0.5) * (0.75 + 0.25 * Math.sin(t * 7)));
    ring(ctx, X, ...M([590, 990]), 120, t, at(t, tN, tN + 0.5));
    pill(ctx, X, ...M([760, 1260]), 'העצב', at(t, tN, tN + 0.5), { color: P.clay, size: 44 });
    pill(ctx, X, ...M([220, 1300]), 'הדיסק פורץ', at(t, tH, tH + 0.5), { color: P.hi, size: 42 });
    stepper(ctx, X, 3);
    headline(ctx, t, 'לחץ + סיבוב', 540, 318, { size: 116, times: [tP, tR, tR], colors: [null, null, P.clay], out: tH - 0.5 });
    sub(ctx, t, 'שילוב מסוכן במיוחד לדיסק', 540, 405, { t0: w('l14', 4).s, size: 50, color: P.ink, out: tH - 0.5 });
    headline(ctx, t, 'פריצת דיסק', 540, 318, { size: 124, times: [tName, w('l15', 8).s], color: P.clay });
    sub(ctx, t, 'הדיסק לוחץ על העצב', 540, 405, { t0: tN, size: 50, color: P.ink });
    caption(ctx, t);
  },
});
