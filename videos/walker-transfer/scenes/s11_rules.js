// s11 — safety rules (what we never do).
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, checklist } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's11',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    drawPhoto(ctx, X, 'w0', kb({ s: 1.12, cx: 540, cy: 1000 }), { filter: 'blur(16px) brightness(0.3)' });
    checklist(ctx, X, t, [['לא מושכים מתחת לבית השחי', false, w('n17', 2).s], ['לא קמים בעזרת ההליכון', false, w('n17', 7).s], ['לא עומדים מול המטופל וחוסמים', false, w('n17', 11).s], ['לא מושיבים לפני שהוא מרגיש את הכיסא', false, w('n17', 17).s]], 540, 600, { gap: 118, size: 42 });
    headline(ctx, t, 'כללי בטיחות', 540, 330, { size: 116, times: [w('n17', 0).s, w('n17', 1).s] });
    cap(ctx, t);
  },
});
