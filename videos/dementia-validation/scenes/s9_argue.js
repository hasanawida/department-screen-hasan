// s9 — answer 1, arguing: he can't follow the logic, only feels someone stopping him from going to his mother;
// the alarm fires and the damaged brakes don't hold → fear, anger, sometimes aggression. He'll forget the argument, not the anger.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, shade, pill, lens } from '../lib/photo.js';
import { cap, alarm, glow, pillRow } from '../lib/dv.js';
MOTION.scene({
  id: 's9',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tA = w('l31', 0).s - 0.4, kA = at(t, tA, tA + 0.8);
    drawPhoto(ctx, X, 'd1', kb({ s: 1.04 + 0.06 * at(t, sc.start, tA), cx: 600, cy: 900 }));
    X.save(); X.globalAlpha = kA; drawPhoto(ctx, X, 'd4', kb({ s: 1.06 + 0.05 * at(t, tA, sc.end), cx: 620, cy: 900, dy: 110 * kA })); X.restore();
    shade(ctx, X, { dim: 0.15 * at(t, w('l32', 0).s, w('l32', 0).s + 0.5) });
    pill(ctx, X, 760, 880, 'עוצרים אותו', at(t, w('l30', 9).s, w('l30', 11).e) * (1 - kA), { color: P.clay, size: 44 });
    // inside his head: the alarm (amygdala lens), brakes damaged
    const kL = at(t, w('l31', 0).s, w('l31', 1).e) * (1 - at(t, w('l32', 0).s - 0.3, w('l32', 0).s + 0.2));
    if (kL > 0) {
      const L = lens(ctx, X, 'b4', 400, 560, 150, { x: 560, y: 1010, s: 1.1 }, kL, { color: P.clay, from: [690, 790] });
      if (L) { const a = L.map([605, 1049]); alarm(ctx, X, t, a[0], a[1], kL, { r: 34, width: 4 }); }
      pill(ctx, X, 800, 480, 'האזעקה נדלקת', kL, { color: P.clay, size: 40 });
      pill(ctx, X, 800, 570, 'הבלמים פגועים', kL * at(t, w('l31', 3).s, w('l31', 6).e), { color: P.hi, size: 40 });
    }
    const row = pillRow(ctx, t, [['פחד', w('l31', 9).s], ['כעס', w('l31', 10).s], ['תוקפנות', w('l31', 12).s]], 0, { size: 46, out: w('l32', 0).s - 0.3 });
    row.forEach(([x, txt, k]) => pill(ctx, X, x, 1250, txt, k, { color: P.clay, size: 46 }));
    glow(ctx, X, 702, 781, 230, '229,72,77', at(t, w('l32', 4).s, w('l32', 6).e) * (0.6 + 0.3 * Math.sin(t * 4)));
    headline(ctx, t, '1 · ויכוח', 540, 300, { size: 104, t0: w('l29', 4).s - 0.2, out: w('l32', 0).s - 0.3, color: P.clay });
    headline(ctx, t, 'את הוויכוח — ישכח', 540, 300, { size: 84, t0: w('l32', 0).s, color: P.mut });
    headline(ctx, t, 'את הכעס — לא', 540, 420, { size: 92, t0: w('l32', 4).s, color: P.clay });
    cap(ctx, t);
  },
});
