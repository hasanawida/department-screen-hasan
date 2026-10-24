// s2 — the lift broken into layers, bottom → top: base & wheels, foot plate, knee pads, motorised inclined column,
// lifting arm & handles, standing sling, control panel. A layer stack builds on the left; each part lights up in turn. Ends on the safe working load.
import { headline, caption } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, feather, spot, ring, arrow, pill, lens } from '../lib/photo.js';
// [label, start word, spot ellipse (photo px), leader anchor (photo px) | null]
const LAYERS = [
  ['בסיס וגלגלים', ['n4', 0], { x: 640, y: 1570, rx: 420, ry: 160 }, [330, 1500]],
  ['משטח לרגליים', ['n4', 11], { x: 580, y: 1505, rx: 260, ry: 85 }, [520, 1505]],
  ['תומכי ברכיים', ['n5', 1], { x: 590, y: 1195, rx: 210, ry: 95 }, [480, 1190]],
  ['עמוד עם מנוע', ['n6', 0], { x: 530, y: 1000, rx: 90, ry: 490, rot: -0.23 }, [470, 860]],
  ['זרוע וידיות', ['n7', 2], { x: 720, y: 850, rx: 240, ry: 200 }, [610, 790]],
  ['רתמת עמידה', ['n8', 1], null, null],
  ['לוח בקרה', ['n8', 6], { x: 510, y: 1405, rx: 150, ry: 80 }, [470, 1400]],
];
const CX = 36, CW = 300, CH = 60, Y0 = 1390, STEP = 74;
MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const K = lerpKB(ctx, kb({ s: 0.86, cx: 600, cy: 1100, dx: 106, dy: -148 }), kb({ s: 0.89, cx: 600, cy: 1100, dx: 106, dy: -148 }), at(t, sc.start, sc.end, 'sineInOut')), M = mapper(K);
    const t9 = w('n9', 0).s, dimIn = at(t, w('n3', 1).s, w('n4', 0).s, 'cubicInOut'), k9 = at(t, t9 - 0.2, t9 + 0.6, 'cubicInOut');
    drawPhoto(ctx, X, 'm0', K, { filter: `brightness(${1 - 0.6 * dimIn}) saturate(${1 - 0.35 * dimIn})` });
    const T0 = LAYERS.map(L => w(L[1][0], L[1][1]).s);
    // spotlights: the active layer full, earlier ones softer
    LAYERS.forEach((L, i) => {
      if (!L[2] || t < T0[i] - 0.3) return;
      const kin = at(t, T0[i] - 0.3, T0[i] + 0.5, 'cubicOut'), next = T0[i + 1] ?? t9, act = 1 - at(t, next - 0.2, next + 0.4);
      spot(ctx, X, 'm0', K, L[2], kin * (0.38 + 0.62 * act) * (1 - 0.7 * k9), { edge: act > 0.05 && k9 < 1 ? P.acc : null, t });
    });
    feather(ctx, X, K, 1, 160);
    // layer stack (bottom → top) with a leader to the active part
    LAYERS.forEach((L, i) => {
      const k = at(t, T0[i] - 0.2, T0[i] + 0.4, 'expoOut'); if (k <= 0) return;
      const next = T0[i + 1] ?? t9, act = 1 - at(t, next - 0.2, next + 0.3), y = Y0 - i * STEP;
      X.save(); X.globalAlpha *= k * (1 - 0.6 * k9); X.translate((1 - k) * -40, 0);
      X.fillStyle = act > 0.5 ? P.acc : 'rgba(11,22,38,0.88)'; X.strokeStyle = act > 0.5 ? P.acc : 'rgba(46,196,182,0.55)'; X.lineWidth = 3;
      X.beginPath(); X.roundRect(CX, y - CH / 2, CW, CH, 18); X.fill(); X.stroke();
      const nx = CX + CW - 32;
      X.fillStyle = act > 0.5 ? P.bg : P.acc; X.beginPath(); X.arc(nx, y, 19, 0, 6.283); X.fill();
      ctx.text(X, String(i + 1), nx, y + 8, { family: 'num', weight: 800, size: 24, color: act > 0.5 ? P.acc : P.bg });
      ctx.text(X, L[0], nx - 32, y + 11, { family: 'body', weight: 800, size: 32, color: act > 0.5 ? P.bg : P.ink, dir: 'rtl', align: 'right' });
      X.restore();
      if (L[3] && act > 0.01) {
        const a = M(L[3]), kl = at(t, T0[i] + 0.1, T0[i] + 0.7, 'cubicInOut');
        X.save(); X.globalAlpha *= act * (1 - k9); X.setLineDash([10, 8]); ctx.drawPath(X, [[CX + CW + 8, y], a], kl, { width: 3, color: P.acc, smooth: false }); X.setLineDash([]);
        X.fillStyle = P.acc; X.beginPath(); X.arc(a[0], a[1], 10 * kl, 0, 6.283); X.fill(); X.restore();
      }
    });
    // extras: under bed / chair / toilet; motor; natural standing path; sling attachment points; the sling (lens); control panel
    const kLow = at(t, w('n4', 7).s, w('n4', 7).s + 0.5) * (1 - at(t, w('n4', 11).s - 0.3, w('n4', 11).s));
    arrow(ctx, X, [M([955, 1440]), M([955, 1530])], kLow, { color: P.hi, width: 8, smooth: false }); arrow(ctx, X, [M([955, 1620]), M([955, 1530])], kLow, { color: P.hi, width: 8, smooth: false });
    pill(ctx, X, ...M([790, 1385]), 'נמוך — נכנס מתחת', kLow, { color: P.hi, size: 34 });
    ring(ctx, X, ...M([445, 960]), 44, t, at(t, w('n6', 3).s, w('n6', 3).s + 0.5) * (1 - at(t, w('n7', 0).s - 0.3, w('n7', 0).s)), { color: P.hi });
    const kArc = at(t, w('n6', 7).s, w('n6', 10).e, 'cubicInOut') * (1 - at(t, w('n7', 0).s - 0.3, w('n7', 0).s));
    X.save(); X.setLineDash([14, 10]); arrow(ctx, X, [M([930, 1330]), M([960, 1120]), M([880, 940]), M([800, 870])], kArc, { color: P.acc, width: 8 }); X.restore();
    pill(ctx, X, ...M([820, 1390]), 'כמו עמידה טבעית', kArc, { color: P.acc, size: 34 });
    const kAtt = at(t, w('n7', 7).s, w('n7', 8).e) * (1 - at(t, w('n8', 0).s - 0.3, w('n8', 0).s));
    ring(ctx, X, ...M([628, 745]), 32, t, kAtt, { color: P.hi, width: 5 }); ring(ctx, X, ...M([848, 745]), 32, t, kAtt, { color: P.hi, width: 5 });
    const kSl = at(t, w('n8', 1).s - 0.2, w('n8', 1).s + 0.4) * (1 - at(t, t9 - 0.4, t9));
    lens(ctx, X, 'm3', 920, 1140, 128, { x: 870, y: 910, s: 0.75 }, kSl, { color: P.acc });
    pill(ctx, X, 900, 1320, 'סביב הגב התחתון', kSl, { color: P.acc, size: 34 });
    // safe working load
    if (k9 > 0) {
      X.save(); X.globalAlpha *= k9; X.fillStyle = 'rgba(11,22,38,0.55)'; X.fillRect(0, 0, ctx.W, ctx.H);
      X.fillStyle = 'rgba(11,22,38,0.9)'; X.strokeStyle = 'rgba(46,196,182,0.7)'; X.lineWidth = 4; X.beginPath(); X.roundRect(200, 600, 680, 520, 40); X.fill(); X.stroke(); X.restore();
      const kN = at(t, w('n9', 6).s - 0.2, w('n9', 8).e, 'cubicOut');
      ctx.text(X, 'עומס עבודה בטוח', 540, 720, { family: 'body', weight: 800, size: 56, color: P.ink, alpha: k9, dir: 'rtl' });
      if (kN > 0) {
        ctx.text(X, String(Math.round(160 * kN)), 540, 960, { family: 'num', weight: 800, size: 230, color: P.acc, alpha: Math.min(1, kN * 3) });
        ctx.text(X, 'קילוגרם', 540, 1060, { family: 'body', weight: 800, size: 60, color: P.ink, alpha: at(t, w('n9', 8).s, w('n9', 8).s + 0.4), dir: 'rtl' });
      }
    }
    headline(ctx, t, 'פירוק לשכבות', 540, 330, { size: 112, times: [w('n3', 1).s, w('n3', 4).s], colors: [null, P.acc] });
    caption(ctx, t, { skip: /^c/, base: 1790 });
  },
});
