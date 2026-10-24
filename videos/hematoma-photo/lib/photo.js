// lib/photo.js — photo plates (Ken Burns) + the overlay "layers": spine chain, pressure heat, lenses, arrows, stage stepper.
import { AN } from './ui.js';

/* Ken Burns state: scale s about focus (cx, cy), plus a pan (dx, dy) */
export function kb(o) { return { s: o.s ?? 1, cx: o.cx ?? 540, cy: o.cy ?? 960, dx: o.dx ?? 0, dy: o.dy ?? 0, rot: o.rot ?? 0 }; }
export function lerpKB(ctx, A, B, k) { const L = ctx.lerp; return { s: L(A.s, B.s, k), cx: L(A.cx, B.cx, k), cy: L(A.cy, B.cy, k), dx: L(A.dx || 0, B.dx || 0, k), dy: L(A.dy || 0, B.dy || 0, k), rot: L(A.rot || 0, B.rot || 0, k) }; }
export const mapper = K => ([x, y]) => {
  let px = (x - K.cx) * K.s, py = (y - K.cy) * K.s;
  if (K.rot) { const c = Math.cos(K.rot), s = Math.sin(K.rot); [px, py] = [px * c - py * s, px * s + py * c]; }
  return [px + K.cx + K.dx, py + K.cy + K.dy];
};
export function drawPhoto(ctx, X, name, K, o = {}) {
  const im = ctx.img(name); if (!im) return;
  X.save(); if (o.alpha != null) X.globalAlpha *= o.alpha; if (o.filter) X.filter = o.filter;
  X.translate(K.cx + K.dx, K.cy + K.dy); if (K.rot) X.rotate(K.rot); X.scale(K.s, K.s); X.translate(-K.cx, -K.cy);
  X.drawImage(im, 0, 0, 1080, 1920);
  X.restore();
}
/* readability: darken top (titles) and bottom (captions); dim = extra overall darkening for the overlay layer */
export function shade(ctx, X, o = {}) {
  const top = X.createLinearGradient(0, 0, 0, o.topH ?? 560);
  top.addColorStop(0, 'rgba(11,22,38,0.92)'); top.addColorStop(0.6, 'rgba(11,22,38,0.55)'); top.addColorStop(1, 'rgba(11,22,38,0)');
  X.fillStyle = top; X.fillRect(0, 0, ctx.W, o.topH ?? 560);
  const bot = X.createLinearGradient(0, 1250, 0, 1920);
  bot.addColorStop(0, 'rgba(11,22,38,0)'); bot.addColorStop(0.45, 'rgba(11,22,38,0.6)'); bot.addColorStop(1, 'rgba(11,22,38,0.92)');
  X.fillStyle = bot; X.fillRect(0, 1250, ctx.W, 670);
  if (o.dim) { X.fillStyle = `rgba(11,22,38,${0.5 * o.dim})`; X.fillRect(0, 0, ctx.W, ctx.H); }
}
function mixHex(a, b, k) { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; }
export function loadColor(ctx, l) { const P = ctx.P; return l < 0.5 ? mixHex(P.acc, P.hi, l * 2) : mixHex(P.hi, P.clay, (l - 0.5) * 2); }

/* spine layer: pts = screen points from neck (C7) to sacrum; k = reveal 0..1; load 0..1 colours the lumbar discs */
export function spine(ctx, X, pts, k, o = {}) {
  if (k <= 0) return;
  const info = ctx.pathInfo(pts), N = 17, load = o.load || 0, sc = o.scale || 1, a = o.alpha ?? 1;
  X.save(); X.globalAlpha *= a;
  // glow channel
  ctx.drawPath(X, pts, k, { width: 34 * sc, color: load > 0.5 ? 'rgba(229,72,77,0.28)' : 'rgba(46,196,182,0.25)' });
  const n = Math.floor(N * k + 0.0001);
  for (let i = 0; i < n; i++) {
    const l = info.len * (i + 0.5) / N, [x, y] = info.at(l), [x2, y2] = info.at(Math.min(info.len, l + 2)), ang = Math.atan2(y2 - y, x2 - x);
    const lumbar = i >= N - 6 && i < N - 1, w = (lumbar ? 30 : 22 + i * 0.4) * sc, h = (lumbar ? 20 : 15) * sc;
    X.save(); X.translate(x, y); X.rotate(ang);
    X.fillStyle = '#EFE5CF'; X.strokeStyle = 'rgba(0,0,0,0.35)'; X.lineWidth = 1.5;
    X.beginPath(); X.roundRect(-h / 2, -w / 2, h, w, 5 * sc); X.fill(); X.stroke();
    if (i < n - 1) {                                   // disc to the next vertebra
      const dl = lumbar ? load : load * 0.35, sq = 1 - 0.45 * dl;
      X.fillStyle = loadColor(ctx, dl);
      X.beginPath(); X.ellipse(h / 2 + 4 * sc, 0, 3.5 * sc * sq + 1, w / 2 + 3 * dl * sc, 0, 0, 6.283); X.fill();
    }
    X.restore();
  }
  X.restore();
}
/* pressure heat spot */
export function heat(ctx, X, x, y, r, k) {
  if (k <= 0.01) return;
  const g = X.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(229,72,77,${0.78 * k})`); g.addColorStop(0.45, `rgba(245,194,107,${0.45 * k})`); g.addColorStop(1, 'rgba(245,194,107,0)');
  X.save(); X.globalCompositeOperation = 'screen'; X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, 6.283); X.fill(); X.restore();
}
/* circular lens showing another photo; focus = {x, y, s} in that photo's 1080x1920 space */
export function lens(ctx, X, name, cx, cy, R, focus, k, o = {}) {
  if (k <= 0) return;
  const im = ctx.img(name), r = R * (0.85 + 0.15 * ctx.E.cubicOut(k));
  X.save(); X.globalAlpha *= Math.min(1, k * 1.6);
  if (o.from) { X.strokeStyle = o.color || ctx.P.ink; X.lineWidth = 3; X.setLineDash([10, 9]); X.beginPath(); X.moveTo(o.from[0], o.from[1]); X.lineTo(cx + (o.from[0] - cx) * r / Math.hypot(o.from[0] - cx, o.from[1] - cy), cy + (o.from[1] - cy) * r / Math.hypot(o.from[0] - cx, o.from[1] - cy)); X.stroke(); X.setLineDash([]);
    X.fillStyle = o.color || ctx.P.ink; X.beginPath(); X.arc(o.from[0], o.from[1], 9, 0, 6.283); X.fill(); }
  X.save(); X.beginPath(); X.arc(cx, cy, r, 0, 6.283); X.clip();
  X.fillStyle = ctx.P.bg; X.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  const s = focus.s || 1; X.translate(cx, cy); X.scale(s, s); X.translate(-focus.x, -focus.y); X.drawImage(im, 0, 0, 1080, 1920);
  X.restore();
  X.strokeStyle = o.color || ctx.P.ink; X.lineWidth = 7; X.beginPath(); X.arc(cx, cy, r, 0, 6.283); X.stroke();
  X.restore();
  return { map: ([x, y]) => [cx + (x - focus.x) * (focus.s || 1), cy + (y - focus.y) * (focus.s || 1)], r };
}
/* arrow along points with a head */
export function arrow(ctx, X, pts, k, o = {}) {
  if (k <= 0) return;
  const col = o.color || ctx.P.clay, w = o.width || 12;
  X.save(); if (o.alpha != null) X.globalAlpha *= o.alpha;
  const tip = ctx.drawPath(X, pts, k, { width: w, color: col, smooth: o.smooth !== false }) || pts[pts.length - 1];
  const info = ctx.pathInfo(pts, o.smooth !== false), L = info.len * Math.min(1, k), [x0, y0] = info.at(Math.max(0, L - 6));
  const a = Math.atan2(tip[1] - y0, tip[0] - x0), hs = w * 2.4;
  X.fillStyle = col; X.translate(tip[0], tip[1]); X.rotate(a); X.beginPath(); X.moveTo(hs * 0.9, 0); X.lineTo(-hs * 0.5, -hs * 0.75); X.lineTo(-hs * 0.5, hs * 0.75); X.closePath(); X.fill();
  X.restore();
}
/* pill label */
export function pill(ctx, X, x, y, text, k, o = {}) {
  if (k <= 0) return;
  const size = o.size || 44, col = o.color || ctx.P.ink;
  X.save(); X.font = ctx.font(o.family || 'body', o.weight || 800, size); X.direction = 'rtl'; const w = X.measureText(text).width; X.restore();
  const a = o.align || 'center', x0 = a === 'center' ? x - w / 2 : a === 'right' ? x - w : x;
  X.save(); X.globalAlpha *= Math.min(1, k * 1.5); X.translate(0, (1 - ctx.E.cubicOut(k)) * 18);
  X.fillStyle = o.bg || 'rgba(11,22,38,0.82)'; X.beginPath(); X.roundRect(x0 - 22, y - size * 0.82, w + 44, size * 1.42, size * 0.71); X.fill();
  if (o.border !== false) { X.strokeStyle = o.border || col; X.lineWidth = 3; X.stroke(); }
  ctx.text(X, text, x0 + w / 2, y + size * 0.3, { family: o.family || 'body', weight: o.weight || 800, size, color: col, dir: 'rtl' });
  X.restore();
}
/* pulsing ring */
export function ring(ctx, X, x, y, r, t, k, o = {}) {
  if (k <= 0) return;
  X.save(); X.strokeStyle = o.color || ctx.P.clay; X.lineWidth = o.width || 6;
  for (let i = 0; i < 2; i++) { const ph = ctx.fract(t * 0.7 + i / 2); X.globalAlpha = k * (1 - ph) * 0.9; X.beginPath(); X.arc(x, y, r * (0.8 + 0.5 * ph), 0, 6.283); X.stroke(); }
  X.globalAlpha = k; X.lineWidth = (o.width || 6) * 0.8; X.beginPath(); X.arc(x, y, r * 0.8, 0, 6.283); X.stroke();
  X.restore();
}
/* stage stepper (4 steps, RTL: step 1 on the right) */
const STEPS = ['אחיזה', 'הרמה', 'סיבוב', 'הורדה'];
export function stepper(ctx, X, cur, k = 1, o = {}) {
  if (k <= 0) return;
  const P = ctx.P, y = o.y ?? 172, w = 232, gap = 14, x0 = 540 + (2 * w + 1.5 * gap) - w / 2;
  X.save(); X.globalAlpha *= k; X.translate(0, (1 - k) * -30);
  STEPS.forEach((s, i) => {
    const cx = x0 - i * (w + gap), on = i + 1 === cur, done = i + 1 < cur;
    X.fillStyle = on ? P.acc : 'rgba(11,22,38,0.7)'; X.strokeStyle = on ? P.acc : done ? 'rgba(46,196,182,0.6)' : 'rgba(138,155,176,0.45)'; X.lineWidth = 3;
    X.beginPath(); X.roundRect(cx - w / 2, y - 34, w, 68, 34); X.fill(); X.stroke();
    X.fillStyle = on ? P.bg : done ? P.acc : P.mut; X.beginPath(); X.arc(cx + w / 2 - 36, y, 22, 0, 6.283); X.fill();
    ctx.text(X, String(i + 1), cx + w / 2 - 36, y + 10, { family: 'num', weight: 800, size: 28, color: on ? P.acc : P.bg });
    ctx.text(X, s, cx - 18, y + 13, { family: 'body', weight: 800, size: 38, color: on ? P.bg : done ? P.ink : P.mut, dir: 'rtl' });
  });
  X.restore();
}
/* camera shake offset */
export function shake(ctx, t, t0, amp = 14, decay = 7) { if (t < t0) return [0, 0]; const e = Math.exp(-decay * (t - t0)) * amp; return [e * Math.sin((t - t0) * 71), e * Math.cos((t - t0) * 53)]; }

/* darken everything outside [y0, y1] (screen y), feathered */
export function spotlight(ctx, X, y0, y1, k) {
  if (k <= 0.01) return;
  const f = 40, a = 0.62 * k;
  X.save(); X.fillStyle = `rgba(11,22,38,${a})`;
  X.fillRect(0, 0, ctx.W, Math.max(0, y0 - f)); X.fillRect(0, y1 + f, ctx.W, ctx.H - y1 - f);
  let g = X.createLinearGradient(0, y0 - f, 0, y0); g.addColorStop(0, `rgba(11,22,38,${a})`); g.addColorStop(1, 'rgba(11,22,38,0)'); X.fillStyle = g; X.fillRect(0, y0 - f, ctx.W, f);
  g = X.createLinearGradient(0, y1, 0, y1 + f); g.addColorStop(0, 'rgba(11,22,38,0)'); g.addColorStop(1, `rgba(11,22,38,${a})`); X.fillStyle = g; X.fillRect(0, y1, ctx.W, f);
  X.restore();
}


/* hide the edges of a photo drawn smaller than the frame (renders on a navy studio background) */
export function feather(ctx, X, K, k = 1, f = 150) {
  if (k <= 0) return;
  const [x0, y0] = mapper(K)([0, 0]), [x1, y1] = mapper(K)([1080, 1920]), c = a => `rgba(11,22,38,${a * k})`;
  X.save(); X.fillStyle = c(1);
  X.fillRect(0, 0, ctx.W, Math.max(0, y0)); X.fillRect(0, y1, ctx.W, ctx.H - y1); X.fillRect(0, 0, Math.max(0, x0), ctx.H); X.fillRect(x1, 0, ctx.W - x1, ctx.H);
  const side = (ax, ay, bx, by, rx, ry, rw, rh) => { const g = X.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, c(1)); g.addColorStop(1, c(0)); X.fillStyle = g; X.fillRect(rx, ry, rw, rh); };
  side(0, y0, 0, y0 + f, 0, y0, ctx.W, f); side(0, y1, 0, y1 - f, 0, y1 - f, ctx.W, f);
  side(x0, 0, x0 + f, 0, x0, 0, f, ctx.H); side(x1, 0, x1 - f, 0, x1 - f, 0, f, ctx.H);
  X.restore();
}
