// s1 — hook: one transfer, two people at risk.
import { caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, ring, pill } from '../lib/photo.js';

MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const K = lerpKB(ctx, kb({ s: 1.0, cx: 560, cy: 1050 }), kb({ s: 1.07, cx: 560, cy: 1050 }), at(t, 0, sc.end + 0.6, 'sineInOut'));
    X.save(); X.globalAlpha = at(t, 0, 0.5); drawPhoto(ctx, X, 'establish', K); X.restore();
    shade(ctx, X);
    const M = mapper(K), tPt = w('l2', 0).s, tCg = w('l2', 2).s;
    const pt = M([905, 1060]), cg = M([270, 930]), ph = M([860, 700]), ch = M([320, 480]);
    ring(ctx, X, pt[0], pt[1], 230, t, at(t, tPt - 0.1, tPt + 0.5));
    ring(ctx, X, cg[0], cg[1], 250, t, at(t, tCg - 0.1, tCg + 0.5));
    pill(ctx, X, ph[0], ph[1], 'מטופל', at(t, tPt, tPt + 0.5), { color: P.clay });
    pill(ctx, X, ch[0], ch[1], 'מטפל', at(t, tCg, tCg + 0.5), { color: P.clay });
    headline(ctx, t, 'מעבר אחד', 540, 300, { size: 124, times: [w('l1', 0).s, w('l1', 1).s], out: w('l1', 4).s - 0.4 });
    sub(ctx, t, 'מהמיטה לכיסא', 540, 392, { t0: w('l1', 2).s, size: 54, color: P.ink, out: w('l1', 4).s - 0.4 });
    headline(ctx, t, 'שני אנשים בסיכון', 540, 300, { size: 104, times: [w('l1', 4).s, w('l1', 5).s, w('l1', 6).s], colors: [null, null, P.clay], out: sc.end - 0.4 });
    caption(ctx, t);
  },
});
