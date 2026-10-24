// s6 — stage 3: standing up — the patient pushes from the bed; caregiver close, knees bent, hand on the gait belt; weight path + green spine.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, spine, heatGood } from '../lib/photo.js';
import { plate, cap } from '../lib/steps.js';
export const SPC = [[350, 770], [290, 860], [250, 980], [240, 1080], [250, 1160]];
MOTION.scene({
  id: 's6',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tW = w('n10', 0).s;
    const { K, M } = plate(ctx, X, t, 'w3', 3, { s: 1.0, cx: 560, cy: 1100 }, { s: 1.07, cx: 560, cy: 1100 }, { dim: 0.45 * at(t, tW - 0.3, tW + 0.4) });
    pill(ctx, X, ...M([300, 620]), 'קרוב', at(t, w('n9', 6).s, w('n9', 6).s + 0.5) * (1 - at(t, tW - 0.4, tW)), { color: P.acc, size: 42 });
    pill(ctx, X, ...M([250, 1330]), 'ברכיים כפופות', at(t, w('n9', 8).s, w('n9', 8).s + 0.5) * (1 - at(t, tW - 0.4, tW)), { color: P.acc, size: 40 });
    pill(ctx, X, ...M([700, 900]), 'יד על החגורה', at(t, w('n9', 10).s, w('n9', 10).s + 0.5) * (1 - at(t, w('c3', 0).s - 0.3, w('c3', 0).s)), { color: P.acc, size: 40 });
    const kPush = at(t, w('c3', 8).s, w('c3', -1).e);
    arrow(ctx, X, [M([880, 1270]), M([880, 1110])], kPush, { color: P.acc, width: 12, smooth: false });
    pill(ctx, X, ...M([900, 1380]), 'דוחף מהמיטה', kPush * (1 - at(t, tW + 2, tW + 2.4)), { color: P.acc, size: 40 });
    // weight path + caregiver spine (green = low load)
    spine(ctx, X, SPC.map(M), at(t, w('n10', 11).s - 0.2, w('n10', 11).s + 0.8, 'cubicOut'), { load: 0.05, scale: K.s });
    const kWt = at(t, w('n10', 5).s, w('n10', 9).e);
    if (kWt > 0) {
      const c = M([720, 1100]);
      X.save(); X.setLineDash([12, 10]); ctx.drawPath(X, [c, M([690, 1620])], kWt, { width: 6, color: P.acc, smooth: false }); ctx.drawPath(X, [c, M([880, 1250])], at(t, w('n10', 9).s, w('n10', 9).e + 0.3), { width: 6, color: P.acc, smooth: false }); X.restore();
      heatGood(ctx, X, ...M([690, 1630]), 120, kWt); heatGood(ctx, X, ...M([880, 1255]), 95, at(t, w('n10', 9).s, w('n10', 9).e + 0.3));
      pill(ctx, X, ...M([700, 1500]), 'המשקל על הרגליים', at(t, w('n10', 8).s, w('n10', 8).s + 0.5), { color: P.acc, size: 40 });
    }
    pill(ctx, X, ...M([200, 870]), 'גב ישר · עומס נמוך', at(t, w('n10', 15).s, w('n10', 15).s + 0.5), { color: P.acc, size: 38 });
    bubble(ctx, X, t, 'c3', ...M([430, 640]), { y: 560 });
    headline(ctx, t, 'הקימה', 540, 330, { size: 124, times: [w('n9', 2).s], out: w('c3', 0).s - 0.4 });
    headline(ctx, t, 'המשקל על המטופל', 540, 330, { size: 96, times: [w('n10', 5).s, w('n10', 8).s], colors: [null, P.acc] });
    cap(ctx, t);
  },
});
