// s1 — from the wrong transfer (red) to the right way (green): walker transfer with light support.
import { caption, headline, sub, badge } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, spine, heat } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
const SPW = [[338, 760], [245, 808], [165, 908], [130, 1012], [142, 1118]];
MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tNow = w('n1', 6).s, sw = at(t, tNow - 0.4, tNow + 0.4, 'cubicInOut');
    if (sw < 1) { const K = kb({ s: 1.04 + 0.04 * at(t, 0, tNow), cx: 420, cy: 1050 }), M = mapper(K);
      X.save(); X.globalAlpha = at(t, 0, 0.4); drawPhoto(ctx, X, 'wrong2', K, { filter: 'saturate(0.7)' }); shade(ctx, X, { dim: 0.4 });
      spine(ctx, X, SPW.map(M), at(t, 0.3, 1.4), { load: 1, scale: K.s }); heat(ctx, X, ...M([125, 1040]), 160, at(t, 0.8, 1.6));
      badge(ctx, X, 900, 620, 56, 'x', at(t, w('n1', 4).s, w('n1', 4).s + 0.5)); X.restore(); }
    if (sw > 0) { X.save(); X.globalAlpha = sw; const K = kb({ s: 1.0 + 0.05 * at(t, tNow, sc.end), cx: 560, cy: 1100 }); drawPhoto(ctx, X, 'w0', K); shade(ctx, X); X.restore(); }
    headline(ctx, t, 'ראינו מה לא נכון', 540, 320, { size: 100, times: [w('n1', 0).s, w('n1', 3).s, w('n1', 4).s, w('n1', 5).s], colors: [null, null, P.clay, P.clay], out: tNow - 0.3 });
    headline(ctx, t, 'עכשיו: איך נכון', 540, 320, { size: 108, times: [tNow, w('n1', 7).s, w('n1', 11).s], colors: [null, null, P.acc] });
    sub(ctx, t, 'מעבר בתמיכה קלה, עם הליכון', 540, 420, { t0: w('n2', 0).s, size: 54, color: P.ink });
    cap(ctx, t);
  },
});
