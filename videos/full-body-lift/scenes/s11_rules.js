// s11 — safety rules.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, checklist } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's11',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    drawPhoto(ctx, X, 'h5', kb({ s: 1.12 + 0.03 * at(t, sc.start, sc.end), cx: 540, cy: 1000 }), { filter: 'blur(16px) brightness(0.3)' });
    checklist(ctx, X, t, [
      ['לא עוברים את עומס העבודה הבטוח', false, w('n25', 2).s],
      ['רתמה בגודל הנכון, נבדקת לפני כל שימוש', true, w('n25', 8).s],
      ['תמיד שני מטפלים', true, w('n25', 15).s],
      ['נוסעים לאט', true, w('n25', 18).s],
      ['לא משאירים מטופל תלוי לבד', false, w('n25', 20).s],
      ['מכירים את עצירת החירום', true, w('n25', 25).s],
    ], 540, 540, { gap: 96, size: 38, w: 980 });
    headline(ctx, t, 'כללי בטיחות', 540, 330, { size: 116, times: [w('n25', 0).s, w('n25', 1).s] });
    cap(ctx, t);
  },
});
