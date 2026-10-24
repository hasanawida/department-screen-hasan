// s7 — meanwhile the patient's feet drag and the shin hits the wheelchair: scratches, skin tears, hematomas.
import { caption, headline } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, lens, arrow, pill, stepper, shake } from '../lib/photo.js';

MOTION.scene({
  id: 's7',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tDrag = w('l16', 4).s, tHit = w('l16', 8).s, tS = w('l16', 10).s, tT = w('l16', 11).s, tH = w('l16', 13).s;
    const [sx, sy] = shake(ctx, t, tHit, 16, 6);
    const K = lerpKB(ctx, kb({ s: 1.0, cx: 540, cy: 1000 }), kb({ s: 1.12, cx: 480, cy: 1120 }), at(t, sc.start, tHit, 'sineInOut'));
    K.dx = sx; K.dy = sy; const M = mapper(K);
    drawPhoto(ctx, X, 'shin', K);
    shade(ctx, X, { dim: 0.5 * at(t, tS - 0.3, tS + 0.3) });
    // drag trails
    const kD = at(t, tDrag - 0.1, tDrag + 0.6) * (1 - at(t, tHit, tHit + 0.6));
    if (kD > 0) { X.save(); X.strokeStyle = P.ink; X.lineCap = 'round'; X.lineWidth = 6; X.globalAlpha = 0.7 * kD; for (let i = 0; i < 4; i++) { const [x, y] = M([560 + i * 30, 1150 + i * 26]); X.beginPath(); X.moveTo(x + 40, y); X.lineTo(x + 40 + 160 * kD, y); X.stroke(); } X.restore(); }
    arrow(ctx, X, [M([760, 1330]), M([450, 1330])], kD, { color: P.hi, width: 10, smooth: false });
    pill(ctx, X, ...M([620, 1400]), 'נגררות', kD, { color: P.hi, size: 40 });
    // impact
    const kI = at(t, tHit - 0.05, tHit + 0.25, 'expoOut') * (1 - at(t, tS - 0.3, tS));
    if (kI > 0) { const [x, y] = M([520, 1130]); X.save(); X.strokeStyle = P.clay; X.lineWidth = 8; X.lineCap = 'round'; X.globalAlpha = kI; for (let j = 0; j < 10; j++) { const a = j * 0.628; X.beginPath(); X.moveTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40); X.lineTo(x + Math.cos(a) * (70 + 50 * kI), y + Math.sin(a) * (70 + 50 * kI)); X.stroke(); } X.restore(); }
    // injuries on the skin
    const kL = at(t, tS - 0.3, tS + 0.5, 'cubicOut');
    const Ls = lens(ctx, X, 'skin', 540, 840, 300, { x: 560, y: 1000, s: 1.15 }, kL, { from: M([520, 1130]), color: P.clay });
    if (Ls) {
      pill(ctx, X, 540, 1200, 'שריטות', at(t, tS, tS + 0.5), { color: P.clay, size: 42 });
      pill(ctx, X, ...Ls.map([650, 930]), 'קרע עור', at(t, tT, tT + 0.5), { color: P.clay, size: 40 });
      pill(ctx, X, ...Ls.map([450, 1120]), 'המטומה', at(t, tH, tH + 0.5), { color: P.clay, size: 40 });
    }
    stepper(ctx, X, 3);
    headline(ctx, t, 'הרגליים נגררות', 540, 318, { size: 104, times: [w('l16', 1).s, tDrag], out: tHit - 0.35 });
    headline(ctx, t, 'השוק נחבטת בכיסא', 540, 318, { size: 96, maxWidth: 1000, times: [w('l16', 7).s, tHit, w('l16', 9).s], colors: [null, P.clay, null], out: tS - 0.4 });
    headline(ctx, t, 'פגיעות בעור', 540, 318, { size: 112, times: [tS, tT], colors: [null, P.clay] });
    caption(ctx, t);
  },
});
