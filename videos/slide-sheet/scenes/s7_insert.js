// s7 — stage 2: put the sheet in by rolling — to the side, sheet from head to heels, roll back and spread it.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, ring } from '../lib/photo.js';
import { plate, cap } from '../lib/steps.js';
MOTION.scene({
  id: 's7',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const { M } = plate(ctx, X, t, 's3', 2, { s: 1.08, cx: 540, cy: 1000, dy: -120 }, { s: 1.11, cx: 560, cy: 1000, dy: -120 });
    const tC = w('c1', 0).s;
    const kR = at(t, w('n13', 4).s, w('n13', 7).e) * (1 - at(t, w('n13', 8).s, w('n13', 8).s + 0.4));
    arrow(ctx, X, [M([600, 960]), M([500, 940]), M([420, 1010])], kR, { color: P.acc, width: 10 });
    pill(ctx, X, ...M([560, 870]), 'לצד', kR, { color: P.acc, size: 38 });
    const kL = at(t, w('n13', 11).s, w('n13', 13).e) * (1 - at(t, tC - 0.4, tC));
    arrow(ctx, X, [M([620, 1110]), M([180, 1110])], kL, { color: P.hi, width: 8, smooth: false }); arrow(ctx, X, [M([620, 1110]), M([1060, 1110])], kL, { color: P.hi, width: 8, smooth: false });
    pill(ctx, X, ...M([620, 1200]), 'מהראש ועד העקבים', kL, { color: P.hi, size: 36 });
    ring(ctx, X, ...M([495, 1269]), 50, t, at(t, w('n13', 14).s, w('n13', 17).e) * (1 - at(t, tC + 2, tC + 2.4)), { color: P.acc });
    pill(ctx, X, ...M([820, 880]), 'מגלגלים חזרה ופורשים', at(t, w('n13', 14).s, w('n13', 14).s + 0.5) * (1 - at(t, tC - 0.4, tC)), { color: P.acc, size: 34 });
    bubble(ctx, X, t, 'c1', ...M([230, 640]), { y: 300 });
    headline(ctx, t, 'הכנסת הסדין', 540, 330, { size: 112, times: [w('n13', 2).s, w('n13', 3).s], out: tC - 0.4 });
    cap(ctx, t);
  },
});
