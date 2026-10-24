// s9 — stage 6: feel the chair behind the legs, reach back one hand then the other, lean forward, sit slowly.
import { headline } from '../lib/ui.js';
import { kb, mapper, drawPhoto, shade, arrow, pill, bubble, ring } from '../lib/photo.js';
import { plate, cap } from '../lib/steps.js';
MOTION.scene({
  id: 's9',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tSit = w('c7', 12).s, sw = at(t, tSit - 0.5, tSit + 0.2, 'cubicInOut');
    const { M } = plate(ctx, X, t, 'w6', 6, { s: 1.0, cx: 500, cy: 1150 }, { s: 1.06, cx: 480, cy: 1150 });
    ring(ctx, X, ...M([450, 1330]), 70, t, at(t, w('c7', 2).s, w('c7', 4).e) * (1 - sw), { color: P.acc, width: 5 });
    pill(ctx, X, ...M([300, 1450]), 'הכיסא מאחורי הרגליים', at(t, w('c7', 2).s, w('c7', 2).s + 0.5) * (1 - sw), { color: P.acc, size: 38 });
    ring(ctx, X, ...M([330, 1170]), 55, t, at(t, w('c7', 5).s, w('c7', 7).e) * (1 - sw), { color: P.acc, width: 5 });
    if (sw > 0) { X.save(); X.globalAlpha = sw; const K = kb({ s: 1.05, cx: 500, cy: 1150 }), MS = mapper(K); drawPhoto(ctx, X, 'w7', K); shade(ctx, X);
      arrow(ctx, X, [MS([560, 950]), MS([560, 1130])], at(t, tSit, tSit + 0.8), { color: P.acc, width: 12, smooth: false }); pill(ctx, X, ...MS([560, 860]), 'לאט', at(t, tSit, tSit + 0.5), { color: P.acc, size: 44 }); X.restore(); }
    bubble(ctx, X, t, 'c7', ...M([760, 700]), { y: 560 });
    headline(ctx, t, 'התיישבות', 540, 330, { size: 116, times: [w('n15', 2).s], out: w('c7', 0).s - 0.4 });
    cap(ctx, t);
  },
});
