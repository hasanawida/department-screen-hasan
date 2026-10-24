// s9 — stage 5: the slide — count together, shift weight back leg → front leg, the sheet glides; no straight-arm pulling, no lifting;
// backs straight, the legs do the work, the patient's skin isn't dragged.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, heatGood } from '../lib/photo.js';
import { plate, cap, check } from '../lib/steps.js';
MOTION.scene({
  id: 's9',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    const { M } = plate(ctx, X, t, 's5', 5, { s: 1.0, cx: 540, cy: 1100 }, { s: 1.04, cx: 540, cy: 1100 });
    const tC = w('c3', 0).s, tW = w('n17', 0).s, tB = w('n18', 0).s;
    pill(ctx, X, 540, 470, 'סופרים יחד', at(t, w('n16', 3).s, w('n16', 3).s + 0.5) * (1 - at(t, tC - 0.3, tC)), { color: P.hi, size: 40 });
    // 1 · 2 · 3
    ['1', '2', '3'].forEach((n, i) => { const s0 = w('c3', i).s, k = at(t, s0 - 0.05, s0 + 0.25, 'backOut') * (1 - at(t, tW - 0.4, tW)); if (k <= 0) return;
      const x = 760 - i * 220; X.save(); X.globalAlpha *= Math.min(1, k); X.translate(x, 600); X.scale(k, k);
      X.fillStyle = i === 2 ? P.acc : 'rgba(11,22,38,0.85)'; X.strokeStyle = P.acc; X.lineWidth = 5; X.beginPath(); X.arc(0, 0, 80, 0, 6.283); X.fill(); X.stroke(); X.restore();
      ctx.text(X, n, x, 600 + 38, { family: 'num', weight: 800, size: 110, color: i === 2 ? P.bg : P.acc, alpha: Math.min(1, k) }); });
    // weight shift + the glide
    const kWs = at(t, tW, w('n17', 6).e) * (1 - at(t, tB + 2, tB + 2.4));
    arrow(ctx, X, [M([180, 1800]), M([280, 1740]), M([380, 1760])], kWs, { color: P.hi, width: 8 });
    arrow(ctx, X, [M([1040, 1800]), M([960, 1740]), M([860, 1760])], kWs, { color: P.hi, width: 8 });
    pill(ctx, X, 540, 1660, 'מהרגל האחורית לקדמית', kWs, { color: P.hi, size: 36 });
    const kG = at(t, w('n17', 7).s, w('n17', 8).e + 0.4);
    arrow(ctx, X, [M([900, 1170]), M([330, 1170])], kG, { color: P.acc, width: 14, smooth: false });
    pill(ctx, X, ...M([620, 1080]), 'הסדין מחליק', kG * (1 - at(t, tB - 0.3, tB)), { color: P.acc, size: 38 });
    check(ctx, X, 540, 470, 'משיכה בידיים ישרות', at(t, w('n17', 10).s, w('n17', 10).s + 0.5) * (1 - at(t, tB - 0.3, tB)), { ok: false, size: 36 });
    check(ctx, X, 540, 550, 'הרמה', at(t, w('n17', 14).s, w('n17', 14).s + 0.5) * (1 - at(t, tB - 0.3, tB)), { ok: false, size: 36 });
    // backs straight, legs work, skin safe
    check(ctx, X, 540, 470, 'גב ישר', at(t, w('n18', 3).s, w('n18', 3).s + 0.5), { size: 36 });
    const kL = at(t, w('n18', 4).s, w('n18', 6).e);
    heatGood(ctx, X, ...M([330, 1680]), 140, kL); heatGood(ctx, X, ...M([940, 1680]), 140, kL);
    check(ctx, X, 540, 550, 'העבודה ברגליים', at(t, w('n18', 6).s, w('n18', 6).s + 0.5), { size: 36 });
    const kS = at(t, w('n18', 7).s, w('n18', 11).e);
    [[350, 1170], [520, 1180], [690, 1170]].forEach(p => heatGood(ctx, X, ...M(p), 130, kS));
    check(ctx, X, 540, 630, 'העור לא נגרר', at(t, w('n18', 10).s, w('n18', 10).s + 0.5), { size: 36 });
    bubble(ctx, X, t, 'c3', ...M([983, 690]), { y: 300 });
    headline(ctx, t, 'ההחלקה', 540, 330, { size: 124, times: [w('n16', 2).s], out: tC - 0.4 });
    headline(ctx, t, 'משקל, לא כוח ידיים', 540, 330, { size: 92, times: [tW + 0.1, w('n17', 2).s], out: tB - 0.4 });
    headline(ctx, t, 'הגב בטוח, העור מוגן', 540, 330, { size: 92, times: [tB + 0.1, w('n18', 3).s, w('n18', 7).s, w('n18', 9).s], colors: [null, P.acc, null, P.acc] });
    cap(ctx, t);
  },
});
