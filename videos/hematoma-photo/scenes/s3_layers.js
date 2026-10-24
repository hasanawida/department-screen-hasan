// s3 — the skin layers on a real medical render: each layer lit in turn, others dimmed.
import { caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, pill, spotlight, feather } from '../lib/photo.js';

const BANDS = { epi: [452, 528], dermis: [526, 908], fat: [912, 1138], muscle: [1136, 1312], bone: [1300, 1660] };

MOTION.scene({
  id: 's3',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tE = w('l4', 2).s, tD = w('l5', 2).s, tF = w('l6', 2).s, tM = w('l7', 1).s, tB = w('l7', 3).s, tAll = w('l7', -1).e + 0.25;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const K = lerpKB(ctx, kb({ s: 0.78, cx: 540, cy: 960, dy: -60 }), kb({ s: 0.82, cx: 540, cy: 960, dy: -60 }), at(t, sc.start, sc.end, 'sineInOut')), M = mapper(K);
    drawPhoto(ctx, X, 'skinY', K); feather(ctx, X, K);
    const seq = [['epi', tE, tD], ['dermis', tD, tF], ['fat', tF, tM], ['muscle', tM, tB], ['bone', tB, tAll]];
    let y0 = 0, y1 = 0, kk = 0;
    for (const [key, a, b] of seq) { const k = at(t, a - 0.25, a + 0.35, 'cubicInOut') * (1 - at(t, b - 0.3, b + 0.2, 'cubicInOut')); if (k > kk) { kk = k; y0 = M([0, BANDS[key][0]])[1]; y1 = M([0, BANDS[key][1]])[1]; } }
    const any = at(t, tE - 0.25, tE + 0.35) * (1 - at(t, tAll, tAll + 0.5));
    spotlight(ctx, X, y0, y1, any);
    shade(ctx, X);
    // labels on the front face (stay once introduced)
    const L = [['אפידרמיס', tE, [300, 610], [300, 492]], ['דרמיס', tD, [300, 760]], ['שומן', tF, [300, 1030]], ['שריר', tM, [300, 1225]], ['עצם', tB, [640, 1470]]];
    for (const [txt, t0, p, anchor] of L) {
      const k = at(t, t0 + 0.05, t0 + 0.6);
      if (anchor && k > 0) { const a = M(anchor), b = M(p); ctx.drawPath(X, [[b[0], b[1] - 34], a], k, { width: 4, color: P.acc }); X.save(); X.fillStyle = P.acc; X.globalAlpha = k; X.beginPath(); X.arc(a[0], a[1], 9, 0, 6.283); X.fill(); X.restore(); }
      pill(ctx, X, ...M(p), txt, k, { color: P.acc, size: 46 });
    }
    pill(ctx, X, ...M([720, 640]), 'כלי דם', at(t, w('l5', 4).s, w('l5', 4).s + 0.5) * (1 - at(t, tF - 0.4, tF)), { color: P.clay, size: 40 });
    const TT = [[tE, tD, 'אפידרמיס', 'השכבה החיצונית שמגינה על הגוף'], [tD, tF, 'דרמיס', 'כלי דם קטנים ועדינים'], [tF, tM, 'שכבת שומן', 'כרית שבולמת לחץ ומכות'], [tM, sc.end + 1, 'שריר ועצם', 'בעומק']];
    for (const [a, b, tt, ss] of TT) { headline(ctx, t, tt, 540, 300, { size: 118, t0: a - 0.1, out: b - 0.45, outDur: 0.3 }); sub(ctx, t, ss, 540, 392, { t0: a + 0.2, size: 50, color: P.ink, out: b - 0.45 }); }
    sub(ctx, t, 'שכבות העור', 540, 300, { t0: sc.start + 0.2, size: 64, weight: 800, color: P.ink, out: tE - 0.5 });
    caption(ctx, t);
  },
});
