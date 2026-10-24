// s13 — step 4: ask about her (who, what, where, when, how). He tells, remembers, feels heard. A painful feeling that
// gets listened to weakens; one that's ignored grows. Then something pleasant together: tea, a photo, a short walk.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, shade, pill, bubble } from '../lib/photo.js';
import { cap, step, polaroid, glow, pillRow } from '../lib/dv.js';
MOTION.scene({
  id: 's13',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tR = w('l47', 0).s - 0.4, tTea = w('l48', 0).s - 0.4;
    const kR = at(t, tR, tR + 0.7) * (1 - at(t, tTea, tTea + 0.7)), kTea = at(t, tTea, tTea + 0.8);
    drawPhoto(ctx, X, 'd8', kb({ s: 1.04 + 0.08 * at(t, sc.start, tR, 'sineInOut'), cx: 600, cy: 1050 })); shade(ctx, X, { dim: 0.9 * kR });
    if (kTea > 0) { X.save(); X.globalAlpha = kTea; drawPhoto(ctx, X, 'd9', kb({ s: 1.05 + 0.05 * at(t, tTea, sc.end), cx: 540, cy: 1100 })); shade(ctx, X); X.restore(); }
    // who / what / where / when / how
    const qs = pillRow(ctx, t, [['מי', w('l45', 4).s], ['מה', w('l45', 5).s], ['איפה', w('l45', 6).s], ['מתי', w('l45', 7).s], ['איך', w('l45', 8).s]], 0, { size: 50, out: w('c5', 0).s - 0.4 });
    qs.forEach(([x, txt, k]) => pill(ctx, X, x, 560, txt, k, { color: P.acc, size: 50 }));
    bubble(ctx, X, t, 'c5', 360, 920, { x: 540, y: 600 });
    // he tells, remembers — the old kitchen floats up
    const kM = at(t, w('l46', 0).s, w('l46', 2).e) * (1 - at(t, tR - 0.3, tR + 0.4));
    glow(ctx, X, 760, 560, 300, '245,194,107', 0.4 * kM); polaroid(ctx, X, 760, 560, 250, 0.05, kM);
    pill(ctx, X, 330, 600, 'מקשיבים לו', at(t, w('l46', 4).s, w('l46', 5).e) * (1 - at(t, tR - 0.3, tR + 0.4)), { color: P.acc, size: 44 });
    // heard → weaker, ignored → stronger
    if (kR > 0) {
      X.save(); X.globalAlpha = kR;
      const row = (y, txt, col, up, t0) => { const k = at(t, t0, t0 + 0.6, 'expoOut'); if (k <= 0) return;
        X.save(); X.globalAlpha *= k; X.fillStyle = 'rgba(11,22,38,0.85)'; X.strokeStyle = col; X.lineWidth = 3; X.beginPath(); X.roundRect(110, y - 90, 860, 180, 30); X.fill(); X.stroke();
        ctx.text(X, txt, 900, y + 18, { family: 'display', weight: 900, size: 52, color: P.ink, dir: 'rtl', align: 'right' });
        const ax = 200, h = 60 * ctx.E.cubicOut(k); X.strokeStyle = col; X.fillStyle = col; X.lineWidth = 12; X.lineCap = 'round';
        X.beginPath(); X.moveTo(ax, y + (up ? h : -h)); X.lineTo(ax, y - (up ? h : -h)); X.stroke();
        X.beginPath(); const tip = y - (up ? h : -h) - (up ? 16 : -16); X.moveTo(ax - 28, y - (up ? h : -h)); X.lineTo(ax + 28, y - (up ? h : -h)); X.lineTo(ax, tip); X.closePath(); X.fill(); X.restore(); };
      row(700, 'רגש שמקבל הקשבה — נחלש', P.acc, false, w('l47', 0).s);
      row(940, 'רגש שמתעלמים ממנו — מתחזק', P.clay, true, w('l47', 5).s);
      X.restore();
    }
    const opts = pillRow(ctx, t, [['כוס תה', w('l48', 7).s], ['תמונה', w('l48', 9).s], ['הליכה קצרה', w('l48', 10).s]], 0, { size: 46 });
    opts.forEach(([x, txt, k]) => pill(ctx, X, x, 560, txt, k * kTea, { color: P.hi, size: 46 }));
    step(ctx, t, 4, 'שואלים עליה', 540, 300, sc.start + 0.3, tR - 0.3);
    headline(ctx, t, 'הקשבה מרגיעה', 540, 300, { size: 96, t0: w('l47', 0).s, out: tTea - 0.2, color: P.acc });
    headline(ctx, t, 'ואז — משהו נעים ביחד', 540, 300, { size: 84, t0: w('l48', 2).s, color: P.hi });
    cap(ctx, t);
  },
});
