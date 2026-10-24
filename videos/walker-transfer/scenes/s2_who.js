// s2 — who this method is for (✓) and who it isn't (✕ → sit-to-stand lift).
import { headline, sub } from '../lib/ui.js';
import { kb, drawPhoto, checklist, pill } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    drawPhoto(ctx, X, 'w4', kb({ s: 1.12, cx: 540, cy: 1000 }), { filter: 'blur(16px) brightness(0.3)' });
    const tNo = w('n4', 0).s, out = 1 - at(t, tNo - 0.5, tNo, 'cubicIn');
    if (out > 0) { X.save(); X.globalAlpha = out;
      checklist(ctx, X, t, [['נושא משקל על שתי הרגליים', true, w('n3', 4).s], ['יושב יציב', true, w('n3', 9).s], ['מבין הוראות', true, w('n3', 11).s], ['יכול לדחוף עם הידיים', true, w('n3', 13).s]], 540, 620, { gap: 112 });
      X.restore(); headline(ctx, t, 'למי מתאים?', 540, 320, { size: 120, t0: sc.start + 0.3, out: tNo - 0.4 }); }
    checklist(ctx, X, t, [['לא נושא משקל', false, w('n4', 4).s], ['מבולבל', false, w('n4', 7).s], ['סחרחורת בקימה', false, w('n4', 10).s]], 540, 620, { gap: 112 });
    headline(ctx, t, 'למי לא?', 540, 320, { size: 120, times: [tNo + 0.2, tNo + 0.3], colors: [null, P.clay] });
    pill(ctx, X, 540, 1060, '← עוברים למנוף העמדה', at(t, w('n4', 14).s, w('n4', 14).s + 0.5), { color: P.hi, size: 50 });
    cap(ctx, t);
  },
});
