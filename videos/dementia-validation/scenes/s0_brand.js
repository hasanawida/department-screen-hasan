// s0 — opening card (no narration): the Eshkolot logo assembles (three drops fall in, wordmark, tagline), the division
// and the home's name, then the motto in glossy 3D gold letters with a light sweep.
import { goldText, BRAND } from '../lib/brand.js';
const PINS = ['brand_pin0', 'brand_pin2', 'brand_pin1'];          // sage (top), yellow (left), coral (right)
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
    const fit = Math.min(...this.lines.map(m => 9.7 / m.userData.w), 1.4);
    this.lines.forEach(m => { m.scale.setScalar(fit); this.st.add(m); });
    this.fit = fit;
    const r = ctx.seeded(7);
    this.dust = Array.from({ length: 40 }, () => ({ x: r.range(0, 1080), y: r.range(0, 1920), s: r.range(1.2, 3.2), sp: r.range(8, 26), ph: r.range(0, 6.28) }));
  },
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx, sc = ctx.scene, t0 = sc.start;
    const T = u => t0 + u;
    // background: deep navy with a warm glow
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    let g = X.createRadialGradient(540, 1050, 60, 540, 1050, 1100); g.addColorStop(0, 'rgba(245,194,107,0.16)'); g.addColorStop(1, 'rgba(245,194,107,0)'); X.fillStyle = g; X.fillRect(0, 0, ctx.W, ctx.H);
    X.save(); X.globalCompositeOperation = 'lighter';
    for (const p of this.dust) { const y = (p.y - (t - t0) * p.sp + 1920) % 1920, a = 0.25 + 0.25 * Math.sin(t * 2 + p.ph); X.fillStyle = `rgba(246,203,92,${a * at(t, T(0.2), T(1.2))})`; X.beginPath(); X.arc(p.x, y, p.s, 0, 6.283); X.fill(); }
    X.restore();
    // logo card
    const kc = at(t, T(0.15), T(0.75), 'cubicOut');
    if (kc > 0) {
      X.save(); X.globalAlpha = kc; X.translate(540, 600); X.scale(0.92 + 0.08 * kc, 0.92 + 0.08 * kc); X.translate(-540, -470);
      X.shadowColor = 'rgba(0,0,0,0.45)'; X.shadowBlur = 40; X.shadowOffsetY = 12; X.fillStyle = '#F7F4EF'; X.beginPath(); X.roundRect(110, 305, 860, 330, 40); X.fill(); X.shadowColor = 'transparent';
      PINS.forEach((n, i) => { const k = at(t, T(0.45 + i * 0.16), T(0.95 + i * 0.16), 'backOut'); if (k <= 0) return;
        X.save(); X.globalAlpha *= Math.min(1, k * 1.4); X.drawImage(ctx.img(n), 735, 365 - (1 - k) * 150, 220, 210); X.restore(); });
      const kw = at(t, T(0.95), T(1.45), 'cubicOut'), kt = at(t, T(1.15), T(1.65), 'cubicOut');
      X.save(); X.globalAlpha *= kw; X.drawImage(ctx.img('brand_wordmark'), 275 - (1 - kw) * 40, 380, 430, 126); X.restore();
      X.save(); X.globalAlpha *= kt; X.drawImage(ctx.img('brand_tagline'), 275 - (1 - kt) * 40, 528, 430, 43); X.restore();
      X.restore();
    }
    // division + home (gold / white)
    const kk = at(t, T(1.4), T(1.9), 'cubicOut'), kh = at(t, T(1.6), T(2.1), 'cubicOut');
    if (kk > 0) { X.save(); const gg = X.createLinearGradient(0, -52, 0, 8); gg.addColorStop(0, '#FFE39A'); gg.addColorStop(0.5, '#F2C14E'); gg.addColorStop(1, '#B5832B');
      ctx.text(X, BRAND.kicker, 540, 905 + (1 - kk) * 20, { family: 'display', weight: 900, size: 56, color: gg, dir: 'rtl', alpha: kk }); X.restore(); }
    if (kh > 0) ctx.text(X, BRAND.title, 540, 995 + (1 - kh) * 20, { family: 'display', weight: 700, size: 60, color: P.ink, dir: 'rtl', alpha: kh });
    // 3D gold motto
    const ys = [1250, 1465];
    const kd = at(t, T(1.8), T(2.4), 'cubicInOut'); if (kd > 0) { const lg = X.createLinearGradient(240, 0, 840, 0); lg.addColorStop(0, 'rgba(242,193,78,0)'); lg.addColorStop(0.5, 'rgba(242,193,78,0.9)'); lg.addColorStop(1, 'rgba(242,193,78,0)'); X.fillStyle = lg; X.fillRect(540 - 300 * kd, 1080, 600 * kd, 3); }
    this.lines.forEach((m, i) => {
      const k = at(t, T(2.0 + i * 0.35), T(3.0 + i * 0.35), 'cubicOut');
      m.visible = k > 0.001;
      m.position.set(0, (960 - ys[i]) / PX, -6 * (1 - k));
      m.rotation.set(0.9 * (1 - k) - 0.16 * k, 0.13 * Math.sin((t - t0) * 0.9 + i * 1.3) * k, 0);
      m.material.forEach(mt => { mt.opacity = Math.min(1, k * 1.5); });
    });
    const sw = at(t, T(3.3), T(4.6), 'sineInOut'); this.sweep.position.set(-9 + 18 * sw, (960 - 1360) / PX, 4.5); this.sweep.intensity = 14 * Math.sin(Math.PI * sw);
    this.st.draw(X);
  },
});
