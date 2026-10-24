// lib/hoist3d.js — a stylised 3D mobile patient hoist built from primitives, split into layers for an exploded view.
// Units ≈ metres. +x = forward (toward the patient), +y = up, z = across.
const WHITE = 0xE9EDF1, GREY = 0x8C969F, DARK = 0x3A424A, RED = 0xD8433F, YEL = 0xF2C14E, GREEN = 0x3FE08A, BLUE = 0x2F6DB5;

export function buildHoist(ctx) {
  const T = ctx.THREE, root = new T.Group(), parts = {};
  const mat = (c, o = {}) => new T.MeshStandardMaterial({ color: c, metalness: o.m ?? 0.25, roughness: o.r ?? 0.42, transparent: true, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 });
  const box = (w, h, d, m) => new T.Mesh(new T.BoxGeometry(w, h, d), m);
  const cyl = (r, h, m, seg = 24) => new T.Mesh(new T.CylinderGeometry(r, r, h, seg), m);
  const tube = (pts, r, m, seg = 64) => new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), seg, r, 14, false), m);
  const group = (name) => { const g = new T.Group(); g.name = name; parts[name] = g; root.add(g); return g; };

  // 1 · base: rear crossbar + two legs opening in a V
  const base = group('base'), mW = mat(WHITE);
  const rear = box(0.12, 0.07, 0.62, mW); rear.position.set(0, 0.11, 0); base.add(rear);
  for (const s of [-1, 1]) {
    const L = 1.05, ang = s * 0.2, leg = box(L, 0.065, 0.075, mW);
    leg.position.set(L / 2 * Math.cos(ang) + 0.02, 0.105, s * 0.26 + L / 2 * Math.sin(ang)); leg.rotation.y = -ang; base.add(leg);
  }
  const foot = box(0.2, 0.12, 0.18, mat(GREY)); foot.position.set(0, 0.15, 0); base.add(foot);
  // 2 · castors (+ brake pedals on the rear ones)
  const cas = group('castors'), mD = mat(DARK, { r: 0.6 }), mG = mat(GREY);
  const wheelAt = (x, z, brake) => {
    const fork = box(0.05, 0.06, 0.06, mG); fork.position.set(x, 0.055, z); cas.add(fork);
    const w = cyl(0.045, 0.035, mD); w.rotation.x = Math.PI / 2; w.position.set(x, 0.045, z); cas.add(w);
    if (brake) { const p = box(0.07, 0.015, 0.05, mat(RED)); p.position.set(x - 0.07, 0.07, z); cas.add(p); }
  };
  wheelAt(0, -0.28, true); wheelAt(0, 0.28, true);
  for (const s of [-1, 1]) wheelAt(1.05 * Math.cos(0.2) + 0.02, s * (0.26 + 1.05 * Math.sin(0.2)), false);
  // 3 · mast + push handle
  const mast = group('mast');
  const m1 = box(0.085, 1.12, 0.085, mW); m1.position.set(0, 0.74, 0); mast.add(m1);
  mast.add(tube([[-0.04, 1.02, -0.17], [-0.22, 1.02, -0.17], [-0.24, 1.02, 0], [-0.22, 1.02, 0.17], [-0.04, 1.02, 0.17]], 0.018, mat(GREY)));
  // 4 · boom + actuator (motor)
  const boom = group('boom');
  boom.add(tube([[0, 1.28, 0], [0.12, 1.4, 0], [0.42, 1.44, 0], [0.72, 1.36, 0], [0.86, 1.22, 0]], 0.045, mW));
  const act = cyl(0.028, 0.62, mat(GREY, { m: 0.6, r: 0.3 })); act.position.set(0.17, 1.02, 0); act.rotation.z = -0.42; boom.add(act);
  const motor = box(0.11, 0.16, 0.1, mat(WHITE)); motor.position.set(0.07, 0.74, 0); boom.add(motor);
  // 5 · spreader bar + hooks
  const spr = group('spreader'), mS = mat(GREY, { m: 0.5 });
  const link = cyl(0.016, 0.16, mS); link.position.set(0.86, 1.13, 0); spr.add(link);
  spr.add(tube([[0.86, 1.04, -0.3], [0.86, 1.08, -0.12], [0.86, 1.09, 0], [0.86, 1.08, 0.12], [0.86, 1.04, 0.3]], 0.022, mS));
  for (const z of [-0.3, -0.18, 0.18, 0.3]) { const hk = new T.Mesh(new T.TorusGeometry(0.03, 0.008, 8, 20, Math.PI * 1.4), mat(DARK)); hk.position.set(0.86, 1.01 + Math.abs(z) * -0.05, z); hk.rotation.z = Math.PI * 0.8; spr.add(hk); }
  // 6 · battery + indicator + hand control (coiled cable)
  const pwr = group('power');
  const bat = box(0.07, 0.26, 0.13, mat(0xD9DEE3)); bat.position.set(-0.08, 0.72, 0); pwr.add(bat);
  for (let i = 0; i < 4; i++) { const led = box(0.012, 0.025, 0.018, mat(GREEN, { e: GREEN, ei: 1.2 })); led.position.set(-0.117, 0.8 - i * 0.035, 0.03); pwr.add(led); }
  const hc = box(0.04, 0.12, 0.05, mat(0xF2F4F6)); hc.position.set(-0.17, 0.6, 0.06); pwr.add(hc);
  const coil = []; for (let i = 0; i <= 120; i++) { const a = i * 0.55; coil.push([-0.17 + 0.012 * Math.cos(a), 0.54 - i * 0.0028, 0.06 + 0.012 * Math.sin(a)]); }
  pwr.add(tube(coil, 0.004, mat(GREY), 240));
  // 7 · emergency stop (red button, yellow collar)
  const es = group('estop');
  const col = cyl(0.035, 0.015, mat(YEL)); col.rotation.z = Math.PI / 2; col.position.set(-0.05, 0.98, 0.0); es.add(col);
  const btn = cyl(0.025, 0.03, mat(RED, { e: RED, ei: 0.2 })); btn.rotation.z = Math.PI / 2; btn.position.set(-0.07, 0.98, 0); es.add(btn);
  // 8 · sling: padded seat on straps from the four hooks
  const sl = group('sling'), mB = mat(BLUE, { m: 0, r: 0.8 });
  const seat = new T.Mesh(new T.SphereGeometry(0.26, 32, 16, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), mB);
  seat.scale.set(1.0, 0.9, 1.15); seat.position.set(0.86, 0.78, 0); seat.material.side = T.DoubleSide; sl.add(seat);
  for (const [z, x2] of [[-0.3, 0.98], [0.3, 0.98], [-0.18, 0.72], [0.18, 0.72]]) sl.add(tube([[0.86, 1.0, z], [(0.86 + x2) / 2, 0.85, z * 0.9], [x2, 0.72, z * 0.7]], 0.012, mB, 16));
  // anchors for labels (local, in part space)
  const anchors = { base: [0.9, 0.11, 0.42], castors: [0, 0.045, -0.28], mast: [0, 0.6, 0.05], boom: [0.42, 1.44, 0], spreader: [0.86, 1.06, 0.3], power: [-0.12, 0.72, 0.07], estop: [-0.08, 0.98, 0], sling: [0.86, 0.62, 0.2] };
  // exploded offsets (scaled by e)
  const EXP = { castors: [0, -0.24, 0], base: [0, 0, 0], mast: [0, 0.2, 0], power: [-0.22, 0.2, 0], estop: [-0.3, 0.38, 0], boom: [0.02, 0.42, 0], spreader: [0.06, 0.66, 0], sling: [0.18, 0.06, 0] };
  root.traverse(o => { if (o.isMesh) o.material = o.material.clone(); });
  return {
    root, parts, anchors, EXP,
    /* e: explode 0..1 · glow {name: 0..1} teal highlight · seen {name: 0..1} how solid a part is · ghost 0..1 fades unseen parts */
    set(e, glow = {}, seen = {}, ghost = 0, accColor = 0x2EC4B6) {
      for (const [n, g] of Object.entries(parts)) {
        const o = EXP[n]; g.position.set(o[0] * e, o[1] * e, o[2] * e);
        const l = glow[n] || 0, sv = seen[n] ?? 1, op = Math.max(l, 1 - ghost * (1 - (0.22 + 0.6 * sv)));
        g.traverse(m => { if (!m.isMesh) return; const M = m.material; M.opacity = op; M.depthWrite = op > 0.95;
          if (M.userData.e0 == null) { M.userData.e0 = M.emissive.getHex(); M.userData.ei0 = M.emissiveIntensity; }
          if (l > 0.01) { M.emissive.setHex(accColor); M.emissiveIntensity = 0.38 * l; } else { M.emissive.setHex(M.userData.e0); M.emissiveIntensity = M.userData.ei0; } });
      }
    },
    anchor(name, e) { const a = anchors[name], o = EXP[name]; return new ctx.THREE.Vector3(a[0] + o[0] * e, a[1] + o[1] * e, a[2] + o[2] * e); },
  };
}
export function hoistLights(ctx, st) {
  const T = ctx.THREE;
  st.add(new T.HemisphereLight(0xdfe9ff, 0x1a2230, 0.9));
  const k = new T.DirectionalLight(0xffffff, 2.2); k.position.set(3, 5, 4); st.add(k);
  const r = new T.DirectionalLight(0x9fdcff, 1.1); r.position.set(-4, 2, -3); st.add(r);
}
