// s8 — stage 5: small steps to the chair, walker first; turn by stepping, no trunk twist.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, heat } from '../lib/photo.js';
import { plate, cap } from '../lib/steps.js';
MOTION.scene({
  id: 's8',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    const { M } = plate(ctx, X, t, 'w5', 5, { s: 1.0, cx: 540, cy: 1100 }, { s: 1.06, cx: 500, cy: 1100 });
    arrow(ctx, X, [M([300, 1330]), M([130, 1330])], at(t, w('c6', 2).s, w('c6', 3).e), { color: P.acc, width: 12, smooth: false });
    pill(ctx, X, ...M([230, 1240]), '1. ההליכון', at(t, w('c6', 2).s, w('c6', 3).s + 0.4), { color: P.acc, size: 40 });
    const kf = at(t, w('c6', 4).s, w('c6', 5).e);
    for (let i = 0; i < 3; i++) { const k = at(t, w('c6', 4).s + i * 0.3, w('c6', 4).s + i * 0.3 + 0.3); heat(ctx, X, ...M([700 - i * 70, 1640]), 60, k * 0.8); }
    pill(ctx, X, ...M([620, 1480]), '2. הרגליים', kf, { color: P.acc, size: 40 });
    pill(ctx, X, 540, 1060, 'מסתובבים בצעדים, בלי לסובב את הגב', at(t, w('n14', 0).s, w('n14', 0).s + 0.5), { color: P.acc, size: 40 });
    bubble(ctx, X, t, 'c6', ...M([900, 700]), { y: 560 });
    headline(ctx, t, 'צעדים קטנים', 540, 330, { size: 112, times: [w('n13', 2).s, w('n13', 3).s], out: w('c6', 0).s - 0.4 });
    cap(ctx, t);
  },
});
