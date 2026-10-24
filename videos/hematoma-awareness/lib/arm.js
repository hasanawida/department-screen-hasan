// lib/arm.js — 2D illustration: an older person's forearm, a caregiver's gloved hand, and grip bruises.
import { AN } from './ui.js';

const X0 = -260, X1 = 1340;
export const armHW = x => 172 - 44 * Math.min(1, Math.max(0, (x - X0) / (X1 - X0)));
export const armCY = (x, cy) => cy + (x - 540) * 0.035;

function mix(a, b, k) {
  const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
}
export function armPath(cy) {
  const pth = new Path2D();
  for (let x = X0; x <= X1; x += 20) pth[x === X0 ? 'moveTo' : 'lineTo'](x, armCY(x, cy) - armHW(x));
  for (let x = X1; x >= X0; x -= 20) pth.lineTo(x, armCY(x, cy) + armHW(x));
  pth.closePath();
  return pth;
}

/* forearm with thin, crepey older skin */
const cache = {};
export function drawArm(ctx, X, o = {}) {
  const cy = o.cy ?? 1000, key = 'arm' + cy;
  if (!cache[key]) {
    const r = ctx.seeded(41), d = { wr: [], spots: [], veins: [] };
    for (let i = 0; i < 150; i++) { const x = r.range(X0, X1), v = r.range(-0.9, 0.85); d.wr.push([x, v, r.range(18, 54), r.range(-0.25, 0.25), r.range(0.05, 0.12)]); }
    for (let i = 0; i < 9; i++) d.spots.push([r.range(-40, 1100), r.range(-0.6, 0.5), r.range(9, 22), r.range(6, 14), r.range(0.10, 0.2)]);
    for (let v = 0; v < 3; v++) { const pts = [], y0 = r.range(-0.55, 0.25), ph = r.range(0, 6); for (let x = X0; x <= X1; x += 60) pts.push([x, y0 + 0.12 * Math.sin(x * 0.006 + ph) + r.range(-0.03, 0.03)]); d.veins.push(pts); }
    cache[key] = d;
  }
  const d = cache[key], pth = armPath(cy);
  X.save();
  // contact shadow under the arm
  const sh = X.createLinearGradient(0, cy + 120, 0, cy + 330);
  sh.addColorStop(0, 'rgba(0,0,0,0.38)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  X.fillStyle = sh; X.fillRect(X0, cy + 110, X1 - X0, 240);
  const g = X.createLinearGradient(0, cy - 175, 0, cy + 175);
  g.addColorStop(0, '#F6D6C1'); g.addColorStop(0.28, AN.skin); g.addColorStop(0.72, '#D29A80'); g.addColorStop(1, '#A56E58');
  X.fillStyle = g; X.fill(pth);
  X.clip(pth);
  // veins seen through thin skin
  for (const pts of d.veins) {
    X.beginPath(); pts.forEach(([x, v], i) => { const y = armCY(x, cy) + v * armHW(x); i ? X.lineTo(x, y) : X.moveTo(x, y); });
    X.strokeStyle = AN.vein; X.globalAlpha = 0.16; X.lineWidth = 7; X.lineJoin = 'round'; X.stroke(); X.globalAlpha = 1;
  }
  // crepey wrinkles
  X.strokeStyle = '#7A4A3A'; X.lineCap = 'round';
  for (const [x, v, len, cur, a] of d.wr) {
    const y = armCY(x, cy) + v * armHW(x);
    X.globalAlpha = a; X.lineWidth = 2;
    X.beginPath(); X.moveTo(x - len / 2, y); X.quadraticCurveTo(x, y + cur * len, x + len / 2, y + 2); X.stroke();
  }
  // age spots
  for (const [x, v, rx, ry, a] of d.spots) { const y = armCY(x, cy) + v * armHW(x); X.globalAlpha = a; X.fillStyle = '#8E5B40'; X.beginPath(); X.ellipse(x, y, rx, ry, 0.2, 0, 6.283); X.fill(); }
  X.globalAlpha = 1;
  if (o.inside) o.inside(X);
  X.restore();
  // rim light on the top edge
  X.save(); X.beginPath();
  for (let x = X0; x <= X1; x += 20) X[x === X0 ? 'moveTo' : 'lineTo'](x, armCY(x, cy) - armHW(x) + 2);
  X.strokeStyle = 'rgba(255,236,224,0.45)'; X.lineWidth = 3; X.stroke(); X.restore();
}

/* a bruise: k = intensity 0..1, age 0 (fresh red) → 1 (purple) */
export function drawBruise(ctx, X, x, y, rx, ry, k, age, seed = 1) {
  if (k <= 0.001) return;
  const r = ctx.seeded(seed * 97 + 13);
  const core = mix(AN.blood, AN.bruise, Math.min(1, age)), edge = mix('#C0504F', '#7B4A8E', Math.min(1, age));
  X.save(); X.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 6; i++) {
    const dx = r.range(-0.35, 0.35) * rx, dy = r.range(-0.3, 0.3) * ry, s = r.range(0.55, 1.0) * (0.7 + 0.3 * k);
    const gg = X.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rx * s);
    gg.addColorStop(0, core); gg.addColorStop(0.55, edge); gg.addColorStop(1, 'rgba(255,255,255,0)');
    X.globalAlpha = 0.42 * k; X.fillStyle = gg;
    X.save(); X.translate(x + dx, y + dy); X.scale(1, ry / rx); X.translate(-(x + dx), -(y + dy));
    X.beginPath(); X.arc(x + dx, y + dy, rx * s, 0, 6.283); X.fill(); X.restore();
  }
  X.restore();
}

/* caregiver's gloved hand gripping the arm from above.
   o: { x, cy (arm centre), lift 0..1, press 0..1, drag px, alpha } — returns fingertip + thumb points (absolute) */
const FX = [-112, -38, 36, 108], FL = [232, 252, 240, 206];
export function gloveTips(o) {
  const top = armCY(o.x, o.cy) - armHW(o.x), drag = o.drag || 0;
  const tips = FX.map((fx, i) => [o.x + drag + fx + fx * 0.07 * (FL[i] / 230), top - 90 + FL[i] - 34]);
  const thumb = [o.x + drag - 150, armCY(o.x, o.cy) + armHW(o.x) - 4];
  return { tips, thumb, top };
}
export function drawThumb(ctx, X, o) {          // drawn BEFORE the arm (it wraps behind)
  const lift = o.lift || 0; if (lift >= 1) return;
  const top = armCY(o.x, o.cy) - armHW(o.x), bot = armCY(o.x, o.cy) + armHW(o.x);
  X.save(); X.globalAlpha *= (o.alpha ?? 1) * (1 - lift);
  X.translate(o.x + (o.drag || 0), -lift * 600);
  capsule(X, -160, top - 120, -150, bot + 46, 66, AN.glove, AN.gloveDark);
  X.restore();
}
function capsule(X, x0, y0, x1, y1, w, c1, c2) {
  const ang = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2, len = Math.hypot(x1 - x0, y1 - y0);
  X.save(); X.translate(x0, y0); X.rotate(ang);
  const g = X.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, c1); g.addColorStop(0.55, c1); g.addColorStop(1, c2);
  X.fillStyle = g; X.beginPath(); X.roundRect(-w / 2, 0, w, len, w / 2); X.fill();
  X.strokeStyle = 'rgba(0,0,0,0.22)'; X.lineWidth = 2.5; X.stroke();
  X.restore();
}
export function drawGlove(ctx, X, o) {
  const lift = o.lift || 0, press = o.press || 0, drag = o.drag || 0;
  if (lift >= 1) return;
  const top = armCY(o.x, o.cy) - armHW(o.x);
  X.save(); X.globalAlpha *= (o.alpha ?? 1);
  X.translate(o.x + drag, top - lift * 900); X.rotate(-lift * 0.12);
  // sleeve
  const sg = X.createLinearGradient(-140, 0, 140, 0);
  sg.addColorStop(0, '#3A5F88'); sg.addColorStop(1, AN.sleeve);
  X.fillStyle = sg; X.beginPath(); X.roundRect(-138, -1200, 276, 880, 30); X.fill();
  // glove cuff
  X.fillStyle = '#58D3C7'; X.beginPath(); X.roundRect(-132, -360, 264, 56, 18); X.fill();
  // back of the hand
  const hg = X.createLinearGradient(-160, -320, 170, -60);
  hg.addColorStop(0, '#5ED8CC'); hg.addColorStop(0.5, AN.glove); hg.addColorStop(1, AN.gloveDark);
  X.fillStyle = hg; X.beginPath();
  X.moveTo(-124, -312); X.lineTo(124, -312);
  X.bezierCurveTo(150, -230, 168, -150, 160, -86);
  X.quadraticCurveTo(150, -40, 100, -48); X.lineTo(-110, -48);
  X.quadraticCurveTo(-166, -44, -170, -96);
  X.bezierCurveTo(-176, -160, -152, -240, -124, -312); X.closePath(); X.fill();
  X.strokeStyle = 'rgba(0,0,0,0.2)'; X.lineWidth = 2.5; X.stroke();
  // tendons hint
  X.strokeStyle = 'rgba(255,255,255,0.18)'; X.lineWidth = 4; X.lineCap = 'round';
  FX.forEach(fx => { X.beginPath(); X.moveTo(fx * 0.45, -290); X.quadraticCurveTo(fx * 0.8, -180, fx, -96); X.stroke(); });
  // fingers
  FX.forEach((fx, i) => {
    const len = FL[i] * (1 - 0.035 * press), x1 = fx + fx * 0.07 * (FL[i] / 230);
    capsule(X, fx, -96, x1, -96 + len, 66, AN.glove, AN.gloveDark);
    X.strokeStyle = 'rgba(0,40,40,0.32)'; X.lineWidth = 3;
    [0.38, 0.7].forEach(q => { const yy = -96 + len * q, xx = fx + (x1 - fx) * q; X.beginPath(); X.moveTo(xx - 22, yy); X.quadraticCurveTo(xx, yy + 7, xx + 22, yy); X.stroke(); });
    X.fillStyle = 'rgba(255,255,255,0.22)'; X.beginPath(); X.ellipse(fx - 6, -84, 20, 11, 0, 0, 6.283); X.fill();
  });
  X.restore();
}

/* pressure under fingertips: blanched halo + darker centre */
export function drawPress(ctx, X, pts, k) {
  if (k <= 0) return;
  X.save();
  for (const [x, y] of pts) {
    const g = X.createRadialGradient(x, y, 4, x, y, 70);
    g.addColorStop(0, 'rgba(120,60,50,0.35)'); g.addColorStop(0.45, 'rgba(255,240,230,0.35)'); g.addColorStop(1, 'rgba(255,240,230,0)');
    X.globalAlpha = k; X.fillStyle = g; X.beginPath(); X.arc(x, y, 70, 0, 6.283); X.fill();
  }
  X.restore();
}
