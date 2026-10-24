// s1 — from the sit-to-stand lift to the full-body lift: the whole patient rides in a sling, bearing no weight.
import { headline, sub } from '../lib/ui.js';
import { kb, mapper, drawPhoto, shade, ring, pill, heatGood } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tNow = w('n1', 5).s, sw = at(t, tNow - 0.4, tNow + 0.4, 'cubicInOut');
    if (sw < 1) { X.save(); X.globalAlpha = at(t, 0, 0.4);
      drawPhoto(ctx, X, 'm4', kb({ s: 1.04 + 0.04 * at(t, 0, tNow), cx: 540, cy: 1050 }), { filter: 'saturate(0.75)' }); shade(ctx, X, { dim: 0.3 }); X.restore(); }
    if (sw > 0) {
      const K = kb({ s: 1.03 + 0.05 * at(t, tNow, sc.end), cx: 620, cy: 1050 }), M = mapper(K);
      X.save(); X.globalAlpha = sw; drawPhoto(ctx, X, 'h5', K); shade(ctx, X); X.restore();
      const kAll = at(t, w('n2', 5).s, w('n2', 7).e);
      heatGood(ctx, X, ...M([700, 1020]), 230, kAll * 0.9);
      pill(ctx, X, ...M([870, 880]), 'רתמה', at(t, w('n2', 7).s, w('n2', 7).s + 0.5), { color: P.acc, size: 40 });
      ring(ctx, X, ...M([520, 1450]), 56, t, at(t, w('n2', 9).s, w('n2', 12).e), { color: P.hi });
      pill(ctx, X, ...M([560, 1640]), 'לא נושא משקל', at(t, w('n2', 10).s, w('n2', 10).s + 0.5), { color: P.hi, size: 42 });
    }
    sub(ctx, t, 'בסרטון הקודם', 540, 200, { t0: w('n1', 0).s, size: 46, out: tNow - 0.4 });
    headline(ctx, t, 'מנוף העמדה', 540, 330, { size: 116, times: [w('n1', 3).s, w('n1', 4).s], out: tNow - 0.3 });
    headline(ctx, t, 'מנוף הרמה', 540, 330, { size: 132, times: [w('n1', 6).s, w('n1', 7).s], color: P.acc });
    sub(ctx, t, 'הרמה מלאה ברתמה', 540, 425, { t0: w('n2', 2).s, size: 46 });
    cap(ctx, t);
  },
});
