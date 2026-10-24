// s5 — stage 3, the pivot: feet stay planted while the trunk twists with the full load.
import { caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, heat, arrow, pill, stepper } from '../lib/photo.js';

MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tTurn = w('l12', 2).s, tFeet = w('l13', 0).s, tPlant = w('l13', 4).s, tTwist = w('l13', 6).s, tLoad = w('l13', 10).s;
    const K = lerpKB(ctx, kb({ s: 1.0, cx: 540, cy: 900 }), kb({ s: 1.1, cx: 560, cy: 860 }), at(t, sc.start, sc.end + 0.7, 'sineInOut')), M = mapper(K);
    drawPhoto(ctx, X, 'twist', K);
    shade(ctx, X, { dim: 0.6 * at(t, tFeet - 0.2, tFeet + 0.5) });
    // to the chair
    arrow(ctx, X, [M([800, 1010]), M([560, 1130]), M([260, 1000])], at(t, tTurn, w('l12', 4).e + 0.2), { color: P.acc, width: 12 });
    // planted feet
    const kF = at(t, tFeet, tPlant + 0.4);
    for (const p of [[480, 1215], [640, 1180]]) {
      const [x, y] = M(p); if (kF <= 0) continue;
      X.save(); X.globalAlpha = kF; X.strokeStyle = P.hi; X.lineWidth = 6; X.beginPath(); X.ellipse(x, y, 62, 26, 0, 0, 6.283); X.stroke();
      X.fillStyle = 'rgba(245,194,107,0.25)'; X.fill(); X.restore();
    }
    pill(ctx, X, ...M([560, 1300]), 'נשארות במקום', at(t, tPlant, tPlant + 0.5), { color: P.hi, size: 40 });
    // hips line vs shoulders line → twist wedge
    const kT = at(t, tTwist - 0.1, tTwist + 0.9, 'cubicInOut');
    if (kT > 0) {
      const c = M([600, 760]), ang = -0.75 * kT;
      X.save(); X.lineCap = 'round';
      X.strokeStyle = P.hi; X.lineWidth = 8; X.globalAlpha = Math.min(1, kT * 2); X.beginPath(); X.moveTo(c[0] - 170, c[1] + 190); X.lineTo(c[0] + 170, c[1] + 190); X.stroke();
      X.strokeStyle = P.clay; X.lineWidth = 10; X.beginPath(); X.moveTo(c[0] - 180 * Math.cos(ang), c[1] - 200 - 180 * Math.sin(ang)); X.lineTo(c[0] + 180 * Math.cos(ang), c[1] - 200 + 180 * Math.sin(ang)); X.stroke();
      X.fillStyle = 'rgba(229,72,77,0.28)'; X.beginPath(); X.moveTo(c[0], c[1]); X.arc(c[0], c[1], 150, 0, ang, true); X.closePath(); X.fill();
      X.restore();
      arrow(ctx, X, [[c[0] + 220, c[1] - 90], [c[0], c[1] - 175], [c[0] - 220, c[1] - 90]], kT, { color: P.clay, width: 12 });
      pill(ctx, X, c[0] - 250, c[1] + 120, 'פיתול', kT, { color: P.clay, size: 46 });
    }
    heat(ctx, X, ...M([640, 830]), 170 * K.s, at(t, tLoad - 0.3, tLoad + 0.5) * (0.8 + 0.2 * Math.sin(t * 6)));
    pill(ctx, X, ...M([700, 640]), 'כל המשקל על הגב', at(t, tLoad - 0.1, tLoad + 0.5), { color: P.clay, size: 40 });
    stepper(ctx, X, 3);
    headline(ctx, t, 'סיבוב', 540, 318, { size: 124, times: [tTurn], out: tFeet - 0.35 });
    sub(ctx, t, 'אל הכיסא', 540, 405, { t0: w('l12', 3).s, size: 52, color: P.ink, out: tFeet - 0.35 });
    headline(ctx, t, 'הרגליים נשארות', 540, 318, { size: 104, times: [tFeet, tPlant], out: tTwist - 0.35 });
    headline(ctx, t, 'הגוף מסתובב', 540, 318, { size: 108, times: [tTwist, w('l13', 7).s], colors: [null, P.clay] });
    caption(ctx, t);
  },
});
