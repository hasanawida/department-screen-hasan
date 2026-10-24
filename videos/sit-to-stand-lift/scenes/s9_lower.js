// s9 — stage 6: lowering — lock the wheelchair, lower slowly, pelvis deep in the seat; one caregiver operates, the other guides and talks.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, ring, heatGood } from '../lib/photo.js';
import { plate, cap, check } from '../lib/steps.js';
MOTION.scene({
  id: 's9',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    const { M } = plate(ctx, X, t, 'm5', 6, { s: 1.0, cx: 540, cy: 1000 }, { s: 1.06, cx: 520, cy: 1000 });
    const tC = w('c4', 0).s;
    const kLock = at(t, w('n21', 3).s, w('n21', 5).e);
    ring(ctx, X, ...M([470, 1405]), 50, t, kLock, { color: P.acc });
    arrow(ctx, X, [M([300, 1640]), M([440, 1460])], kLock, { color: P.acc, width: 8, smooth: false });
    check(ctx, X, ...M([290, 1700]), 'הכיסא נעול', at(t, w('n21', 5).s - 0.2, w('n21', 5).s + 0.3), { size: 36 });
    const kDown = at(t, w('n21', 6).s, w('n21', 7).e + 0.6);
    arrow(ctx, X, [M([560, 1000]), M([560, 1130])], kDown, { color: P.acc, width: 10, smooth: false });
    pill(ctx, X, ...M([640, 1210]), 'לאט', kDown, { color: P.acc, size: 38 });
    const kPel = at(t, w('n21', 8).s, w('n21', 10).e);
    heatGood(ctx, X, ...M([350, 1180]), 120, kPel);
    pill(ctx, X, ...M([330, 1270]), 'אגן עמוק במושב', at(t, w('n21', 9).s, w('n21', 9).s + 0.5), { color: P.acc, size: 36 });
    pill(ctx, X, ...M([700, 760]), 'מפעיל', at(t, w('n21', 6).s, w('n21', 6).s + 0.5) * (1 - at(t, tC - 0.5, tC - 0.1)), { color: P.mut, size: 32 });
    bubble(ctx, X, t, 'c4', ...M([190, 600]), { y: 440 });
    headline(ctx, t, 'ההורדה', 540, 330, { size: 124, times: [w('n21', 2).s], out: tC - 0.4 });
    cap(ctx, t);
  },
});
