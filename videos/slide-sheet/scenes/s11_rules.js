// s11 — safety rules.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, checklist } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's11',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    drawPhoto(ctx, X, 's4', kb({ s: 1.12 + 0.03 * at(t, sc.start, sc.end), cx: 540, cy: 1000 }), { filter: 'blur(16px) brightness(0.3)' });
    checklist(ctx, X, t, [
      ['מיטה נעולה ובגובה הנכון', true, w('n21', 2).s],
      ['שני מטפלים', true, w('n21', 6).s],
      ['לא מושכים בידיים או ברגליים', false, w('n21', 8).s],
      ['מגינים על העקבים', true, w('n21', 15).s],
      ['מוציאים את הסדין בסוף', true, w('n21', 18).s],
    ], 540, 560, { gap: 104, size: 40, w: 980 });
    headline(ctx, t, 'כללי בטיחות', 540, 330, { size: 116, times: [w('n21', 0).s, w('n21', 1).s] });
    cap(ctx, t);
  },
});
