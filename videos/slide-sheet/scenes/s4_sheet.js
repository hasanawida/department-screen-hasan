// s4 — the slide sheet: two smooth layers that glide over each other; the skin stays put, friction and shear drop.
import { headline } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, feather, arrow, pill, heatGood } from '../lib/photo.js';
import { cap, check } from '../lib/steps.js';
const SHEET = [[40, 452], [700, 460], [985, 398], [300, 382]];
MOTION.scene({
  id: 's4',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const tB = w('n9', 6).s, sw = at(t, tB - 0.5, tB + 0.2, 'cubicInOut');
    if (sw < 1) {
      const K = kb({ s: 1.0 + 0.06 * at(t, sc.start, tB), cx: 560, cy: 1000 }), M = mapper(K);
      drawPhoto(ctx, X, 's2', K); shade(ctx, X);
      pill(ctx, X, ...M([660, 1120]), 'שתי שכבות חלקות', at(t, w('n9', 3).s, w('n9', 3).s + 0.5), { color: P.acc, size: 40 });
    }
    if (sw > 0) {
      X.save(); X.globalAlpha = sw;
      const K = lerpKB(ctx, kb({ s: 0.8, cx: 540, cy: 900, dy: -10 }), kb({ s: 0.83, cx: 540, cy: 900, dy: -10 }), at(t, tB, sc.end, 'sineInOut')), M = mapper(K);
      X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H); drawPhoto(ctx, X, 'skinO', K); feather(ctx, X, K, 1, 140);
      const slide = at(t, w('n9', 6).s, w('n9', 9).e, 'cubicInOut'), off = 70 * slide;
      const quad = (dy, ox, fill, a) => { const q = SHEET.map(M); X.save(); X.globalAlpha *= a; X.fillStyle = fill; X.beginPath(); q.forEach((p, i) => i ? X.lineTo(p[0] + ox, p[1] + dy) : X.moveTo(p[0] + ox, p[1] + dy)); X.closePath(); X.fill(); X.restore(); };
      quad(-8, 0, 'rgba(120,200,225,1)', 0.9);                 // lower layer: stays with the skin
      quad(-26, off, 'rgba(175,228,245,1)', 0.92);              // upper layer: glides
      arrow(ctx, X, [[M([300, 360])[0] + off * 0.2, M([300, 360])[1]], [M([700, 360])[0] + off, M([700, 360])[1]]], slide, { color: P.acc, width: 10, smooth: false });
      heatGood(ctx, X, ...M([380, 600]), 230, at(t, w('n9', 10).s, w('n9', 12).e));
      check(ctx, X, 540, 1180, 'העור נשאר במקום', at(t, w('n9', 11).s, w('n9', 11).s + 0.5), { size: 40 });
      check(ctx, X, 540, 1260, 'חיכוך וגזירה קטנים מאוד', at(t, w('n9', 14).s, w('n9', 14).s + 0.5), { size: 36 });
      X.restore();
    }
    headline(ctx, t, 'סדין החלקה', 540, 330, { size: 120, times: [w('n9', 0).s, w('n9', 1).s], color: P.acc, out: tB - 0.4 });
    headline(ctx, t, 'שתי שכבות מחליקות', 540, 330, { size: 100, times: [tB, w('n9', 6).s + 0.1, w('n9', 7).s], colors: [null, null, P.acc], out: w('n9', 10).s - 0.4 });
    headline(ctx, t, 'העור נשאר במקום', 540, 330, { size: 100, times: [w('n9', 10).s, w('n9', 11).s, w('n9', 12).s], colors: [P.acc, null, null] });
    cap(ctx, t);
  },
});
