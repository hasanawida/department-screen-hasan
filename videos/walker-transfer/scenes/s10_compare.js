// s10 — wrong (red) vs. right (green): no pulling, no lifting, no twisting; weight stays on the patient's legs.
import { headline, badge } from '../lib/ui.js';
import { spine, heat, heatGood, pill } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
const SPW = [[338, 760], [245, 808], [165, 908], [130, 1012], [142, 1118]];
const SPC = [[350, 770], [290, 860], [250, 980], [240, 1080], [250, 1160]];
function half(ctx, X, img, side, fx, fy, s) {
  const cx = side === 'L' ? 270 : 810, ox = side === 'L' ? 0 : 540;
  X.save(); X.beginPath(); X.rect(ox, 0, 540, ctx.H); X.clip();
  X.translate(cx, 1000); X.scale(s, s); X.translate(-fx, -fy); X.drawImage(ctx.img(img), 0, 0, 1080, 1920); X.restore();
  return ([x, y]) => [cx + (x - fx) * s, 1000 + (y - fy) * s];
}
MOTION.scene({
  id: 's10',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const s = 0.78 + 0.03 * at(t, sc.start, sc.end);
    const ML = half(ctx, X, 'wrong2', 'L', 380, 1050, s), MR = half(ctx, X, 'w3', 'R', 520, 1080, s);
    const top = X.createLinearGradient(0, 0, 0, 560); top.addColorStop(0, 'rgba(11,22,38,0.95)'); top.addColorStop(1, 'rgba(11,22,38,0)'); X.fillStyle = top; X.fillRect(0, 0, ctx.W, 560);
    const bot = X.createLinearGradient(0, 1250, 0, 1920); bot.addColorStop(0, 'rgba(11,22,38,0)'); bot.addColorStop(1, 'rgba(11,22,38,0.95)'); X.fillStyle = bot; X.fillRect(0, 1250, ctx.W, 670);
    X.fillStyle = P.bg; X.fillRect(537, 0, 6, ctx.H);
    spine(ctx, X, SPW.map(ML), at(t, sc.start + 0.3, sc.start + 1.2), { load: 1, scale: s });
    heat(ctx, X, ...ML([125, 1040]), 110, at(t, sc.start + 0.6, sc.start + 1.2));
    spine(ctx, X, SPC.map(MR), at(t, sc.start + 0.3, sc.start + 1.2), { load: 0.05, scale: s });
    heatGood(ctx, X, ...MR([690, 1630]), 90, at(t, w('n16', 12).s, w('n16', 15).e));
    badge(ctx, X, 270, 560, 46, 'x', at(t, sc.start + 0.4, sc.start + 0.9)); badge(ctx, X, 810, 560, 46, 'v', at(t, sc.start + 0.6, sc.start + 1.1));
    const chips = [['אין משיכה', 5], ['אין הרמה', 7], ['אין סיבוב', 9]];
    chips.forEach(([txt, i], j) => pill(ctx, X, 810, 1180 + j * 70, txt, at(t, w('n16', i).s, w('n16', i).s + 0.4), { color: P.acc, size: 38 }));
    headline(ctx, t, 'לא נכון מול נכון', 540, 330, { size: 100, times: [w('n16', 0).s, w('n16', 1).s, w('n16', 3).s, w('n16', 3).s], colors: [P.clay, P.clay, null, P.acc] });
    cap(ctx, t);
  },
});
