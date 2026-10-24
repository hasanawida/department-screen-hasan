// s7 — damage goes deeper: healthy bone vs. thin, porous bone (osteoporosis).
import { AN, caption, headline, sub, bg } from '../lib/ui.js';

const BONE = 'M 480 640 C 430 600 420 540 470 520 C 500 505 520 530 540 540 C 560 530 580 505 610 520 C 660 540 650 600 600 640 L 590 1140 C 640 1180 650 1240 600 1260 C 570 1275 555 1250 540 1240 C 525 1250 510 1275 480 1260 C 430 1240 440 1180 490 1140 Z';

function section(ctx, seed) {                 // seeded trabecular network inside a unit circle
  const r = ctx.seeded(seed), pts = [], edges = [], holes = [];
  for (let i = 0; i < 95; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * 0.92; pts.push([Math.cos(a) * d, Math.sin(a) * d]); }
  pts.forEach((p, i) => pts.map((q, j) => [j, Math.hypot(q[0] - p[0], q[1] - p[1])]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 3)
    .forEach(([j]) => { if (i < j || !edges.some(e => e[0] === j && e[1] === i)) edges.push([i, j, r()]); }));
  for (let i = 0; i < 9; i++) { const a = r() * 6.283; holes.push([a, r.range(0.84, 0.94), r.range(0.03, 0.06)]); }
  return { pts, edges, holes };
}
function drawSection(ctx, X, S, cx, cy, R, p) {  // p: porosity 0 (healthy) → 1 (osteoporotic)
  const cort = R * ctx.lerp(0.3, 0.12, p), inner = R - cort;
  X.save();
  X.fillStyle = AN.bone; X.beginPath(); X.arc(cx, cy, R, 0, 6.283); X.fill();
  X.strokeStyle = 'rgba(160,140,110,0.45)'; X.lineWidth = 2;
  for (let q = inner + 6; q < R - 3; q += 7) { X.beginPath(); X.arc(cx, cy, q, 0, 6.283); X.stroke(); }
  X.fillStyle = ctx.lerp(0, 1, p) > 0.5 ? '#4E2226' : '#6B2B2E';
  X.beginPath(); X.arc(cx, cy, inner, 0, 6.283); X.fill();
  X.save(); X.beginPath(); X.arc(cx, cy, inner, 0, 6.283); X.clip();
  X.strokeStyle = AN.bone; X.lineCap = 'round';
  for (const [i, j, th] of S.edges) {
    if (th < p * 0.72) continue;
    X.lineWidth = ctx.lerp(13, 3.5, p) * (0.7 + 0.6 * th);
    const a = S.pts[i], b = S.pts[j];
    X.beginPath(); X.moveTo(cx + a[0] * inner, cy + a[1] * inner); X.lineTo(cx + b[0] * inner, cy + b[1] * inner); X.stroke();
  }
  X.restore();
  if (p > 0.3) { X.fillStyle = '#4E2226'; X.globalAlpha = ctx.clamp((p - 0.3) / 0.5); for (const [a, d, s] of S.holes) { X.beginPath(); X.arc(cx + Math.cos(a) * R * d, cy + Math.sin(a) * R * d, R * s, 0, 6.283); X.fill(); } X.globalAlpha = 1; }
  X.strokeStyle = 'rgba(0,0,0,0.25)'; X.lineWidth = 3; X.beginPath(); X.arc(cx, cy, R, 0, 6.283); X.stroke();
  X.restore();
}

MOTION.scene({
  id: 's7',
  setup(ctx) { this.A = section(ctx, 31); this.B = section(ctx, 31); },
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    bg(ctx, X, { cy: 950 });
    const tCut = w('l18', 0).s - 0.2, tThin = w('l18', 4).s, tOst = w('l18', -1).s;
    // part 1: the bone draws in
    const fade = 1 - at(t, tCut + 0.5, tCut + 1.1, 'cubicInOut');
    if (fade > 0) {
      X.save(); X.globalAlpha = fade; X.translate(540, 870); X.scale(1.08, 1.08); X.translate(-540, -900);
      const kd = at(t, sc.start + 0.2, w('l17', 3).s, 'cubicInOut'), kf = at(t, w('l17', 3).s - 0.2, w('l17', -1).s, 'cubicOut');
      const pth = new Path2D(BONE);
      X.save(); X.globalAlpha *= kf; const g = X.createLinearGradient(420, 0, 660, 0); g.addColorStop(0, '#FFF8EA'); g.addColorStop(0.6, AN.bone); g.addColorStop(1, '#C9B898'); X.fillStyle = g; X.fill(pth); X.restore();
      ctx.drawPath(X, BONE, kd, { width: 7, color: P.ink, smooth: false });
      // cut line across the shaft
      const kc = at(t, tCut, tCut + 0.5, 'cubicInOut');
      if (kc > 0) ctx.drawPath(X, [[380, 900], [700, 900]], kc, { width: 6, color: P.acc });
      X.restore();
    }
    // part 2: two cross-sections
    const kin = at(t, tCut + 0.4, tCut + 1.2, 'expoOut');
    if (kin > 0) {
      const p = at(t, tThin - 0.3, tOst - 0.2, 'cubicInOut');
      const R = 200 * (0.85 + 0.15 * kin), y = 1040;
      X.save(); X.globalAlpha = kin;
      drawSection(ctx, X, this.A, ctx.lerp(540, 790, kin), y, R, 0);
      drawSection(ctx, X, this.B, ctx.lerp(540, 290, kin), y, R, p);
      X.restore();
      sub(ctx, t, 'עצם בריאה', 790, 780, { t0: tCut + 0.8, size: 50, weight: 800, color: P.acc });
      sub(ctx, t, 'עצם מבוגרת', 290, 780, { t0: tCut + 1.0, size: 50, weight: 800, color: P.clay, out: tThin - 0.2 });
      sub(ctx, t, 'דקה ונקבובית', 290, 780, { t0: tThin, size: 50, weight: 800, color: P.clay });
    }
    headline(ctx, t, 'הנזק לא נעצר בעור', 540, 320, { size: 96, maxWidth: 1000, times: [w('l17', 1).s, w('l17', 2).s, w('l17', 4).s, w('l17', 5).s], out: tCut + 0.2 });
    headline(ctx, t, 'העצם נחלשת', 540, 320, { size: 112, times: [w('l18', 2).s, w('l18', 3).s], out: tOst - 0.4 });
    headline(ctx, t, 'אוסטאופורוזיס', 540, 320, { size: 108, times: [tOst], color: P.clay });
    sub(ctx, t, 'עצם דקה ונקבובית שנשברת בקלות', 540, 412, { t0: tOst + 0.4, size: 48, color: P.ink });
    caption(ctx, t);
  },
});
