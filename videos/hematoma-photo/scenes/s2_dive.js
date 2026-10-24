// s2 — a lens opens on the bruise and shows the real skin layers underneath.
import { caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, drawPhoto, shade, lens, feather } from '../lib/photo.js';

MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const K = lerpKB(ctx, kb({ s: 1.9, cx: 540, cy: 1050 }), kb({ s: 2.3, cx: 540, cy: 1050 }), at(t, sc.start - 0.3, sc.end, 'sineInOut'));
    drawPhoto(ctx, X, 'bruises', K);
    const open = at(t, w('l3', 0).s - 0.1, w('l3', 4).s + 0.2, 'expoOut'), full = at(t, sc.end - 0.8, sc.end + 0.05, 'cubicInOut');
    X.fillStyle = `rgba(11,22,38,${0.55 * open})`; X.fillRect(0, 0, ctx.W, ctx.H);
    const R = ctx.lerp(400 * open, 1250, full), cx = ctx.lerp(540, 540, full), cy = ctx.lerp(980, 960, full);
    if (R > 2) {
      const s = ctx.lerp(0.55, 0.78, full), ty = ctx.lerp(980, 900, full);
      X.save(); X.beginPath(); X.arc(cx, cy, R, 0, 6.283); X.clip(); X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
      X.save(); X.translate(540, ty); X.scale(s, s); X.translate(-540, -960); X.drawImage(ctx.img('skinY'), 0, 0, 1080, 1920); X.restore();
      feather(ctx, X, { s, cx: 540, cy: 960, dx: 0, dy: ty - 960 }, full);
      X.restore();
      ctx.drawPath(X, `M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R}`, Math.min(1, open * 1.15), { width: 8 * (1 - full), color: P.acc, tip: { r: 10, color: P.ink } });
    }
    shade(ctx, X);
    sub(ctx, t, 'בואו נראה מה קורה', 540, 250, { t0: w('l3', 0).s, size: 56, color: P.ink, out: sc.end - 0.5 });
    headline(ctx, t, 'מתחת לעור', 540, 370, { size: 120, times: [w('l3', 4).s, w('l3', 5).s], out: sc.end - 0.5 });
    caption(ctx, t);
  },
});
