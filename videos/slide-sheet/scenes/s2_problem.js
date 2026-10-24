// s2 — the problem: the patient slid down the bed. The common wrong fix: pulling under the armpits on an ordinary sheet (backs + skin at risk).
import { headline, badge } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, arrow, pill, heat, ring } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tW = w('n4', 0).s, sw = at(t, tW - 0.4, tW + 0.3, 'cubicInOut');
    if (sw < 1) {
      const K = lerpKB(ctx, kb({ s: 1.0, cx: 540, cy: 1100 }), kb({ s: 1.06, cx: 480, cy: 1100 }), at(t, sc.start, tW, 'sineInOut')), M = mapper(K);
      drawPhoto(ctx, X, 's0', K); shade(ctx, X);
      const kA = at(t, w('n3', 4).s, w('n3', 6).e);
      X.save(); X.setLineDash([14, 10]); arrow(ctx, X, [M([520, 960]), M([120, 960])], kA, { color: P.hi, width: 10, smooth: false }); X.restore();
      pill(ctx, X, ...M([330, 880]), 'למעלה במיטה', kA, { color: P.hi, size: 38 });
    }
    if (sw > 0) {
      const K = kb({ s: 1.02 + 0.05 * at(t, tW, sc.end), cx: 540, cy: 1150 }), M = mapper(K);
      X.save(); X.globalAlpha = sw; drawPhoto(ctx, X, 's1', K, { filter: 'saturate(0.85)' }); shade(ctx, X, { dim: 0.15 }); X.restore();
      const kPit = at(t, w('n4', 4).s, w('n4', 6).e);
      heat(ctx, X, ...M([396, 1080]), 120, kPit); heat(ctx, X, ...M([720, 1080]), 120, kPit);
      pill(ctx, X, ...M([560, 980]), 'מתחת לבית השחי', at(t, w('n4', 5).s, w('n4', 5).s + 0.5), { color: P.clay, size: 36 });
      ring(ctx, X, ...M([560, 1690]), 80, t, at(t, w('n4', 8).s, w('n4', 9).e), { color: P.clay });
      pill(ctx, X, ...M([560, 1800]), 'סדין רגיל', at(t, w('n4', 8).s, w('n4', 8).s + 0.5), { color: P.clay, size: 36 });
      const kB = at(t, w('n4', 12).s, w('n4', 14).e);
      heat(ctx, X, ...M([95, 1060]), 150, kB); heat(ctx, X, ...M([1010, 1010]), 150, kB);
      const kS = at(t, w('n4', 15).s, w('n4', 17).e);
      heat(ctx, X, ...M([486, 1512]), 90, kS); heat(ctx, X, ...M([666, 1512]), 90, kS);
      badge(ctx, X, 900, 560, 52, 'x', at(t, w('n4', 11).s, w('n4', 11).s + 0.5));
    }
    headline(ctx, t, 'איך מעלים אותו?', 540, 330, { size: 104, times: [w('n3', 4).s, w('n3', 5).s, w('n3', 6).s], out: tW - 0.4 });
    headline(ctx, t, 'הדרך הנפוצה', 540, 330, { size: 108, times: [tW + 0.1, w('n4', 1).s], colors: [null, P.clay] });
    cap(ctx, t);
  },
});
