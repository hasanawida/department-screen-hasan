// lib/dv.js — helpers for this video: captions without the caregiver cues, glows, the alarm and calm signals,
// the old family photo ("polaroid"), step chips, emotion waves, the trust meter and a simple loop icon.
import { caption } from './ui.js';
export const cap = (ctx, t) => caption(ctx, t, { skip: /^c/ });

export function glow(ctx, X, x, y, r, rgb, k) {
  if (k <= 0.01) return;
  const g = X.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${0.8 * k})`); g.addColorStop(0.45, `rgba(${rgb},${0.32 * k})`); g.addColorStop(1, `rgba(${rgb},0)`);
  X.save(); X.globalCompositeOperation = 'screen'; X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, 6.283); X.fill(); X.restore();
}
/* red alarm: fast pulsing glow + expanding rings */
export function alarm(ctx, X, t, x, y, k, o = {}) {
  if (k <= 0.01) return; const r = o.r || 70;
  glow(ctx, X, x, y, r * 2.6, '229,72,77', k * (0.7 + 0.3 * Math.sin(t * 9)));
  X.save(); X.strokeStyle = ctx.P.clay; X.lineWidth = o.width || 5;
  for (let i = 0; i < 3; i++) { const ph = ctx.fract(t * 1.2 + i / 3); X.globalAlpha = k * (1 - ph); X.beginPath(); X.arc(x, y, r * (0.6 + 1.7 * ph), 0, 6.283); X.stroke(); }
  X.restore();
}
/* calm: slow breathing teal glow + one slow ring */
export function calm(ctx, X, t, x, y, k, o = {}) {
  if (k <= 0.01) return; const r = o.r || 80, b = 0.5 + 0.5 * Math.sin(t * 1.6);
  glow(ctx, X, x, y, r * (2.2 + 0.4 * b), '46,196,182', k * (0.55 + 0.25 * b));
  X.save(); X.strokeStyle = ctx.P.acc; X.lineWidth = 4; const ph = ctx.fract(t * 0.35); X.globalAlpha = k * (1 - ph) * 0.8;
  X.beginPath(); X.arc(x, y, r * (0.8 + 1.2 * ph), 0, 6.283); X.stroke(); X.restore();
}
/* the old family photo (b8), cut from its plate, as a floating card */
const PH = { x: 75, y: 227, w: 914, h: 1455 };
export function polaroid(ctx, X, cx, cy, w, rot, k, o = {}) {
  if (k <= 0.01) return; const im = ctx.img('b8'); if (!im) return;
  const h = w * PH.h / PH.w, s = 0.92 + 0.08 * ctx.E.cubicOut(k);
  X.save(); X.globalAlpha *= Math.min(1, k * 1.4); X.translate(cx, cy + (1 - k) * 30); X.rotate(rot); X.scale(s, s);
  X.shadowColor = 'rgba(0,0,0,0.55)'; X.shadowBlur = 40; X.shadowOffsetY = 14;
  X.fillStyle = '#000'; X.fillRect(-w / 2, -h / 2, w, h); X.shadowColor = 'transparent';
  if (o.filter) X.filter = o.filter;
  X.drawImage(im, PH.x * im.width / 1080, PH.y * im.height / 1920, PH.w * im.width / 1080, PH.h * im.height / 1920, -w / 2, -h / 2, w, h);
  X.restore();
}
/* step chip: number disc + label, centred at (x, y) */
export function step(ctx, t, n, label, x, y, t0, out, o = {}) {
  const { X, P } = ctx, k = ctx.at(t, t0, t0 + 0.6, 'expoOut') * (out != null ? 1 - ctx.at(t, out, out + 0.4) : 1);
  if (k <= 0) return;
  const size = o.size || 64; X.save(); X.font = ctx.font('display', 900, size); X.direction = 'rtl'; const w = X.measureText(label).width; X.restore();
  const R = size * 0.62, gap = 26, tw = w + 2 * R + gap, x0 = x + tw / 2;
  X.save(); X.globalAlpha *= k; X.translate(0, (1 - k) * 30);
  X.fillStyle = o.color || P.acc; X.beginPath(); X.arc(x0 - R, y - size * 0.32, R, 0, 6.283); X.fill();
  ctx.text(X, String(n), x0 - R, y - size * 0.32 + size * 0.3, { family: 'num', weight: 800, size: size * 0.8, color: P.bg });
  ctx.text(X, label, x0 - 2 * R - gap, y, { family: 'display', weight: 900, size, color: P.ink, dir: 'rtl', align: 'right' });
  X.restore();
}
/* emotion waves travelling from a to b (arcs facing b) */
export function waves(ctx, X, t, a, b, k, rgb) {
  if (k <= 0.01) return;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  X.save(); X.translate(a[0], a[1]); X.rotate(ang); X.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const ph = ctx.fract(t * 0.55 + i / 4), x = 40 + ph * (L - 80), r = 40 + 50 * ph;
    X.globalAlpha = k * Math.sin(Math.PI * ph) * 0.9; X.strokeStyle = `rgb(${rgb})`; X.lineWidth = 7;
    X.beginPath(); X.arc(x - r, 0, r, -0.7, 0.7); X.stroke();
  }
  X.restore();
}
/* trust meter: label + bar (0..1) with a crack when low */
export function meter(ctx, X, label, x, y, w, v, k, o = {}) {
  if (k <= 0.01) return; const { P } = ctx, h = 34;
  X.save(); X.globalAlpha *= k;
  ctx.text(X, label, x + w / 2, y - 26, { family: 'display', weight: 900, size: 52, color: P.ink, dir: 'rtl', align: 'right' });
  X.fillStyle = 'rgba(11,22,38,0.85)'; X.strokeStyle = 'rgba(242,246,250,0.5)'; X.lineWidth = 3;
  X.beginPath(); X.roundRect(x - w / 2, y, w, h, h / 2); X.fill(); X.stroke();
  const col = v > 0.6 ? P.acc : v > 0.35 ? P.hi : P.clay, fw = Math.max(h, w * v);
  X.fillStyle = col; X.beginPath(); X.roundRect(x + w / 2 - fw, y, fw, h, h / 2); X.fill();   // fills from the right (RTL)
  X.restore();
}
/* circular "again" arrow */
export function loopIcon(ctx, X, t, x, y, r, k, col) {
  if (k <= 0.01) return;
  X.save(); X.globalAlpha *= k; X.translate(x, y); X.rotate(t * 1.4); X.strokeStyle = col; X.fillStyle = col; X.lineWidth = r * 0.18; X.lineCap = 'round';
  X.beginPath(); X.arc(0, 0, r, 0.3, Math.PI * 1.75); X.stroke();
  const ex = r * Math.cos(Math.PI * 1.75), ey = r * Math.sin(Math.PI * 1.75);
  X.translate(ex, ey); X.rotate(Math.PI * 1.75 + Math.PI / 2); X.beginPath(); X.moveTo(-r * 0.32, -r * 0.05); X.lineTo(r * 0.32, -r * 0.05); X.lineTo(0, r * 0.38); X.closePath(); X.fill();
  X.restore();
}
/* a small row of pills, laid out right-to-left and centred, each appearing at its own time */
export function pillRow(ctx, t, items, y, o = {}) {
  const { X } = ctx, size = o.size || 44, gap = o.gap || 26;
  const ws = items.map(([txt]) => { X.save(); X.font = ctx.font('body', 800, size); const w = X.measureText(txt).width + 44; X.restore(); return w; });
  const tot = ws.reduce((a, b) => a + b, 0) + gap * (items.length - 1); let x = 540 + tot / 2;
  return items.map(([txt, t0, col], i) => { const cx = x - ws[i] / 2; x -= ws[i] + gap; return [cx, txt, ctx.at(t, t0, t0 + 0.5, 'expoOut') * (o.out != null ? 1 - ctx.at(t, o.out, o.out + 0.4) : 1), col]; });
}
