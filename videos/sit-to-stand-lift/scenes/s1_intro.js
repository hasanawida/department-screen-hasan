// s1 — from the walker video to the sit-to-stand lift: a motor does the lifting, the patient still carries part of the weight.
import { headline, sub } from '../lib/ui.js';
import { kb, mapper, drawPhoto, shade, ring, pill, heatGood } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tNow = w('n1', 6).s, sw = at(t, tNow - 0.4, tNow + 0.4, 'cubicInOut');
    if (sw < 1) { X.save(); X.globalAlpha = at(t, 0, 0.4);
      drawPhoto(ctx, X, 'w5', kb({ s: 1.04 + 0.04 * at(t, 0, tNow), cx: 540, cy: 1050 }), { filter: 'saturate(0.75)' }); shade(ctx, X, { dim: 0.3 }); X.restore(); }
    if (sw > 0) {
      const K = kb({ s: 1.04 + 0.05 * at(t, tNow, sc.end), cx: 560, cy: 1100 }), M = mapper(K);
      X.save(); X.globalAlpha = sw; drawPhoto(ctx, X, 'm3', K); shade(ctx, X); X.restore();
      const kMot = at(t, w('n2', 6).s, w('n2', 6).s + 0.5);
      ring(ctx, X, ...M([380, 1110]), 56, t, kMot, { color: P.hi });
      pill(ctx, X, ...M([250, 1210]), 'מנוע', kMot, { color: P.hi, size: 42 });
      const kW = at(t, w('n2', 8).s, w('n2', 11).e);
      heatGood(ctx, X, ...M([650, 1585]), 130, kW);
      pill(ctx, X, ...M([700, 1700]), 'נושא חלק מהמשקל', at(t, w('n2', 10).s, w('n2', 10).s + 0.5), { color: P.acc, size: 42 });
    }
    sub(ctx, t, 'בסרטון הקודם', 540, 200, { t0: w('n1', 0).s, size: 46, out: tNow - 0.4 });
    headline(ctx, t, 'מעבר עם הליכון', 540, 330, { size: 108, times: [w('n1', 3).s, w('n1', 4).s, w('n1', 5).s], colors: [null, null, P.acc], out: tNow - 0.3 });
    const B = headline(ctx, t, 'מנוף העמדה', 540, 330, { size: 132, times: [w('n1', 7).s, w('n1', 8).s], color: P.acc });
    const kM = at(t, w('n1', 8).e, w('n1', 8).e + 0.5, 'cubicOut');
    if (kM > 0) ctx.text(X, 'Molift Quick Raiser 1', 540, 420 + (1 - kM) * 20, { family: 'num', weight: 700, size: 44, color: P.mut, alpha: kM, dir: 'ltr' });
    cap(ctx, t);
  },
});
