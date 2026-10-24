// s4 — stage 1: check the lift and the sling, lock the bed.
import { headline, sub } from '../lib/ui.js';
import { ring } from '../lib/photo.js';
import { plate, cap, check } from '../lib/steps.js';
MOTION.scene({
  id: 's4',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const { M } = plate(ctx, X, t, 'm1', 1, { s: 1.0, cx: 600, cy: 1150 }, { s: 1.05, cx: 600, cy: 1150 });
    const kL = at(t, w('n12', 5).s, w('n12', 5).s + 0.5), kS = at(t, w('n12', 7).s, w('n12', 7).s + 0.5), kB = at(t, w('n12', 8).s, w('n12', 10).e);
    ring(ctx, X, ...M([300, 1120]), 60, t, kL, { color: P.acc });
    check(ctx, X, ...M([270, 990]), 'המנוף', kL);
    ring(ctx, X, ...M([840, 1170]), 60, t, kS, { color: P.acc });
    check(ctx, X, ...M([840, 1040]), 'הרתמה', kS);
    ring(ctx, X, ...M([900, 1650]), 50, t, kB, { color: P.acc });
    check(ctx, X, ...M([860, 1570]), 'המיטה נעולה', kB);
    headline(ctx, t, 'בדיקה', 540, 330, { size: 124, times: [w('n12', 2).s] });
    sub(ctx, t, 'לפני שמתחילים', 540, 420, { t0: w('n12', 3).s, size: 46 });
    cap(ctx, t);
  },
});
