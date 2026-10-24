// s10 — safety rules.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, checklist } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
MOTION.scene({
  id: 's10',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    drawPhoto(ctx, X, 'm4', kb({ s: 1.12 + 0.03 * at(t, sc.start, sc.end), cx: 540, cy: 1000 }), { filter: 'blur(16px) brightness(0.3)' });
    checklist(ctx, X, t, [
      ['לא עוברים 160 ק״ג', false, w('n22', 2).s],
      ['רתמה בגודל הנכון, נבדקת לפני כל שימוש', true, w('n22', 8).s],
      ['נוסעים לאט, בלי מכשולים ושיפועים', true, w('n22', 15).s],
      ['לא משאירים מטופל לבד במנוף', false, w('n22', 20).s],
      ['לפי הוראות היצרן ונוהל המחלקה', true, w('n22', 25).s],
    ], 540, 590, { gap: 116, size: 38, w: 980 });
    headline(ctx, t, 'כללי בטיחות', 540, 330, { size: 116, times: [w('n22', 0).s, w('n22', 1).s] });
    cap(ctx, t);
  },
});
