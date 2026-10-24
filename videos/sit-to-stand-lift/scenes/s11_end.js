// s11 — next: full-body lift.
import { headline, badge } from '../lib/ui.js';
import { kb, drawPhoto } from '../lib/photo.js';
MOTION.scene({
  id: 's11',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    drawPhoto(ctx, X, 'm4', kb({ s: 1.1 + 0.04 * at(t, sc.start, sc.end), cx: 540, cy: 1000 }), { filter: 'blur(18px) brightness(0.28)' });
    const g = X.createRadialGradient(540, 900, 40, 540, 900, 950); g.addColorStop(0, 'rgba(46,196,182,0.16)'); g.addColorStop(1, 'rgba(46,196,182,0)'); X.fillStyle = g; X.fillRect(0, 0, ctx.W, ctx.H);
    badge(ctx, X, 540, 660, 92, 'v', at(t, sc.start + 0.2, sc.start + 0.9));
    headline(ctx, t, 'בסרטון הבא', 540, 920, { size: 96, family: 'body', weight: 700, times: [w('n23', 0).s, w('n23', 1).s], color: P.mut });
    const B = headline(ctx, t, 'מנוף הרמה', 540, 1080, { size: 140, times: [w('n23', 2).s, w('n23', 3).s], color: P.acc });
    if (B) { const b0 = B[0], b1 = B[B.length - 1], k = at(t, w('n23', 3).s + 0.3, w('n23', 3).s + 0.9, 'cubicInOut'); ctx.drawPath(X, [[b0.x + b0.w + 8, b0.base + 32], [b1.x - 8, b1.base + 32]], k, { width: 10, color: P.acc }); }
  },
});
