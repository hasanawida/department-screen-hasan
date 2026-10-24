// s11 — answer 3, lying: calms for a moment, but the longing gets no answer and the question returns, again and again.
// On a deep level he knows the truth; each lie wears down trust — and without trust it's hard to calm him.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, shade, pill } from '../lib/photo.js';
import { cap, meter, loopIcon } from '../lib/dv.js';
MOTION.scene({
  id: 's11',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tB = w('l37', 8).s - 0.3, kB = at(t, tB, tB + 0.8);
    drawPhoto(ctx, X, 'd3', kb({ s: 1.04 + 0.05 * at(t, sc.start, tB), cx: 540, cy: 900 }));
    X.save(); X.globalAlpha = kB; drawPhoto(ctx, X, 'd0', kb({ s: 1.08 + 0.05 * at(t, tB, sc.end), cx: 700, cy: 900 })); X.restore();
    shade(ctx, X, { dim: 0.3 * at(t, w('l38', 0).s, w('l38', 0).s + 0.6) });
    pill(ctx, X, 540, 520, 'מרגיע לרגע', at(t, w('l37', 0).s, w('l37', 2).e) * (1 - at(t, w('l37', 3).s, w('l37', 3).s + 0.3)), { color: P.acc, size: 46 });
    pill(ctx, X, 540, 520, 'הגעגוע לא קיבל מענה', at(t, w('l37', 4).s, w('l37', 7).e) * (1 - kB), { color: P.hi, size: 46 });
    // the question keeps coming back
    const kQ = at(t, w('l37', 8).s, w('l37', 11).e) * (1 - at(t, w('l38', 0).s - 0.3, w('l38', 0).s));
    const beat = Math.max(0, Math.sin((t - w('l37', 9).s) * 4.2)); pill(ctx, X, 600, 430, 'איפה אמא?', kQ, { color: P.ink, size: 46 + 4 * beat });
    loopIcon(ctx, X, t, 360, 420, 40, kQ, P.hi);
    // trust wears down
    const kM = at(t, w('l38', 0).s, w('l38', 0).s + 0.5);
    const v = 0.9 - 0.7 * at(t, w('l38', 9).s, w('l38', 13).e, 'sineInOut');
    meter(ctx, X, 'אמון', 540, 1180, 760, v, kM);
    pill(ctx, X, 540, 1040, 'ברובד עמוק — הוא יודע', at(t, w('l38', 3).s, w('l38', 8).e) * (1 - at(t, w('l38', 9).s, w('l38', 9).s + 0.3)), { color: P.hi, size: 44 });
    headline(ctx, t, '3 · שקר', 540, 300, { size: 104, t0: w('l36', 0).s - 0.2, out: w('l39', 0).s - 0.3, color: P.clay });
    headline(ctx, t, 'בלי אמון — קשה להרגיע', 540, 300, { size: 80, t0: w('l39', 0).s, color: P.clay });
    cap(ctx, t);
  },
});
