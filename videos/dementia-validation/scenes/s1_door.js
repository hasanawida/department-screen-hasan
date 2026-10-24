// s1 — evening in the nursing home: he stands at the door in his coat; "mother is waiting" (the old photo floats up);
// but his mother died long ago — what do we answer?
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, shade } from '../lib/photo.js';
import { cap, polaroid, glow } from '../lib/dv.js';
MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const K = kb({ s: 1.0 + 0.1 * at(t, sc.start, sc.end, 'sineInOut'), cx: 700, cy: 900 });
    drawPhoto(ctx, X, 'd0', K); shade(ctx, X, { dim: 0.25 * at(t, w('l3', 7).s - 0.3, w('l3', 7).s + 0.4) });
    // the mother he is going to — an old photo rising from his head
    const kM = at(t, w('l2', 6).s - 0.2, w('l2', 6).s + 0.8, 'cubicOut'), grey = at(t, w('l3', 3).s - 0.1, w('l3', 3).e + 0.4);
    if (kM > 0) {
      X.save(); X.globalAlpha = kM * 0.8; X.setLineDash([2, 18]); X.lineCap = 'round'; X.strokeStyle = P.hi; X.lineWidth = 9;
      X.beginPath(); X.moveTo(690, 560); X.quadraticCurveTo(640, 520, 590, 545); X.stroke(); X.restore();
      glow(ctx, X, 450, 560, 260, '245,194,107', kM * 0.35 * (1 - grey));
      polaroid(ctx, X, 450, 560, 220, -0.06 + 0.01 * Math.sin(t * 0.8), kM, { filter: grey > 0 ? `grayscale(${grey}) brightness(${1 - 0.35 * grey})` : undefined });
    }
    headline(ctx, t, 'ערב בבית האבות', 540, 300, { size: 92, times: [w('l1', 0).s, w('l1', 1).s, w('l1', 2).s], out: w('l2', 6).s - 0.5 });
    headline(ctx, t, 'אמא מחכה לי', 540, 300, { size: 96, t0: w('l2', 6).s, out: w('l3', 7).s - 0.4, color: P.hi });
    headline(ctx, t, 'מה עונים לו?', 540, 300, { size: 104, times: [w('l3', 7).s, w('l3', 8).s, w('l3', 9).s], color: P.hi });
    cap(ctx, t);
  },
});
