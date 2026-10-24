// s4 — stage 1: check — the right sling size, no tears or loose seams, the lift, the bed locked.
import { headline } from '../lib/ui.js';
import { ring } from '../lib/photo.js';
import { plate, cap, check } from '../lib/steps.js';
MOTION.scene({
  id: 's4',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    const { M } = plate(ctx, X, t, 'h1', 1, { s: 1.0, cx: 560, cy: 1050 }, { s: 1.06, cx: 560, cy: 1000 });
    ring(ctx, X, ...M([560, 950]), 150, t, at(t, w('n12', 4).s, w('n12', 4).s + 0.5) * (1 - at(t, w('n12', 12).s, w('n12', 12).s + 0.4)), { color: P.acc, width: 5 });
    check(ctx, X, 300, 470, 'רתמה בגודל הנכון', at(t, w('n12', 5).s, w('n12', 5).s + 0.5), { size: 36 });
    check(ctx, X, 300, 550, 'בלי קרעים ותפרים פרומים', at(t, w('n12', 8).s, w('n12', 8).s + 0.5), { size: 36 });
    check(ctx, X, 300, 630, 'המנוף תקין', at(t, w('n12', 14).s, w('n12', 14).s + 0.5), { size: 36 });
    ring(ctx, X, ...M([720, 1625]), 48, t, at(t, w('n12', 15).s, w('n12', 17).e), { color: P.acc });
    check(ctx, X, ...M([700, 1745]), 'המיטה נעולה', at(t, w('n12', 16).s, w('n12', 16).s + 0.5), { size: 36 });
    headline(ctx, t, 'בדיקה', 540, 330, { size: 124, times: [w('n12', 2).s] });
    cap(ctx, t);
  },
});
