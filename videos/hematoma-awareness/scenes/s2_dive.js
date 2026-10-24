// s2 — dive under the skin: a lens opens on the bruise and shows the layers beneath.
import { AN, caption, headline, sub, draw3D, bg } from '../lib/ui.js';
import { drawArm, drawBruise, gloveTips } from '../lib/arm.js';
import { buildSkin, lights, CAM } from '../lib/skin.js';

const GX = 600, CY = 1000, DRAG = 46;

MOTION.scene({
  id: 's2',
  setup(ctx) {
    this.st = ctx.stage3D({ fov: CAM.fov, env: 'room', tone: 'neutral' });
    this.st.scene.environmentIntensity = 0.35;
    lights(ctx, this.st);
    this.skin = buildSkin(ctx, { seed: 11 });
    this.st.add(this.skin.root);
  },
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    bg(ctx, X, { cy: 1000 });
    const tp = gloveTips({ x: GX, cy: CY, drag: DRAG });
    const ex = tp.tips[1][0] + 40, ey = tp.tips[1][1];
    // continue s1's dive toward the bruises
    const z = 2.12 + 0.5 * at(t, sc.start - 0.4, sc.end, 'sineInOut');
    X.save(); X.translate(540, 1040); X.translate(ex - 540, ey - 1000); X.scale(z, z); X.translate(-ex, -ey);
    drawArm(ctx, X, { cy: CY, inside: XX => {
      tp.tips.forEach(([x, y], i) => drawBruise(ctx, XX, x + (i - 1.5) * 4, y - 6, 62, 46, 0.8 + 0.2 * (i % 2), 0.95, i + 1));
      drawBruise(ctx, XX, tp.thumb[0], tp.thumb[1] - 30, 50, 34, 0.85, 0.95, 9);
    } });
    X.restore();
    // darken the outside while the lens is open
    const open = at(t, w('l3', 0).s - 0.1, w('l3', 4).s + 0.2, 'expoOut'), full = at(t, sc.end - 0.75, sc.end + 0.05, 'cubicInOut');
    X.fillStyle = P.bg; X.globalAlpha = 0.55 * open; X.fillRect(0, 0, ctx.W, ctx.H); X.globalAlpha = 1;
    const cx = 540, cy = 930, R = ctx.lerp(380 * open, 1250, full);
    if (R > 1) {
      this.skin.set({});
      this.st.orbit(CAM.az + 0.25 * (1 - full), CAM.el, CAM.dist - 3 * (1 - full), CAM.target);
      X.save(); X.beginPath(); X.arc(cx, cy, R, 0, Math.PI * 2); X.clip();
      bg(ctx, X, { cy: 1000 });
      draw3D(ctx, this.st, X);
      X.restore();
      ctx.drawPath(X, `M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R}`, Math.min(1, open * 1.15), { width: 8 * (1 - full), color: P.acc, tip: { r: 10, color: P.ink } });
    }
    sub(ctx, t, 'בואו נראה מה קורה', 540, 250, { t0: w('l3', 0).s, size: 56, color: P.mut, out: sc.end - 0.5 });
    headline(ctx, t, 'מתחת לעור', 540, 370, { size: 120, times: [w('l3', 4).s, w('l3', 5).s], out: sc.end - 0.5 });
    caption(ctx, t);
  },
});
