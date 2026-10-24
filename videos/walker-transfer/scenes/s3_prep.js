// s3 — preparation: locked bed at the right height, feet flat, closed shoes, walker in front, wheelchair locked, gait belt.
import { headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, pill, ring, feather } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's3',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const K = lerpKB(ctx, kb({ s: 1.0, cx: 540, cy: 1300, dy: -260 }), kb({ s: 1.05, cx: 540, cy: 1300, dy: -260 }), at(t, sc.start, sc.end)), M = mapper(K);
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H); drawPhoto(ctx, X, 'w0', K); feather(ctx, X, K, 1, 120); shade(ctx, X);
    const items = [[[935, 1700], 'מיטה נעולה', w('n5', 2).s, [880, 1500]], [[700, 1625], 'כפות רגליים שטוחות', w('n5', 5).s, [700, 1440]], [[700, 1600], 'נעליים סגורות', w('n6', 0).s, [560, 1700]],
      [[540, 1250], 'הליכון ישר מול המטופל', w('n6', 2).s, [430, 1100]], [[70, 1450], 'כיסא גלגלים נעול', w('n6', 9).s, [230, 1300]], [[840, 1150], 'חגורת הליכה', w('n6', 0).s + 1.2, [870, 980]]];
    for (const [pt, txt, t0, lp] of items) { const p = M(pt), l = M(lp), k = at(t, t0, t0 + 0.5); ring(ctx, X, p[0], p[1], 48, t, k * 0.8, { color: P.acc, width: 4 }); if (k > 0) ctx.drawPath(X, [p, l], k, { width: 3, color: P.acc }); pill(ctx, X, l[0], l[1], txt, k, { color: P.acc, size: 40 }); }
    headline(ctx, t, 'הכנה', 540, 320, { size: 124, t0: sc.start + 0.3 });
    sub(ctx, t, 'לפני שמתחילים', 540, 410, { t0: w('n5', 0).s, size: 52, color: P.ink });
    cap(ctx, t);
  },
});
