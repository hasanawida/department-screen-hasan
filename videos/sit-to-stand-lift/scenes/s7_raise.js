// s7 — stage 4: the raise. Cue (lean back into the sling, stand), then the weight split: feet, shins on the knee pads, sling;
// the caregiver's spine stays green. Then the skin to check: under the arms, sling edges, shins.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, ring, spine, heatGood } from '../lib/photo.js';
import { plate, cap } from '../lib/steps.js';
const SPC = [[150, 650], [112, 745], [98, 845], [100, 955], [110, 1060]];
MOTION.scene({
  id: 's7',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const { K, M } = plate(ctx, X, t, 'm3', 4, { s: 1.05, cx: 540, cy: 1000, dy: -40 }, { s: 1.08, cx: 560, cy: 1000, dy: -40 });
    const tC = w('c3', 0).s, tW = w('n16', 0).s, tS = w('n17', 0).s;
    // the cue: rise along an arc, lean back into the sling
    const kUp = at(t, tC, w('c3', 1).e, 'cubicInOut') * (1 - at(t, tW - 0.4, tW));
    X.save(); X.setLineDash([14, 10]); arrow(ctx, X, [M([985, 1300]), M([960, 1140]), M([905, 1010])], kUp, { color: P.acc, width: 9 }); X.restore();
    const kLean = at(t, w('c3', 2).s, w('c3', 4).e) * (1 - at(t, tW - 0.4, tW));
    ring(ctx, X, ...M([885, 905]), 70, t, kLean, { color: P.acc });
    // weight split (green): feet, shins on the knee pads, sling
    const c = M([830, 1050]), kWt = at(t, tW, tW + 0.6) * (1 - at(t, tS - 0.5, tS));
    const legs = [[[650, 1585], w('n16', 3).s, 'כפות הרגליים', [650, 1690]], [[662, 1322], w('n16', 5).s, 'שוקיים', [470, 1240]], [[885, 905], w('n16', 9).s, 'רתמה', [900, 780]]];
    if (kWt > 0) {
      X.save(); X.fillStyle = P.hi; X.globalAlpha *= kWt; X.beginPath(); X.arc(c[0], c[1], 14, 0, 6.283); X.fill(); X.restore();
      legs.forEach(([p, s0, lab, lp]) => {
        const k = at(t, s0, s0 + 0.6) * kWt, q = M(p);
        X.save(); X.globalAlpha *= kWt; X.setLineDash([12, 10]); ctx.drawPath(X, [c, q], k, { width: 6, color: P.acc, smooth: false }); X.restore();
        heatGood(ctx, X, ...q, 105, k); pill(ctx, X, ...M(lp), lab, k, { color: P.acc, size: 38 });
      });
    }
    spine(ctx, X, SPC.map(M), at(t, w('n16', 10).s - 0.2, w('n16', 10).s + 0.8, 'cubicOut') * (1 - at(t, tS - 0.5, tS)), { load: 0.05, scale: K.s });
    pill(ctx, X, ...M([300, 1180]), 'גב ישר · עומס נמוך', at(t, w('n16', 13).s, w('n16', 13).s + 0.5) * (1 - at(t, tS - 0.5, tS)), { color: P.acc, size: 36 });
    // skin to check
    const skin = [[[800, 880], 3], [[890, 975], 5], [[662, 1322], 7]];
    skin.forEach(([p, i]) => ring(ctx, X, ...M(p), 46, t, at(t, w('n17', i).s, w('n17', i).s + 0.4), { color: P.clay }));
    pill(ctx, X, ...M([740, 760]), 'מתחת לזרועות', at(t, w('n17', 3).s, w('n17', 3).s + 0.4) * (1 - at(t, w('n17', 8).s - 0.3, w('n17', 8).s)), { color: P.clay, size: 34 });
    pill(ctx, X, ...M([900, 1110]), 'שולי הרתמה', at(t, w('n17', 5).s, w('n17', 5).s + 0.4) * (1 - at(t, w('n17', 8).s - 0.3, w('n17', 8).s)), { color: P.clay, size: 34 });
    pill(ctx, X, ...M([480, 1240]), 'שוקיים', at(t, w('n17', 7).s, w('n17', 7).s + 0.4) * (1 - at(t, w('n17', 8).s - 0.3, w('n17', 8).s)), { color: P.clay, size: 34 });
    pill(ctx, X, 540, 1180, 'בודקים את העור אחרי כל העברה', at(t, w('n17', 8).s, w('n17', 8).s + 0.5), { color: P.hi, size: 40 });
    bubble(ctx, X, t, 'c3', ...M([600, 600]), { y: 300, maxWidth: 820 });
    headline(ctx, t, 'ההרמה', 540, 330, { size: 124, times: [w('n15', 2).s], out: tC - 0.4 });
    headline(ctx, t, 'המשקל מתחלק', 540, 330, { size: 104, times: [tW, w('n16', 1).s], colors: [null, P.acc], out: tS - 0.4 });
    headline(ctx, t, 'שימו לב לעור', 540, 330, { size: 104, times: [tS, w('n17', 1).s, w('n17', 2).s], colors: [null, null, P.clay] });
    cap(ctx, t);
  },
});
