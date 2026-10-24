// s4 — with age: thinner skin, less fat, fragile vessels that tear easily; blood thinners raise the risk.
import { AN, caption, headline, sub, tag, project, draw3D, bg } from '../lib/ui.js';
import { buildSkin, lights, BD } from '../lib/skin.js';

const S = 0.5, XO = 1.4;                     // block scale, x offset (young right, old left)

MOTION.scene({
  id: 's4',
  setup(ctx) {
    const T = ctx.THREE;
    this.st = ctx.stage3D({ fov: 30, env: 'room', tone: 'neutral' });
    this.st.scene.environmentIntensity = 0.35;
    lights(ctx, this.st);
    this.young = buildSkin(ctx, { seed: 11 }); this.old = buildSkin(ctx, { seed: 12 });
    this.young.root.scale.setScalar(S); this.old.root.scale.setScalar(S);
    this.young.root.position.x = XO; this.old.root.position.x = -XO;
    this.st.add(this.young.root, this.old.root);
    // tearing capillaries in the old skin: leak particles at three loop tops (computed at full age)
    this.old.set({ age: 1 }); this.old.root.updateMatrixWorld(true);
    const tops = [1, 4, 6].map(i => { const c = this.old.caps[i]; return c.localToWorld(new T.Vector3(c.userData.x, c.userData.h, 0)); });
    this.tops = tops;
    this.leak = ctx.particles3D({
      count: 150, seed: 4, geometry: 'sphere', color: AN.blood, drag: 3.2,
      spawn: (i, r) => { const p = tops[i % 3]; const a = r.range(0, 6.283), sp = r.range(0.1, 0.42); return { p: [p.x, p.y, p.z + 0.02], v: [Math.cos(a) * sp, Math.sin(a) * sp * 0.55 - 0.06, r.range(0, 0.05)], s: r.range(0.025, 0.05), delay: (i % 3) * 0.18 + r.range(0, 0.35) }; },
    });
    this.st.add(this.leak.mesh);
  },
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    bg(ctx, X, { cy: 1000 });
    const tAge0 = w('l8', 1).s, tAge1 = w('l8', -1).e, tThin = w('l9', 2).s, tFat = w('l9', 4).s, tVes = w('l10', 0).s, tTear = w('l10', 4).s, tMed = w('l11', 0).s;
    const age = at(t, tAge0, tAge1 + 0.3, 'cubicInOut');
    const fatFocus = at(t, tFat - 0.2, tFat + 0.4, 'cubicInOut') * (1 - at(t, tVes - 0.6, tVes, 'cubicInOut'));
    const vesFocus = at(t, tVes - 0.3, tVes + 0.5, 'cubicInOut') * (1 - at(t, tMed - 0.2, tMed + 0.6, 'cubicInOut'));
    const dimFat = { epi: fatFocus, dermis: fatFocus, fascia: fatFocus, muscle: fatFocus, fat: 0 };
    const dimVes = { epi: 0.5 * vesFocus, fat: vesFocus, fascia: vesFocus, muscle: vesFocus, dermis: 0 };
    const dim = {}; for (const k of ['epi', 'dermis', 'fat', 'fascia', 'muscle']) dim[k] = Math.max(dimFat[k], dimVes[k]);
    const flick = vesFocus * (0.5 + 0.5 * Math.sin(t * 9));
    this.young.set({ dim });
    this.old.set({ age, dim, glow: flick * 0.6, pool: 0.5 * at(t, tTear + 0.2, tTear + 1.6, 'cubicOut') * (1 - at(t, sc.end - 0.6, sc.end)) });
    this.leak.update(t - tTear);
    // camera: wide → dolly into the old dermis for the vessels → back out
    const zin = vesFocus;
    const tx = ctx.lerp(0, -XO + 0.1, zin), ty = ctx.lerp(-1.0, -0.5, zin), dist = ctx.lerp(19.5, 8.2, zin);
    this.st.orbit(0.2 + 0.04 * at(t, sc.start, sc.end), 0.3, dist, [tx, ty, 0]);
    this.young.root.updateMatrixWorld(true); this.old.root.updateMatrixWorld(true);
    draw3D(ctx, this.st, X);

    const pj = v => project(ctx, this.st, v), T = ctx.THREE;
    // block labels
    const lab = 1 - zin;
    if (lab > 0.01) {
      for (const [blk, txt, col] of [[this.young, 'עור צעיר', P.acc], [this.old, 'עור מבוגר', AN.bruiseLight]]) {
        const p = pj(blk.root.localToWorld(new T.Vector3(0, 0.05, 0)));
        ctx.text(X, txt, p[0], p[1] - 70, { family: 'body', weight: 800, size: 50, color: col, dir: 'rtl', alpha: lab * at(t, sc.start + 0.3, sc.start + 0.9) });
      }
    }
    // thickness brackets: skin (epi + dermis), then fat
    const bracket = (blk, from, to, k, col, side = -1) => {
      if (k <= 0) return;
      const g = blk.groups, top = g[from], bot = g[to];
      const a = pj(top.localToWorld(new T.Vector3(side * 2.2 - side * 0.0, top.userData.h / 2, BD / 2)));
      const b = pj(bot.localToWorld(new T.Vector3(side * 2.2, -bot.userData.h / 2, BD / 2)));
      const off = -30;
      ctx.drawPath(X, [[a[0] + off + 18, a[1]], [a[0] + off, a[1]], [b[0] + off, b[1]], [b[0] + off + 18, b[1]]], k, { width: 8, color: col, smooth: false });
    };
    const kSkin = at(t, tThin - 0.1, tThin + 0.6) * (1 - at(t, tFat - 0.3, tFat)), kFat = at(t, tFat, tFat + 0.6) * (1 - at(t, tVes - 0.6, tVes - 0.2));
    bracket(this.young, 'epi', 'dermis', kSkin * lab, P.acc); bracket(this.old, 'epi', 'dermis', kSkin * lab, P.clay);
    bracket(this.young, 'fat', 'fat', kFat * lab, P.acc); bracket(this.old, 'fat', 'fat', kFat * lab, P.clay);

    // tear marks on the old capillaries
    if (vesFocus > 0.05) this.tops.forEach((v, i) => {
      const [x, y] = pj(v), k = at(t, tTear + i * 0.18, tTear + i * 0.18 + 0.35, 'expoOut');
      if (k <= 0) return;
      X.save(); X.globalAlpha = vesFocus * (1 - 0.6 * at(t, tTear + 1, tTear + 2)); X.strokeStyle = P.clay; X.lineWidth = 5; X.lineCap = 'round';
      for (let j = 0; j < 6; j++) { const a = j * 1.047 + 0.3, r0 = 16 * k, r1 = 34 * k; X.beginPath(); X.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); X.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); X.stroke(); }
      X.restore();
    });

    // titles
    headline(ctx, t, 'עם הגיל', 540, 300, { size: 118, times: [w('l8', 0).s, w('l8', 1).s], out: tThin - 0.45 });
    sub(ctx, t, 'כל השכבות משתנות', 540, 392, { t0: w('l8', 2).s, size: 52, out: tThin - 0.45 });
    headline(ctx, t, 'העור נעשה דק', 540, 300, { size: 110, t0: tThin - 0.15, out: tFat - 0.4 });
    headline(ctx, t, 'פחות שומן מרפד', 540, 300, { size: 104, t0: tFat - 0.1, out: tVes - 0.4 });
    headline(ctx, t, 'כלי דם שבריריים', 540, 300, { size: 104, t0: tVes - 0.05, out: tMed - 0.4, colors: [null, null, P.clay] });
    sub(ctx, t, 'ונקרעים בקלות', 540, 392, { t0: tTear, size: 52, color: P.ink, out: tMed - 0.4 });

    // blood thinners card
    const kc = at(t, tMed - 0.1, tMed + 0.5, 'expoOut') * (1 - at(t, sc.end - 0.5, sc.end - 0.1));
    if (kc > 0) {
      X.save(); X.globalAlpha = kc; X.translate(0, (1 - kc) * 40);
      X.fillStyle = 'rgba(11,22,38,0.86)'; X.strokeStyle = 'rgba(229,72,77,0.55)'; X.lineWidth = 3;
      X.beginPath(); X.roundRect(110, 175, 860, 300, 34); X.fill(); X.stroke();
      // capsule pill icon (right side, RTL)
      X.save(); X.translate(842, 258); X.rotate(-0.6);
      X.fillStyle = P.ink; X.beginPath(); X.roundRect(-58, -26, 58, 52, [26, 0, 0, 26]); X.fill();
      X.fillStyle = P.clay; X.beginPath(); X.roundRect(0, -26, 58, 52, [0, 26, 26, 0]); X.fill();
      X.restore();
      ctx.text(X, 'תרופות לדילול דם', 740, 278, { family: 'display', weight: 700, size: 60, color: P.ink, dir: 'rtl', align: 'right' });
      // drop icon + arrow up
      const k2 = at(t, w('l11', 3).s, w('l11', 3).s + 0.5, 'expoOut');
      X.globalAlpha = kc * k2;
      X.save(); X.translate(842, 400); X.fillStyle = P.clay; X.beginPath(); X.moveTo(0, -40); X.bezierCurveTo(26, -8, 32, 8, 32, 18); X.arc(0, 18, 32, 0, Math.PI); X.bezierCurveTo(-32, 8, -26, -8, 0, -40); X.fill(); X.restore();
      ctx.text(X, 'יותר סיכון לדימום', 740, 420, { family: 'body', weight: 800, size: 54, color: P.clay, dir: 'rtl', align: 'right' });
      X.restore();
    }
    caption(ctx, t);
  },
});
