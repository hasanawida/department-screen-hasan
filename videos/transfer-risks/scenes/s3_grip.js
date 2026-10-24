// s3 — stage 1, the grip: standing far, bending from the waist, straight knees, reaching under the armpits.
import { caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, spine, heat, lens, arrow, pill, stepper, loadColor } from '../lib/photo.js';

const SP = [[470, 808], [335, 805], [215, 888], [152, 990], [158, 1090]];

MOTION.scene({
  id: 's3',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tFar = w('l4', 3).s, tBend = w('l4', 5).s, tKnee = w('l5', 0).s, tArms = w('l5', 2).s, tL6 = w('l6', 0).s, tLoad = w('l6', 5).s, tPt = w('l7', 0).s, tSkin = w('l7', 2).s;
    const A = kb({ s: 1.0, cx: 540, cy: 1100 }), B = kb({ s: 1.12, cx: 300, cy: 1050 }), C = kb({ s: 1.18, cx: 860, cy: 1020 });
    const K = t < tPt - 0.8 ? lerpKB(ctx, A, B, at(t, sc.start, tPt - 0.8, 'sineInOut')) : lerpKB(ctx, B, C, at(t, tPt - 0.8, tPt + 0.8, 'cubicInOut'));
    drawPhoto(ctx, X, 'grip', K);
    const layer = at(t, tBend - 0.3, tBend + 0.4) * (1 - 0.5 * at(t, tPt - 0.5, tPt + 0.3));
    shade(ctx, X, { dim: layer * 0.7 });
    const M = mapper(K), load = at(t, tLoad - 0.2, w('l6', -1).e, 'cubicInOut') * 0.95 + 0.25 * at(t, tBend, tBend + 1);
    // distance between the feet
    const kF = at(t, tFar, tFar + 0.6) * (1 - at(t, tKnee - 0.4, tKnee));
    if (kF > 0) { const a = M([300, 1590]), b = M([600, 1590]); arrow(ctx, X, [a, b], kF, { color: P.hi, width: 8, smooth: false }); arrow(ctx, X, [b, a], kF, { color: P.hi, width: 8, smooth: false }); pill(ctx, X, (a[0] + b[0]) / 2, a[1] - 60, 'רחוק', kF, { color: P.hi }); }
    // spine layer
    spine(ctx, X, SP.map(M), at(t, tBend - 0.1, tBend + 1.0, 'cubicOut'), { load, scale: K.s, alpha: 1 - 0.6 * at(t, tPt - 0.5, tPt + 0.3) });
    heat(ctx, X, ...M([150, 1010]), 150 * K.s, load * (1 - 0.6 * at(t, tPt - 0.5, tPt + 0.3)));
    // straight knees + reaching arms
    const kK = at(t, tKnee, tKnee + 0.6) * (1 - at(t, tL6 - 0.4, tL6));
    if (kK > 0) { ctx.drawPath(X, [M([200, 1120]), M([215, 1390]), M([255, 1630])], kK, { width: 9, color: P.hi, smooth: false }); X.save(); X.fillStyle = P.hi; const kn = M([215, 1390]); X.globalAlpha = kK; X.beginPath(); X.arc(kn[0], kn[1], 15, 0, 6.283); X.fill(); X.restore(); pill(ctx, X, ...M([430, 1250]), 'ברכיים ישרות', kK, { color: P.hi, size: 40 }); }
    const kA = at(t, tArms, tArms + 0.7) * (1 - at(t, tL6 - 0.4, tL6));
    if (kA > 0) arrow(ctx, X, [M([450, 850]), M([660, 900]), M([850, 975])], kA, { color: P.acc, width: 10 });
    // lever arm: lower back ↔ the patient's weight
    const kL = at(t, w('l6', 1).s, w('l6', 4).e) * (1 - at(t, tPt - 0.5, tPt));
    if (kL > 0) {
      const a = M([150, 1000]), b = M([880, 1000]);
      X.save(); X.setLineDash([16, 12]); ctx.drawPath(X, [a, b], kL, { width: 6, color: P.ink, smooth: false }); X.restore();
      arrow(ctx, X, [M([880, 1000]), M([880, 1230])], at(t, w('l6', 2).s, w('l6', 3).e), { color: P.clay, width: 10, smooth: false });
      pill(ctx, X, (a[0] + b[0]) / 2, a[1] - 50, 'מרחק', kL, { size: 40 });
      pill(ctx, X, ...M([880, 1290]), 'משקל', at(t, w('l6', 2).s, w('l6', 3).e), { color: P.clay, size: 40 });
    }
    const kB = at(t, tLoad, tLoad + 0.6) * (1 - at(t, tPt - 0.5, tPt));
    pill(ctx, X, ...M([175, 880]), 'עומס על הגב', kB, { color: loadColor(ctx, load), size: 42 });
    // patient: fingers on thin skin
    const kP = at(t, tSkin - 0.2, tSkin + 0.5);
    heat(ctx, X, ...M([872, 990]), 120 * K.s, kP * (0.75 + 0.25 * Math.sin(t * 5)));
    heat(ctx, X, ...M([905, 1100]), 95 * K.s, at(t, w('l7', -1).s - 0.2, w('l7', -1).s + 0.5));
    lens(ctx, X, 'skin', 330, 760, 210, { x: 520, y: 990, s: 1.15 }, at(t, w('l7', 5).s - 0.1, w('l7', 5).s + 0.6, 'cubicOut'), { from: M([860, 995]), color: P.clay });

    stepper(ctx, X, 1, at(t, sc.start + 0.2, sc.start + 0.8));
    headline(ctx, t, 'עומד רחוק', 540, 318, { size: 108, times: [tFar, w('l4', 4).s], out: tBend - 0.35 });
    headline(ctx, t, 'מתכופף מהמותניים', 540, 318, { size: 96, maxWidth: 1000, times: [tBend, w('l4', 6).s], out: tKnee - 0.35 });
    headline(ctx, t, 'ברכיים ישרות', 540, 318, { size: 104, times: [tKnee, w('l5', 1).s], out: tArms - 0.35 });
    headline(ctx, t, 'ידיים קדימה', 540, 318, { size: 104, times: [tArms, w('l5', 4).s], out: tL6 - 0.35 });
    headline(ctx, t, 'יותר רחוק, יותר עומס', 540, 318, { size: 92, maxWidth: 1000, times: [w('l6', 2).s, w('l6', 3).s, w('l6', 5).s, w('l6', 9).s], out: tPt - 0.35, colors: [null, null, P.clay, P.clay] });
    headline(ctx, t, 'לחץ על עור דק', 540, 318, { size: 104, times: [tSkin, w('l7', 5).s, w('l7', 6).s], colors: [null, null, P.clay] });
    caption(ctx, t);
  },
});
