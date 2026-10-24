// lib/steps.js — shared bits for the sit-to-stand lift video: stage names, caption filter, stage photo plate, check chip.
import { caption } from './ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, stepper } from './photo.js';
export const STAGES = ['בדיקה', 'הצבה', 'רתמה', 'הרמה', 'תנועה', 'הורדה'];
export const cap = (ctx, t) => caption(ctx, t, { skip: /^c/ });
/* a stage plate: photo with slow push, shade, stepper; returns the mapper */
export function plate(ctx, X, t, img, stage, A, B, o = {}) {
  const sc = ctx.scene, K = lerpKB(ctx, kb(A), kb(B || A), ctx.at(t, sc.start, sc.end + 0.6, 'sineInOut'));
  drawPhoto(ctx, X, img, K, { filter: o.filter }); shade(ctx, X, { dim: o.dim || 0 });
  if (stage) stepper(ctx, X, stage, 1, { steps: STAGES });
  return { K, M: mapper(K) };
}
/* check chip: pill with a ✓ (or ✕) disc on its right (RTL start) */
export function check(ctx, X, x, y, text, k, o = {}) {
  if (k <= 0) return;
  const P = ctx.P, size = o.size || 40, ok = o.ok !== false, col = ok ? P.acc : P.clay;
  X.save(); X.font = ctx.font('body', 800, size); X.direction = 'rtl'; const tw = X.measureText(text).width; X.restore();
  const r = size * 0.5, w = tw + r * 2 + 66, x0 = x - w / 2, h = size * 1.5;
  X.save(); X.globalAlpha *= Math.min(1, k * 1.5); X.translate(0, (1 - ctx.E.cubicOut(k)) * 18);
  X.fillStyle = 'rgba(11,22,38,0.86)'; X.beginPath(); X.roundRect(x0, y - h / 2, w, h, h / 2); X.fill();
  X.strokeStyle = col; X.lineWidth = 3; X.stroke();
  const cx = x0 + w - r - 14, kk = ctx.at(k, 0.3, 1, 'cubicOut'), q = r * 0.45;
  X.fillStyle = col; X.beginPath(); X.arc(cx, y, r, 0, 6.283); X.fill();
  if (ok) ctx.drawPath(X, [[cx - q, y], [cx - q * 0.25, y + q * 0.7], [cx + q, y - q * 0.6]], kk, { width: r * 0.24, color: P.bg, cap: 'round' });
  else { ctx.drawPath(X, [[cx - q, y - q], [cx + q, y + q]], kk, { width: r * 0.24, color: P.bg, cap: 'round' }); ctx.drawPath(X, [[cx + q, y - q], [cx - q, y + q]], kk, { width: r * 0.24, color: P.bg, cap: 'round' }); }
  ctx.text(X, text, x0 + (w - r * 2 - 14) / 2 + 4, y + size * 0.34, { family: 'body', weight: 800, size, color: P.ink, dir: 'rtl' });
  X.restore();
}
