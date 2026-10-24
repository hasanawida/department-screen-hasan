// s2 — the full-body lift broken into layers, bottom → top: base legs that open, castors & brakes, mast, boom & motor,
// spreader bar & hooks, battery & hand control, emergency stop / lowering, and the sling. Layer stack on the left.
import { headline, caption } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, feather, spot, ring, arrow, pill, lens } from '../lib/photo.js';
// [label, start word, spot ellipse (photo px) | null, leader anchor (photo px) | null]
const LAYERS = [
  ['בסיס ורגליים', ['n4', 0], { x: 580, y: 1555, rx: 440, ry: 150 }, [300, 1480]],
  ['גלגלים ובלמים', ['n4', 10], null, [225, 1512]],
  ['תורן', ['n5', 1], { x: 360, y: 1110, rx: 75, ry: 390, rot: -0.1 }, [370, 1260]],
  ['זרוע ומנוע', ['n5', 2], { x: 500, y: 830, rx: 270, ry: 240 }, [440, 1000]],
  ['מוט פיזור', ['n6', 2], { x: 715, y: 850, rx: 220, ry: 95 }, [600, 865]],
  ['סוללה ושלט', ['n7', 0], { x: 300, y: 1080, rx: 115, ry: 185 }, [320, 1100]],
  ['עצירת חירום', ['n8', 3], { x: 330, y: 920, rx: 70, ry: 70 }, [330, 920]],
  ['רתמה', ['n9', 2], null, null],
];
const CASTORS = [[225, 1512], [945, 1575], [720, 1647]];
const HOOKS = [[558, 882], [657, 882], [774, 873], [873, 873]];
const CX = 36, CW = 300, CH = 58, Y0 = 1390, STEP = 72;
MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const K = lerpKB(ctx, kb({ s: 0.9, cx: 600, cy: 1100, dx: 121, dy: -216 }), kb({ s: 0.93, cx: 600, cy: 1100, dx: 122, dy: -218 }), at(t, sc.start, sc.end, 'sineInOut')), M = mapper(K);
    const tEnd = sc.end, dimIn = at(t, w('n3', 1).s, w('n4', 0).s, 'cubicInOut');
    drawPhoto(ctx, X, 'h0', K, { filter: `brightness(${1 - 0.6 * dimIn}) saturate(${1 - 0.35 * dimIn})` });
    const T0 = LAYERS.map(L => w(L[1][0], L[1][1]).s);
    LAYERS.forEach((L, i) => {
      if (!L[2] || t < T0[i] - 0.3) return;
      const kin = at(t, T0[i] - 0.3, T0[i] + 0.5, 'cubicOut'), next = T0[i + 1] ?? tEnd, act = 1 - at(t, next - 0.2, next + 0.4);
      spot(ctx, X, 'h0', K, L[2], kin * (0.38 + 0.62 * act), { edge: act > 0.05 ? P.acc : null, t });
    });
    feather(ctx, X, K, 1, 160);
    LAYERS.forEach((L, i) => {
      const k = at(t, T0[i] - 0.2, T0[i] + 0.4, 'expoOut'); if (k <= 0) return;
      const next = T0[i + 1] ?? tEnd + 1, act = 1 - at(t, next - 0.2, next + 0.3), y = Y0 - i * STEP;
      X.save(); X.globalAlpha *= k; X.translate((1 - k) * -40, 0);
      X.fillStyle = act > 0.5 ? P.acc : 'rgba(11,22,38,0.88)'; X.strokeStyle = act > 0.5 ? P.acc : 'rgba(46,196,182,0.55)'; X.lineWidth = 3;
      X.beginPath(); X.roundRect(CX, y - CH / 2, CW, CH, 18); X.fill(); X.stroke();
      const nx = CX + CW - 32;
      X.fillStyle = act > 0.5 ? P.bg : P.acc; X.beginPath(); X.arc(nx, y, 19, 0, 6.283); X.fill();
      ctx.text(X, String(i + 1), nx, y + 8, { family: 'num', weight: 800, size: 24, color: act > 0.5 ? P.acc : P.bg });
      ctx.text(X, L[0], nx - 32, y + 11, { family: 'body', weight: 800, size: 32, color: act > 0.5 ? P.bg : P.ink, dir: 'rtl', align: 'right' });
      X.restore();
      if (L[3] && act > 0.01) {
        const a = M(L[3]), kl = at(t, T0[i] + 0.1, T0[i] + 0.7, 'cubicInOut');
        X.save(); X.globalAlpha *= act; X.setLineDash([10, 8]); ctx.drawPath(X, [[CX + CW + 8, y], a], kl, { width: 3, color: P.acc, smooth: false }); X.setLineDash([]);
        X.fillStyle = P.acc; X.beginPath(); X.arc(a[0], a[1], 10 * kl, 0, 6.283); X.fill(); X.restore();
      }
    });
    // legs open wide for stability
    const kOpen = at(t, w('n4', 3).s, w('n4', 4).e) * (1 - at(t, w('n4', 10).s - 0.3, w('n4', 10).s));
    arrow(ctx, X, [M([840, 1615]), M([735, 1690])], kOpen, { color: P.hi, width: 8, smooth: false }); arrow(ctx, X, [M([840, 1615]), M([960, 1560])], kOpen, { color: P.hi, width: 8, smooth: false });
    pill(ctx, X, ...M([830, 1470]), 'נפתחות לייצוב', kOpen, { color: P.hi, size: 34 });
    const kCas = at(t, w('n4', 10).s, w('n4', 12).e) * (1 - at(t, w('n5', 0).s - 0.3, w('n5', 0).s));
    CASTORS.forEach(p => ring(ctx, X, ...M(p), 34, t, kCas, { color: P.acc, width: 5 }));
    ring(ctx, X, ...M([459, 1188]), 44, t, at(t, w('n5', 5).s, w('n5', 5).s + 0.5) * (1 - at(t, w('n6', 0).s - 0.3, w('n6', 0).s)), { color: P.hi });
    const kHk = at(t, w('n6', 4).s, w('n6', 5).e) * (1 - at(t, w('n7', 0).s - 0.3, w('n7', 0).s));
    HOOKS.forEach(p => ring(ctx, X, ...M(p), 26, t, kHk, { color: P.hi, width: 4 }));
    ring(ctx, X, ...M([320, 1044]), 34, t, at(t, w('n7', 2).s, w('n7', 3).e) * (1 - at(t, w('n8', 0).s - 0.3, w('n8', 0).s)), { color: P.acc, width: 5 });
    ring(ctx, X, ...M([266, 990]), 34, t, at(t, w('n7', 4).s, w('n7', 6).e) * (1 - at(t, w('n8', 0).s - 0.3, w('n8', 0).s)), { color: P.acc, width: 5 });
    ring(ctx, X, ...M([330, 920]), 40, t, at(t, w('n8', 3).s, w('n8', 4).e) * (1 - at(t, w('n9', 0).s - 0.3, w('n9', 0).s)), { color: P.clay });
    // close-ups: controls (n8) then the sling on the hooks (n9)
    const kC = at(t, w('n8', 3).s - 0.2, w('n8', 3).s + 0.4) * (1 - at(t, w('n9', 2).s - 0.5, w('n9', 2).s - 0.1));
    lens(ctx, X, 'h9', 900, 1010, 150, { x: 470, y: 1000, s: 0.62 }, kC, { color: P.clay });
    pill(ctx, X, 880, 1200, 'עצירה · הורדת חירום', kC, { color: P.clay, size: 32 });
    const kS = at(t, w('n9', 2).s - 0.2, w('n9', 2).s + 0.4);
    lens(ctx, X, 'h8', 900, 1010, 150, { x: 560, y: 1080, s: 0.42 }, kS, { color: P.acc });
    pill(ctx, X, 880, 1200, 'סוג וגודל לפי המטופל', at(t, w('n9', 4).s, w('n9', 4).s + 0.5), { color: P.acc, size: 32 });
    headline(ctx, t, 'פירוק לשכבות', 540, 330, { size: 112, times: [w('n3', 1).s, w('n3', 4).s], colors: [null, P.acc] });
    caption(ctx, t, { skip: /^c/, base: 1790 });
  },
});
