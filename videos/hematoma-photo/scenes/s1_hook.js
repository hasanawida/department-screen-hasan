// s1 — hook: one wrong grip (real photo) → finger-shaped bruises.
import { AN, caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, heat, ring } from '../lib/photo.js';

const TIPS = [[520, 1170], [600, 1180], [680, 1188], [750, 1192]];
const BRUISES = [[400, 1080], [480, 1052], [560, 1026], [656, 986], [630, 1180]];

MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const l1 = i => w('l1', i).s, l2 = i => w('l2', i).s;
    const K = lerpKB(ctx, kb({ s: 1.0, cx: 560, cy: 1100 }), kb({ s: 1.1, cx: 560, cy: 1080 }), at(t, 0, l2(3), 'sineInOut'));
    const K2 = lerpKB(ctx, K, kb({ s: 1.9, cx: 540, cy: 1050 }), at(t, l2(-1) + 0.2, sc.end + 0.3, 'cubicIn'));
    const KK = t > l2(-1) ? K2 : K, M = mapper(KK);
    X.save(); X.globalAlpha = at(t, 0, 0.4); drawPhoto(ctx, X, 'grip', KK); X.restore();
    const swap = at(t, l1(4) - 0.15, l1(4) + 0.6, 'cubicInOut');
    if (swap > 0) { X.save(); X.globalAlpha = swap; drawPhoto(ctx, X, 'bruises', KK); X.restore(); }
    shade(ctx, X);
    const press = at(t, 0.9, 1.4) * (1 - swap);
    TIPS.forEach(([x, y], i) => heat(ctx, X, ...M([x, y]), 80 * KK.s, press * (0.75 + 0.25 * Math.sin(t * 6 + i))));
    const kb2 = at(t, l1(5), l1(6) + 0.4) * (1 - at(t, l2(0), l2(0) + 0.6));
    BRUISES.forEach(([x, y], i) => ring(ctx, X, ...M([x, y]), 46 * KK.s, t + i * 0.2, kb2 * 0.8, { color: AN.bruiseLight, width: 4 }));
    const out1 = l2(0) - 0.45;
    headline(ctx, t, 'תפיסה אחת לא נכונה', 540, 320, { size: 92, maxWidth: 1000, times: [l1(0), l1(1), l1(2), l1(3)], out: out1 });
    headline(ctx, t, 'ונשאר סימן כחול', 540, 450, { size: 92, maxWidth: 1000, times: [l1(4), l1(5), l1(6)], color: AN.bruiseLight, out: out1 });
    sub(ctx, t, 'אצל אנשים מבוגרים', 540, 300, { t0: l2(0), size: 56, color: P.ink, out: sc.end - 0.6 });
    const B = headline(ctx, t, 'זה קורה הרבה יותר בקלות', 540, 430, { size: 84, maxWidth: 1000, times: [l2(3), l2(4), l2(5), l2(6), l2(7)], colors: [null, null, null, null, P.clay], out: sc.end - 0.6 });
    if (B) { const b = B[B.length - 1], k = at(t, l2(7) + 0.15, l2(7) + 0.7, 'cubicInOut') * (1 - at(t, sc.end - 0.6, sc.end - 0.2)); ctx.drawPath(X, [[b.x + b.w + 6, b.base + 22], [b.x + b.w * 0.5, b.base + 30], [b.x - 6, b.base + 20]], k, { width: 8, color: P.clay }); }
    caption(ctx, t);
  },
});
