// s10 — answer 2, correcting reality: for him it's new news — he hears his mother died as if for the first time and
// grieves again. The fact is forgotten in minutes, the sadness stays, and tomorrow it may happen again.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, shade, pill } from '../lib/photo.js';
import { cap, glow, loopIcon } from '../lib/dv.js';
MOTION.scene({
  id: 's10',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tG = w('l34', 12).s - 0.3, kG = at(t, tG, tG + 0.9);
    drawPhoto(ctx, X, 'd2', kb({ s: 1.05 + 0.25 * at(t, w('l34', 0).s, tG, 'sineInOut'), cx: 755, cy: 700 }));
    X.save(); X.globalAlpha = kG; drawPhoto(ctx, X, 'd5', kb({ s: 1.06 + 0.05 * at(t, tG, sc.end), cx: 780, cy: 1000 })); X.restore();
    shade(ctx, X);
    pill(ctx, X, 540, 520, 'בשורה חדשה', at(t, w('l34', 2).s, w('l34', 3).e) * (1 - at(t, w('l34', 9).s - 0.3, w('l34', 9).s)), { color: P.hi, size: 48 });
    pill(ctx, X, 540, 520, 'כאילו בפעם הראשונה', at(t, w('l34', 9).s, w('l34', 11).e) * (1 - kG), { color: P.hi, size: 48 });
    // the fact fades, the sadness stays
    const kF = at(t, w('l35', 0).s, w('l35', 0).s + 0.4) * (1 - at(t, w('l35', 1).s, w('l35', 3).e));
    pill(ctx, X, 540, 560, 'העובדה', kF, { color: P.ink, size: 46 });
    const kS = at(t, w('l35', 4).s, w('l35', 5).e);
    glow(ctx, X, 793, 907, 260, '91,120,200', kS * (0.7 + 0.2 * Math.sin(t * 1.5)));
    pill(ctx, X, 540, 560, 'העצב נשאר', kS * (1 - at(t, w('l35', 6).s - 0.2, w('l35', 6).s)), { color: P.hi, size: 46 });
    const kL = at(t, w('l35', 6).s, w('l35', 10).e);
    loopIcon(ctx, X, t, 370, 560, 44, kL, P.clay); pill(ctx, X, 600, 560, 'ומחר — שוב', kL, { color: P.clay, size: 46 });
    headline(ctx, t, '2 · תיקון המציאות', 540, 300, { size: 92, t0: w('l33', 0).s - 0.2, color: P.clay });
    cap(ctx, t);
  },
});
