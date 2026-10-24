// s15 — summary: not arguing, not correcting, not lying; calm down, come close, name the feeling, ask about it.
// End: "His memory is erased. His feelings are in our hands."
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, checklist } from '../lib/photo.js';
import { cap, glow } from '../lib/dv.js';
MOTION.scene({
  id: 's15',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tF = w('l53', 0).s - 0.4, kF = at(t, tF, tF + 0.9);
    drawPhoto(ctx, X, 'd9', kb({ s: 1.1 + 0.05 * at(t, sc.start, sc.end), cx: 540, cy: 1100 }));
    X.fillStyle = `rgba(11,22,38,${0.8 + 0.12 * kF})`; X.fillRect(0, 0, 1080, 1920);
    const kL = 1 - kF;
    if (kL > 0) {
      X.save(); X.globalAlpha = kL;
      checklist(ctx, X, t, [['לא להתווכח', false, w('l51', 1).s], ['לא לתקן', false, w('l51', 3).s], ['לא לשקר', false, w('l51', 5).s]], 540, 520, { w: 760, gap: 100, size: 48 });
      checklist(ctx, X, t, [['להירגע', true, w('l52', 0).s], ['להתקרב', true, w('l52', 1).s], ['לתת שם לרגש', true, w('l52', 2).s], ['לשאול עליו', true, w('l52', 5).s]], 540, 880, { w: 760, gap: 100, size: 48 });
      X.restore();
      headline(ctx, t, 'לסיכום', 540, 300, { size: 100, t0: w('l51', 0).s, out: tF - 0.2 });
    }
    if (kF > 0) {
      glow(ctx, X, 540, 860, 520, '46,196,182', 0.3 * kF);
      headline(ctx, t, 'הזיכרון שלו נמחק.', 540, 700, { size: 92, t0: w('l53', 0).s, color: P.mut });
      headline(ctx, t, 'הרגש שלו —', 540, 880, { size: 112, t0: w('l53', 3).s, color: P.ink });
      headline(ctx, t, 'בידיים שלנו.', 540, 1030, { size: 124, t0: w('l53', 5).s, color: P.acc });
    }
    cap(ctx, t);
  },
});
