// s2 — the full-body lift as a 3D model: it explodes into layers (castors, base, mast, power, emergency stop, boom & motor,
// spreader & hooks, sling); each layer lights up in turn with a legend card, photo close-ups for the controls and the sling;
// at the end it reassembles and dissolves into the real photo.
import { headline, caption, bg, project, draw3D } from '../lib/ui.js';
import { kb, drawPhoto, shade, lens, pill, ring } from '../lib/photo.js';
import { buildHoist, hoistLights } from '../lib/hoist3d.js';
const LAYERS = [
  ['בסיס ורגליים', 'base', ['n4', 0]],
  ['גלגלים ובלמים', 'castors', ['n4', 10]],
  ['תורן וידית', 'mast', ['n5', 1]],
  ['זרוע ומנוע', 'boom', ['n5', 2]],
  ['מוט פיזור וווים', 'spreader', ['n6', 2]],
  ['סוללה ושלט', 'power', ['n7', 0]],
  ['עצירת חירום', 'estop', ['n8', 3]],
  ['רתמה', 'sling', ['n9', 2]],
];
const CX = 36, CW = 300, CH = 58, Y0 = 1390, STEP = 72, SHIFT = 130;
MOTION.scene({
  id: 's2',
  setup(ctx) {
    this.st = ctx.stage3D({ fov: 30, env: 'room', tone: 'neutral', samples: 4 });
    this.st.scene.environmentIntensity = 0.45;
    hoistLights(ctx, this.st);
    this.h = buildHoist(ctx); this.st.add(this.h.root);
  },
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene, h = this.h, st = this.st;
    bg(ctx, X, { cy: 1050, glow: 'rgba(46,196,182,0.10)' });
    const T0 = LAYERS.map(L => w(L[2][0], L[2][1]).s), tEx = w('n3', 4).s, tBack = w('n9', 7).s, tPhoto = sc.end - 1.6;
    const e = at(t, tEx - 0.3, tEx + 1.1, 'cubicInOut') * (1 - at(t, tBack, tBack + 1.4, 'cubicInOut'));
    const ghost = at(t, tEx, T0[0], 'cubicInOut') * (1 - at(t, tBack, tBack + 1.0));
    const glow = {}, seen = {};
    LAYERS.forEach(([, n], i) => { const next = T0[i + 1] ?? tBack; seen[n] = at(t, T0[i] - 0.2, T0[i] + 0.4); glow[n] = at(t, T0[i] - 0.2, T0[i] + 0.3) * (1 - at(t, next - 0.2, next + 0.3)); });
    h.set(e, glow, seen, ghost);
    const az = 0.42 + 0.38 * at(t, sc.start, sc.end, 'sineInOut') + 0.05 * Math.sin(t * 0.4);
    st.orbit(az, 0.18, 7.8 + 0.9 * e, [0.42, 0.72 + 0.28 * e, 0]);
    // floor shadow + model (shifted right to leave room for the legend)
    const f0 = project(ctx, st, new ctx.THREE.Vector3(0.45, 0, 0)), sh = X.createRadialGradient(f0[0] + SHIFT, f0[1], 10, f0[0] + SHIFT, f0[1], 380);
    sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    X.save(); X.translate(f0[0] + SHIFT, f0[1]); X.scale(1, 0.22); X.translate(-(f0[0] + SHIFT), -f0[1]); X.fillStyle = sh; X.beginPath(); X.arc(f0[0] + SHIFT, f0[1], 380, 0, 6.283); X.fill(); X.restore();
    X.save(); X.translate(SHIFT, 0); draw3D(ctx, st, X); X.restore();
    const A = n => { const p = project(ctx, st, h.anchor(n, e)); return [p[0] + SHIFT, p[1]]; };
    // legend stack + leader to the active part
    LAYERS.forEach(([lab, n], i) => {
      const k = at(t, T0[i] - 0.2, T0[i] + 0.4, 'expoOut') * (1 - at(t, tPhoto - 0.3, tPhoto + 0.3)); if (k <= 0) return;
      const act = glow[n], y = Y0 - i * STEP;
      X.save(); X.globalAlpha *= k; X.translate((1 - k) * -40, 0);
      X.fillStyle = act > 0.5 ? P.acc : 'rgba(11,22,38,0.88)'; X.strokeStyle = act > 0.5 ? P.acc : 'rgba(46,196,182,0.55)'; X.lineWidth = 3;
      X.beginPath(); X.roundRect(CX, y - CH / 2, CW, CH, 18); X.fill(); X.stroke();
      const nx = CX + CW - 32;
      X.fillStyle = act > 0.5 ? P.bg : P.acc; X.beginPath(); X.arc(nx, y, 19, 0, 6.283); X.fill();
      ctx.text(X, String(i + 1), nx, y + 8, { family: 'num', weight: 800, size: 24, color: act > 0.5 ? P.acc : P.bg });
      ctx.text(X, lab, nx - 32, y + 11, { family: 'body', weight: 800, size: 30, color: act > 0.5 ? P.bg : P.ink, dir: 'rtl', align: 'right' });
      X.restore();
      if (act > 0.01) { const a = A(n), kl = at(t, T0[i] + 0.1, T0[i] + 0.7, 'cubicInOut');
        X.save(); X.globalAlpha *= act; X.setLineDash([10, 8]); ctx.drawPath(X, [[CX + CW + 8, y], a], kl, { width: 3, color: P.acc, smooth: false }); X.setLineDash([]);
        X.fillStyle = P.acc; X.beginPath(); X.arc(a[0], a[1], 10 * kl, 0, 6.283); X.fill(); X.restore(); }
    });
    // details: legs open, brakes, motor, battery indicator, emergency lowering
    pill(ctx, X, ...(([x, y]) => [x, y + 80])(A('base')), 'נפתחות לייצוב', at(t, w('n4', 3).s, w('n4', 3).s + 0.5) * (1 - at(t, T0[1] - 0.3, T0[1])), { color: P.hi, size: 32 });
    ring(ctx, X, ...A('castors'), 34, t, at(t, w('n4', 12).s, w('n4', 12).s + 0.5) * (1 - at(t, T0[2] - 0.3, T0[2])), { color: P.clay, width: 5 });
    ring(ctx, X, ...A('power'), 38, t, at(t, w('n7', 2).s, w('n7', 3).e) * (1 - at(t, T0[6] - 0.3, T0[6])), { color: P.acc, width: 5 });
    // photo close-ups
    const kC = at(t, w('n8', 3).s - 0.2, w('n8', 3).s + 0.4) * (1 - at(t, T0[7] - 0.5, T0[7] - 0.1));
    lens(ctx, X, 'h9', 890, 505, 120, { x: 470, y: 1000, s: 0.6 }, kC, { color: P.clay });
    pill(ctx, X, 610, 455, 'עצירה · הורדת חירום', kC, { color: P.clay, size: 30 });
    const kS = at(t, T0[7] - 0.2, T0[7] + 0.4) * (1 - at(t, tPhoto - 0.4, tPhoto));
    lens(ctx, X, 'h8', 890, 505, 120, { x: 560, y: 1080, s: 0.4 }, kS, { color: P.acc });
    pill(ctx, X, 610, 455, 'סוג וגודל לפי המטופל', at(t, w('n9', 4).s, w('n9', 4).s + 0.5) * (1 - at(t, tPhoto - 0.4, tPhoto)), { color: P.acc, size: 30 });
    // dissolve into the real photo
    const kP = at(t, tPhoto, sc.end, 'cubicInOut');
    if (kP > 0) { X.save(); X.globalAlpha = kP; drawPhoto(ctx, X, 'h0', kb({ s: 1.0, cx: 560, cy: 1100 })); shade(ctx, X); X.restore(); }
    headline(ctx, t, 'פירוק לשכבות', 540, 330, { size: 112, times: [w('n3', 1).s, w('n3', 4).s], colors: [null, P.acc] });
    caption(ctx, t, { skip: /^c/, base: 1790 });
  },
});
