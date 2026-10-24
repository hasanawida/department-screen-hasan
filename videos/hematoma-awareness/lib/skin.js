// lib/skin.js — 3D cross-section block of skin: epidermis, dermis (+ vessels), fat, fascia, muscle, bone.
import { AN } from './ui.js';

export const BW = 4.4, BD = 2.6;
export const CAM = { fov: 30, target: [-1.05, -2.6, 0], az: 0.52, el: 0.36, dist: 25 };   // s2 → s3 shared framing                     // block width (x) and depth (z)
export const LAYERS = [                              // top → bottom, thickness young / old
  { key: 'epi', h: 0.22, old: 0.11 },
  { key: 'dermis', h: 0.95, old: 0.56 },
  { key: 'fat', h: 1.15, old: 0.58 },
  { key: 'fascia', h: 0.06, old: 0.05 },
  { key: 'muscle', h: 1.05, old: 0.98 },
];

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(ctx, c) { const T = new ctx.THREE.CanvasTexture(c); T.colorSpace = ctx.THREE.SRGBColorSpace; T.anisotropy = 8; return T; }

/* ── face textures (drawn once per seed) ── */
function epiTex(ctx, w, h, seed) {
  const c = canvas(w, h), X = c.getContext('2d'), r = ctx.seeded(seed);
  X.fillStyle = AN.epi; X.fillRect(0, 0, w, h);
  X.fillStyle = '#F4D2BE'; X.fillRect(0, 0, w, h * 0.2);
  for (let y = h * 0.24; y < h * 0.8; y += h * 0.13) for (let x = r.range(0, 20); x < w; x += r.range(18, 30)) {
    X.fillStyle = `rgba(150,80,60,${r.range(0.08, 0.2)})`; X.beginPath(); X.ellipse(x, y + r.range(-3, 3), r.range(6, 11), h * 0.045, 0, 0, 6.283); X.fill();
  }
  X.fillStyle = AN.basal; X.beginPath(); X.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) X.lineTo(x, h * 0.82 - Math.abs(Math.sin(x * 0.03)) * h * 0.1);
  X.lineTo(w, h); X.fill();
  return c;
}
function dermisTex(ctx, w, h, seed) {
  const c = canvas(w, h), X = c.getContext('2d'), r = ctx.seeded(seed);
  const g = X.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#F6CBC6'); g.addColorStop(1, AN.dermis);
  X.fillStyle = g; X.fillRect(0, 0, w, h);
  X.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = r.range(-60, w), y = r.range(h * 0.12, h), len = r.range(60, 180), a = r.range(-0.35, 0.35);
    X.strokeStyle = `rgba(214,120,118,${r.range(0.18, 0.42)})`; X.lineWidth = r.range(3, 7);
    X.beginPath(); X.moveTo(x, y); X.bezierCurveTo(x + len * 0.3, y + len * a + 12, x + len * 0.6, y + len * a - 12, x + len, y + len * a * 0.6); X.stroke();
  }
  for (let i = 0; i < 160; i++) { X.fillStyle = 'rgba(160,70,80,0.35)'; X.beginPath(); X.ellipse(r.range(0, w), r.range(0, h), 4, 2, r.range(0, 3), 0, 6.283); X.fill(); }
  return c;
}
function fatTex(ctx, w, h, seed) {
  const c = canvas(w, h), X = c.getContext('2d'), r = ctx.seeded(seed);
  X.fillStyle = AN.septa; X.fillRect(0, 0, w, h);
  const cells = [];
  for (let i = 0; i < 9000 && cells.length < 420; i++) {
    const R = r.range(20, 40), x = r.range(-10, w + 10), y = r.range(-10, h + 10);
    if (cells.every(([cx, cy, cr]) => Math.hypot(cx - x, cy - y) > cr + R + 4)) cells.push([x, y, R]);
  }
  for (const [x, y, R] of cells) {
    const gg = X.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R);
    gg.addColorStop(0, '#FCEBB8'); gg.addColorStop(0.7, AN.fat); gg.addColorStop(1, '#E1B04F');
    X.fillStyle = gg; X.beginPath(); X.arc(x, y, R, 0, 6.283); X.fill();
  }
  X.strokeStyle = 'rgba(200,70,70,0.35)'; X.lineWidth = 2.5;
  for (let i = 0; i < 18; i++) { const x = r.range(0, w), y = r.range(0, h); X.beginPath(); X.moveTo(x, y); X.quadraticCurveTo(x + 40, y - 30, x + r.range(60, 120), y + r.range(-30, 30)); X.stroke(); }
  return c;
}
function muscleTex(ctx, w, h, seed) {
  const c = canvas(w, h), X = c.getContext('2d'), r = ctx.seeded(seed);
  X.fillStyle = AN.muscle; X.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    const bh = r.range(26, 48);
    for (let k = 0; k < bh; k += 5) { X.strokeStyle = `rgba(${r.range(90, 140) | 0},20,24,${r.range(0.25, 0.5)})`; X.lineWidth = 2; X.beginPath(); X.moveTo(0, y + k); for (let x = 0; x <= w; x += 64) X.lineTo(x, y + k + Math.sin(x * 0.004 + k) * 2); X.stroke(); }
    X.strokeStyle = 'rgba(238,170,160,0.55)'; X.lineWidth = 3; X.beginPath(); X.moveTo(0, y + bh); for (let x = 0; x <= w; x += 64) X.lineTo(x, y + bh + Math.sin(x * 0.003 + y) * 4); X.stroke();
    y += bh + 3;
  }
  return c;
}
function fasciaTex(ctx, w, h) {
  const c = canvas(w, h), X = c.getContext('2d');
  X.fillStyle = AN.fascia; X.fillRect(0, 0, w, h);
  X.strokeStyle = 'rgba(160,140,120,0.5)'; X.lineWidth = 2; for (let y = 4; y < h; y += 6) { X.beginPath(); X.moveTo(0, y); X.lineTo(w, y); X.stroke(); }
  return c;
}
function skinTopTex(ctx, w, h, seed) {
  const c = canvas(w, h), X = c.getContext('2d'), r = ctx.seeded(seed);
  X.fillStyle = AN.skin; X.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { X.fillStyle = `rgba(${r() < 0.5 ? '255,235,220' : '170,110,90'},0.06)`; X.beginPath(); X.ellipse(r.range(0, w), r.range(0, h), r.range(8, 26), r.range(6, 18), r(), 0, 6.283); X.fill(); }
  X.strokeStyle = 'rgba(140,85,70,0.16)'; X.lineWidth = 2;
  for (let i = 0; i < 70; i++) { const x = r.range(0, w), y = r.range(0, h), a = r.range(0, 3.14), L = r.range(80, 200); X.beginPath(); X.moveTo(x, y); X.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); X.stroke(); }
  for (let i = 0; i < 7; i++) { X.fillStyle = 'rgba(142,91,64,0.18)'; X.beginPath(); X.ellipse(r.range(0, w), r.range(0, h), r.range(12, 26), r.range(9, 18), r(), 0, 6.283); X.fill(); }
  return c;
}
export function boneCapTex(ctx, porous, seed = 5) {
  const S = 512, c = canvas(S, S), X = c.getContext('2d'), r = ctx.seeded(seed), R = S / 2 - 4, inner = porous ? 0.8 : 0.64;
  X.fillStyle = AN.bone; X.beginPath(); X.arc(S / 2, S / 2, R, 0, 6.283); X.fill();
  X.strokeStyle = 'rgba(170,150,120,0.35)'; X.lineWidth = 2;
  for (let q = inner + 0.03; q < 1; q += 0.05) { X.beginPath(); X.arc(S / 2, S / 2, R * q, 0, 6.283); X.stroke(); }
  X.save(); X.beginPath(); X.arc(S / 2, S / 2, R * inner, 0, 6.283); X.clip();
  X.fillStyle = porous ? '#5A2A2E' : AN.marrow; X.fillRect(0, 0, S, S);
  const n = porous ? 34 : 120, pts = [];
  for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * R * inner; pts.push([S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d]); }
  X.strokeStyle = AN.bone; X.lineCap = 'round'; X.lineWidth = porous ? 4 : 10;
  for (const p of pts) {
    const near = pts.filter(q => q !== p).sort((a, b) => Math.hypot(a[0] - p[0], a[1] - p[1]) - Math.hypot(b[0] - p[0], b[1] - p[1])).slice(0, porous ? 2 : 3);
    for (const q of near) { X.beginPath(); X.moveTo(p[0], p[1]); X.lineTo(q[0], q[1]); X.stroke(); }
  }
  X.restore();
  return c;
}

/* ── vessels ── */
function tube(ctx, pts, radius, color, emissive = 0) {
  const T = ctx.THREE, curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)));
  const m = new T.Mesh(new T.TubeGeometry(curve, Math.max(24, pts.length * 10), radius, 12, false),
    new T.MeshStandardMaterial({ color, roughness: 0.38, emissive: color, emissiveIntensity: emissive }));
  m.userData.base = color;
  return m;
}

/* build(ctx, {seed}) → skin block object */
export function buildSkin(ctx, opts = {}) {
  const T = ctx.THREE, seed = opts.seed ?? 11, root = new T.Group(), groups = {}, mats = {};
  const side = (c) => new T.MeshStandardMaterial({ map: tex(ctx, c), roughness: 0.62 });
  const plain = col => new T.MeshStandardMaterial({ color: col, roughness: 0.7 });
  const FW = 2048, SW = 1210, PX = 460;                 // texture px per unit height
  const faceTex = {
    epi: [epiTex(ctx, FW, 96, seed), epiTex(ctx, SW, 96, seed + 1)],
    dermis: [dermisTex(ctx, FW, 440, seed), dermisTex(ctx, SW, 440, seed + 2)],
    fat: [fatTex(ctx, FW, 520, seed), fatTex(ctx, SW, 520, seed + 3)],
    fascia: [fasciaTex(ctx, FW, 24), fasciaTex(ctx, SW, 24)],
    muscle: [muscleTex(ctx, FW, 600, seed), muscleTex(ctx, SW, 600, seed + 4)],
  };
  const top = skinTopTex(ctx, 1600, 950, seed + 9);
  for (const L of LAYERS) {
    const g = new T.Group(); groups[L.key] = g; root.add(g);
    const front = side(faceTex[L.key][0]), right = side(faceTex[L.key][1]);
    const up = L.key === 'epi' ? new T.MeshStandardMaterial({ map: tex(ctx, top), roughness: 0.55 }) : side(faceTex[L.key][1]);
    const dn = plain('#7a3030');
    const box = new T.Mesh(new T.BoxGeometry(BW, 1, BD), [right, right.clone(), up, dn, front, front.clone()]);
    box.userData.key = L.key; g.add(box); g.userData.box = box;
    mats[L.key] = [right, up, dn, front];
  }
  // dermis vessels: deep plexus artery + vein, capillary loops toward the epidermis
  const vz = BD / 2, r = ctx.seeded(seed + 21), vessels = [];
  const wav = (y0, amp, ph, z = vz) => { const p = []; for (let x = -BW / 2 - 0.08; x <= BW / 2 + 0.081; x += 0.22) p.push([x, y0 + amp * Math.sin(x * 2.1 + ph), z]); return p; };
  const art = tube(ctx, wav(0, 0.035, 0.5), 0.05, AN.artery, 0.08); art.userData.f = 0.74; art.userData.kind = 'artery';
  const vein = tube(ctx, wav(0, 0.035, 2.2), 0.06, AN.vein, 0.05); vein.userData.f = 0.86; vein.userData.kind = 'vein';
  vessels.push(art, vein);
  const caps = [];
  for (let i = 0; i < 9; i++) {
    const x = -BW / 2 + 0.3 + i * (BW - 0.6) / 8 + r.range(-0.08, 0.08), hgt = r.range(0.2, 0.3);
    const p = [[x - 0.09, 0, vz], [x - 0.06, hgt * 0.6, vz], [x, hgt, vz], [x + 0.06, hgt * 0.6, vz], [x + 0.09, 0, vz]];
    const m = tube(ctx, p, 0.022, i % 2 ? AN.artery : '#C2456A', 0.06); m.userData.f = 0.55; m.userData.kind = 'cap'; m.userData.x = x; m.userData.h = hgt;
    caps.push(m); vessels.push(m);
  }
  const vg = new T.Group(); vessels.forEach(v => vg.add(v)); groups.dermis.add(vg);
  // fat vessel (larger, along x)
  const fv = tube(ctx, wav(0, 0.05, 1.3), 0.075, AN.artery, 0.06); fv.userData.f = 0.25; groups.fat.add(fv);
  // bone (axis along z, protrudes out of the front face)
  const z0 = -BD / 2 + 0.1, z1 = BD / 2 + 0.32, bl = z1 - z0, br = 0.4;
  const capY = new T.MeshStandardMaterial({ map: tex(ctx, boneCapTex(ctx, false)), roughness: 0.75, color: '#D8D0C2' });
  const capO = new T.MeshStandardMaterial({ map: tex(ctx, boneCapTex(ctx, true)), roughness: 0.75, color: '#D8D0C2' });
  const bone = new T.Mesh(new T.CylinderGeometry(br, br, bl, 64, 1), [new T.MeshStandardMaterial({ color: AN.bone, roughness: 0.42 }), capY, capY]);
  bone.rotation.x = Math.PI / 2; bone.position.set(0.35, 0, (z0 + z1) / 2); groups.muscle.add(bone);
  // overlays: bruise on the top surface, blood pool on the front face
  const decal = (w, h, draw) => { const c = canvas(512, 512), X = c.getContext('2d'); draw(X, 512); return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex(ctx, c), transparent: true, opacity: 0, depthWrite: false })); };
  const blob = (X, S, c0, c1, n, sd) => { const rr = ctx.seeded(sd); for (let i = 0; i < n; i++) { const x = S / 2 + rr.range(-0.2, 0.2) * S, y = S / 2 + rr.range(-0.16, 0.16) * S, R = rr.range(0.18, 0.3) * S; const g = X.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, c0); g.addColorStop(0.6, c1); g.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = g; X.beginPath(); X.arc(x, y, R, 0, 6.283); X.fill(); } };
  const bruise = decal(2.2, 1.7, (X, S) => blob(X, S, 'rgba(94,42,107,0.55)', 'rgba(130,50,90,0.25)', 9, 3));
  bruise.rotation.x = -Math.PI / 2; bruise.position.set(-0.1, 0.004, 0.55); groups.epi.add(bruise);
  const pool = decal(2.4, 1.4, (X, S) => blob(X, S, 'rgba(120,16,34,0.95)', 'rgba(110,30,70,0.6)', 12, 7));
  pool.position.set(-0.1, 0, BD / 2 + 0.006); root.add(pool);
  const ruptures = [];
  const obj = {
    root, groups, mats, vessels, caps, bone, capY, capO, bruise, pool, ruptures,
    heights: LAYERS.map(L => L.h), tops: {}, centers: {},
    /* state: age 0..1, gap (explode), push {key: z}, lift {key: y}, dim {key: 0..1}, shear {key: x} */
    set(s = {}) {
      const age = s.age || 0, gap = s.gap || 0;
      let y = 0;
      LAYERS.forEach((L, i) => {
        const h = L.h + (L.old - L.h) * age, g = groups[L.key];
        this.tops[L.key] = y; this.centers[L.key] = y - h / 2;
        g.position.set((s.shear && s.shear[L.key]) || 0, y - h / 2 + ((s.lift && s.lift[L.key]) || 0), (s.push && s.push[L.key]) || 0);
        g.userData.box.scale.y = h; g.userData.h = h;
        const d = 1 - 0.62 * ((s.dim && s.dim[L.key]) || 0);
        mats[L.key].forEach(m => m.color.setScalar(d));
        y -= h + gap;
      });
      // vessels sit at fractions of the dermis; thinner + paler with age
      const dh = groups.dermis.userData.h, vs = 1 - 0.35 * age;
      for (const v of vessels) {
        const isCap = v.userData.kind === 'cap';
        v.position.y = dh / 2 - v.userData.f * dh + (isCap ? 0 : 0);
        if (isCap) v.position.y = dh / 2 - Math.min(dh - 0.06, v.userData.h + 0.03);
        v.scale.set(1, vs, vs); v.position.z = vz * (1 - vs);
        const dd = 1 - 0.62 * ((s.dim && s.dim.dermis) || 0);
        v.material.color.set(v.userData.base).multiplyScalar(dd); v.material.emissiveIntensity = (s.glow || 0) * 0.9 + 0.06;
      }
      const fh = groups.fat.userData.h; fv.position.y = fh / 2 - 0.25 * fh; fv.scale.set(1, vs, vs); fv.position.z = vz * (1 - vs);
      const mh = groups.muscle.userData.h; bone.position.y = -0.05 * mh;
      const bd = 1 - 0.62 * ((s.dim && s.dim.muscle) || 0); bone.material.forEach(m => m.color.setScalar(bd));
      bone.position.z = (z0 + z1) / 2 + (s.bonePush || 0);
      bone.material[1] = bone.material[2] = (s.porous ? capO : capY);
      bruise.material.opacity = s.bruise || 0; bruise.position.y = groups.epi.userData.h / 2 + 0.004;
      pool.material.opacity = s.pool || 0;
      if (s.pool) { const k = 0.35 + 0.65 * s.pool; pool.scale.set(k, k, 1); pool.position.y = this.tops.dermis - groups.dermis.userData.h * 0.75; pool.position.x = -0.1 + ((s.shear && s.shear.dermis) || 0) * 0.6; }
      return this;
    },
    /* world-space point on the front face of a layer: u = -0.5..0.5 across, v = 0 top .. 1 bottom of that layer */
    anchor(key, u = -0.35, v = 0.5) {
      const g = groups[key], h = g.userData.h;
      return new T.Vector3(u * BW, h / 2 - v * h, BD / 2 + 0.01).applyMatrix4(g.matrixWorld);
    },
  };
  return obj;
}

export function lights(ctx, st) {
  const T = ctx.THREE;
  st.add(new T.HemisphereLight('#FFFFFF', '#2A3550', 1.1));
  const k = new T.DirectionalLight('#FFF4EA', 1.75); k.position.set(4, 7, 6); st.add(k);
  const f = new T.DirectionalLight('#BFE9FF', 0.55); f.position.set(-6, 2, 3); st.add(f);
}
