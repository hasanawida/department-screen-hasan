// s7 — stage 4: a moment of stability; only then hold the walker. Wrong: pulling up on the walker.
import { headline, badge } from '../lib/ui.js';
import { kb, mapper, drawPhoto, shade, arrow, pill, bubble, ring, heatGood } from '../lib/photo.js';
import { plate, cap } from '../lib/steps.js';
MOTION.scene({
  id: 's7',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tWr = w('n12', 7).s, wr = at(t, tWr - 0.4, tWr + 0.1, 'cubicInOut');
    const { M } = plate(ctx, X, t, 'w4', 4, { s: 1.0, cx: 560, cy: 1100 }, { s: 1.06, cx: 560, cy: 1100 });
    heatGood(ctx, X, ...M([630, 1610]), 110, at(t, w('c4', 0).s, w('c4', 0).s + 0.6) * 0.6);
    ring(ctx, X, ...M([480, 1130]), 70, t, at(t, w('c5', 2).s, w('c5', 2).s + 0.5) * (1 - wr), { color: P.acc, width: 5 });
    bubble(ctx, X, t, 'c4', ...M([360, 700]), { y: 560, hold: 0.4 });
    bubble(ctx, X, t, 'c5', ...M([360, 700]), { y: 560 });
    pill(ctx, X, ...M([480, 1260]), 'רק אחרי שעומדים', at(t, w('n12', 2).s, w('n12', 2).s + 0.5) * (1 - wr), { color: P.acc, size: 42 });
    if (wr > 0) { X.save(); X.globalAlpha = wr; const K = kb({ s: 1.05, cx: 640, cy: 1150 }), MW = mapper(K); drawPhoto(ctx, X, 'w8', K, { filter: 'saturate(0.75)' }); shade(ctx, X, { dim: 0.3 });
      ring(ctx, X, ...MW([640, 1300]), 210, t, at(t, tWr, tWr + 0.5)); arrow(ctx, X, [MW([760, 1060]), MW([880, 1010])], at(t, w('n12', 11).s, w('n12', 12).e), { color: P.clay, width: 12, smooth: false });
      badge(ctx, X, 900, 640, 56, 'x', at(t, tWr, tWr + 0.5)); pill(ctx, X, 540, 1180, 'ההליכון עלול ליפול', at(t, w('n12', 11).s, w('n12', 11).s + 0.5), { color: P.clay, size: 46 }); X.restore(); }
    headline(ctx, t, 'רגע של יציבות', 540, 330, { size: 104, times: [w('n11', 2).s, w('n11', 3).s], out: w('c4', 0).s - 0.4 });
    headline(ctx, t, 'לא מושכים בהליכון', 540, 330, { size: 96, times: [tWr, w('n12', 8).s, w('n12', 8).s], colors: [P.clay, P.clay, null] });
    cap(ctx, t);
  },
});
