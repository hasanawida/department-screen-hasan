// s7 — stage 4: raise a little and stop; check loops, seat, comfort; weight spread over the whole sling;
// split-screen against the manual lift (red spine) vs. the hoist (green spine); skin to check.
import { headline, badge } from '../lib/ui.js';
import { arrow, pill, bubble, ring, spine, heat, heatGood } from '../lib/photo.js';
import { plate, cap, check } from '../lib/steps.js';
const SPW = [[338, 760], [245, 808], [165, 908], [130, 1012], [142, 1118]];
const SPC = [[150, 705], [95, 800], [70, 900], [65, 1000], [72, 1090]];
function half(ctx, X, img, side, fx, fy, s) {
  const cx = side === 'L' ? 270 : 810, ox = side === 'L' ? 0 : 540;
  X.save(); X.beginPath(); X.rect(ox, 0, 540, ctx.H); X.clip();
  X.translate(cx, 1000); X.scale(s, s); X.translate(-fx, -fy); X.drawImage(ctx.img(img), 0, 0, 1080, 1920); X.restore();
  return ([x, y]) => [cx + (x - fx) * s, 1000 + (y - fy) * s];
}
MOTION.scene({
  id: 's7',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const { M } = plate(ctx, X, t, 'h4', 4, { s: 1.04, cx: 560, cy: 1000, dy: -60 }, { s: 1.08, cx: 580, cy: 1000, dy: -60 });
    const tC = w('c3', 0).s, tK = w('n16', 0).s, tW = w('n17', 0).s, tCmp = w('n17', 6).s, tS = w('n18', 0).s;
    // raise a little, stop
    const kUp = at(t, w('n15', 3).s, w('n15', 6).e) * (1 - at(t, tC - 0.4, tC));
    arrow(ctx, X, [M([880, 1330]), M([880, 1200])], kUp, { color: P.acc, width: 10, smooth: false });
    pill(ctx, X, ...M([880, 1100]), 'עוצרים', at(t, w('n15', 7).s, w('n15', 7).s + 0.4) * (1 - at(t, tK + 0.5, tK + 0.9)), { color: P.hi, size: 40 });
    // the checks before going on
    const kOut = 1 - at(t, tW - 0.4, tW);
    check(ctx, X, 560, 460, 'כל הלולאות מחוברות', at(t, w('n16', 2).s, w('n16', 2).s + 0.5) * kOut, { size: 36 });
    check(ctx, X, 560, 540, 'יושב עמוק ברתמה', at(t, w('n16', 6).s, w('n16', 6).s + 0.5) * kOut, { size: 36 });
    check(ctx, X, 560, 620, 'נוח לו', at(t, w('n16', 8).s, w('n16', 8).s + 0.5) * kOut, { size: 36 });
    [[575, 850], [767, 842]].forEach(p => ring(ctx, X, ...M(p), 34, t, at(t, w('n16', 1).s, w('n16', 3).e) * kOut, { color: P.acc, width: 5 }));
    ring(ctx, X, ...M([700, 1240]), 60, t, at(t, w('n16', 5).s, w('n16', 7).e) * kOut, { color: P.acc });
    pill(ctx, X, 560, 700, 'רק אז ממשיכים', at(t, w('n16', 10).s, w('n16', 10).s + 0.5) * kOut, { color: P.hi, size: 40 });
    // weight spread over the whole sling
    const kSp = at(t, tW, w('n17', 5).e) * (1 - at(t, tCmp - 0.3, tCmp));
    [[640, 1000], [700, 1150], [790, 1120], [690, 1250], [600, 1080]].forEach((p, i) => heatGood(ctx, X, ...M(p), 130, ctx.clamp(kSp * 1.4 - i * 0.08)));
    pill(ctx, X, ...M([700, 760]), 'על כל שטח הרתמה', at(t, w('n17', 3).s, w('n17', 3).s + 0.5) * (1 - at(t, tCmp - 0.3, tCmp)), { color: P.acc, size: 38 });
    // skin to check
    const kSk = at(t, tS, tS + 0.4);
    if (kSk > 0) {
      [[[783, 1117], 3, 'ירכיים', [900, 1010]], [[583, 1033], 5, 'מתחת לזרועות', [470, 930]], [[700, 1267], 7, 'עצם הזנב', [840, 1300]]].forEach(([p, i, lab, lp]) => {
        const k = at(t, w('n18', i).s, w('n18', i).s + 0.4); ring(ctx, X, ...M(p), 46, t, k, { color: P.clay }); pill(ctx, X, ...M(lp), lab, k, { color: P.clay, size: 34 }); });
      pill(ctx, X, 540, 470, 'בודקים את העור אחרי כל העברה', at(t, w('n18', 9).s, w('n18', 9).s + 0.5), { color: P.hi, size: 40 });
    }
    // split: manual lift vs. hoist
    const kSplit = at(t, tCmp - 0.3, tCmp + 0.3) * (1 - at(t, tS - 0.5, tS));
    if (kSplit > 0) {
      X.save(); X.globalAlpha *= kSplit;
      X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
      const s = 0.74 + 0.03 * at(t, tCmp, tS);
      const ML = half(ctx, X, 'wrong2', 'L', 380, 1050, s), MR = half(ctx, X, 'h4', 'R', 330, 1050, s);
      const top = X.createLinearGradient(0, 0, 0, 560); top.addColorStop(0, 'rgba(11,22,38,0.95)'); top.addColorStop(1, 'rgba(11,22,38,0)'); X.fillStyle = top; X.fillRect(0, 0, ctx.W, 560);
      const bot = X.createLinearGradient(0, 1250, 0, 1920); bot.addColorStop(0, 'rgba(11,22,38,0)'); bot.addColorStop(1, 'rgba(11,22,38,0.95)'); X.fillStyle = bot; X.fillRect(0, 1250, ctx.W, 670);
      X.fillStyle = P.bg; X.fillRect(537, 0, 6, ctx.H);
      spine(ctx, X, SPW.map(ML), at(t, tCmp, tCmp + 0.9), { load: 1, scale: s }); heat(ctx, X, ...ML([125, 1040]), 110, at(t, tCmp + 0.3, tCmp + 0.9));
      spine(ctx, X, SPC.map(MR), at(t, tCmp, tCmp + 0.9), { load: 0.05, scale: s }); heatGood(ctx, X, ...MR([700, 1150]), 140, at(t, tCmp + 0.3, tCmp + 0.9));
      badge(ctx, X, 270, 560, 46, 'x', at(t, tCmp + 0.1, tCmp + 0.6)); badge(ctx, X, 810, 560, 46, 'v', at(t, tCmp + 0.3, tCmp + 0.8));
      pill(ctx, X, 270, 1180, 'הרמה ידנית', at(t, w('n17', 7).s, w('n17', 7).s + 0.4), { color: P.clay, size: 36 });
      pill(ctx, X, 810, 1180, 'הגב לא נושא עומס', at(t, w('n17', 9).s, w('n17', 9).s + 0.4), { color: P.acc, size: 36 });
      X.restore();
    }
    bubble(ctx, X, t, 'c3', ...M([933, 690]), { y: 450, x: 560 });
    headline(ctx, t, 'ההרמה', 540, 330, { size: 124, times: [w('n15', 2).s], out: tC - 0.4 });
    headline(ctx, t, 'בודקים ורק אז ממשיכים', 540, 330, { size: 84, times: [tK + 0.1], out: tW - 0.4 });
    headline(ctx, t, 'המשקל מתפזר', 540, 330, { size: 104, times: [tW, w('n17', 1).s], colors: [null, P.acc], out: tCmp - 0.4 });
    headline(ctx, t, 'ידנית מול מנוף', 540, 330, { size: 104, times: [tCmp, w('n17', 7).s, w('n17', 7).s], colors: [P.clay, null, P.acc], out: tS - 0.4 });
    headline(ctx, t, 'שימו לב לעור', 540, 330, { size: 104, times: [tS, w('n18', 1).s, w('n18', 2).s], colors: [null, null, P.clay] });
    cap(ctx, t);
  },
});
