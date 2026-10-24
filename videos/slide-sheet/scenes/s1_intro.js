// s1 — from the full-body lift to the slide sheet: move and transfer without lifting and without dragging the skin.
import { headline, sub } from '../lib/ui.js';
import { kb, mapper, drawPhoto, shade, arrow } from '../lib/photo.js';
import { cap, check } from '../lib/steps.js';
MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tNow = w('n1', 5).s, sw = at(t, tNow - 0.4, tNow + 0.4, 'cubicInOut');
    if (sw < 1) { X.save(); X.globalAlpha = at(t, 0, 0.4);
      drawPhoto(ctx, X, 'h5', kb({ s: 1.04 + 0.04 * at(t, 0, tNow), cx: 600, cy: 1050 }), { filter: 'saturate(0.75)' }); shade(ctx, X, { dim: 0.3 }); X.restore(); }
    if (sw > 0) {
      const K = kb({ s: 1.04 + 0.05 * at(t, tNow, sc.end), cx: 560, cy: 1150 }), M = mapper(K);
      X.save(); X.globalAlpha = sw; drawPhoto(ctx, X, 's5', K); shade(ctx, X); X.restore();
      arrow(ctx, X, [M([880, 1180]), M([380, 1180])], at(t, w('n2', 3).s, w('n2', 5).e), { color: P.acc, width: 12, smooth: false });
      check(ctx, X, 540, 480, 'בלי להרים', at(t, w('n2', 8).s, w('n2', 8).s + 0.5), { size: 38 });
      check(ctx, X, 540, 560, 'בלי לגרור את העור', at(t, w('n2', 10).s, w('n2', 10).s + 0.5), { size: 38 });
    }
    sub(ctx, t, 'בסרטון הקודם', 540, 200, { t0: w('n1', 0).s, size: 46, out: tNow - 0.4 });
    headline(ctx, t, 'מנוף הרמה', 540, 330, { size: 116, times: [w('n1', 3).s, w('n1', 4).s], out: tNow - 0.3 });
    headline(ctx, t, 'סדין החלקה', 540, 330, { size: 132, times: [w('n1', 6).s, w('n1', 7).s], color: P.acc });
    cap(ctx, t);
  },
});
