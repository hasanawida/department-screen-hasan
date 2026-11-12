// s0 — opening card (no narration): the title in glossy 3D gold letters with a light sweep, then the purpose of the video.
// The Autrix logo sits above the title when its image ('autrix') is in the project.
import { goldText, BRAND } from '../lib/brand.js';
const PX = 100;                                                     // px per world unit at the text plane
MOTION.scene({
  id: 's0',
  setup(ctx) {
    const T = ctx.THREE;
    this.st = ctx.stage3D({ fov: 30, env: 'room', tone: 'neutral', samples: 4 });
    this.st.scene.environmentIntensity = 0.7;
    const d = 960 / PX / Math.tan(15 * Math.PI / 180); this.st.camera.position.set(0, 0, d); this.st.camera.lookAt(0, 0, 0);
    this.st.add(new T.HemisphereLight(0xfff4dd, 0x201810, 0.35));
    const k = new T.DirectionalLight(0xffffff, 1.5); k.position.set(-4, 7, 10); this.st.add(k); const f = new T.DirectionalLight(0xffe2a8, 0.5); f.position.set(5, -3, 8); this.st.add(f);
    this.sweep = new T.PointLight(0xfff1c8, 0, 30, 1.2); this.st.add(this.sweep);
    this.lines = BRAND.lines.map(s => goldText(ctx, s, { size: 1 }));
    const fit = Math.min(...this.lines.map(m => 9.4 / m.userData.w), 1.75);
    this.lines.forEach(m => { m.scale.setScalar(fit); this.st.add(m); });
    const r = ctx.seeded(7);
    this.dust = Array.from({ length: 40 }, () => ({ x: r.range(0, 1080), y: r.range(0, 1920), s: r.range(1.2, 3.2), sp: r.range(8, 26), ph: r.range(0, 6.28) }));
  },
  draw(t, lt, ctx) {
    const { X, P, at } = ctx, sc = ctx.scene, t0 = sc.start;
    const T = u => t0 + u;
    // background: deep navy with a warm glow + drifting gold dust
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const g = X.createRadialGradient(540, 960, 60, 540, 960, 1100); g.addColorStop(0, 'rgba(245,194,107,0.16)'); g.addColorStop(1, 'rgba(245,194,107,0)'); X.fillStyle = g; X.fillRect(0, 0, ctx.W, ctx.H);
    X.save(); X.globalCompositeOperation = 'lighter';
    for (const p of this.dust) { const y = (p.y - (t - t0) * p.sp + 1920) % 1920, a = 0.25 + 0.25 * Math.sin(t * 2 + p.ph); X.fillStyle = `rgba(246,203,92,${a * at(t, T(0.2), T(1.2))})`; X.beginPath(); X.arc(p.x, y, p.s, 0, 6.283); X.fill(); }
    X.restore();
    // Autrix logo (if supplied)
    const logo = ctx.img('autrix');
    if (logo) {
      const kl = at(t, T(0.15), T(0.8), 'cubicOut'), w = 420, h = w * logo.height / logo.width;
      X.save(); X.globalAlpha = kl; X.translate(540, 470); X.scale(0.92 + 0.08 * kl, 0.92 + 0.08 * kl); X.drawImage(logo, -w / 2, -h / 2, w, h); X.restore();
    }
    // 3D gold title
    const ys = [800, 1010];
    this.lines.forEach((m, i) => {
      const k = at(t, T(0.6 + i * 0.35), T(1.6 + i * 0.35), 'cubicOut');
      m.visible = k > 0.001;
      m.position.set(0, (960 - ys[i]) / PX, -6 * (1 - k));
      m.rotation.set(0.9 * (1 - k) - 0.14 * k, 0.12 * Math.sin((t - t0) * 0.9 + i * 1.3) * k, 0);
      m.material.forEach(mt => { mt.opacity = Math.min(1, k * 1.5); });
    });
    const sw = at(t, T(2.0), T(3.3), 'sineInOut'); this.sweep.position.set(-9 + 18 * sw, (960 - 905) / PX, 4.5); this.sweep.intensity = 14 * Math.sin(Math.PI * sw);
    this.st.draw(X);
    // divider + the purpose statement (white), word by word
    const kd = at(t, T(2.0), T(2.6), 'cubicInOut');
    if (kd > 0) { const lg = X.createLinearGradient(240, 0, 840, 0); lg.addColorStop(0, 'rgba(242,193,78,0)'); lg.addColorStop(0.5, 'rgba(242,193,78,0.9)'); lg.addColorStop(1, 'rgba(242,193,78,0)'); X.fillStyle = lg; X.fillRect(540 - 300 * kd, 1155, 600 * kd, 3); }
    if (!this.lays) this.lays = BRAND.statement.map(l => ctx.text.layout(X, l, { family: 'body', weight: 700, size: 54, maxWidth: 940, lineHeight: 1.4 }));
    let wi = 0;
    this.lays.forEach((lay, li) => { const w0 = wi; wi += lay.words.length;
      ctx.text.drawLayout(X, lay, 540, 1265 + li * 76, { color: P.ink, perWord: i => { const k = at(t, T(2.4 + (w0 + i) * 0.12), T(2.9 + (w0 + i) * 0.12), 'cubicOut'); return { alpha: k, dy: (1 - k) * 18 }; } }); });
  },
});
