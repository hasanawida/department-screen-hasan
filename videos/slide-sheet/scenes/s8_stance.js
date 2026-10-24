// s8 — stage 3: stance — two caregivers, one each side, one foot forward, knees bent, gripping the top layer close to the patient (green spines);
// stage 4: the cue to the patient — knees bent, chin to chest, hands on the belly.
import { headline } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, stepper, pill, bubble, ring, spine } from '../lib/photo.js';
import { cap, check, STAGES } from '../lib/steps.js';
const SPF = [[140, 745], [95, 830], [72, 930], [66, 1030], [70, 1110]];
const SPM = [[930, 690], [985, 790], [1015, 900], [1030, 1000], [1035, 1090]];
MOTION.scene({
  id: 's8',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const K = lerpKB(ctx, kb({ s: 1.0, cx: 540, cy: 1050 }), kb({ s: 1.05, cx: 540, cy: 1050 }), at(t, sc.start, sc.end + 0.6, 'sineInOut')), M = mapper(K);
    drawPhoto(ctx, X, 's4', K); shade(ctx, X);
    const tQ = w('n15', 0).s, tC = w('c2', 0).s;
    stepper(ctx, X, t < tQ - 0.2 ? 3 : 4, 1, { steps: STAGES });
    const kOut = 1 - at(t, tQ - 0.4, tQ);
    const k2 = at(t, w('n14', 3).s, w('n14', 4).e) * kOut;
    [[200, 900, '1'], [870, 860, '2']].forEach(([x, y, n]) => { const q = M([x, y]); if (k2 <= 0) return;
      X.save(); X.globalAlpha *= k2; X.fillStyle = P.acc; X.beginPath(); X.arc(q[0], q[1], 34, 0, 6.283); X.fill(); X.restore();
      ctx.text(X, n, q[0], q[1] + 13, { family: 'num', weight: 800, size: 38, color: P.bg, alpha: k2 }); });
    pill(ctx, X, 540, 470, 'אחד מכל צד', at(t, w('n14', 5).s, w('n14', 5).s + 0.5) * kOut, { color: P.acc, size: 38 });
    const kF = at(t, w('n14', 8).s, w('n14', 10).e) * kOut;
    ring(ctx, X, ...M([317, 1652]), 48, t, kF, { color: P.acc }); ring(ctx, X, ...M([783, 1643]), 48, t, kF, { color: P.acc });
    pill(ctx, X, 540, 1730, 'רגל אחת קדימה', kF, { color: P.acc, size: 36 });
    ring(ctx, X, ...M([170, 1420]), 46, t, at(t, w('n14', 11).s, w('n14', 12).e) * kOut, { color: P.acc });
    const kG = at(t, w('n14', 13).s, w('n14', 15).e) * kOut;
    ring(ctx, X, ...M([292, 1135]), 46, t, kG, { color: P.acc }); ring(ctx, X, ...M([758, 1093]), 46, t, kG, { color: P.acc });
    pill(ctx, X, ...M([520, 1000]), 'השכבה העליונה, קרוב לגוף', kG, { color: P.acc, size: 34 });
    const kSp = at(t, w('n14', 8).s, w('n14', 9).e) * kOut;
    spine(ctx, X, SPF.map(M), kSp, { load: 0.05, scale: K.s }); spine(ctx, X, SPM.map(M), kSp, { load: 0.05, scale: K.s });
    // the cue
    ring(ctx, X, ...M([717, 977]), 56, t, at(t, w('c2', 0).s, w('c2', 2).e), { color: P.hi });
    check(ctx, X, 540, 470, 'ברכיים כפופות', at(t, w('c2', 2).s, w('c2', 2).s + 0.4), { size: 34 });
    check(ctx, X, 540, 545, 'סנטר לחזה', at(t, w('c2', 4).s, w('c2', 4).s + 0.4), { size: 34 });
    check(ctx, X, 540, 620, 'ידיים על הבטן', at(t, w('c2', 7).s, w('c2', 7).s + 0.4), { size: 34 });
    bubble(ctx, X, t, 'c2', ...M([200, 630]), { y: 300 });
    headline(ctx, t, 'עמידה', 540, 330, { size: 124, times: [w('n14', 2).s], out: tQ - 0.4 });
    headline(ctx, t, 'הכוונה למטופל', 540, 330, { size: 108, times: [tQ + 0.1, w('n15', 3).s], out: tC - 0.4 });
    cap(ctx, t);
  },
});
