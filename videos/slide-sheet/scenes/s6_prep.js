// s6 — stage 1: prep — bed locked, at the caregivers' waist height, head of the bed flat if allowed.
import { headline } from '../lib/ui.js';
import { ring, pill } from '../lib/photo.js';
import { plate, cap, check } from '../lib/steps.js';
MOTION.scene({
  id: 's6',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const { M } = plate(ctx, X, t, 's0', 1, { s: 1.06, cx: 540, cy: 1000, dy: 90 }, { s: 1.09, cx: 520, cy: 1000, dy: 90 });
    ring(ctx, X, ...M([260, 1700]), 52, t, at(t, w('n12', 3).s, w('n12', 4).e), { color: P.acc });
    check(ctx, X, 540, 440, 'המיטה נעולה', at(t, w('n12', 4).s, w('n12', 4).s + 0.5), { size: 36 });
    const kH = at(t, w('n12', 5).s, w('n12', 8).e);
    if (kH > 0) { const a = M([0, 1120]), b = M([1080, 1120]); X.save(); X.setLineDash([16, 12]); ctx.drawPath(X, [a, b], kH, { width: 5, color: P.hi, smooth: false }); X.restore(); }
    check(ctx, X, 540, 515, 'בגובה המותן', at(t, w('n12', 6).s, w('n12', 6).s + 0.5), { size: 36 });
    ring(ctx, X, ...M([90, 1130]), 60, t, at(t, w('n12', 11).s, w('n12', 13).e), { color: P.acc });
    check(ctx, X, 540, 590, 'ראש המיטה שטוח, אם מותר', at(t, w('n12', 12).s, w('n12', 12).s + 0.5), { size: 36 });
    headline(ctx, t, 'הכנה', 540, 330, { size: 124, times: [w('n12', 2).s] });
    cap(ctx, t);
  },
});
