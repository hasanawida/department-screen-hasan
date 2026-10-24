// s5 — stage 2: positioning — feet on the foot plate, shins against the knee pads at the right height (close-up lens), caregiver's cue.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, ring, lens, heatGood } from '../lib/photo.js';
import { plate, cap, check } from '../lib/steps.js';
MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const { M } = plate(ctx, X, t, 'm1', 2, { s: 1.18, cx: 600, cy: 1780 }, { s: 1.22, cx: 600, cy: 1780 });
    const tC = w('c1', 0).s;
    const kF = at(t, w('n13', 3).s, w('n13', 6).e);
    heatGood(ctx, X, ...M([630, 1600]), 130, kF);
    check(ctx, X, ...M([640, 1690]), 'כפות הרגליים על המשטח', at(t, w('n13', 5).s, w('n13', 5).s + 0.5), { size: 36 });
    const kK = at(t, w('n13', 7).s, w('n13', 7).s + 0.5);
    ring(ctx, X, ...M([480, 1350]), 62, t, kK, { color: P.acc });
    lens(ctx, X, 'm7', 410, 610, 160, { x: 560, y: 960, s: 0.46 }, at(t, w('n13', 9).s - 0.2, w('n13', 9).s + 0.4) * (1 - at(t, tC - 0.6, tC - 0.2)), { from: M([470, 1300]), color: P.acc });
    const kH = at(t, w('n13', 11).s, w('n13', 12).e) * (1 - at(t, tC + 1.5, tC + 1.9));
    arrow(ctx, X, [M([395, 1350]), M([395, 1270])], kH, { color: P.hi, width: 8, smooth: false });
    arrow(ctx, X, [M([395, 1350]), M([395, 1430])], kH, { color: P.hi, width: 8, smooth: false });
    pill(ctx, X, ...M([300, 1240]), 'בגובה המתאים', kH, { color: P.hi, size: 36 });
    bubble(ctx, X, t, 'c1', ...M([500, 960]), { y: 470 });
    headline(ctx, t, 'הצבה', 540, 330, { size: 124, times: [w('n13', 2).s], out: tC - 0.4 });
    cap(ctx, t);
  },
});
