// s10 — the lift's own brakes: models differ (some release them while lifting, some don't) → follow the manufacturer's instructions.
import { headline } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, ring, pill } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
const CASTORS = [[225, 1512], [945, 1575], [720, 1647]];
MOTION.scene({
  id: 's10',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const K = lerpKB(ctx, kb({ s: 1.0, cx: 560, cy: 1300, dy: -340 }), kb({ s: 1.06, cx: 560, cy: 1300, dy: -380 }), at(t, sc.start, sc.end, 'sineInOut')), M = mapper(K);
    drawPhoto(ctx, X, 'h0', K); shade(ctx, X, { dim: 0.35 });
    CASTORS.forEach(p => ring(ctx, X, ...M(p), 44, t, at(t, w('n24', 2).s, w('n24', 2).s + 0.5), { color: P.hi }));
    pill(ctx, X, 540, 590, 'בחלק מהדגמים: משחררים בהרמה', at(t, w('n24', 5).s, w('n24', 5).s + 0.5), { color: P.mut, size: 36 });
    pill(ctx, X, 540, 680, 'ובחלק: לא', at(t, w('n24', 11).s, w('n24', 11).s + 0.5), { color: P.mut, size: 36 });
    pill(ctx, X, 540, 810, 'פועלים לפי הוראות היצרן', at(t, w('n24', 13).s, w('n24', 13).s + 0.5), { color: P.acc, size: 48 });
    headline(ctx, t, 'ומה עם הבלמים?', 540, 330, { size: 104, times: [w('n24', 0).s, w('n24', 1).s, w('n24', 2).s], colors: [null, null, P.hi] });
    cap(ctx, t);
  },
});
