// s8 — stage 5: moving — slowly, pushing only on the lift's handle; one caregiver steers, the other guides head and legs;
// the patient hangs free and can swing, so no sudden stops and no swinging turns.
import { headline } from '../lib/ui.js';
import { arrow, pill, ring } from '../lib/photo.js';
import { plate, cap, check } from '../lib/steps.js';
MOTION.scene({
  id: 's8',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const { M } = plate(ctx, X, t, 'h5', 5, { s: 1.03, cx: 560, cy: 1000, dy: -40 }, { s: 1.07, cx: 580, cy: 1000, dy: -40 });
    const tR = w('n20', 0).s, tSw = w('n21', 0).s;
    check(ctx, X, 540, 440, 'לאט', at(t, w('n19', 4).s, w('n19', 4).s + 0.5) * (1 - at(t, tR - 0.4, tR)), { size: 38 });
    ring(ctx, X, ...M([360, 890]), 60, t, at(t, w('n19', 5).s, w('n19', 9).e) * (1 - at(t, tSw - 0.4, tSw)), { color: P.acc });
    pill(ctx, X, ...M([330, 1010]), 'דוחפים בידית', at(t, w('n19', 7).s, w('n19', 7).s + 0.5) * (1 - at(t, tR - 0.4, tR)), { color: P.acc, size: 36 });
    pill(ctx, X, ...M([200, 540]), 'מוביל', at(t, w('n20', 2).s, w('n20', 2).s + 0.5) * (1 - at(t, tSw - 0.4, tSw)), { color: P.acc, size: 38 });
    pill(ctx, X, ...M([900, 640]), 'מכוונת', at(t, w('n20', 6).s, w('n20', 6).s + 0.5) * (1 - at(t, tSw - 0.4, tSw)), { color: P.acc, size: 38 });
    const kHL = at(t, w('n20', 10).s, w('n20', 13).e) * (1 - at(t, tSw - 0.4, tSw));
    ring(ctx, X, ...M([680, 790]), 60, t, kHL, { color: P.hi }); ring(ctx, X, ...M([520, 1440]), 60, t, kHL, { color: P.hi });
    // the pendulum: hangs from the spreader bar and can swing
    const kP = at(t, tSw, w('n21', 5).e), piv = M([700, 720]);
    if (kP > 0) {
      const amp = 0.16 * Math.sin((t - tSw) * 2.6) * kP, L = M([720, 1100])[1] - piv[1], bob = [piv[0] + Math.sin(amp) * L, piv[1] + Math.cos(amp) * L];
      X.save(); X.globalAlpha *= kP; X.setLineDash([12, 10]); X.strokeStyle = P.hi; X.lineWidth = 5;
      X.beginPath(); X.moveTo(...piv); X.lineTo(...bob); X.stroke(); X.setLineDash([]);
      X.beginPath(); X.arc(piv[0], piv[1], L, Math.PI / 2 - 0.22, Math.PI / 2 + 0.22); X.stroke();
      X.fillStyle = P.hi; X.beginPath(); X.arc(piv[0], piv[1], 10, 0, 6.283); X.fill(); X.beginPath(); X.arc(bob[0], bob[1], 18, 0, 6.283); X.fill(); X.restore();
      pill(ctx, X, ...M([700, 640]), 'עלול להתנדנד', at(t, w('n21', 4).s, w('n21', 4).s + 0.5), { color: P.hi, size: 38 });
    }
    check(ctx, X, 770, 470, 'עצירה פתאומית', at(t, w('n21', 8).s, w('n21', 8).s + 0.5), { ok: false, size: 34 });
    check(ctx, X, 330, 470, 'סיבוב בתנופה', at(t, w('n21', 12).s, w('n21', 12).s + 0.5), { ok: false, size: 34 });
    headline(ctx, t, 'תנועה', 540, 330, { size: 124, times: [w('n19', 2).s], out: tSw - 0.4 });
    headline(ctx, t, 'בלי תנופה', 540, 330, { size: 112, times: [tSw + 0.1, w('n21', 1).s], colors: [null, P.hi] });
    cap(ctx, t);
  },
});
