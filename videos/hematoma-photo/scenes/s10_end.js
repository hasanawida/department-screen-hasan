// s11 — end card: "בהמשך נלמד איך נכון"
import { headline, badge } from '../lib/ui.js';
import { kb, drawPhoto } from '../lib/photo.js';

MOTION.scene({
  id: 's10',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    drawPhoto(ctx, X, 'establish', kb({ s: 1.1 + 0.04 * at(t, sc.start, sc.end), cx: 540, cy: 1000 }), { filter: 'blur(18px) brightness(0.28)' });
    const g = X.createRadialGradient(540, 900, 40, 540, 900, 950); g.addColorStop(0, 'rgba(46,196,182,0.16)'); g.addColorStop(1, 'rgba(46,196,182,0)'); X.fillStyle = g; X.fillRect(0, 0, ctx.W, ctx.H);
    badge(ctx, X, 540, 640, 92, 'v', at(t, w('l22', 0).s - 0.3, w('l22', 0).s + 0.6));
    ctx.drawPath(X, `M 540 ${640 - 132} A 132 132 0 1 1 539.9 ${640 - 132}`, at(t, w('l22', 0).s - 0.1, w('l22', 2).s, 'cubicInOut'), { width: 5, color: P.acc });
    headline(ctx, t, 'בהמשך', 540, 900, { size: 104, family: 'body', weight: 700, times: [w('l22', 0).s], color: P.mut });
    const B = headline(ctx, t, 'נלמד איך נכון', 540, 1060, { size: 136, times: [w('l22', 1).s, w('l22', 2).s, w('l22', 3).s], colors: [null, null, P.acc] });
    if (B) { const b = B[2], k = at(t, w('l22', 3).s + 0.2, w('l22', 3).s + 0.8, 'cubicInOut'); ctx.drawPath(X, [[b.x + b.w + 8, b.base + 30], [b.x + b.w * 0.5, b.base + 40], [b.x - 8, b.base + 28]], k, { width: 10, color: P.acc }); }
  },
});
