// s8 — stage 4, lowering: strength runs out, the patient drops into the chair → vertebral compression fracture risk.
import { caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, spine, heat, arrow, pill, stepper, shake, ring } from '../lib/photo.js';

const SP = [[600, 790], [720, 815], [835, 895], [925, 985], [945, 1075]];

MOTION.scene({
  id: 's8',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tLow = w('l17', 2).s, tGone = w('l18', 0).s, tDrop = w('l18', 3).s, tVert = w('l19', 0).s, tLand = w('l19', 3).s, tFx = w('l19', 8).s;
    const vert = at(t, tVert - 0.6, tVert + 0.1, 'cubicInOut');
    if (vert < 1) {
      const [sx, sy] = shake(ctx, t, tDrop + 0.1, 18, 6);
      const K = lerpKB(ctx, kb({ s: 1.0, cx: 540, cy: 1150 }), kb({ s: 1.1, cx: 450, cy: 1150 }), at(t, sc.start, tVert, 'sineInOut'));
      K.dx = sx; K.dy = sy + 22 * at(t, tDrop, tDrop + 0.25, 'expoIn') * (1 - at(t, tDrop + 0.3, tDrop + 1)); const M = mapper(K);
      drawPhoto(ctx, X, 'drop', K);
      shade(ctx, X, { dim: 0.6 * at(t, tGone - 0.2, tGone + 0.4) });
      spine(ctx, X, SP.map(M), at(t, tGone, tGone + 0.9, 'cubicOut'), { load: 0.85, scale: K.s });
      heat(ctx, X, ...M([925, 1000]), 150 * K.s, at(t, tGone, tGone + 0.7));
      arrow(ctx, X, [M([330, 900]), M([340, 1210])], at(t, tDrop - 0.1, tDrop + 0.3, 'expoIn'), { color: P.clay, width: 14, smooth: false });
      ring(ctx, X, ...M([400, 1300]), 120, t, at(t, tDrop + 0.2, tDrop + 0.6));
      pill(ctx, X, ...M([560, 1200]), 'נחיתה חזקה', at(t, tDrop + 0.2, tDrop + 0.7), { color: P.clay, size: 44 });
    }
    if (vert > 0) {
      X.save(); X.globalAlpha = vert;
      const KV = kb({ s: 1.0 + 0.08 * at(t, tVert, sc.end, 'sineInOut'), cx: 554, cy: 907 }), MV = mapper(KV);
      drawPhoto(ctx, X, 'vert', KV); shade(ctx, X);
      const kA = at(t, tLand - 0.1, tLand + 0.4);
      arrow(ctx, X, [MV([560, 330]), MV([560, 600])], kA, { color: P.clay, width: 14, smooth: false });
      heat(ctx, X, ...MV([560, 905]), 190, at(t, tFx - 0.3, tFx + 0.4) * (0.8 + 0.2 * Math.sin(t * 6)));
      ring(ctx, X, ...MV([560, 905]), 160, t, at(t, tFx, tFx + 0.5));
      pill(ctx, X, ...MV([560, 1150]), 'שבר דחיסה בחוליה', at(t, tFx, tFx + 0.5), { color: P.clay, size: 46 });
      X.restore();
    }
    stepper(ctx, X, 4);
    headline(ctx, t, 'הורדה', 540, 318, { size: 124, times: [tLow], out: tGone - 0.35 });
    headline(ctx, t, 'הכוח נגמר', 540, 318, { size: 112, times: [tGone, w('l18', 1).s], out: tDrop - 0.3 });
    headline(ctx, t, 'צונח בבת אחת', 540, 318, { size: 108, times: [tDrop, w('l18', 5).s, w('l18', 6).s], colors: [P.clay, null, null], out: tVert - 0.4 });
    headline(ctx, t, 'עצם חלשה', 540, 318, { size: 112, times: [tVert, w('l19', 1).s], out: tFx - 0.4 });
    sub(ctx, t, 'אוסטאופורוזיס', 540, 405, { t0: w('l19', 2).s, size: 54, color: P.hi, out: tFx - 0.4 });
    headline(ctx, t, 'שבר דחיסה', 540, 318, { size: 116, times: [tFx, w('l19', 9).s], color: P.clay });
    caption(ctx, t);
  },
});
