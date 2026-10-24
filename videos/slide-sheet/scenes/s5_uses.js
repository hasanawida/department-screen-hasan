// s5 — what it's used for: up the bed, sideways, turning on the side, bed → stretcher with a transfer board; we learn "up the bed".
import { headline } from '../lib/ui.js';
import { arrow } from '../lib/photo.js';
import { cap, tile } from '../lib/steps.js';
// [image, label, word index, focus x, focus y, scale]  RTL order: first tile top-right
const TILES = [['s5', 'העלאה במיטה', 3, 560, 1150, 0.62], ['s4', 'הזזה לצד', 6, 560, 1150, 0.62], ['s7', 'סיבוב על הצד', 8, 540, 1150, 0.6], ['s8', 'מיטה לאלונקה', 11, 540, 1150, 0.6]];
const POS = [[790, 620], [290, 620], [790, 1040], [290, 1040]], TW = 470, TH = 400;
MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const tL = w('n11', 0).s, kSel = at(t, w('n11', 4).s - 0.2, w('n11', 4).s + 0.5, 'cubicInOut');
    TILES.forEach(([img, lab, wi, fx, fy, s], i) => {
      const k = at(t, w('n10', wi).s - 0.2, w('n10', wi).s + 0.5, 'expoOut');
      tile(ctx, X, img, ...POS[i], TW, TH, fx, fy, s, k, lab, { sel: i === 0 ? kSel : 0, dim: i === 0 ? 0 : kSel * 0.65 });
    });
    // little motion hints on each tile
    arrow(ctx, X, [[900, 600], [700, 600]], at(t, w('n10', 3).s + 0.3, w('n10', 3).s + 0.9), { color: P.acc, width: 8, smooth: false });
    arrow(ctx, X, [[290, 650], [290, 560]], at(t, w('n10', 6).s + 0.3, w('n10', 6).s + 0.9) * (1 - kSel), { color: P.acc, width: 8, smooth: false });
    headline(ctx, t, 'מתי משתמשים?', 540, 330, { size: 108, t0: sc.start + 0.3, out: tL - 0.4 });
    headline(ctx, t, 'נלמד: העלאה במיטה', 540, 330, { size: 96, times: [tL, w('n11', 4).s, w('n11', 5).s], colors: [null, P.acc, P.acc] });
    cap(ctx, t);
  },
});
