// s6 — stage 3: attach — lift brought in with its legs open; shoulder loops first, then leg loops, leg straps crossed (close-up lens).
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, ring, lens } from '../lib/photo.js';
import { plate, cap } from '../lib/steps.js';
MOTION.scene({
  id: 's6',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const { M } = plate(ctx, X, t, 'h3', 3, { s: 1.1, cx: 540, cy: 1000, dy: -220 }, { s: 1.13, cx: 560, cy: 1000, dy: -220 });
    const tC = w('c2', 0).s;
    const kLegs = at(t, w('n14', 3).s, w('n14', 8).e) * (1 - at(t, w('n14', 9).s, w('n14', 9).s + 0.4));
    arrow(ctx, X, [M([520, 1690]), M([300, 1730])], kLegs, { color: P.hi, width: 8, smooth: false }); arrow(ctx, X, [M([520, 1690]), M([860, 1650])], kLegs, { color: P.hi, width: 8, smooth: false });
    pill(ctx, X, 560, 1640, 'רגלי המנוף פתוחות', kLegs, { color: P.hi, size: 36 });
    const kSh = at(t, w('n14', 12).s, w('n14', 13).e);
    ring(ctx, X, ...M([470, 840]), 44, t, kSh * (1 - at(t, tC, tC + 0.4)), { color: P.acc });
    pill(ctx, X, ...M([330, 720]), '1. כתפיים', kSh * (1 - at(t, tC, tC + 0.4)), { color: P.acc, size: 38 });
    const kLg = at(t, w('n14', 16).s, w('n14', 17).e);
    ring(ctx, X, ...M([860, 1140]), 54, t, kLg * (1 - at(t, tC, tC + 0.4)), { color: P.acc });
    pill(ctx, X, ...M([900, 1020]), '2. רגליים', kLg * (1 - at(t, tC, tC + 0.4)), { color: P.acc, size: 38 });
    const kX = at(t, w('n14', 18).s - 0.2, w('n14', 18).s + 0.4) * (1 - at(t, w('c2', 4).s - 0.4, w('c2', 4).s));
    lens(ctx, X, 'h8', 175, 520, 135, { x: 540, y: 1330, s: 0.42 }, kX, { from: M([860, 1150]), color: P.acc });
    pill(ctx, X, 175, 700, 'רצועות מוצלבות', kX, { color: P.acc, size: 32 });
    ring(ctx, X, ...M([500, 1060]), 60, t, at(t, w('c2', 4).s, w('c2', 8).e), { color: P.acc });
    bubble(ctx, X, t, 'c2', ...M([720, 600]), { y: 300, x: 600, maxWidth: 640 });
    headline(ctx, t, 'חיבור', 540, 330, { size: 124, times: [w('n14', 2).s], out: tC - 0.4 });
    cap(ctx, t);
  },
});
