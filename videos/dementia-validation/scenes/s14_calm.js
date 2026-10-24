// s14 — and the brain? Instead of an alarm, a sense of safety: the amygdala's red glow turns calm teal.
// He may forget the conversation; the good feeling he keeps.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, shade } from '../lib/photo.js';
import { cap, alarm, calm } from '../lib/dv.js';
const AMY = [605, 1049];
let OC = null;
MOTION.scene({
  id: 's14',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tC = w('l49', 3).s - 0.3, kC = at(t, tC, tC + 1.2, 'sineInOut'), tP = w('l50', 0).s - 0.4, kP = at(t, tP, tP + 0.9);
    const K = kb({ s: 1.1 + 0.05 * at(t, sc.start, tP), cx: AMY[0], cy: AMY[1] - 60 });
    drawPhoto(ctx, X, 'b2', K);
    // the amygdala glow: red (b4) → teal (b4 hue-rotated), feathered to the region
    if (!OC) { OC = document.createElement('canvas'); OC.width = ctx.W; OC.height = ctx.H; }
    const O = OC.getContext('2d'); O.setTransform(1, 0, 0, 1, 0, 0); O.clearRect(0, 0, OC.width, OC.height); O.setTransform(OC.width / 1080, 0, 0, OC.height / 1920, 0, 0);
    O.filter = kC > 0 ? `hue-rotate(${Math.round(170 * kC)}deg) saturate(${1 + 0.2 * kC})` : 'none'; drawPhoto(ctx, O, 'b4', K); O.filter = 'none';
    const M = ([x, y]) => [(x - K.cx) * K.s + K.cx, (y - K.cy) * K.s + K.cy], A = M(AMY);
    O.globalCompositeOperation = 'destination-in'; const g = O.createRadialGradient(A[0], A[1], 20, A[0], A[1], 220); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); O.fillStyle = g; O.fillRect(0, 0, 1080, 1920); O.globalCompositeOperation = 'source-over';
    X.save(); X.resetTransform ? ctx.resetTransform(X) : 0; X.drawImage(OC, 0, 0, 1080, 1920); X.restore();
    alarm(ctx, X, t, A[0], A[1], (1 - kC) * at(t, sc.start, sc.start + 0.6), { r: 60 });
    calm(ctx, X, t, A[0], A[1], kC, { r: 70 });
    shade(ctx, X, { topH: 430 });
    if (kP > 0) { X.save(); X.globalAlpha = kP; drawPhoto(ctx, X, 'd9', kb({ s: 1.06 + 0.06 * at(t, tP, sc.end), cx: 540, cy: 1100 })); shade(ctx, X); X.restore(); }
    headline(ctx, t, 'במקום אזעקה', 540, 300, { size: 96, t0: w('l49', 1).s, out: w('l49', 3).s - 0.2, color: P.clay });
    headline(ctx, t, 'תחושת ביטחון', 540, 300, { size: 104, t0: w('l49', 3).s, out: tP - 0.2, color: P.acc });
    headline(ctx, t, 'השיחה תישכח', 540, 300, { size: 84, t0: w('l50', 0).s, color: P.mut });
    headline(ctx, t, 'התחושה הטובה נשארת', 540, 420, { size: 80, t0: w('l50', 5).s, color: P.acc });
    cap(ctx, t);
  },
});
