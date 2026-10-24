// lib/ui.js — shared 2D helpers: theme, captions, headlines, tags, icons.
export const THEME = await (await fetch(new URL('../theme.json', import.meta.url))).json();
export const AN = THEME.anatomy;

const PUNCT = /^[—–\-.,:;!?…]+$/;
export const strip = s => String(s).replace(/[֑-ׇ]/g, '').replace(/בד-מנציה/g, 'בדמנציה');   // the hyphen only steers the voice

/* caption — the spoken line at the bottom, karaoke-style (spoken words full, upcoming dimmed) */
const capCache = {};
export function caption(ctx, t, o = {}) {
  const { X, P } = ctx, vo = ctx.timeline.vo;
  let idx = -1;
  for (let i = 0; i < vo.length; i++) if (t >= vo[i].start - 0.2) idx = i;
  if (idx < 0) return;
  if (o.skip && o.skip.test(vo[idx].id)) return;
  const L = vo[idx], next = vo[idx + 1];
  const hold = Math.min(0.75, next ? next.start - L.end - 0.25 : 1.2);
  const a = ctx.at(t, L.start - 0.2, L.start + 0.1, 'cubicOut') * (1 - ctx.at(t, L.end + hold, L.end + hold + 0.25, 'cubicIn'));
  if (a <= 0.001) return;
  let C = capCache[L.id];
  if (!C) {
    const toks = strip(L.text).split(/\s+/).filter(w => w && !PUNCT.test(w));
    const str = toks.join(' ');
    const lay = ctx.text.layout(X, str, { family: 'body', weight: 700, size: o.size || 50, maxWidth: o.maxWidth || 800, lineHeight: 1.32 });
    C = capCache[L.id] = { lay, n: toks.length };
  }
  const lay = C.lay, nl = lay.lines.length, base = o.base || 1474, y0 = base - (nl - 1) * lay.lh;
  // soft backdrop
  const bw = lay.width + 90, bh = nl * lay.lh + 34, bx = 540 - bw / 2, by = y0 - lay.size - 4;
  X.save(); X.globalAlpha = a * 0.62; X.fillStyle = P.bg;
  X.beginPath(); X.roundRect(bx, by, bw, bh, 26); X.fill(); X.restore();
  const words = L.words, aligned = words.length === C.n;
  ctx.text.drawLayout(X, lay, 540, y0, {
    color: P.ink,
    perWord: i => {
      const s = aligned ? words[i].s : L.start + (L.end - L.start) * i / C.n;
      const k = ctx.at(t, s - 0.08, s + 0.12, 'cubicOut');
      return { alpha: a * (0.36 + 0.64 * k) };
    },
  });
}

/* headline — words rise out of a baseline mask. times: array of per-word start times (or one t0 + stagger) */
const layCache = new Map();
export function layoutCached(ctx, str, o) {
  const key = str + '|' + JSON.stringify(o);
  let L = layCache.get(key);
  if (!L) { L = ctx.text.layout(ctx.X, str, o); layCache.set(key, L); }
  return L;
}
export function headline(ctx, t, str, x, y, o = {}) {
  const { X, P } = ctx;
  const L = layoutCached(ctx, str, { family: o.family || 'display', weight: o.weight || 900, size: o.size || 100, maxWidth: o.maxWidth || 900, lineHeight: o.lineHeight || 1.15 });
  const n = L.words.length, t0 = o.t0 ?? 0, st = o.stagger ?? 0.09, dur = o.dur ?? 0.55;
  const out = o.out != null ? 1 - ctx.at(t, o.out, o.out + (o.outDur ?? 0.4), 'cubicIn') : 1;
  if (out <= 0) return null;
  return ctx.text.drawLayout(X, L, x, y, {
    align: o.align || 'center', color: o.color || P.ink,
    perWord: (i, w) => {
      const s = o.times ? o.times[Math.min(i, o.times.length - 1)] : t0 + i * st;
      const k = ctx.at(t, s - 0.05, s - 0.05 + dur, 'expoOut');
      if (k <= 0) return { skip: true };
      const c = o.colors && o.colors[i] ? o.colors[i] : undefined;
      return { clipUp: 1, dy: (1 - k) * L.size * 0.9, alpha: out, color: c };
    },
  });
}

/* tag — anchor dot + elbow leader line + label. k: draw progress 0..1, dim: 0..1 */
export function tag(ctx, X, ax, ay, lx, ly, label, k, o = {}) {
  if (k <= 0) return;
  const { P } = ctx, col = o.color || P.acc, a = (o.alpha ?? 1);
  const ex = lx + (ax > lx ? 0 : 0);
  const pts = [[ax, ay], [ax + (lx - ax) * 0.35, ly], [lx, ly]];
  X.save(); X.globalAlpha *= a;
  const kd = ctx.at(k, 0, 0.25, 'cubicOut');
  X.fillStyle = col; X.beginPath(); X.arc(ax, ay, 10 * kd, 0, Math.PI * 2); X.fill();
  X.strokeStyle = col; X.lineWidth = 3; X.globalAlpha *= 0.55; X.beginPath(); X.arc(ax, ay, 19 * kd, 0, Math.PI * 2); X.stroke(); X.globalAlpha /= 0.55;
  ctx.drawPath(X, pts, ctx.at(k, 0.1, 0.65, 'cubicInOut'), { width: 3.5, color: col, cap: 'round' });
  const kt = ctx.at(k, 0.5, 1, 'cubicOut');
  if (kt > 0) {
    const size = o.size || 46, left = lx < ax;
    X.save(); X.font = ctx.font('body', 800, size); X.direction = 'rtl';
    const w = X.measureText(label).width; X.restore();
    const px = left ? lx - 16 - w : lx + 16, py = ly;
    X.save(); X.globalAlpha *= kt;
    X.fillStyle = o.bg || 'rgba(11,22,38,0.78)'; X.beginPath(); X.roundRect(px - 16, py - size * 0.78, w + 32, size * 1.32, 14); X.fill();
    X.strokeStyle = col; X.lineWidth = 2; X.globalAlpha *= 0.6; X.stroke(); X.globalAlpha /= 0.6;
    ctx.text(X, label, px + w / 2, py + size * 0.32 + (1 - kt) * 14, { family: 'body', weight: 800, size, color: o.textColor || P.ink, dir: 'rtl' });
    X.restore();
  }
  X.restore();
}

/* project a THREE.Vector3 (world) to design px */
export function project(ctx, st, v) {
  const p = v.clone().project(st.camera);
  return [(p.x + 1) / 2 * ctx.W, (1 - p.y) / 2 * ctx.H];
}

/* fast 3D composite: render the stage straight to the shared canvas (MSAA on the default framebuffer) */
export function draw3D(ctx, st, X, o = {}) {
  const r = st.renderer, T = ctx.THREE;
  r.toneMapping = T.NeutralToneMapping; r.toneMappingExposure = o.exposure ?? 1;
  r.setRenderTarget(null); r.setClearColor(0x000000, 0); r.clear();
  r.render(st.scene, st.camera);
  X.save(); if (o.alpha != null) X.globalAlpha *= o.alpha;
  X.drawImage(st.canvas, 0, 0, st.canvas.width, st.canvas.height, 0, 0, ctx.W, ctx.H);
  X.restore();
}

/* background: deep navy with a soft radial glow */
export function bg(ctx, X, o = {}) {
  const { P } = ctx;
  X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
  const g = X.createRadialGradient(o.cx ?? 540, o.cy ?? 900, 40, o.cx ?? 540, o.cy ?? 900, o.r ?? 1100);
  g.addColorStop(0, o.glow || 'rgba(46,196,182,0.10)'); g.addColorStop(1, 'rgba(46,196,182,0)');
  X.fillStyle = g; X.fillRect(0, 0, ctx.W, ctx.H);
}

/* small text (kicker / subtitle) with fade + rise */
export function sub(ctx, t, str, x, y, o = {}) {
  const k = ctx.at(t, o.t0 ?? 0, (o.t0 ?? 0) + (o.dur ?? 0.5), 'cubicOut');
  const out = o.out != null ? 1 - ctx.at(t, o.out, o.out + 0.35, 'cubicIn') : 1;
  if (k * out <= 0) return;
  ctx.text(ctx.X, str, x, y + (1 - k) * 24, { family: o.family || 'body', weight: o.weight || 500, size: o.size || 50, color: o.color || ctx.P.mut, alpha: k * out, dir: 'rtl', align: o.align || 'center' });
}

/* ✕ / ✓ badge */
export function badge(ctx, X, x, y, r, kind, k, o = {}) {
  if (k <= 0) return;
  const { P } = ctx, col = o.color || (kind === 'x' ? P.clay : P.acc);
  X.save(); X.translate(x, y); const s = 0.94 + 0.06 * ctx.E.cubicOut(k); X.scale(s, s); X.globalAlpha *= Math.min(1, k * 2);
  X.fillStyle = col; X.beginPath(); X.arc(0, 0, r, 0, Math.PI * 2); X.fill();
  X.strokeStyle = P.ink; X.lineWidth = r * 0.17; X.lineCap = 'round'; X.lineJoin = 'round';
  const q = r * 0.42, kk = ctx.at(k, 0.3, 1, 'cubicOut');
  if (kind === 'x') { ctx.drawPath(X, [[-q, -q], [q, q]], ctx.clamp(kk * 2), { width: r * 0.17, color: P.ink, cap: 'round' }); ctx.drawPath(X, [[q, -q], [-q, q]], ctx.clamp(kk * 2 - 1), { width: r * 0.17, color: P.ink, cap: 'round' }); }
  else ctx.drawPath(X, [[-q, 0], [-q * 0.25, q * 0.7], [q, -q * 0.6]], kk, { width: r * 0.17, color: P.ink, cap: 'round' });
  X.restore();
}
