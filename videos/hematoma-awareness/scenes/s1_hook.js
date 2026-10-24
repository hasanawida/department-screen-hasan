// s1 — hook: one wrong grip leaves a mark on an older person's arm.
import { AN, caption, headline, sub, bg } from '../lib/ui.js';
import { drawArm, drawBruise, drawGlove, drawThumb, gloveTips, drawPress } from '../lib/arm.js';

const GX = 600, CY = 1000, DRAG = 46, ZOOM = 1.16;

MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    bg(ctx, X, { cy: 1000, glow: 'rgba(229,72,77,0.07)' });
    const l1 = i => w('l1', i).s, l2 = i => w('l2', i).s;

    // grip choreography
    const lift = 1 - at(t, 0.25, 1.15, 'expoOut') + at(t, l1(4) - 0.25, l1(4) + 0.45, 'cubicInOut');
    const press = at(t, 1.0, 1.45, 'cubicOut') * (1 - at(t, l1(4) - 0.2, l1(4) + 0.1, 'cubicIn'));
    const drag = DRAG * at(t, l1(3), l1(3) + 0.55, 'cubicInOut');
    const G = { x: GX, cy: CY, lift: Math.min(1, lift), press, drag };
    const tp = gloveTips({ x: GX, cy: CY, drag: DRAG });
    const bruiseK = at(t, l1(4) + 0.1, l1(6) + 0.3, 'cubicOut'), bruiseAge = at(t, l1(5), l2(3), 'sineInOut');

    // slow push-in, then a dive toward the bruises at the end
    const ex = tp.tips[1][0] + 40, ey = tp.tips[1][1];
    const z = ZOOM + 0.05 * at(t, 0, 8) + 0.9 * at(t, l2(-1) + 0.2, ctx.scene.end + 0.3, 'cubicIn');
    X.save(); X.translate(540, 1040); X.translate(ex - 540, ey - 1000); X.scale(z, z); X.translate(-ex, -ey);
    X.globalAlpha = at(t, 0, 0.5);
    drawThumb(ctx, X, G);
    drawArm(ctx, X, {
      cy: CY, inside: XX => {
        drawPress(ctx, XX, tp.tips.map(([x, y]) => [x - DRAG + drag, y]), press * 0.9);
        tp.tips.forEach(([x, y], i) => drawBruise(ctx, XX, x + (i - 1.5) * 4, y - 6, 62, 46, bruiseK * (0.8 + 0.2 * (i % 2)), bruiseAge, i + 1));
        drawBruise(ctx, XX, tp.thumb[0], tp.thumb[1] - 30, 50, 34, bruiseK * 0.85, bruiseAge, 9);
      }
    });
    drawGlove(ctx, X, G);
    X.restore();

    // headlines
    const out1 = l2(0) - 0.45;
    headline(ctx, t, 'תפיסה אחת לא נכונה', 540, 320, { size: 92, maxWidth: 1000, times: [l1(0), l1(1), l1(2), l1(3)], out: out1 });
    headline(ctx, t, 'ונשאר סימן כחול', 540, 450, { size: 92, maxWidth: 1000, times: [l1(4), l1(5), l1(6)], color: AN.bruiseLight, out: out1 });
    sub(ctx, t, 'אצל אנשים מבוגרים', 540, 300, { t0: l2(0), size: 56, color: P.mut, out: ctx.scene.end - 0.6 });
    const B = headline(ctx, t, 'זה קורה הרבה יותר בקלות', 540, 430, { size: 84, maxWidth: 1000, times: [l2(3), l2(4), l2(5), l2(6), l2(7)], colors: [null, null, null, null, P.clay], out: ctx.scene.end - 0.6 });
    if (B) {
      const b = B[B.length - 1], k = at(t, l2(7) + 0.15, l2(7) + 0.7, 'cubicInOut') * (1 - at(t, ctx.scene.end - 0.6, ctx.scene.end - 0.2));
      ctx.drawPath(X, [[b.x + b.w + 6, b.base + 22], [b.x + b.w * 0.5, b.base + 30], [b.x - 6, b.base + 20]], k, { width: 8, color: P.clay });
    }
    caption(ctx, t);
  },
});
