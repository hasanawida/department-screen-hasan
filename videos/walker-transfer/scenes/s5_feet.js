// s5 — stage 2: feet back under the knees, hands on the mattress beside the thighs.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, ring } from '../lib/photo.js';
import { plate, cap } from '../lib/steps.js';
MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    const { M } = plate(ctx, X, t, 'w2', 2, { s: 1.0, cx: 700, cy: 1250 }, { s: 1.1, cx: 720, cy: 1300 });
    const kF = at(t, w('c2', 0).s, w('c2', 4).e);
    if (kF > 0) { const kn = M([620, 1300]), an = M([650, 1590]); X.save(); X.setLineDash([14, 10]); ctx.drawPath(X, [[kn[0], kn[1] - 40], [kn[0], an[1] + 20]], kF, { width: 5, color: P.acc, smooth: false }); X.restore(); ring(ctx, X, ...an, 60, t, kF, { color: P.acc, width: 4 }); pill(ctx, X, an[0] - 220, an[1] - 120, 'כפות רגליים מתחת לברכיים', kF, { color: P.acc, size: 38 }); }
    const kH = at(t, w('c2', 5).s, w('c2', -1).e);
    ring(ctx, X, ...M([860, 1300]), 60, t, kH, { color: P.acc, width: 4 }); pill(ctx, X, ...M([860, 1180]), 'ידיים על המיטה', kH, { color: P.acc, size: 40 });
    bubble(ctx, X, t, 'c2', ...M([330, 690]), { y: 560 });
    headline(ctx, t, 'רגליים וידיים', 540, 330, { size: 112, times: [w('n8', 2).s, w('n8', 3).s], out: w('c2', 0).s - 0.4 });
    cap(ctx, t);
  },
});
