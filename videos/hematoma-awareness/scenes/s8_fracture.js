// s8 — a sharp twist, a hard pull, a knock on the bed rail → a fracture (spiral crack under torsion).
import { AN, caption, headline, draw3D, project, bg } from '../lib/ui.js';

MOTION.scene({
  id: 's8',
  setup(ctx) {
    const T = ctx.THREE;
    this.st = ctx.stage3D({ fov: 30, camera: [0, 0, 22], env: 'room', tone: 'neutral' });
    this.st.scene.environmentIntensity = 0.45;
    this.st.add(new T.HemisphereLight('#ffffff', '#2A3550', 1.0));
    const k = new T.DirectionalLight('#FFF4EA', 2.0); k.position.set(4, 6, 8); this.st.add(k);
    const prof = [[0.001, 3.25], [0.5, 3.15], [0.74, 2.88], [0.72, 2.5], [0.46, 2.08], [0.31, 1.6], [0.27, 0.6], [0.27, 0]];
    const mat = new T.MeshStandardMaterial({ color: AN.bone, roughness: 0.48 });
    const half = sgn => { const pts = prof.map(([r, y]) => new T.Vector2(r, y * sgn)); if (sgn < 0) pts.reverse(); pts.push(new T.Vector2(0.001, 0)); if (sgn > 0) pts.reverse(); const g = new T.LatheGeometry(pts, 72); g.computeVertexNormals(); return new T.Mesh(g, mat); };
    this.root = new T.Group(); this.st.add(this.root);
    this.top = half(1); this.bot = half(-1);
    this.pivT = new T.Group(); this.pivB = new T.Group(); this.pivT.add(this.top); this.pivB.add(this.bot); this.root.add(this.pivT, this.pivB);
    // spiral crack around the shaft
    const hp = []; for (let i = 0; i <= 80; i++) { const q = i / 80, a = q * Math.PI * 1.7, y = -0.75 + 1.5 * q; hp.push(new T.Vector3(0.277 * Math.cos(a), y, 0.277 * Math.sin(a))); }
    this.crackGeo = new T.TubeGeometry(new T.CatmullRomCurve3(hp), 160, 0.03, 8, false);
    this.crack = new T.Mesh(this.crackGeo, new T.MeshStandardMaterial({ color: '#2A0C10', emissive: new T.Color(AN.blood), emissiveIntensity: 0 }));
    this.root.add(this.crack);
    this.root.rotation.z = -0.62;
    this.chips = ctx.particles3D({ count: 40, seed: 5, geometry: 'tetra', color: AN.bone, drag: 1.5, gravity: [0, -2.2, 0],
      spawn: (i, r) => { const a = r() * 6.283; return { p: [0.28 * Math.cos(a), r.range(-0.3, 0.3), 0.28 * Math.sin(a)], v: [Math.cos(a) * r.range(0.8, 2), r.range(0.4, 1.6), Math.sin(a) * r.range(0.8, 2)], s: r.range(0.04, 0.09), life: r.range(0.8, 1.4) }; } });
    this.root.add(this.chips.mesh);
  },
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    bg(ctx, X, { cy: 950, glow: 'rgba(229,72,77,0.08)' });
    const tTw = w('l19', 0).s, tPull = w('l19', 6).s, tHit = w('l19', 9).s, tBreak = w('l20', 2).s;
    const twist = at(t, tTw, tTw + 0.9, 'cubicInOut') * (1 - at(t, tPull - 0.4, tPull, 'cubicInOut'));
    const pull = at(t, tPull, tPull + 0.7, 'cubicInOut') * (1 - at(t, tHit - 0.4, tHit, 'cubicInOut'));
    const hit = Math.exp(-7 * Math.max(0, t - w('l19', 10).s)) * (t >= w('l19', 10).s ? 1 : 0);
    const brk = at(t, tBreak - 0.05, tBreak + 0.35, 'expoOut');
    const spin = 0.25 * (t - sc.start);
    this.pivT.rotation.y = spin + 0.5 * twist; this.pivB.rotation.y = spin - 0.5 * twist;
    this.pivT.position.y = 0.05 * brk; this.pivB.position.y = -0.05 * brk;
    this.pivT.rotation.z = 0.07 * brk; this.pivB.rotation.z = -0.05 * brk;
    this.crack.rotation.y = spin;
    const kc = at(t, w('l20', 0).s, tBreak + 0.1, 'cubicIn');
    this.crackGeo.setDrawRange(0, Math.floor(this.crackGeo.index.count * kc / 6) * 6);
    this.crack.material.emissiveIntensity = 2.5 * brk * (1 - at(t, tBreak + 0.4, tBreak + 1.4)) + 0.1;
    this.chips.update(t - tBreak);
    this.chips.mesh.visible = t >= tBreak;
    const shake = (hit * 0.08 + 0.12 * Math.exp(-6 * Math.max(0, t - tBreak)) * (t >= tBreak)) * Math.sin(t * 60);
    this.root.position.set(shake, 0.45 + shake * 0.6, 0);
    draw3D(ctx, this.st, X);

    const T = ctx.THREE, pj = v => project(ctx, this.st, v);
    const ends = [this.top.localToWorld(new T.Vector3(0, 1.45, 0)), this.bot.localToWorld(new T.Vector3(0, -1.45, 0))].map(pj), mid = pj(new T.Vector3(0, 0, 0).applyMatrix4(this.root.matrixWorld));
    // twist arrows (opposite directions at both ends)
    if (twist > 0.01) ends.forEach(([x, y], i) => {
      X.save(); X.globalAlpha = twist; X.translate(x, y); X.rotate(-0.62 - Math.PI / 2); X.scale(1, 0.42);
      const a0 = i ? 0.2 : Math.PI + 0.2, sgn = i ? 1 : -1, k = at(t, tTw + 0.1, tTw + 0.9, 'cubicOut');
      X.strokeStyle = P.clay; X.lineWidth = 12; X.lineCap = 'round'; X.beginPath(); X.arc(0, 0, 120, a0, a0 + sgn * 2.4 * k, sgn < 0); X.stroke();
      const ae = a0 + sgn * 2.4 * k; X.fillStyle = P.clay; X.translate(Math.cos(ae) * 120, Math.sin(ae) * 120); X.rotate(ae + sgn * Math.PI / 2); X.beginPath(); X.moveTo(0, 28); X.lineTo(-24, -10); X.lineTo(24, -10); X.closePath(); X.fill();
      X.restore();
    });
    // pull arrows (outward along the axis)
    if (pull > 0.01) ends.forEach(([x, y], i) => {
      const d = [x - mid[0], y - mid[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L], a = [x + u[0] * 150, y + u[1] * 150], b = [x + u[0] * 290, y + u[1] * 290];
      X.save(); X.globalAlpha = pull; ctx.drawPath(X, [a, b], pull, { width: 12, color: P.clay });
      X.fillStyle = P.clay; X.translate(b[0], b[1]); X.rotate(Math.atan2(u[1], u[0])); X.beginPath(); X.moveTo(30, 0); X.lineTo(-12, -24); X.lineTo(-12, 24); X.closePath(); X.fill(); X.restore();
    });
    // bed rail knock
    const kr = at(t, tHit - 0.2, tHit + 0.35, 'expoOut') * (1 - at(t, tBreak - 0.6, tBreak - 0.2));
    if (kr > 0) {
      const rx = mid[0] + 260 - 120 * at(t, tHit, w('l19', 10).s, 'expoIn'), ry = mid[1] - 40;
      X.save(); X.globalAlpha = kr; X.fillStyle = '#9AA6B6'; X.strokeStyle = '#5C6878'; X.lineWidth = 4;
      X.beginPath(); X.roundRect(rx - 26, ry - 260, 52, 520, 26); X.fill(); X.stroke();
      X.fillStyle = 'rgba(255,255,255,0.35)'; X.fillRect(rx - 14, ry - 240, 8, 480);
      X.restore();
      if (hit > 0.02) { X.save(); X.globalAlpha = hit; X.strokeStyle = P.ink; X.lineWidth = 6; X.lineCap = 'round'; for (let j = 0; j < 8; j++) { const a = j * 0.785; X.beginPath(); X.moveTo(mid[0] + 70 + Math.cos(a) * 30, mid[1] - 40 + Math.sin(a) * 30); X.lineTo(mid[0] + 70 + Math.cos(a) * (60 + 40 * (1 - hit)), mid[1] - 40 + Math.sin(a) * (60 + 40 * (1 - hit))); X.stroke(); } X.restore(); }
    }
    // break flash
    const fl = (t >= tBreak) ? Math.exp(-9 * (t - tBreak)) : 0;
    if (fl > 0.01) { X.save(); X.globalAlpha = 0.35 * fl; X.fillStyle = '#FFFFFF'; X.fillRect(0, 0, ctx.W, ctx.H); X.restore(); }

    headline(ctx, t, 'סיבוב חד', 540, 320, { size: 120, times: [tTw, w('l19', 1).s], out: tPull - 0.35 });
    headline(ctx, t, 'משיכה חזקה', 540, 320, { size: 116, times: [tPull, w('l19', 7).s], out: tHit - 0.4 });
    headline(ctx, t, 'מכה במעקה', 540, 320, { size: 116, times: [tHit, w('l19', 10).s], out: w('l20', 0).s - 0.3 });
    headline(ctx, t, 'שבר', 540, 330, { size: 170, times: [tBreak], color: P.clay });
    caption(ctx, t);
  },
});
