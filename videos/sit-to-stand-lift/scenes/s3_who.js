// s3 — who the sit-to-stand lift is for (✓) and who it isn't (✕ → full-body lift).
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, checklist, pill } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's3',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    drawPhoto(ctx, X, 'm3', kb({ s: 1.12 + 0.03 * at(t, sc.start, sc.end), cx: 540, cy: 1000 }), { filter: 'blur(16px) brightness(0.3)' });
    const tNo = w('n11', 0).s, out = 1 - at(t, tNo - 0.5, tNo, 'cubicIn');
    if (out > 0) { X.save(); X.globalAlpha = out;
      checklist(ctx, X, t, [['נושא חלק מהמשקל', true, w('n10', 3).s], ['יושב יציב', true, w('n10', 6).s], ['יכול להחזיק בידיות', true, w('n10', 8).s], ['משתף פעולה', true, w('n10', 11).s]], 540, 620, { gap: 112 });
      X.restore(); headline(ctx, t, 'למי מתאים?', 540, 320, { size: 120, t0: sc.start + 0.3, out: tNo - 0.4 }); }
    checklist(ctx, X, t, [['לא נושא משקל בכלל', false, w('n11', 2).s], ['לא שולט בגוף העליון', false, w('n11', 6).s]], 540, 620, { gap: 112 });
    headline(ctx, t, 'למי לא?', 540, 320, { size: 120, times: [tNo + 0.2, tNo + 0.3], colors: [null, P.clay] });
    pill(ctx, X, 540, 900, '← עוברים למנוף הרמה', at(t, w('n11', 11).s, w('n11', 11).s + 0.5), { color: P.hi, size: 50 });
    cap(ctx, t);
  },
});
