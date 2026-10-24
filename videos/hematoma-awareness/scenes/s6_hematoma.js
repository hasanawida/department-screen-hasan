// s6 — inside the old skin: fingers press, the skin is dragged sideways, small vessels tear, blood pools → hematoma.
import { AN, caption, headline, sub, tag, project, draw3D, bg } from '../lib/ui.js';
import { buildSkin, lights, BD } from '../lib/skin.js';

const FX = [-0.95, -0.32, 0.32, 0.95], BROKEN = [2, 3, 4, 5, 6];

MOTION.scene({
  id: 's6',
  setup(ctx) {
    const T = ctx.THREE;
    this.st = ctx.stage3D({ fov: 30, env: 'room', tone: 'neutral' });
    this.st.scene.environmentIntensity = 0.35;
    lights(ctx, this.st);
    const sk = this.skin = buildSkin(ctx, { seed: 12 });
    this.st.add(sk.root);
    // gloved fingertips
    const gm = this.gm = new T.MeshStandardMaterial({ color: AN.glove, roughness: 0.35, metalness: 0, transparent: true });
    this.fingers = FX.map((x, i) => { const m = new T.Mesh(new T.CapsuleGeometry(0.21, 0.9, 8, 24), gm); m.position.set(x, 3, 0.75); sk.root.add(m); return m; });
    // contact shadows on the top surface
    const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sx = sc.getContext('2d'), g = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(60,20,20,0.55)'); g.addColorStop(1, 'rgba(60,20,20,0)'); sx.fillStyle = g; sx.fillRect(0, 0, 128, 128);
    const st = new T.CanvasTexture(sc);
    this.shadows = FX.map(x => { const m = new T.Mesh(new T.PlaneGeometry(0.75, 0.75), new T.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, 0.75); sk.groups.epi.add(m); return m; });
    // torn capillaries: same loop with a gap at the top
    sk.set({ age: 1 }); sk.root.updateMatrixWorld(true);
    const vz = BD / 2, origins = [];
    this.broken = BROKEN.map(i => {
      const c = sk.caps[i], x = c.userData.x, h = c.userData.h;
      const half = pts => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), 24, 0.022, 10, false);
      const geo = ctx.BufferGeometryUtils.mergeGeometries([
        half([[x - 0.09, 0, vz], [x - 0.065, h * 0.55, vz], [x - 0.04, h * 0.86, vz]]),
        half([[x + 0.04, h * 0.86, vz], [x + 0.065, h * 0.55, vz], [x + 0.09, 0, vz]])]);
      origins.push(c.localToWorld(new T.Vector3(x, h * 0.92, 0)));
      return { c, full: c.geometry, geo };
    });
    this.leak = ctx.particles3D({
      count: 300, seed: 9, geometry: 'sphere', color: '#C0283A', drag: 2.0,
      spawn: (i, r) => { const o = origins[i % origins.length], a = r.range(0, 6.283), sp = r.range(0.15, 0.8); return { p: [o.x, o.y, o.z + 0.06], v: [Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 0.12, 0], s: r.range(0.06, 0.11), delay: (i % origins.length) * 0.07 + r.range(0, 1.2) }; },
    });
    sk.root.add(this.leak.mesh);
  },
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene, sk = this.skin;
    bg(ctx, X, { cy: 1000, glow: 'rgba(229,72,77,0.07)' });
    const tIn = w('l14', 0).s, tPress = w('l14', 1).s, tShear = w('l14', 3).s, tTear = w('l15', 3).s, tOut = w('l15', 4).s, tPool = w('l16', 1).s, tHem = w('l16', -1).s;
    // fingers: down → press → drag sideways → lift
    const down = at(t, tIn - 0.3, tPress, 'cubicOut'), press = at(t, tPress, tPress + 0.4, 'cubicOut');
    const shear = at(t, tShear - 0.1, w('l14', -1).e, 'cubicInOut') * (1 - at(t, tTear - 0.45, tTear, 'cubicInOut'));
    const lift = at(t, tTear - 0.25, tTear + 0.6, 'cubicIn');
    const sx = 0.42 * shear; this.gm.opacity = 1 - lift;
    this.fingers.forEach((f, i) => { f.position.y = ctx.lerp(3.4, 0.62 - 0.07 * press, down) + 1.2 * lift + 0.04 * Math.sin(i); f.position.x = FX[i] + sx; f.visible = lift < 0.99; });
    this.shadows.forEach((m, i) => { m.material.opacity = down * (1 - lift) * (0.5 + 0.5 * press); m.position.x = FX[i]; m.position.y = sk.groups.epi.userData.h / 2 + 0.006; });
    const torn = t >= tTear;
    this.broken.forEach(b => { b.c.geometry = torn ? b.geo : b.full; });
    const pool = at(t, tOut - 0.3, tPool + 1.2, 'cubicInOut'), bruise = at(t, tPool - 0.2, w('l16', 3).e + 0.4, 'cubicInOut');
    sk.set({ age: 1, shear: { epi: sx, dermis: sx, fat: sx * 0.3 }, pool, bruise: 0.95 * bruise, glow: 0.8 * at(t, tTear - 0.1, tTear + 0.05) * (1 - at(t, tTear + 0.4, tTear + 1)) });
    this.leak.update(t - tTear);
    this.leak.mesh.position.x = 0;
    const az = 0.5 - 0.06 * at(t, sc.start, sc.end, 'sineInOut') , el = 0.4 + 0.14 * at(t, tPool - 0.5, tHem + 0.5, 'cubicInOut');
    this.st.orbit(az, el, 20 - 1.0 * at(t, sc.start, sc.end, 'sineInOut'), [-0.85, -1.35, 0]);
    sk.root.updateMatrixWorld(true);
    draw3D(ctx, this.st, X);

    const pj = v => project(ctx, this.st, v), T = ctx.THREE;
    // pressure arrows ↓ above the fingers
    const kP = at(t, tPress, tPress + 0.4) * (1 - at(t, tShear - 0.2, tShear + 0.1));
    if (kP > 0) this.fingers.forEach((f, i) => {
      const [x, y] = pj(f.localToWorld(new T.Vector3(0, 0.75, 0))); const yy = y - 34 - 14 * Math.sin((t - tPress) * 6);
      X.save(); X.globalAlpha = kP; ctx.drawPath(X, [[x, yy - 80], [x, yy]], 1, { width: 9, color: P.clay });
      X.fillStyle = P.clay; X.beginPath(); X.moveTo(x - 20, yy - 6); X.lineTo(x + 20, yy - 6); X.lineTo(x, yy + 22); X.closePath(); X.fill(); X.restore();
    });
    // shear arrow →
    const kS = at(t, tShear, tShear + 0.5) * (1 - at(t, tTear - 0.5, tTear - 0.2));
    if (kS > 0) {
      const [x0, y0] = pj(new T.Vector3(-1.3, 1.8, 0.75)), [x1, y1] = pj(new T.Vector3(1.7, 1.8, 0.75));
      ctx.drawPath(X, [[x0, y0], [x1, y1]], kS, { width: 12, color: P.clay });
      if (kS > 0.9) { X.save(); X.fillStyle = P.clay; X.translate(x1, y1); X.rotate(Math.atan2(y1 - y0, x1 - x0)); X.beginPath(); X.moveTo(30, 0); X.lineTo(-14, -24); X.lineTo(-14, 24); X.closePath(); X.fill(); X.restore(); }
    }
    // tear bursts at the torn loops
    if (t >= tTear && t < tTear + 1.6) this.broken.forEach((b, i) => {
      const c = b.c, [x, y] = pj(c.localToWorld(new T.Vector3(c.userData.x, c.userData.h * 0.92, 0.05))), k = at(t, tTear + i * 0.07, tTear + i * 0.07 + 0.3, 'expoOut');
      X.save(); X.globalAlpha = 1 - at(t, tTear + 0.9, tTear + 1.6); X.strokeStyle = P.clay; X.lineWidth = 5; X.lineCap = 'round';
      for (let j = 0; j < 6; j++) { const a = j * 1.047 + 0.4, r0 = 12 * k, r1 = 30 * k; X.beginPath(); X.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); X.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); X.stroke(); }
      X.restore();
    });
    // hematoma tag
    const pp = pj(sk.pool.getWorldPosition(new T.Vector3()));
    tag(ctx, X, pp[0], pp[1], 262, pp[1] + 150, 'המטומה', at(t, tHem, tHem + 0.9, 'linear'), { color: AN.bruiseLight });

    headline(ctx, t, 'לחץ', 540, 300, { size: 124, times: [tPress], out: tShear - 0.35, colors: [P.clay] });
    sub(ctx, t, 'האצבעות לוחצות על העור', 540, 392, { t0: tIn, size: 50, out: tShear - 0.35 });
    headline(ctx, t, 'ומתיחה הצידה', 540, 300, { size: 110, times: [tShear, w('l14', -1).s], out: w('l15', 0).s - 0.3, colors: [P.clay, null] });
    headline(ctx, t, 'כלי הדם נקרעים', 540, 300, { size: 104, times: [w('l15', 0).s, w('l15', 1).s, tTear], out: tPool - 0.6, colors: [null, null, P.clay] });
    sub(ctx, t, 'והדם יוצא אל הרקמה', 540, 392, { t0: tOut, size: 50, color: P.ink, out: tPool - 0.6 });
    headline(ctx, t, 'המטומה', 540, 300, { size: 132, times: [tHem], color: AN.bruiseLight });
    sub(ctx, t, 'דם שהצטבר מתחת לעור', 540, 392, { t0: tPool, size: 52, color: P.ink });
    caption(ctx, t);
  },
});
