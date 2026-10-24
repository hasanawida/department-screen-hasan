// s5 — what it means: new information doesn't stick (it dissolves before the hippocampus); old memories often last
// longer (the old photo); so in his world, now is then — mother is really waiting.
import { headline, badge } from '../lib/ui.js';
import { kb, drawPhoto, shade, pill } from '../lib/photo.js';
import { cap, glow, polaroid } from '../lib/dv.js';
const HIP = [690, 1008];
MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tOld = w('l16', 0).s - 0.3, tNow = w('l17', 0).s - 0.2;
    const kBr = 1 - at(t, tNow, tNow + 0.9);
    if (kBr > 0) { X.save(); X.globalAlpha = kBr; drawPhoto(ctx, X, 'b2', kb({ s: 1.06 - 0.03 * at(t, sc.start, tNow), cx: 540, cy: 960, dy: -40 + 40 * at(t, sc.start, sc.start + 1) })); X.restore(); }
    // new information: bright dots fly toward the hippocampus and fade out before they get there
    const t0 = w('l15', 2).s, t1 = w('l15', 11).e;
    for (let i = 0; i < 6; i++) {
      const s = t0 + i * 0.75, u = at(t, s, s + 1.4, 'cubicIn'); if (u <= 0 || t > t1 + 1.5) continue;
      const sx = 300 + i * 90, sy = 420, x = sx + (HIP[0] - sx) * u, y = sy + (HIP[1] - sy) * u, a = 1 - at(u, 0.55, 0.9);
      glow(ctx, X, x, y, 44, '245,194,107', a * kBr); X.globalAlpha = a * kBr; X.fillStyle = P.hi; X.beginPath(); X.arc(x, y, 9, 0, 6.283); X.fill(); X.globalAlpha = 1;
    }
    pill(ctx, X, 540, 470, 'מידע חדש', at(t, t0, t0 + 0.5) * (1 - at(t, tOld - 0.3, tOld)), { color: P.hi, size: 44 });
    badge(ctx, X, HIP[0] + 150, HIP[1] - 150, 46, 'x', at(t, w('l15', 6).s, w('l15', 6).s + 0.5) * (1 - at(t, tOld - 0.3, tOld)));
    pill(ctx, X, 540, 1290, 'לפני דקה — נעלם', at(t, w('l15', 9).s, w('l15', 9).s + 0.5) * (1 - at(t, tOld - 0.3, tOld)), { color: P.mut, size: 40 });
    // old memories: the photo of mother, large and warm
    const kO = at(t, tOld, tOld + 0.9, 'cubicOut');
    if (kO > 0) {
      X.save(); X.fillStyle = `rgba(11,22,38,${0.55 * kO * kBr})`; X.fillRect(0, 0, 1080, 1920); X.restore();
      const kk = kO * (1 - at(t, tNow + 0.2, tNow + 1.2));
      glow(ctx, X, 540, 860, 520, '245,194,107', 0.4 * kk);
      polaroid(ctx, X, 540, 860, 470, -0.03, kk);
    }
    // now = then: him at the door, with mother's kitchen showing through
    const kN = at(t, tNow, tNow + 0.9);
    if (kN > 0) {
      X.save(); X.globalAlpha = kN; drawPhoto(ctx, X, 'd0', kb({ s: 1.12 + 0.05 * at(t, tNow, sc.end), cx: 700, cy: 900 })); shade(ctx, X); X.restore();
      const kg = at(t, w('l17', 6).s, w('l17', 10).e);
      X.save(); X.globalAlpha = 0.85 * kg; polaroid(ctx, X, 560, 420, 250, -0.06, kg); X.restore();
      glow(ctx, X, 560, 420, 240, '245,194,107', 0.3 * kg);
    }
    headline(ctx, t, 'מידע חדש לא נקלט', 540, 300, { size: 88, t0: w('l15', 2).s, out: tOld - 0.3 });
    headline(ctx, t, 'זיכרונות ישנים', 540, 300, { size: 96, t0: w('l16', 0).s, out: tNow - 0.3, color: P.hi });
    sub(ctx, t, 'נשמרים לעיתים קרובות זמן רב יותר', 540, 400, w('l16', 5).s, tNow - 0.3);
    headline(ctx, t, 'בעולם שלו, עכשיו זה אז', 540, 300, { size: 84, t0: w('l17', 1).s, color: P.hi });
    cap(ctx, t);
  },
});
function sub(ctx, t, str, x, y, t0, out) {
  const k = ctx.at(t, t0, t0 + 0.5) * (1 - ctx.at(t, out, out + 0.3)); if (k <= 0) return;
  ctx.text(ctx.X, str, x, y, { family: 'body', weight: 700, size: 46, color: ctx.P.ink, alpha: k * 0.85, dir: 'rtl' });
}
