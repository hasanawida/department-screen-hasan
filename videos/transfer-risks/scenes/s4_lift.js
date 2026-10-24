// s4 — stage 2, the lift: lifting with the back, not the legs; discs squeezed, nucleus pushed back; the patient's skin stretched.
import { caption, headline, sub, badge } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, spine, heat, lens, arrow, pill, stepper } from '../lib/photo.js';

const SP = [[338, 760], [245, 808], [165, 908], [130, 1012], [142, 1118]];

MOTION.scene({
  id: 's4',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tLift = w('l8', 2).s, tBack = w('l9', 3).s, tLegs = w('l9', 5).s, tDisc = w('l10', 0).s, tNuc = w('l10', 4).s, tPt = w('l11', 0).s, tTear = w('l11', 7).s;
    // photo ↔ disc render
    const disc = at(t, tDisc - 0.5, tDisc + 0.2, 'cubicInOut') * (1 - at(t, tPt - 0.6, tPt, 'cubicInOut'));
    const K = lerpKB(ctx, kb({ s: 1.02, cx: 420, cy: 1050 }), kb({ s: 1.14, cx: 300, cy: 1020 }), at(t, sc.start, tPt, 'sineInOut'));
    const K2 = lerpKB(ctx, K, kb({ s: 1.2, cx: 700, cy: 980 }), at(t, tPt - 0.6, tPt + 0.8, 'cubicInOut'));
    const KP = t < tPt - 0.6 ? K : K2, M = mapper(KP);
    if (disc < 1) {
      drawPhoto(ctx, X, 'lift', KP);
      const layer = at(t, w('l9', 0).s - 0.2, w('l9', 0).s + 0.5) * (1 - 0.6 * at(t, tPt - 0.4, tPt + 0.4));
      shade(ctx, X, { dim: layer * 0.7 });
      const load = 0.35 + 0.65 * at(t, tBack - 0.2, tBack + 0.6);
      spine(ctx, X, SP.map(M), at(t, w('l9', 0).s, w('l9', 2).e, 'cubicOut'), { load, scale: KP.s, alpha: 1 - 0.7 * at(t, tPt - 0.4, tPt + 0.4) });
      heat(ctx, X, ...M([125, 1040]), 160 * KP.s, at(t, tBack - 0.2, tBack + 0.6) * (1 - 0.7 * at(t, tPt - 0.4, tPt + 0.4)));
      badge(ctx, X, ...M([60, 860]), 40, 'x', at(t, tBack, tBack + 0.6) * (1 - at(t, tDisc - 0.6, tDisc - 0.2)));
      const kL = at(t, tLegs, tLegs + 0.6) * (1 - at(t, tDisc - 0.6, tDisc - 0.2));
      if (kL > 0) { ctx.drawPath(X, [M([180, 1160]), M([300, 1355]), M([330, 1610])], kL, { width: 9, color: P.mut, smooth: false }); pill(ctx, X, ...M([470, 1450]), 'הרגליים לא עובדות', kL, { color: P.mut, size: 38 }); }
      // patient pulled up, skin stretched
      arrow(ctx, X, [M([720, 1180]), M([720, 930])], at(t, w('l11', 1).s, w('l11', 2).e), { color: P.acc, width: 12, smooth: false });
      const kS = at(t, w('l11', 3).s, w('l11', 5).e);
      heat(ctx, X, ...M([655, 905]), 120 * KP.s, kS * (0.8 + 0.2 * Math.sin(t * 6)));
      if (kS > 0) { X.save(); X.strokeStyle = P.hi; X.lineWidth = 4; X.lineCap = 'round'; X.globalAlpha = kS; for (let i = 0; i < 4; i++) { const [x, y] = M([610 + i * 22, 960 + i * 14]); X.beginPath(); X.moveTo(x - 26, y); X.lineTo(x + 26, y - 30 * kS); X.stroke(); } X.restore(); }
      const kT = at(t, tTear - 0.2, tTear + 0.6, 'cubicOut');
      const Ls = lens(ctx, X, 'skin', 330, 760, 215, { x: 560, y: 990, s: 1.1 }, kT, { from: M([650, 905]), color: P.clay });
      if (Ls) { pill(ctx, X, ...Ls.map([640, 900]), 'קרע עור', at(t, tTear, tTear + 0.5), { color: P.clay, size: 36 }); pill(ctx, X, ...Ls.map([470, 1110]), 'שטף דם', at(t, w('l11', 9).s, w('l11', 9).s + 0.5), { color: P.clay, size: 36 }); }
    }
    if (disc > 0) {
      X.save(); X.globalAlpha = disc;
      const KD = kb({ s: 1.0 + 0.06 * at(t, tDisc, tPt, 'sineInOut'), cx: 380, cy: 960 }), MD = mapper(KD);
      drawPhoto(ctx, X, 'disc', KD); shade(ctx, X);
      const sq = at(t, w('l10', 3).s - 0.2, w('l10', 3).s + 0.4);
      arrow(ctx, X, [MD([370, 380]), MD([370, 560])], sq, { color: P.clay, width: 14, smooth: false });
      arrow(ctx, X, [MD([385, 1520]), MD([385, 1350])], sq, { color: P.clay, width: 14, smooth: false });
      heat(ctx, X, ...MD([400, 955]), 170, sq * 0.7);
      arrow(ctx, X, [MD([300, 960]), MD([540, 960])], at(t, tNuc, w('l10', 7).e), { color: P.hi, width: 12, smooth: false });
      pill(ctx, X, ...MD([420, 1300]), 'הגרעין נדחק אחורה', at(t, tNuc, tNuc + 0.6), { color: P.hi, size: 42 });
      pill(ctx, X, ...MD([780, 1130]), 'לכיוון העצב', at(t, w('l10', 7).s, w('l10', 7).s + 0.6), { color: P.ink, size: 38 });
      X.restore();
    }
    stepper(ctx, X, 2);
    headline(ctx, t, 'הרמה', 540, 318, { size: 124, times: [tLift], out: w('l9', 0).s - 0.35 });
    headline(ctx, t, 'מרים עם הגב', 540, 318, { size: 108, times: [w('l9', 1).s, tBack], colors: [null, null, P.clay], out: tDisc - 0.6 });
    headline(ctx, t, 'הדיסקים נלחצים', 540, 318, { size: 104, times: [tDisc, w('l10', 3).s], colors: [null, P.clay], out: tPt - 0.4 });
    headline(ctx, t, 'העור נמתח', 540, 318, { size: 112, times: [w('l11', 3).s, w('l11', 5).s], out: tTear - 0.3 });
    headline(ctx, t, 'קרעי עור ושטפי דם', 540, 318, { size: 92, maxWidth: 1000, times: [tTear, w('l11', 8).s, w('l11', 9).s, w('l11', 10).s], colors: [P.clay, P.clay, P.clay, P.clay] });
    caption(ctx, t);
  },
});
