// lib/steps.js — shared bits for the slide sheet video: stage names, caption filter, stage photo plate, check chip.
import { caption } from './ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, stepper } from './photo.js';
export const STAGES = ['הכנה', 'הכנסה', 'עמידה', 'הכוונה', 'החלקה', 'הוצאה'];
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
/* photo tile (rounded, cover-cropped around fx,fy at scale s) with a label; o.sel highlights, o.dim darkens */
export function tile(ctx, X, img, cx, cy, TW, TH, fx, fy, s, k, label, o = {}) {
  if (k <= 0) return;
  const P = ctx.P, dim = o.dim || 0, sel = o.sel || 0, sc = 1 + 0.05 * sel;
  X.save(); X.globalAlpha *= k; X.translate(cx, cy + (1 - k) * 40); X.scale(sc, sc);
  const rr = () => { X.beginPath(); X.roundRect(-TW / 2, -TH / 2, TW, TH, 28); };
  X.save(); rr(); X.clip(); X.translate(-fx * s, -fy * s); X.drawImage(ctx.img(img), 0, 0, 1080 * s, 1920 * s); X.restore();
  if (dim > 0) { X.fillStyle = `rgba(11,22,38,${dim})`; rr(); X.fill(); }
  const g = X.createLinearGradient(0, TH / 2 - 120, 0, TH / 2); g.addColorStop(0, 'rgba(11,22,38,0)'); g.addColorStop(1, 'rgba(11,22,38,0.92)'); X.fillStyle = g; rr(); X.fill();
  X.strokeStyle = sel > 0 ? P.acc : 'rgba(46,196,182,0.45)'; X.lineWidth = 3 + 4 * sel; rr(); X.stroke();
  ctx.text(X, label, 0, TH / 2 - 30, { family: 'body', weight: 800, size: o.size || 40, color: P.ink, dir: 'rtl', alpha: 1 - dim * 0.5 });
  X.restore();
}
