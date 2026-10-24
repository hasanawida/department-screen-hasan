// s5b — the right roll: far rail up, far knee bent, hand on the chest; open hands on the shoulder and the pelvis
// (large joints, no gripping); roll slowly as one unit — then the sling goes in behind the back.
import { headline, badge } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, stepper, arrow, pill, ring, bubble, heatGood } from '../lib/photo.js';
import { plate, cap, check, STAGES } from '../lib/steps.js';
MOTION.scene({
  id: 's5b',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const tH = w('r5', 0).s, tS = w('r7', 0).s, sH = at(t, tH - 0.4, tH + 0.3, 'cubicInOut'), sS = at(t, tS - 0.4, tS + 0.3, 'cubicInOut');
    // r4 — preparation
    if (sH < 1) {
      const { M } = plate(ctx, X, t, 'r3', 2, { s: 1.08, cx: 540, cy: 1000, dy: -120 }, { s: 1.12, cx: 520, cy: 1000, dy: -120 });
      ring(ctx, X, ...M([900, 1100]), 64, t, at(t, w('r4', 1).s, w('r4', 4).e), { color: P.acc });
      check(ctx, X, 540, 470, 'המעקה הרחוק מורם', at(t, w('r4', 4).s, w('r4', 4).s + 0.5), { size: 36 });
      ring(ctx, X, ...M([720, 955]), 58, t, at(t, w('r4', 5).s, w('r4', 8).e), { color: P.acc });
      check(ctx, X, 540, 550, 'ברך כפופה', at(t, w('r4', 7).s, w('r4', 7).s + 0.5), { size: 36 });
      ring(ctx, X, ...M([415, 1045]), 58, t, at(t, w('r4', 9).s, w('r4', 13).e), { color: P.acc });
      check(ctx, X, 540, 630, 'יד על החזה', at(t, w('r4', 11).s, w('r4', 11).s + 0.5), { size: 36 });
      badge(ctx, X, 900, 330, 50, 'v', at(t, w('r4', 0).s, w('r4', 0).s + 0.6));
    }
    // r5–r6, c1 — hands on the shoulder and pelvis, roll as one unit
    if (sH > 0 && sS < 1) {
      const K = lerpKB(ctx, kb({ s: 1.08, cx: 540, cy: 1000, dy: -120 }), kb({ s: 1.13, cx: 520, cy: 1000, dy: -120 }), at(t, tH, tS, 'sineInOut')), M = mapper(K);
      X.save(); X.globalAlpha = sH; drawPhoto(ctx, X, 'r4', K); shade(ctx, X); stepper(ctx, X, 2, 1, { steps: STAGES }); X.restore();
      const kSh = at(t, w('r5', 2).s, w('r5', 3).e), kPv = at(t, w('r5', 6).s, w('r5', 7).e);
      ring(ctx, X, ...M([396, 1035]), 56, t, kSh, { color: P.acc }); pill(ctx, X, ...M([330, 910]), 'כתף', kSh, { color: P.acc, size: 38 });
      ring(ctx, X, ...M([684, 1134]), 56, t, kPv, { color: P.acc }); pill(ctx, X, ...M([700, 1010]), 'אגן', kPv, { color: P.acc, size: 38 });
      const kOut = 1 - at(t, w('r6', 0).s - 0.4, w('r6', 0).s);
      check(ctx, X, 540, 470, 'ידיים פתוחות', at(t, w('r5', 8).s, w('r5', 8).s + 0.5) * kOut, { size: 36 });
      check(ctx, X, 540, 550, 'על מפרקים גדולים', at(t, w('r5', 10).s, w('r5', 10).s + 0.5) * kOut, { size: 36 });
      check(ctx, X, 540, 630, 'בלי לתפוס', at(t, w('r5', 13).s, w('r5', 13).s + 0.5) * kOut, { size: 36 });
      const kR = at(t, w('r6', 0).s, w('r6', 4).e);
      arrow(ctx, X, [M([430, 940]), M([560, 900]), M([690, 960])], kR, { color: P.acc, width: 10 });
      heatGood(ctx, X, ...M([396, 1035]), 100, kR); heatGood(ctx, X, ...M([684, 1134]), 100, kR);
      pill(ctx, X, 540, 520, 'כמו יחידה אחת', at(t, w('r6', 5).s, w('r6', 5).s + 0.5) * (1 - at(t, w('c1', 0).s - 0.4, w('c1', 0).s)), { color: P.acc, size: 42 });
      check(ctx, X, 540, 610, 'בלי למשוך ובלי לסובב', at(t, w('r6', 8).s, w('r6', 8).s + 0.5) * (1 - at(t, w('c1', 0).s - 0.4, w('c1', 0).s)), { size: 36 });
      bubble(ctx, X, t, 'c1', ...M([648, 690]), { y: 470 });
    }
    // r7 — now the sling goes in behind the back
    if (sS > 0) {
      const K = lerpKB(ctx, kb({ s: 1.12, cx: 540, cy: 1000, dy: -200 }), kb({ s: 1.15, cx: 560, cy: 1000, dy: -200 }), at(t, tS, sc.end, 'sineInOut')), M = mapper(K);
      X.save(); X.globalAlpha = sS; drawPhoto(ctx, X, 'h2', K); shade(ctx, X); stepper(ctx, X, 2, 1, { steps: STAGES }); X.restore();
      ring(ctx, X, ...M([760, 1255]), 80, t, at(t, w('r7', 2).s, w('r7', 5).e), { color: P.acc });
      pill(ctx, X, ...M([800, 1120]), 'רתמה מאחורי הגב', at(t, w('r7', 3).s, w('r7', 3).s + 0.5), { color: P.acc, size: 36 });
      arrow(ctx, X, [M([700, 1250]), M([980, 1235])], at(t, w('r7', 6).s, w('r7', 11).e), { color: P.hi, width: 9, smooth: false });
      pill(ctx, X, ...M([900, 1330]), 'פורשים', at(t, w('r7', 10).s, w('r7', 10).s + 0.5), { color: P.hi, size: 36 });
    }
    headline(ctx, t, 'נכון', 540, 330, { size: 124, times: [w('r4', 0).s], color: P.acc, out: w('c1', 0).s - 0.4 });
    headline(ctx, t, 'מניחים את הרתמה', 540, 330, { size: 100, times: [tS + 0.1, w('r7', 3).s] });
    cap(ctx, t);
  },
});
