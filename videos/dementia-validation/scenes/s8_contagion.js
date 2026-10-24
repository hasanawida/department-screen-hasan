// s8 — emotional contagion: as the disease advances, people with Alzheimer's catch the feelings around them.
// Calm caregiver → calm waves; stressed caregiver → the stress passes to him.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, shade, pill } from '../lib/photo.js';
import { cap, waves } from '../lib/dv.js';
MOTION.scene({
  id: 's8',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tT = w('l28', 2).s - 0.3, kT = at(t, tT, tT + 0.8);
    const K = kb({ s: 1.04 + 0.05 * at(t, sc.start, sc.end), cx: 540, cy: 900 });
    drawPhoto(ctx, X, 'd11', K); X.save(); X.globalAlpha = kT; drawPhoto(ctx, X, 'd10', K); X.restore(); shade(ctx, X);
    const a = [400, 800], b = [690, 790];
    waves(ctx, X, t, a, b, at(t, w('l27', 8).s, w('l27', 10).e) * (1 - kT), '46,196,182');
    waves(ctx, X, t * 1.6, a, b, at(t, w('l28', 7).s - 0.2, w('l28', 9).e), '229,72,77');
    pill(ctx, X, 330, 640, 'רגוע', at(t, w('l27', 10).s, w('l27', 10).s + 0.4) * (1 - kT), { color: P.acc, size: 42 });
    pill(ctx, X, 330, 640, 'לחוץ', at(t, w('l28', 4).s, w('l28', 4).s + 0.4), { color: P.clay, size: 42 });
    pill(ctx, X, 540, 520, 'הלחץ עובר אליו', at(t, w('l28', 7).s, w('l28', 9).e), { color: P.clay, size: 42 });
    headline(ctx, t, 'הדבקה רגשית', 540, 300, { size: 100, t0: w('l27', 8).s - 0.3, color: P.hi });
    cap(ctx, t);
  },
});
