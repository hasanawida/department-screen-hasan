// s9 — worst case: both lose balance and fall together → hip fracture, head injury; the caregiver is hurt too.
import { caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, heat, lens, arrow, pill, stepper, shake, ring } from '../lib/photo.js';

MOTION.scene({
  id: 's9',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tBal = w('l20', 3).s, tFall = w('l20', 6).s, tHip = w('l21', 0).s, tHead = w('l21', 2).s, tCg = w('l21', 6).s;
    const cg = at(t, tCg - 0.6, tCg + 0.1, 'cubicInOut');
    if (cg < 1) {
      const [sx, sy] = shake(ctx, t, tFall + 0.15, 22, 5);
      const K = lerpKB(ctx, kb({ s: 1.0, cx: 520, cy: 1100 }), kb({ s: 1.06, cx: 520, cy: 1100, rot: 0.035 }), at(t, tBal - 0.2, tFall + 0.4, 'cubicIn'));
      K.dx = sx; K.dy = sy; const M = mapper(K);
      drawPhoto(ctx, X, 'fall', K);
      shade(ctx, X, { dim: 0.5 * at(t, tHip - 0.3, tHip + 0.3) });
      const kB = at(t, tBal, tBal + 0.7) * (1 - at(t, tHip - 0.4, tHip));
      arrow(ctx, X, [M([330, 620]), M([520, 560]), M([700, 640])], kB, { color: P.hi, width: 12 });
      pill(ctx, X, ...M([520, 500]), 'איבוד שיווי משקל', kB, { color: P.hi, size: 40 });
      arrow(ctx, X, [M([760, 1000]), M([860, 1300])], at(t, tFall, tFall + 0.4, 'expoIn') * (1 - at(t, tHip - 0.4, tHip)), { color: P.clay, width: 14 });
      // injuries
      const kH = at(t, tHip - 0.1, tHip + 0.5);
      heat(ctx, X, ...M([520, 1240]), 140 * K.s, kH);
      lens(ctx, X, 'hip', 780, 760, 230, { x: 512, y: 980, s: 0.9 }, kH, { from: M([520, 1240]), color: P.clay });
      pill(ctx, X, 780, 1040, 'שבר בירך', at(t, tHip, tHip + 0.5), { color: P.clay, size: 44 });
      const kHd = at(t, tHead - 0.1, tHead + 0.5);
      heat(ctx, X, ...M([425, 690]), 120 * K.s, kHd);
      ring(ctx, X, ...M([425, 690]), 95, t, kHd);
      pill(ctx, X, ...M([260, 560]), 'פגיעת ראש', at(t, tHead, tHead + 0.5), { color: P.clay, size: 44 });
    }
    if (cg > 0) {
      X.save(); X.globalAlpha = cg;
      const KC = kb({ s: 1.04 + 0.06 * at(t, tCg, sc.end, 'sineInOut'), cx: 400, cy: 1000 }), MC = mapper(KC);
      drawPhoto(ctx, X, 'backpain', KC); shade(ctx, X);
      heat(ctx, X, ...MC([330, 1010]), 190, at(t, w('l21', 7).s - 0.2, w('l21', 7).s + 0.5) * (0.8 + 0.2 * Math.sin(t * 6)));
      pill(ctx, X, ...MC([360, 1150]), 'גם המטפל נפגע', at(t, w('l21', 8).s, w('l21', 8).s + 0.5), { color: P.clay, size: 44 });
      X.restore();
    }
    stepper(ctx, X, 4);
    headline(ctx, t, 'במקרה הגרוע', 540, 318, { size: 108, times: [w('l20', 0).s, w('l20', 1).s], out: tFall - 0.35 });
    headline(ctx, t, 'נופלים יחד', 540, 318, { size: 116, times: [tFall, w('l20', 7).s], colors: [P.clay, null], out: tCg - 0.5 });
    headline(ctx, t, 'וגם המטפל', 540, 318, { size: 116, times: [tCg, w('l21', 10).s], colors: [null, P.clay] });
    caption(ctx, t);
  },
});
