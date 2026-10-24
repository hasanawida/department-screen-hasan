// s10 — stage 6: always take the sheet out (bottom layer, diagonally, low to the mattress) — left in, it makes him slide again; protect the heels.
import { headline } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, arrow, pill, ring, heatGood } from '../lib/photo.js';
import { plate, cap, check } from '../lib/steps.js';
MOTION.scene({
  id: 's10',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const tH = w('n20', 0).s, sw = at(t, tH - 0.5, tH + 0.2, 'cubicInOut');
    if (sw < 1) {
      const { M } = plate(ctx, X, t, 's6', 6, { s: 1.0, cx: 540, cy: 1100 }, { s: 1.05, cx: 600, cy: 1150 });
      const kD = at(t, w('n19', 6).s, w('n19', 10).e);
      arrow(ctx, X, [M([480, 1250]), M([700, 1500]), M([920, 1780])], kD, { color: P.acc, width: 12 });
      pill(ctx, X, ...M([760, 1700]), 'שכבה תחתונה, באלכסון', at(t, w('n19', 8).s, w('n19', 8).s + 0.5), { color: P.acc, size: 34 });
      check(ctx, X, 540, 470, 'סדין שנשאר = החלקה', at(t, w('n19', 13).s, w('n19', 13).s + 0.5), { ok: false, size: 36 });
      headline(ctx, t, 'מוציאים, תמיד', 540, 330, { size: 112, times: [w('n19', 2).s, w('n19', 5).s], colors: [null, P.acc] });
    }
    if (sw > 0) {
      const K = lerpKB(ctx, kb({ s: 1.0, cx: 700, cy: 1050 }), kb({ s: 1.07, cx: 760, cy: 1080 }), at(t, tH, sc.end + 0.6)), M = mapper(K);
      X.save(); X.globalAlpha = sw; drawPhoto(ctx, X, 's9', K); shade(ctx, X); X.restore();
      ring(ctx, X, ...M([800, 1090]), 60, t, at(t, w('n20', 2).s, w('n20', 2).s + 0.5), { color: P.hi });
      check(ctx, X, 540, 470, 'לא גוררים את העקבים', at(t, w('n20', 3).s, w('n20', 3).s + 0.5), { ok: false, size: 36 });
      pill(ctx, X, ...M([420, 1060]), 'כרית מתחת לשוקיים', at(t, w('n20', 7).s, w('n20', 7).s + 0.5), { color: P.acc, size: 36 });
      const kG = at(t, w('n20', 11).s, w('n20', 14).e);
      arrow(ctx, X, [M([920, 1200]), M([920, 1130])], kG, { color: P.acc, width: 7, smooth: false });
      heatGood(ctx, X, ...M([800, 1100]), 110, kG);
      check(ctx, X, 540, 550, 'העקב לא נוגע במזרן', at(t, w('n20', 12).s, w('n20', 12).s + 0.5), { size: 36 });
      headline(ctx, t, 'והעקבים', 540, 330, { size: 112, times: [tH + 0.1], color: P.hi });
    }
    cap(ctx, t);
  },
});
