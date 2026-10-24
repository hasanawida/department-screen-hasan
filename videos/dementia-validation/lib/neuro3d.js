// lib/neuro3d.js — procedural hippocampal tissue: neurons (soma + tapered dendrites), axons with travelling signals,
// synaptic boutons that flash on arrival, beta-amyloid plaques between cells, tau tangles inside cells, and cell death.
// Everything is driven analytically from t + a state object, so any frame can render on its own.

const NEURONS = [                       // [x, y, z, soma radius]
  [0.0, 0.5, 0.6, 0.44],                // 0 — hero (tangles, close-up)
  [-1.9, 3.0, -0.8, 0.36], [1.9, 2.6, -1.6, 0.36], [-2.0, -1.9, -0.6, 0.38], [1.8, -2.4, 0.0, 0.38],
  [0.2, -4.6, -1.2, 0.36], [-0.6, 5.0, -2.6, 0.34], [2.7, 0.4, -2.8, 0.34], [-2.8, 0.6, -3.0, 0.34],
];
const CONNS = [                         // [from, to, blocked?]
  [1, 0, 0], [2, 0, 1], [0, 3, 0], [0, 4, 1], [3, 5, 1], [4, 5, 0], [6, 1, 1], [6, 2, 0], [7, 4, 0], [8, 3, 1], [7, 2, 0],
];
const U_STOP = 0.52;                    // where a plaque sits on a blocked axon
const DYING = { 2: 1, 6: 1, 8: 1, 0: 0.55 };
const TANGLED = [0, 2, 3];

export function buildTissue(ctx) {
  const T = ctx.THREE, r = ctx.rng('tissue');
  const root = new T.Group();
  const V = (a) => new T.Vector3(a[0], a[1], a[2]);
  const rnd = (a, b) => a + (b - a) * r();
  const randDir = () => { const z = rnd(-1, 1), a = rnd(0, Math.PI * 2), s = Math.sqrt(1 - z * z); return new T.Vector3(s * Math.cos(a), s * Math.sin(a), z); };

  // tapered tube along a curve: TubeGeometry with each ring scaled toward the curve
  function taperTube(curve, segs, r0, r1, radial = 8) {
    const g = new T.TubeGeometry(curve, segs, 1, radial, false), pos = g.attributes.position, c = new T.Vector3(), p = new T.Vector3();
    for (let i = 0; i <= segs; i++) {
      const u = i / segs; curve.getPointAt(u, c); const rad = r0 + (r1 - r0) * Math.pow(u, 0.8);
      for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(rad).add(c); pos.setXYZ(k, p.x, p.y, p.z); }
    }
    g.computeVertexNormals(); return g;
  }
  const neuronMat = () => new T.MeshStandardMaterial({ color: 0xB890E6, emissive: 0x5B2E92, emissiveIntensity: 0.55, roughness: 0.38, metalness: 0, transparent: true, opacity: 1 });
  const cells = NEURONS.map((n, i) => {
    const g = new T.Group(), c = V(n), mat = neuronMat(); g.position.copy(c); root.add(g);
    // soma: displaced sphere, slightly pyramidal
    const sg = new T.SphereGeometry(n[3], 40, 28), sp = sg.attributes.position, v = new T.Vector3();
    for (let k = 0; k < sp.count; k++) {
      v.fromBufferAttribute(sp, k); const d = 1 + 0.12 * Math.sin(v.x * 7 + i) * Math.sin(v.y * 6 + 2 * i) + 0.08 * Math.sin(v.z * 9 - i);
      v.multiplyScalar(d); if (v.y > 0) v.y *= 1 + 0.35 * (v.y / n[3]); sp.setXYZ(k, v.x, v.y, v.z);
    }
    sg.computeVertexNormals();
    const soma = new T.Mesh(sg, mat); g.add(soma);
    const dend = new T.Group(); g.add(dend);
    const nd = 6 + (i % 2);
    for (let d = 0; d < nd; d++) {
      const dir = randDir(); if (d === 0) dir.set(rnd(-0.3, 0.3), 1, rnd(-0.3, 0.3)).normalize();     // apical dendrite
      const L = d === 0 ? rnd(1.8, 2.4) : rnd(0.9, 1.7), p0 = dir.clone().multiplyScalar(n[3] * 0.8);
      const pts = [p0]; let cur = p0.clone(), dd = dir.clone();
      for (let s = 1; s <= 3; s++) { dd.add(randDir().multiplyScalar(0.35)).normalize(); cur = cur.clone().add(dd.clone().multiplyScalar(L / 3)); pts.push(cur); }
      const curve = new T.CatmullRomCurve3(pts);
      dend.add(new T.Mesh(taperTube(curve, 40, d === 0 ? 0.1 : 0.075, 0.012), mat));
      for (let b = 0; b < 2; b++) {                                           // two side branches
        const bp = curve.getPointAt(rnd(0.35, 0.7)), bd = dd.clone().add(randDir().multiplyScalar(0.9)).normalize(), bl = rnd(0.45, 0.8);
        const bc = new T.CatmullRomCurve3([bp, bp.clone().add(bd.clone().multiplyScalar(bl * 0.5)).add(randDir().multiplyScalar(0.08)), bp.clone().add(bd.clone().multiplyScalar(bl))]);
        dend.add(new T.Mesh(taperTube(bc, 18, 0.035, 0.008, 6), mat));
      }
    }
    return { g, soma, dend, mat, c, R: n[3] };
  });

  // tau tangles: dark twisted fibres inside the soma, grown with drawRange
  const tangleMat = new T.MeshStandardMaterial({ color: 0x8A1F4A, emissive: 0xE0306E, emissiveIntensity: 1.25, roughness: 0.45 });
  const tangles = TANGLED.map(i => {
    const cell = cells[i], grp = new T.Group(); cell.g.add(grp); const list = [];
    for (let f = 0; f < 7; f++) {
      const ax = randDir(), up = Math.abs(ax.y) < 0.9 ? new T.Vector3(0, 1, 0) : new T.Vector3(1, 0, 0), b1 = new T.Vector3().crossVectors(ax, up).normalize(), b2 = new T.Vector3().crossVectors(ax, b1);
      const pts = [], turns = rnd(2.5, 4), h = cell.R * 1.2, rad = cell.R * rnd(0.12, 0.26), ph = rnd(0, 6.28);
      for (let s = 0; s <= 60; s++) { const u = s / 60, a = ph + u * turns * 6.283, w = rad * (0.6 + 0.4 * Math.sin(u * 9 + f));
        pts.push(ax.clone().multiplyScalar((u - 0.5) * h).add(b1.clone().multiplyScalar(Math.cos(a) * w)).add(b2.clone().multiplyScalar(Math.sin(a) * w))); }
      const geo = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 120, cell.R * 0.05, 6, false), m = new T.Mesh(geo, tangleMat);
      grp.add(m); list.push({ m, n: geo.index.count, delay: f * 0.08 });
    }
    return { i, list };
  });

  // axons + boutons + plaques
  const axonMat = () => new T.MeshStandardMaterial({ color: 0x9C7BD0, emissive: 0x4A2A7A, emissiveIntensity: 0.5, roughness: 0.4, transparent: true });
  const plaqueMat = new T.MeshStandardMaterial({ color: 0xC08A3E, emissive: 0x6A3C0C, emissiveIntensity: 0.45, roughness: 0.92 });
  // smooth lumpy blob (indexed sphere → smooth normals)
  function blob(rr, k) {
    const geo = new T.SphereGeometry(rr, 28, 18), pp = geo.attributes.position, v = new T.Vector3();
    for (let q = 0; q < pp.count; q++) { v.fromBufferAttribute(pp, q); const n = v.clone().normalize();
      v.multiplyScalar(1 + 0.18 * Math.sin(n.x * 7 + k) * Math.sin(n.y * 6 - k) + 0.1 * Math.sin(n.z * 13 + 2 * k) + 0.05 * Math.sin(n.x * 29 + n.y * 31)); pp.setXYZ(q, v.x, v.y, v.z); }
    geo.computeVertexNormals(); return geo;
  }
  const plaques = [];
  const conns = CONNS.map(([a, b, blocked], ci) => {
    const A = cells[a], B = cells[b], dir = B.c.clone().sub(A.c).normalize();
    const p0 = A.c.clone().add(dir.clone().multiplyScalar(A.R * 0.85)), p3 = B.c.clone().sub(dir.clone().multiplyScalar(B.R + 0.28));
    const perp = new T.Vector3().crossVectors(dir, randDir()).normalize().multiplyScalar(rnd(0.3, 0.6));
    const curve = new T.CatmullRomCurve3([p0, p0.clone().lerp(p3, 0.33).add(perp), p0.clone().lerp(p3, 0.66).sub(perp.clone().multiplyScalar(0.6)), p3]);
    const seg = (u0, u1, m) => { const pts = []; for (let s = 0; s <= 24; s++) pts.push(curve.getPointAt(u0 + (u1 - u0) * s / 24)); return new T.Mesh(taperTube(new T.CatmullRomCurve3(pts), 40, 0.04, 0.03, 6), m); };
    const m1 = axonMat(), m2 = axonMat();
    const s1 = seg(0, blocked ? U_STOP : 1, m1); root.add(s1);
    const s2 = blocked ? seg(U_STOP, 1, m2) : null; if (s2) root.add(s2);
    const bMat = new T.MeshStandardMaterial({ color: 0x7FF0E6, emissive: 0x2EC4B6, emissiveIntensity: 0.8, roughness: 0.3, transparent: true });
    const bouton = new T.Mesh(new T.SphereGeometry(0.1, 20, 14), bMat); bouton.position.copy(curve.getPointAt(1)); root.add(bouton);
    if (blocked) {                                        // plaque cluster sitting on the axon
      const at = curve.getPointAt(U_STOP), grp = new T.Group(); grp.position.copy(at); root.add(grp); const blobs = [];
      const nb = 9;
      for (let k = 0; k < nb; k++) {
        const rr = k === 0 ? 0.28 : rnd(0.07, 0.18), geo = blob(rr, k);
        const m = new T.Mesh(geo, plaqueMat); m.position.copy(k === 0 ? new T.Vector3() : randDir().multiplyScalar(rnd(0.18, 0.42))); grp.add(m); blobs.push({ m, d: k * 0.06 });
      }
      plaques.push({ grp, blobs, ci });
    }
    return { a, b, blocked, curve, s1, s2, m1, m2, bouton, bMat, phase: r(), speed: rnd(0.32, 0.42) };
  });
  // loose plaques floating in the gaps between cells
  [[-1.0, -0.6, -0.4], [1.2, 0.9, -0.2], [-0.4, 2.6, -1.4], [0.9, -3.4, -0.4]].forEach((p, k) => {
    const grp = new T.Group(); grp.position.set(...p); root.add(grp); const blobs = [];
    for (let j = 0; j < 6; j++) { const m = new T.Mesh(blob(j ? rnd(0.05, 0.13) : 0.18, j + k * 7), plaqueMat); m.position.copy(j ? randDir().multiplyScalar(rnd(0.12, 0.3)) : new T.Vector3()); grp.add(m); blobs.push({ m, d: j * 0.07 }); }
    plaques.push({ grp, blobs, ci: -1, d: 0.25 + k * 0.15 });
  });

  // signals: instanced glowing beads (head + trail)
  const PULSES = 2, TRAIL = 5, NI = conns.length * PULSES * TRAIL;
  const sig = new T.InstancedMesh(new T.SphereGeometry(1, 12, 8), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false }), NI);
  sig.instanceColor = new T.InstancedBufferAttribute(new Float32Array(NI * 3), 3); sig.frustumCulled = false; root.add(sig);

  // ambient motes
  const NM = 260, mp = new Float32Array(NM * 3), mseed = [];
  for (let k = 0; k < NM; k++) mseed.push([rnd(-4, 4), rnd(-6.5, 6.5), rnd(-6, 2.5), rnd(0, 6.28)]);
  const motes = new T.Points(new T.BufferGeometry(), new T.PointsMaterial({ color: 0x8C7BC9, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
  motes.geometry.setAttribute('position', new T.BufferAttribute(mp, 3)); root.add(motes);

  const grey = new T.Color(0x4A4658), lav = new T.Color(0xB890E6), tmpM = new T.Matrix4(), tmpV = new T.Vector3(), tmpC = new T.Color();
  const teal = [0.55 * 3.2, 1.0 * 3.2, 0.95 * 3.2], red = [3.2, 0.5, 0.45];

  function update(t, s) {
    const S = Object.assign({ pulse: 1, plaque: 0, tangle: 0, block: 0, cut: 0, die: 0 }, s);
    const sm = (a, b, v) => { const x = Math.min(1, Math.max(0, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
    // dying cells
    cells.forEach((c, i) => {
      const k = (DYING[i] || 0) * S.die, tg = TANGLED.includes(i) ? S.tangle : 0;
      c.mat.color.copy(lav).lerp(grey, k); c.mat.emissiveIntensity = 0.55 * (1 - 0.9 * k);
      c.mat.opacity = Math.max(0.12, 1 - 0.58 * tg * (i === 0 ? 1 : 0.7) - 0.6 * k); c.mat.depthWrite = c.mat.opacity > 0.97;
      c.dend.scale.setScalar(1 - 0.45 * k); c.soma.scale.setScalar(1 - 0.2 * k); c.g.position.y = c.c.y - 0.25 * k;
    });
    tangles.forEach(tg => tg.list.forEach(f => { const k = sm(f.delay, f.delay + 0.5, S.tangle); f.m.visible = k > 0.001; f.m.geometry.setDrawRange(0, Math.floor(f.n * k / 3) * 3); }));
    plaques.forEach(p => { const base = p.ci >= 0 ? 0 : p.d; p.blobs.forEach(b => { const k = sm(base + b.d, base + b.d + 0.45, S.plaque); b.m.scale.setScalar(Math.max(0.0001, k)); b.m.visible = k > 0.001; }); p.grp.rotation.y = t * 0.15; });
    // axons, boutons, signals
    let n = 0;
    conns.forEach((c, ci) => {
      const deadA = (DYING[c.a] || 0) * S.die, deadB = (DYING[c.b] || 0) * S.die;
      c.m1.opacity = 1 - 0.7 * deadA; c.m1.emissiveIntensity = 0.5 * (1 - deadA);
      const cut = c.blocked ? S.cut : 0; if (c.s2) { c.m2.opacity = Math.max(0, 1 - cut - 0.7 * deadA); c.s2.visible = c.m2.opacity > 0.01; }
      let flash = 0;
      for (let p = 0; p < PULSES; p++) {
        const u = (t * c.speed + c.phase + p / PULSES) % 1;
        const stopFade = c.blocked ? S.block * sm(U_STOP - 0.06, U_STOP, u) : 0;
        const vis = S.pulse * (1 - deadA) * (1 - stopFade);
        if (!c.blocked || S.block < 0.5 || u < U_STOP) flash = Math.max(flash, Math.exp(-7 * u / c.speed) * (1 - (c.blocked ? S.block : 0)) * (1 - deadB));
        const nearStop = c.blocked ? S.block * sm(U_STOP - 0.16, U_STOP - 0.02, u) : 0;
        for (let k = 0; k < TRAIL; k++) {
          const uu = u - k * 0.018, a = uu > 0 ? vis * (1 - k / TRAIL) : 0;
          c.curve.getPointAt(Math.min(1, Math.max(0, uu)), tmpV);
          const sc = a > 0.01 ? (0.075 - k * 0.011) : 0;
          tmpM.makeScale(sc, sc, sc).setPosition(tmpV); sig.setMatrixAt(n, tmpM);
          const col = teal.map((v, j) => (v + (red[j] - v) * nearStop) * a);
          sig.instanceColor.setXYZ(n, col[0], col[1], col[2]); n++;
        }
      }
      c.bMat.emissiveIntensity = 0.6 + 4.5 * flash * S.pulse; c.bMat.opacity = Math.max(0, 1 - (c.blocked ? S.cut : 0) - 0.8 * deadB);
      c.bouton.scale.setScalar(1 + 0.5 * flash * S.pulse);
    });
    sig.instanceMatrix.needsUpdate = true; sig.instanceColor.needsUpdate = true;
    mseed.forEach((m, k) => { mp[k * 3] = m[0] + 0.25 * Math.sin(t * 0.21 + m[3]); mp[k * 3 + 1] = m[1] + 0.3 * Math.sin(t * 0.17 + m[3] * 1.7); mp[k * 3 + 2] = m[2] + 0.2 * Math.cos(t * 0.13 + m[3]); });
    motes.geometry.attributes.position.needsUpdate = true;
  }
  const anchor = (name) => {
    if (name === 'soma') return cells[0].c.clone();
    if (name === 'syn') return conns[0].curve.getPointAt(1);
    if (name === 'axon') return conns[2].curve.getPointAt(0.45);
    if (name === 'plaque') return plaques.find(p => p.ci === 3).grp.position.clone();
    if (name === 'plaque2') return plaques.find(p => p.ci === 1).grp.position.clone();
    if (name === 'dead') return cells[2].c.clone();
    return new T.Vector3();
  };
  return { root, update, anchor, cells };
}

export function tissueLights(ctx, st) {
  const T = ctx.THREE;
  st.add(new T.HemisphereLight(0xdfe4ff, 0x2a1840, 1.7));
  const k = new T.DirectionalLight(0xffffff, 2.4); k.position.set(3, 5, 6); st.add(k);
  const rim = new T.DirectionalLight(0x7fe8ff, 1.4); rim.position.set(-4, -2, -5); st.add(rim);
  st.scene.fog = new T.Fog(0x0B1626, 9, 24);
}
