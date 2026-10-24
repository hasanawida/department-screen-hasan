// s12 — series wrap-up: four ways to transfer right (walker, sit-to-stand lift, full-body lift, slide sheet); patient protected, caregivers' backs safe.
import { headline, badge } from '../lib/ui.js';
import { cap, check, tile } from '../lib/steps.js';
const TILES = [['w5', 'הליכון', 7, 560, 1100, 0.52], ['m4', 'מנוף העמדה', 8, 540, 1050, 0.5], ['h5', 'מנוף הרמה', 10, 600, 1050, 0.5], ['s5', 'סדין החלקה', 12, 560, 1150, 0.6]];
const POS = [[790, 620], [290, 620], [790, 1040], [290, 1040]], TW = 470, TH = 400;
MOTION.scene({
  id: 's12',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const g = X.createRadialGradient(540, 900, 40, 540, 900, 950); g.addColorStop(0, 'rgba(46,196,182,0.12)'); g.addColorStop(1, 'rgba(46,196,182,0)'); X.fillStyle = g; X.fillRect(0, 0, ctx.W, ctx.H);
    const tE = w('n23', 0).s, kEnd = at(t, tE, tE + 0.6);
    TILES.forEach(([img, lab, wi, fx, fy, s], i) => tile(ctx, X, img, ...POS[i], TW, TH, fx, fy, s, at(t, w('n22', wi).s - 0.2, w('n22', wi).s + 0.5, 'expoOut'), lab, { dim: 0.7 * kEnd, size: 38 }));
    if (kEnd > 0) {
      badge(ctx, X, 540, 760, 80, 'v', at(t, tE, tE + 0.7));
      check(ctx, X, 540, 920, 'המטופל מוגן', at(t, w('n23', 4).s, w('n23', 4).s + 0.5), { size: 46 });
      check(ctx, X, 540, 1020, 'הגב של המטפלים בטוח', at(t, w('n23', 8).s, w('n23', 8).s + 0.5), { size: 46 });
    }
    headline(ctx, t, 'ארבע דרכים להעביר נכון', 540, 330, { size: 78, maxWidth: 1000, times: [w('n22', 3).s, w('n22', 4).s, w('n22', 5).s, w('n22', 6).s], colors: [null, null, null, P.acc] });
    cap(ctx, t);
  },
});
