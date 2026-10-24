// s12 — the fourth way: validation (Naomi Feil). Not arguing, not correcting, not lying — enter his world and answer
// the feeling. Step 1: calm yourself (breathe). Step 2: from the front, at eye level, calm adult tone. Step 3: name the feeling.
import { headline, sub, badge } from '../lib/ui.js';
import { kb, drawPhoto, shade, pill, bubble, checklist } from '../lib/photo.js';
import { cap, calm, step, glow } from '../lib/dv.js';
MOTION.scene({
  id: 's12',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w, lineSpan: ls } = ctx, sc = ctx.scene;
    const t1 = w('l42', 0).s - 0.4, t2 = w('l43', 0).s - 0.4;
    // title card over the calm photo
    const kT = 1 - at(t, t1, t1 + 0.8);
    if (kT > 0) {
      drawPhoto(ctx, X, 'd6', kb({ s: 1.12, cx: 540, cy: 900 })); X.fillStyle = 'rgba(11,22,38,0.78)'; X.fillRect(0, 0, 1080, 1920);
      glow(ctx, X, 540, 520, 420, '46,196,182', 0.35 * at(t, w('l40', 2).s, w('l40', 3).e));
      headline(ctx, t, 'הדרך הרביעית', 540, 330, { size: 64, t0: w('l40', 0).s, out: t1, color: P.mut });
      headline(ctx, t, 'שיטת התיקוף', 540, 500, { size: 128, t0: w('l40', 2).s, out: t1, color: P.acc });
      sub(ctx, t, 'Validation · נעמי פייל', 540, 600, { t0: w('l40', 7).s, out: t1, size: 46, color: P.ink });
      checklist(ctx, X, t, [['לא מתווכחים', false, w('l41', 0).s], ['לא מתקנים', false, w('l41', 2).s], ['לא משקרים', false, w('l41', 4).s],
        ['נכנסים לעולם שלו', true, w('l41', 6).s], ['עונים לרגש', true, w('l41', 9).s]], 540, 780, { w: 760, gap: 104, size: 46 });
    }
    // step 1: centre yourself
    const k1 = at(t, t1, t1 + 0.8) * (1 - at(t, t2, t2 + 0.8));
    if (k1 > 0) {
      X.save(); X.globalAlpha = k1; drawPhoto(ctx, X, 'd6', kb({ s: 1.04 + 0.05 * at(t, t1, t2), cx: 400, cy: 900 })); shade(ctx, X); X.restore();
      calm(ctx, X, t, 262, 860, k1 * at(t, w('l42', 4).s, w('l42', 5).e), { r: 70 });
      pill(ctx, X, 560, 560, 'הרגש שלנו עובר אליו', k1 * at(t, w('l42', 6).s, w('l42', 10).e), { color: P.acc, size: 44 });
    }
    // step 2 + 3: eye level, calm tone; name the feeling
    const k2 = at(t, t2, t2 + 0.8);
    if (k2 > 0) {
      X.save(); X.globalAlpha = k2; drawPhoto(ctx, X, 'd7', kb({ s: 1.05 + 0.08 * at(t, t2, sc.end, 'sineInOut'), cx: 540, cy: 1050 })); shade(ctx, X); X.restore();
      const kE = k2 * at(t, w('l43', 2).s, w('l43', 3).e);
      if (kE > 0) { const M = ([x, y]) => [(x - 540) * (1.05 + 0.08 * at(t, t2, sc.end, 'sineInOut')) + 540, (y - 1050) * (1.05 + 0.08 * at(t, t2, sc.end, 'sineInOut')) + 1050];
        const a = M([330, 1070]), b = M([725, 1000]); X.save(); X.globalAlpha = kE; X.strokeStyle = P.acc; X.lineWidth = 5; X.setLineDash([14, 12]);
        X.beginPath(); X.moveTo(a[0], a[1]); X.lineTo(a[0] + (b[0] - a[0]) * kE, a[1] + (b[1] - a[1]) * kE); X.stroke(); X.restore(); }
      pill(ctx, X, 540, 760, 'בגובה העיניים', k2 * at(t, w('l43', 2).s, w('l43', 3).e) * (1 - at(t, w('l44', 0).s - 0.3, w('l44', 0).s)), { color: P.acc, size: 44 });
      pill(ctx, X, 540, 850, 'טון רגוע, של מבוגר אל מבוגר', k2 * at(t, w('l43', 5).s, w('l43', 10).e) * (1 - at(t, w('l44', 0).s - 0.3, w('l44', 0).s)), { color: P.acc, size: 40 });
      bubble(ctx, X, t, 'c4', 330, 1030, { x: 540, y: 640 });
    }
    step(ctx, t, 1, 'נרגעים בעצמנו', 540, 300, t1 + 0.3, t2);
    step(ctx, t, 2, 'מתקרבים', 540, 300, t2 + 0.3, w('l44', 0).s - 0.3);
    step(ctx, t, 3, 'נותנים שם לרגש', 540, 300, w('l44', 0).s);
    cap(ctx, t);
  },
});
