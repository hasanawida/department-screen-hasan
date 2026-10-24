// s3 — who the full-body lift is for, and the one rule for every stage: two caregivers.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, checklist } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's3',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    drawPhoto(ctx, X, 'h4', kb({ s: 1.12 + 0.03 * at(t, sc.start, sc.end), cx: 540, cy: 1000 }), { filter: 'blur(16px) brightness(0.3)' });
    const tTwo = w('n11', 0).s, out = 1 - at(t, tTwo - 0.5, tTwo, 'cubicIn');
    if (out > 0) { X.save(); X.globalAlpha = out;
      checklist(ctx, X, t, [['ללא נשיאת משקל', true, w('n10', 3).s], ['ללא שליטה בגוף העליון', true, w('n10', 6).s], ['לא יכול לשתף פעולה בעמידה', true, w('n10', 11).s]], 540, 620, { gap: 112 });
      X.restore(); headline(ctx, t, 'למי מתאים?', 540, 320, { size: 120, t0: sc.start + 0.3, out: tTwo - 0.4 }); }
    headline(ctx, t, 'ובכל השלבים', 540, 700, { size: 76, family: 'body', weight: 700, times: [tTwo, w('n11', 1).s], color: P.mut });
    const B = headline(ctx, t, 'שני מטפלים', 540, 880, { size: 150, times: [w('n11', 2).s, w('n11', 3).s], color: P.acc });
    if (B) { const b0 = B[0], b1 = B[B.length - 1], k = at(t, w('n11', 3).e, w('n11', 3).e + 0.6, 'cubicInOut'); ctx.drawPath(X, [[b0.x + b0.w + 8, b0.base + 34], [b1.x - 8, b1.base + 34]], k, { width: 10, color: P.acc }); }
    cap(ctx, t);
  },
});
