// s8 — stage 5: moving and turning, slowly, with two caregivers (roles), then why two:
// the centre of mass shifts in the turn, the lift can sway, a heavy patient needs more force, and one person can't watch, steer and ready the chair at once.
import { headline } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, stepper, arrow, pill, ring, spine, heat, heatGood, shake } from '../lib/photo.js';
import { plate, cap, check, STAGES } from '../lib/steps.js';
const SPW = [[310, 720], [245, 830], [225, 950], [228, 1060], [245, 1150]];
MOTION.scene({
  id: 's8',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const tWhy = w('n20', 0).s, sw = at(t, tWhy - 0.4, tWhy + 0.3, 'cubicInOut');
    if (sw < 1) {
      const { M } = plate(ctx, X, t, 'm4', 5, { s: 1.0, cx: 540, cy: 1000 }, { s: 1.05, cx: 540, cy: 1020 });
      const kTurn = at(t, w('n18', 3).s, w('n18', 3).e + 0.6);
      X.save(); X.setLineDash([14, 10]); arrow(ctx, X, [M([380, 1740]), M([620, 1790]), M([860, 1740])], kTurn, { color: P.acc, width: 8 }); X.restore();
      check(ctx, X, 540, 440, 'לאט', at(t, w('n18', 4).s, w('n18', 4).s + 0.5), { size: 36 });
      const k2 = at(t, w('n18', 5).s, w('n18', 6).e);
      [[233, 860, '1'], [900, 940, '2']].forEach(([x, y, n]) => { const q = M([x, y]); if (k2 <= 0) return;
        X.save(); X.globalAlpha *= k2; X.fillStyle = P.acc; X.beginPath(); X.arc(q[0], q[1], 34, 0, 6.283); X.fill(); X.restore();
        ctx.text(X, n, q[0], q[1] + 13, { family: 'num', weight: 800, size: 38, color: P.bg, alpha: k2 }); });
      pill(ctx, X, ...M([250, 1100]), 'מוביל את המנוף', at(t, w('n19', 2).s, w('n19', 2).s + 0.5), { color: P.acc, size: 36 });
      ring(ctx, X, ...M([320, 950]), 44, t, at(t, w('n19', 2).s, w('n19', 4).e), { color: P.acc });
      pill(ctx, X, ...M([880, 1100]), 'צמודה למטופל', at(t, w('n19', 6).s, w('n19', 6).s + 0.5), { color: P.acc, size: 36 });
      const kFt = at(t, w('n19', 9).s, w('n19', 12).e);
      heatGood(ctx, X, ...M([625, 1600]), 130, kFt);
      check(ctx, X, ...M([625, 1700]), 'הרגליים לא מחליקות', at(t, w('n19', 11).s, w('n19', 11).s + 0.5), { size: 34 });
      const kKn = at(t, w('n19', 13).s, w('n19', 16).e);
      ring(ctx, X, ...M([550, 1400]), 46, t, kKn, { color: P.acc }); ring(ctx, X, ...M([683, 1400]), 46, t, kKn, { color: P.acc });
      headline(ctx, t, 'תנועה וסיבוב', 540, 330, { size: 108, times: [w('n18', 2).s, w('n18', 3).s] });
    }
    if (sw > 0) {
      // one caregiver: the lift sways, his back loads up
      const kSway = at(t, w('n20', 6).s, w('n20', 8).e) * (1 - at(t, w('n20', 9).s + 0.5, w('n20', 9).s + 1.2));
      const rot = 0.014 * kSway * Math.sin((t - w('n20', 6).s) * 6.5), [sx, sy] = shake(ctx, t, w('n20', 8).s, 8, 5);
      const K = lerpKB(ctx, kb({ s: 1.03, cx: 540, cy: 1150 }), kb({ s: 1.08, cx: 520, cy: 1150 }), at(t, tWhy, sc.end, 'sineInOut')); K.rot = rot; K.dx = sx; K.dy = sy;
      const M = mapper(K);
      X.save(); X.globalAlpha = sw; drawPhoto(ctx, X, 'm6', K, { filter: 'saturate(0.8)' }); shade(ctx, X, { dim: 0.15 }); stepper(ctx, X, 5, 1, { steps: STAGES }); X.restore();
      // centre of mass drifting in the turn
      const kCom = at(t, w('n20', 2).s, w('n20', 5).e) * (1 - at(t, w('n20', 9).s - 0.3, w('n20', 9).s));
      if (kCom > 0) {
        const ph = Math.sin((t - w('n20', 2).s) * 2.4), c = M([750 + 90 * ph * at(t, w('n20', 3).s, w('n20', 5).e), 1060]);
        X.save(); X.globalAlpha *= kCom; X.strokeStyle = P.hi; X.lineWidth = 5; X.beginPath(); X.arc(c[0], c[1], 26, 0, 6.283); X.stroke();
        X.beginPath(); X.moveTo(c[0] - 38, c[1]); X.lineTo(c[0] + 38, c[1]); X.moveTo(c[0], c[1] - 38); X.lineTo(c[0], c[1] + 38); X.stroke(); X.restore();
        pill(ctx, X, ...M([760, 880]), 'מרכז הכובד זז', kCom, { color: P.hi, size: 36 });
      }
      [[333, 1650], [783, 1742]].forEach(p => ring(ctx, X, ...M(p), 50, t, kSway, { color: P.clay }));
      pill(ctx, X, 540, 1640, 'המנוף מתנדנד', kSway, { color: P.clay, size: 38 });
      const kLoad = at(t, w('n20', 11).s, w('n20', 16).e) * (1 - at(t, w('n20', 17).s + 0.3, w('n20', 17).s + 0.9));
      spine(ctx, X, SPW.map(M), at(t, w('n20', 9).s, w('n20', 10).e + 0.4, 'cubicOut') * (1 - at(t, w('n20', 17).s + 0.3, w('n20', 17).s + 0.9)), { load: 0.15 + 0.75 * kLoad, scale: K.s });
      heat(ctx, X, ...M([240, 1110]), 150, kLoad);
      pill(ctx, X, ...M([420, 1000]), 'יותר כוח לנווט ולעצור', at(t, w('n20', 12).s, w('n20', 12).s + 0.5) * (1 - at(t, w('n20', 17).s, w('n20', 17).s + 0.4)), { color: P.clay, size: 36 });
      // one person, three jobs
      const jobs = [['להשגיח', 21, 790], ['לנווט', 22, 560], ['להכין את הכיסא', 23, 260]];
      jobs.forEach(([txt, i, x]) => check(ctx, X, x, 480, txt, at(t, w('n20', i).s, w('n20', i).s + 0.5), { ok: false, size: 36 }));
      const kOne = at(t, w('n20', 17).s, w('n20', 18).e);
      pill(ctx, X, ...M([250, 990]), 'מטפל אחד', kOne, { color: P.clay, size: 36 });
      headline(ctx, t, 'למה שניים?', 540, 330, { size: 112, times: [tWhy + 0.1, w('n20', 1).s], colors: [null, P.hi] });
    }
    cap(ctx, t);
  },
});
