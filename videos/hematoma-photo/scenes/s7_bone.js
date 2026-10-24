// s7 — the damage goes deeper: the bone in the skin render → healthy vs. osteoporotic bone (real renders).
import { caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, pill, ring, feather } from '../lib/photo.js';

MOTION.scene({
  id: 's7',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tCut = w('l18', 0).s - 0.3, tThin = w('l18', 4).s, tOst = w('l18', -1).s;
    const sw = at(t, tCut - 0.3, tCut + 0.4, 'cubicInOut');
    if (sw < 1) { const K = lerpKB(ctx, kb({ s: 0.82, cx: 540, cy: 960, dy: -60 }), kb({ s: 1.9, cx: 380, cy: 1470, dx: 160, dy: -520 }), at(t, sc.start, tCut + 0.4, 'cubicInOut'));
      X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H); drawPhoto(ctx, X, 'skinY', K); feather(ctx, X, K); shade(ctx, X); ring(ctx, X, ...mapper(K)([380, 1470]), 150 * K.s, t, at(t, w('l17', 3).s, w('l17', 4).s) * (1 - sw)); }
    if (sw > 0) { X.save(); X.globalAlpha = sw; const K = kb({ s: 1.0 + 0.05 * at(t, tCut, sc.end), cx: 540, cy: 960 }), M = mapper(K);
      drawPhoto(ctx, X, 'bones', K); shade(ctx, X);
      pill(ctx, X, ...M([790, 660]), 'עצם בריאה', at(t, tCut + 0.6, tCut + 1.1), { color: P.acc, size: 46 });
      pill(ctx, X, ...M([270, 660]), 'עצם מבוגרת', at(t, tCut + 0.9, tCut + 1.4) * (1 - at(t, tThin - 0.3, tThin)), { color: P.clay, size: 46 });
      pill(ctx, X, ...M([270, 660]), 'דקה ונקבובית', at(t, tThin, tThin + 0.5), { color: P.clay, size: 46 });
      ring(ctx, X, ...M([270, 960]), 230, t, at(t, tThin, tThin + 0.6) * 0.8);
      X.restore(); }
    headline(ctx, t, 'הנזק לא נעצר בעור', 540, 320, { size: 96, maxWidth: 1000, times: [w('l17', 1).s, w('l17', 2).s, w('l17', 4).s, w('l17', 5).s], out: tCut + 0.2 });
    headline(ctx, t, 'העצם נחלשת', 540, 320, { size: 112, times: [w('l18', 2).s, w('l18', 3).s], out: tOst - 0.4 });
    headline(ctx, t, 'אוסטאופורוזיס', 540, 320, { size: 108, times: [tOst], color: P.clay });
    sub(ctx, t, 'עצם דקה ונקבובית שנשברת בקלות', 540, 412, { t0: tOst + 0.4, size: 48, color: P.ink });
    caption(ctx, t);
  },
});
