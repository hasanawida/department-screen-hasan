// s9 — stage 6: lowering into the locked chair, slowly, the second caregiver guiding the hips deep into the seat; then unhook and slide the sling out gently.
import { headline } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, stepper, arrow, pill, bubble, ring, heatGood } from '../lib/photo.js';
import { plate, cap, check, STAGES } from '../lib/steps.js';
MOTION.scene({
  id: 's9',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const tC = w('c4', 0).s, tO = w('n23', 0).s, sw = at(t, tO - 0.5, tO + 0.2, 'cubicInOut');
    if (sw < 1) {
      const { M } = plate(ctx, X, t, 'h6', 6, { s: 1.0, cx: 540, cy: 1000 }, { s: 1.06, cx: 520, cy: 1000 });
      const kLock = at(t, w('n22', 3).s, w('n22', 5).e);
      arrow(ctx, X, [M([260, 1640]), M([300, 1470])], kLock, { color: P.acc, width: 8, smooth: false });
      check(ctx, X, ...M([270, 1710]), 'הכיסא נעול', at(t, w('n22', 5).s - 0.2, w('n22', 5).s + 0.3), { size: 36 });
      const kDown = at(t, w('n22', 6).s, w('n22', 7).e + 0.6);
      arrow(ctx, X, [M([600, 960]), M([600, 1090])], kDown, { color: P.acc, width: 10, smooth: false });
      pill(ctx, X, ...M([680, 1150]), 'לאט', kDown, { color: P.acc, size: 38 });
      const kPel = at(t, w('n22', 10).s, w('n22', 14).e);
      heatGood(ctx, X, ...M([420, 1170]), 120, kPel);
      arrow(ctx, X, [M([520, 1120]), M([420, 1160])], kPel, { color: P.acc, width: 8, smooth: false });
      pill(ctx, X, ...M([420, 1270]), 'אגן עמוק במושב', at(t, w('n22', 12).s, w('n22', 12).s + 0.5), { color: P.acc, size: 36 });
      bubble(ctx, X, t, 'c4', ...M([234, 620]), { y: 450 });
      headline(ctx, t, 'ההורדה', 540, 330, { size: 124, times: [w('n22', 2).s], out: tC - 0.4 });
    }
    if (sw > 0) {
      const K = lerpKB(ctx, kb({ s: 1.04, cx: 400, cy: 1100 }), kb({ s: 1.1, cx: 400, cy: 1100 }), at(t, tO, sc.end + 0.6)), M = mapper(K);
      X.save(); X.globalAlpha = sw; drawPhoto(ctx, X, 'h7', K); shade(ctx, X); stepper(ctx, X, 6, 1, { steps: STAGES }); X.restore();
      ring(ctx, X, ...M([400, 1270]), 56, t, at(t, w('n23', 1).s, w('n23', 3).e), { color: P.acc });
      pill(ctx, X, ...M([560, 1180]), 'מנתקים לולאות', at(t, w('n23', 1).s, w('n23', 1).s + 0.5), { color: P.acc, size: 36 });
      ring(ctx, X, ...M([190, 1000]), 56, t, at(t, w('n23', 4).s, w('n23', 7).e), { color: P.acc });
      check(ctx, X, 540, 470, 'מוציאים בעדינות', at(t, w('n23', 7).s, w('n23', 7).s + 0.5), { size: 36 });
      check(ctx, X, 540, 550, 'בלי לגרור על העור', at(t, w('n23', 9).s, w('n23', 9).s + 0.5), { ok: false, size: 36 });
      headline(ctx, t, 'בסוף', 540, 330, { size: 112, times: [tO + 0.1] });
    }
    cap(ctx, t);
  },
});
