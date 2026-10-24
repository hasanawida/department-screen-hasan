// s4 — into the tissue: the brain zooms into the hippocampus → micro photo → live 3D tissue. Neurons pass signals across
// synapses; beta-amyloid plaques build up between the cells; tau tangles grow inside them; signals stop, links break,
// cells die; back out to the brain, which shrinks.
import { headline, bg, project, tag } from '../lib/ui.js';
import { kb, drawPhoto, shade } from '../lib/photo.js';
import { buildTissue, tissueLights } from '../lib/neuro3d.js';
import { cap } from '../lib/dv.js';
const HIP = [680, 1000];
MOTION.scene({
  id: 's4',
  setup(ctx) {
    this.st = ctx.stage3D({ fov: 32, env: null, tone: 'neutral', samples: 2, bloom: { strength: 0.9, radius: 0.55, threshold: 0.95 } });
    tissueLights(ctx, this.st);
    this.ts = buildTissue(ctx); this.st.add(this.ts.root);
  },
  draw(t, lt, ctx) {
    const { X, P, at, kf, wordTime: w } = ctx, sc = ctx.scene, st = this.st, ts = this.ts, T = ctx.THREE;
    const t3 = w('l9', 3).s, tOut = w('l14', 0).s - 0.4;
    bg(ctx, X, { cy: 900, glow: 'rgba(120,80,200,0.12)' });
    // 1) the brain, zooming into the hippocampus, then the micro photo
    const kBrain = 1 - at(t, w('l9', 2).s - 0.2, w('l9', 2).s + 0.6, 'cubicInOut');
    if (kBrain > 0) { const z = 1 + 3.2 * at(t, sc.start, w('l9', 2).s + 0.6, 'cubicIn'); drawPhoto(ctx, X, 'b1', kb({ s: z, cx: HIP[0], cy: HIP[1], dx: (540 - HIP[0]) * (z - 1) / 3.2, dy: (900 - HIP[1]) * (z - 1) / 3.2 }), { alpha: kBrain }); }
    const kMicro = at(t, w('l9', 2).s - 0.2, w('l9', 2).s + 0.6) * (1 - at(t, t3 + 0.6, t3 + 1.6, 'cubicInOut'));
    if (kMicro > 0) drawPhoto(ctx, X, 'b6', kb({ s: 1.05 + 0.7 * at(t, w('l9', 2).s, t3 + 1.6, 'cubicIn'), cy: 900 }), { alpha: kMicro });
    // 2) the 3D tissue
    const k3 = at(t, t3 + 0.4, t3 + 1.6, 'cubicInOut') * (1 - at(t, tOut, tOut + 0.9, 'cubicInOut'));
    const S = {
      pulse: 1,
      plaque: at(t, w('l11', 3).s, w('l11', 9).e + 0.6, 'sineInOut'),
      tangle: at(t, w('l12', 4).s - 0.2, w('l12', 6).e + 0.6, 'sineInOut'),
      block: at(t, w('l13', 0).s, w('l13', 1).e, 'cubicOut'),
      cut: at(t, w('l13', 2).s, w('l13', 5).e, 'cubicInOut'),
      die: at(t, w('l13', 6).s, w('l13', 8).e + 0.8, 'cubicInOut'),
    };
    ts.update(t, S);
    const tz = w('l12', 0).s, tb = w('l13', 0).s;
    const dist = kf(t, [[t3, 18], [w('l10', 0).s + 1, 12.5, 'cubicOut'], [w('l11', 2).s, 11.5], [tz, 11, 'sineInOut'], [tz + 2.2, 7.6, 'cubicInOut'], [tb - 0.2, 7.3], [tb + 1.8, 12.8, 'cubicInOut'], [sc.end, 14.5]]);
    const tgt = kf(t, [[t3, [0, 0.6, 0]], [tz, [0.2, 0.2, 0]], [tz + 2.2, [0, 0.55, 0.6], 'cubicInOut'], [tb - 0.2, [0, 0.55, 0.6]], [tb + 1.8, [0.3, 0.3, 0], 'cubicInOut']]);
    st.orbit(0.12 + 0.35 * Math.sin(lt * 0.11) + 0.25 * at(t, tz, tz + 2.2, 'sineInOut'), 0.08 + 0.05 * Math.sin(lt * 0.09), dist, tgt);
    if (k3 > 0) st.draw(X, { alpha: k3 });
    // 3) back out: the brain, shrinking
    const kB2 = at(t, tOut, tOut + 0.9, 'cubicInOut');
    if (kB2 > 0) {
      const sh = at(t, w('l14', 1).s - 0.2, sc.end + 0.4, 'sineInOut'), K = kb({ s: 1.12 - 0.06 * sh, cx: 540, cy: 960, dy: -40 });
      drawPhoto(ctx, X, 'b1', K, { alpha: kB2 * (1 - sh) }); drawPhoto(ctx, X, 'b2', K, { alpha: kB2 * sh });
    }
    shade(ctx, X, { topH: 430 });
    // labels on the tissue
    const A = n => project(ctx, st, ts.anchor(n));
    const lab = (name, txt, t0, t1, dx, dy, col) => { const k = at(t, t0, t0 + 0.9) * (1 - at(t, t1, t1 + 0.4)) * k3; if (k <= 0) return; const p = A(name);
      tag(ctx, X, p[0], p[1], ctx.clamp(p[0] + dx, 150, 930), ctx.clamp(p[1] + dy, 420, 1290), txt, k, { color: col, size: 44 }); };
    lab('soma', 'תא עצב', w('l10', 1).s, w('l10', 10).s, -250, -330, P.acc);
    lab('syn', 'סינפסה', w('l10', 11).s - 0.3, w('l11', 0).s, 200, -160, P.acc);
    lab('plaque2', 'רובד עמילואיד', w('l11', 4).s, w('l12', 0).s, -280, -200, P.hi);
    lab('soma', 'סבך טאו', w('l12', 4).s + 0.2, w('l13', 0).s - 0.3, -260, 420, P.clay);
    lab('plaque2', 'האות נחסם', w('l13', 1).s, w('l13', 6).s, -280, -200, P.clay);
    lab('dead', 'תא עצב מת', w('l13', 8).s - 0.3, tOut, -320, -240, P.mut);
    // headlines
    const H = (txt, t0, t1, col) => headline(ctx, t, txt, 540, 300, { t0, out: t1, size: 84, color: col });
    H('רקמת ההיפוקמפוס', w('l10', 0).s - 0.3, w('l11', 0).s - 0.4);
    H('רבדי עמילואיד', w('l11', 3).s, w('l12', 0).s - 0.4, P.hi);
    H('סבכי טאו', w('l12', 4).s, w('l13', 0).s - 0.4, P.clay);
    H('הקשרים נקטעים', w('l13', 2).s, tOut - 0.2, P.clay);
    H('ההיפוקמפוס מתכווץ', w('l14', 0).s, sc.end + 2);
    cap(ctx, t);
  },
});
