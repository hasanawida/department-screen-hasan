// s5 — stage 2: the sling goes in by rolling — roll to the side, sling behind the back, roll back to spread it; the patient holds the rail.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, ring } from '../lib/photo.js';
import { plate, cap } from '../lib/steps.js';
MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const { M } = plate(ctx, X, t, 'h2', 2, { s: 1.12, cx: 540, cy: 1000, dy: -200 }, { s: 1.15, cx: 560, cy: 1000, dy: -200 });
    const tC = w('c1', 0).s;
    const kRoll = at(t, w('n13', 3).s, w('n13', 6).e) * (1 - at(t, w('n13', 11).s - 0.3, w('n13', 11).s));
    arrow(ctx, X, [M([700, 930]), M([600, 900]), M([520, 960])], kRoll, { color: P.acc, width: 10 });
    pill(ctx, X, ...M([600, 820]), 'לצד', kRoll, { color: P.acc, size: 38 });
    const kSl = at(t, w('n13', 7).s, w('n13', 10).e);
    ring(ctx, X, ...M([760, 1255]), 80, t, kSl * (1 - at(t, tC + 1, tC + 1.4)), { color: P.acc });
    pill(ctx, X, ...M([800, 1120]), 'רתמה מאחורי הגב', at(t, w('n13', 9).s, w('n13', 9).s + 0.5) * (1 - at(t, tC - 0.4, tC)), { color: P.acc, size: 36 });
    const kBack = at(t, w('n13', 11).s, w('n13', 16).e) * (1 - at(t, tC - 0.4, tC));
    arrow(ctx, X, [M([700, 1250]), M([980, 1235])], kBack, { color: P.hi, width: 9, smooth: false });
    pill(ctx, X, ...M([900, 1330]), 'פורשים', kBack, { color: P.hi, size: 36 });
    ring(ctx, X, ...M([504, 1262]), 50, t, at(t, w('c1', 3).s, w('c1', 4).e), { color: P.acc });
    bubble(ctx, X, t, 'c1', ...M([252, 600]), { y: 300 });
    headline(ctx, t, 'גלגול', 540, 330, { size: 124, times: [w('n13', 2).s], out: tC - 0.4 });
    cap(ctx, t);
  },
});
