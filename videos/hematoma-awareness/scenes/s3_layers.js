// s3 — the skin layers, one at a time: epidermis, dermis (vessels), fat, muscle + bone.
import { caption, headline, sub, tag, project, draw3D, bg } from '../lib/ui.js';
import { buildSkin, lights, CAM } from '../lib/skin.js';

MOTION.scene({
  id: 's3',
  setup(ctx) {
    this.st = ctx.stage3D({ fov: CAM.fov, env: 'room', tone: 'neutral' });
    this.st.scene.environmentIntensity = 0.35;
    lights(ctx, this.st);
    this.skin = buildSkin(ctx, { seed: 11 });
    this.st.add(this.skin.root);
  },
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    bg(ctx, X, { cy: 1000 });
    const tE = w('l4', 2).s, tD = w('l5', 2).s, tF = w('l6', 2).s, tM = w('l7', 1).s, tB = w('l7', 3).s, tAll = w('l7', -1).e + 0.2;
    const win = (a, b) => at(t, a - 0.25, a + 0.45, 'cubicInOut') * (1 - at(t, b - 0.35, b + 0.35, 'cubicInOut'));
    const act = { epi: win(tE, tD), dermis: win(tD, tF), fat: win(tF, tM), muscle: win(tM, tAll), fascia: 0 };
    const any = at(t, tE - 0.25, tE + 0.45, 'cubicInOut') * (1 - at(t, tAll - 0.2, tAll + 0.5, 'cubicInOut'));
    const dim = {}, push = {};
    for (const k in act) { dim[k] = any * (1 - act[k]) * 0.85; push[k] = 0.5 * act[k]; }
    dim.fascia = dim.fat; push.fascia = 0;
    const gap = 0.16 * at(t, sc.start + 0.3, tE + 0.2, 'cubicInOut') * (1 - 0.6 * at(t, tAll, tAll + 0.6, 'cubicInOut'));
    this.skin.set({ gap, dim, push, glow: act.dermis * (0.5 + 0.5 * Math.sin((t - tD) * 5) ** 2), bonePush: 0.35 * at(t, tB - 0.2, tB + 0.6, 'cubicInOut') * (1 - at(t, tAll, tAll + 0.6)) });
    const az = CAM.az - 0.08 * at(t, sc.start, sc.end, 'sineInOut'), dist = CAM.dist - 1.0 * at(t, sc.start, sc.end, 'sineInOut');
    this.st.orbit(az, CAM.el, dist, CAM.target);
    this.skin.root.updateMatrixWorld(true);
    draw3D(ctx, this.st, X);

    // tags (stay once introduced)
    const sk = this.skin, pj = v => project(ctx, this.st, v);
    const T1 = [
      ['epi', 'אפידרמיס', tE, -0.42, 0.5, -46],
      ['dermis', 'דרמיס', tD, -0.42, 0.45, 0],
      ['fat', 'שומן', tF, -0.42, 0.5, 0],
      ['muscle', 'שריר', tM, -0.42, 0.35, 0],
    ];
    for (const [key, label, t0, u, v, dy] of T1) {
      const [ax, ay] = pj(sk.anchor(key, u, v));
      tag(ctx, X, ax, ay, 262, ay + dy, label, at(t, t0 + 0.1, t0 + 1.0, 'linear'), { alpha: 1 - 0.5 * dim[key] });
    }
    const T = ctx.THREE, bp = new T.Vector3(0, 0, 0).applyMatrix4(sk.bone.matrixWorld); bp.z += 0; const capPos = new T.Vector3(0.35, 0, 0);
    const bw = sk.bone.localToWorld(new T.Vector3(0, (sk.bone.geometry.parameters.height / 2), 0));
    const [bx, by] = pj(bw);
    tag(ctx, X, bx, by, 262, by + 30, 'עצם', at(t, tB + 0.1, tB + 1.0, 'linear'));
    const cap = sk.caps[3], cw = cap.localToWorld(new T.Vector3(cap.userData.x, cap.userData.h * 0.7, 0));
    const [cx, cy] = pj(cw);
    tag(ctx, X, cx, cy, 760, cy - 210, 'כלי דם', at(t, w('l5', 4).s, w('l5', 4).s + 0.9, 'linear') * (1 - at(t, tF - 0.3, tF + 0.1)), { color: P.clay });

    // titles
    const TT = [
      [tE, tD, 'אפידרמיס', 'השכבה החיצונית שמגינה על הגוף'],
      [tD, tF, 'דרמיס', 'כלי דם קטנים ועדינים'],
      [tF, tM, 'שכבת שומן', 'כרית שבולמת לחץ ומכות'],
      [tM, sc.end + 1, 'שריר ועצם', 'בעומק'],
    ];
    for (const [a, b, tt, ss] of TT) {
      headline(ctx, t, tt, 540, 300, { size: 118, t0: a - 0.1, out: b - 0.45, outDur: 0.3 });
      sub(ctx, t, ss, 540, 392, { t0: a + 0.2, size: 50, out: b - 0.45 });
    }
    sub(ctx, t, 'שכבות העור', 540, 300, { t0: sc.start + 0.2, size: 64, weight: 800, color: P.ink, out: tE - 0.5 });
    caption(ctx, t);
  },
});
