// s5 — an everyday transfer, bed → chair; the two wrong moves: a hard grip on the arm, pulling by the hand.
import { AN, caption, headline, sub, badge, bg } from '../lib/ui.js';
import { drawArm, drawGlove, drawThumb, gloveTips, drawPress } from '../lib/arm.js';

const BED = 'M 640 846 L 940 846 L 940 892 L 640 892 Z M 940 760 L 940 980 M 652 892 L 652 980 M 928 892 L 928 980 M 660 812 L 790 812';
const PILLOW = 'M 870 846 C 868 818 924 816 926 846';
const CHAIR = 'M 300 990 A 92 92 0 1 1 300.1 990 M 250 860 L 372 860 L 372 900 M 250 860 L 226 742 L 190 742 M 254 812 L 352 812 M 372 900 L 410 978 L 446 978';

MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    bg(ctx, X, { cy: 1000 });
    const tBed = w('l12', 4).s, tChair = w('l12', 5).s, tB = w('l13', 0).s - 0.5, tPull = w('l13', 4).s;

    // ── A: bed → chair (line icons) ──
    const outA = at(t, tB - 0.2, tB + 0.5, 'cubicInOut');
    if (outA < 1) {
      X.save(); X.globalAlpha = 1 - outA; X.translate(540, 880 - outA * 120); X.scale(1.22, 1.22); X.translate(-540, -880);
      const kBed = at(t, w('l12', 0).s, tBed + 0.4, 'cubicInOut'), kCh = at(t, tChair - 0.4, tChair + 0.5, 'cubicInOut');
      ctx.drawPath(X, BED, kBed, { width: 9, color: P.ink, smooth: false });
      ctx.drawPath(X, PILLOW, kBed, { width: 9, color: P.ink });
      ctx.drawPath(X, CHAIR, kCh, { width: 9, color: P.ink, smooth: false });
      X.save(); X.globalAlpha *= kCh; X.strokeStyle = P.ink; X.lineWidth = 9; X.beginPath(); X.arc(424, 990, 20, 0, 6.283); X.stroke(); X.restore();
      // dotted arc bed → chair (right → left)
      const info = ctx.pathInfo('M 780 740 Q 560 560 330 700'), k = at(t, tBed, tChair + 0.6, 'cubicInOut');
      X.fillStyle = P.acc;
      for (let l = 0; l <= info.len * k; l += 26) { const [x, y] = info.at(l); X.beginPath(); X.arc(x, y, 6, 0, 6.283); X.fill(); }
      if (k > 0.05) { const [x, y] = info.at(info.len * k), [x0, y0] = info.at(Math.max(0, info.len * k - 10)), a = Math.atan2(y - y0, x - x0);
        X.save(); X.translate(x, y); X.rotate(a); X.beginPath(); X.moveTo(18, 0); X.lineTo(-12, -14); X.lineTo(-12, 14); X.closePath(); X.fill(); X.restore(); }
      X.restore();
      headline(ctx, t, 'מעבר', 540, 320, { size: 130, t0: sc.start + 0.35, out: tB - 0.1 });
      sub(ctx, t, 'מהמיטה לכיסא', 540, 420, { t0: tBed, size: 56, color: P.ink, out: tB - 0.1 });
    }

    // ── B: the two wrong moves ──
    const inB = at(t, tB, tB + 0.7, 'cubicOut');
    if (inB > 0) {
      const GX = 600, CY = 1010;
      const lift = 1 - at(t, tB + 0.2, w('l13', 1).s + 0.1, 'expoOut');
      const press = at(t, w('l13', 1).s, w('l13', 2).s + 0.2, 'cubicOut');
      const pull = at(t, tPull - 0.1, w('l13', -1).e, 'cubicInOut');
      const drag = -150 * pull, armShift = -70 * pull;
      const G = { x: GX, cy: CY, lift, press, drag: drag - armShift };
      X.save(); X.globalAlpha = inB; X.translate(armShift, 0);
      drawThumb(ctx, X, G);
      const tp = gloveTips({ x: GX, cy: CY, drag: drag - armShift });
      drawArm(ctx, X, { cy: CY, inside: XX => drawPress(ctx, XX, tp.tips, press) });
      drawGlove(ctx, X, G);
      X.restore();
      // pressure rings around the fingers
      const pr = press * (1 - pull);
      if (pr > 0.01) {
        X.save(); X.strokeStyle = P.clay; X.lineWidth = 5;
        for (let i = 0; i < 3; i++) { const ph = ctx.fract((t - w('l13', 1).s) * 0.8 + i / 3); X.globalAlpha = pr * (1 - ph) * 0.8; X.beginPath(); X.ellipse(GX + armShift, CY - 60, 190 + ph * 160, 120 + ph * 90, 0, Math.PI * 1.05, Math.PI * 1.95); X.stroke(); }
        X.restore();
      }
      // pull arrow + speed lines (toward the left)
      if (pull > 0.01) {
        ctx.drawPath(X, 'M 860 1250 Q 620 1300 330 1250', at(t, tPull, tPull + 0.7, 'cubicOut'), { width: 12, color: P.clay });
        const kh = at(t, tPull + 0.55, tPull + 0.8);
        if (kh > 0) { X.save(); X.globalAlpha = kh; X.fillStyle = P.clay; X.translate(330, 1250); X.rotate(Math.atan2(1250 - 1268, 330 - 400)); X.beginPath(); X.moveTo(30, 0); X.lineTo(-16, -22); X.lineTo(-16, 22); X.closePath(); X.fill(); X.restore(); }
        X.save(); X.strokeStyle = P.ink; X.lineCap = 'round'; X.lineWidth = 5;
        for (let i = 0; i < 4; i++) { const y = 900 + i * 50, x = 860 + 30 * Math.sin(i * 2.1); X.globalAlpha = 0.5 * pull * (1 - at(t, w('l13', -1).e, w('l13', -1).e + 0.5)); X.beginPath(); X.moveTo(x, y); X.lineTo(x + 90, y); X.stroke(); }
        X.restore();
      }
      badge(ctx, X, 905, 700, 46, 'x', at(t, w('l13', 2).s, w('l13', 2).s + 0.6) * (1 - at(t, tPull - 0.3, tPull)));
      badge(ctx, X, 905, 560, 46, 'x', at(t, w('l13', -1).s, w('l13', -1).s + 0.6) * (1 - at(t, sc.end - 0.4, sc.end)));
      headline(ctx, t, 'תפיסה חזקה בזרוע', 540, 320, { size: 96, times: [w('l13', 0).s, w('l13', 1).s, w('l13', 2).s], out: tPull - 0.35, colors: [null, P.clay, null] });
      headline(ctx, t, 'משיכה ביד', 540, 320, { size: 112, times: [tPull, w('l13', -1).s], out: sc.end - 0.35, colors: [P.clay, null] });
    }
    caption(ctx, t);
  },
});
