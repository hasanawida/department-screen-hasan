// s4 — with age: thinner skin and less fat (same render, side by side), fragile vessels, blood thinners.
import { AN, caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, heat, pill, ring } from '../lib/photo.js';

const OY = 480;                               // half-scale panels sit at y = OY
const half = (x, y, side) => [x * 0.5 + (side === 'R' ? 540 : 0), y * 0.5 + OY];

MOTION.scene({
  id: 's4',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tAge = w('l8', 1).s, tThin = w('l9', 2).s, tFat = w('l9', 4).s, tVes = w('l10', 0).s, tTear = w('l10', 4).s, tMed = w('l11', 0).s;
    const split = at(t, sc.start + 0.2, tAge + 0.6, 'cubicInOut');
    const zin = at(t, tVes - 0.4, tVes + 0.6, 'cubicInOut') * (1 - at(t, tMed - 0.7, tMed - 0.1, 'cubicInOut'));
    const med = at(t, tMed - 0.5, tMed + 0.1, 'cubicInOut');
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    // composition camera (zoom into the old dermis for the vessels)
    const CK = lerpKB(ctx, kb({ s: 1 }), kb({ s: 2.1, cx: 150, cy: 790, dx: 390, dy: 170 }), zin), CM = mapper(CK);
    X.save(); X.translate(CK.cx + CK.dx, CK.cy + CK.dy); X.scale(CK.s, CK.s); X.translate(-CK.cx, -CK.cy);
    // young: full screen → right half
    const sY = ctx.lerp(1, 0.5, split), xY = ctx.lerp(0, 540, split), yY = ctx.lerp(0, OY, split);
    X.drawImage(ctx.img('skinY'), xY, yY, 1080 * sY, 1920 * sY);
    if (split > 0) { X.save(); X.globalAlpha = split; X.drawImage(ctx.img('skinO'), 0, OY, 540, 960); X.restore(); }
    X.restore();
    // soft edges of the half panels
    if (split > 0.01) { for (const [y0, y1, a0, a1] of [[OY - 10, OY + 140, 1, 0], [OY + 820, OY + 970, 0, 1]]) { const g = X.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(11,22,38,${a0 * split})`); g.addColorStop(1, `rgba(11,22,38,${a1 * split})`); X.fillStyle = g; X.fillRect(0, y0, ctx.W, y1 - y0); } }
    if (med > 0) { X.save(); X.globalAlpha = med; drawPhoto(ctx, X, 'pills', kb({ s: 1.05 + 0.05 * at(t, tMed, sc.end), cx: 540, cy: 1500, dy: -330 })); X.restore(); }
    shade(ctx, X);
    const lab = split * (1 - zin) * (1 - med);
    if (lab > 0.01) {
      pill(ctx, X, 810, 640, 'עור צעיר', lab, { color: P.acc, size: 46 });
      pill(ctx, X, 270, 640, 'עור מבוגר', lab, { color: AN.bruiseLight, size: 46 });
      const br = (side, y0, y1, k, col) => { if (k <= 0) return; const x = side === 'R' ? 1046 : 512, a = half(0, y0, side)[1], b = half(0, y1, side)[1]; ctx.drawPath(X, [[x - 16, a], [x, a], [x, b], [x - 16, b]], k, { width: 7, color: col, smooth: false }); };
      const kS = at(t, tThin - 0.1, tThin + 0.6) * (1 - at(t, tFat - 0.3, tFat)) * lab, kF = at(t, tFat, tFat + 0.6) * (1 - at(t, tVes - 0.6, tVes - 0.2)) * lab;
      br('R', 452, 908, kS, P.acc); br('L', 452, 736, kS, P.clay);
      br('R', 910, 1138, kF, P.acc); br('L', 738, 846, kF, P.clay);
    }
    // fragile vessels tearing in the old skin
    if (zin > 0.05) {
      const pts = [[220, 640], [360, 610], [300, 690], [430, 650]].map(([x, y]) => CM(half(x, y, 'L')));
      pts.forEach(([x, y], i) => {
        heat(ctx, X, x, y, 60, zin * (0.4 + 0.3 * Math.sin(t * 8 + i)));
        const k = at(t, tTear + i * 0.15, tTear + i * 0.15 + 0.3, 'expoOut') * (1 - at(t, tTear + 1.4, tTear + 2.2));
        if (k > 0) { X.save(); X.strokeStyle = P.clay; X.lineWidth = 6; X.lineCap = 'round'; for (let j = 0; j < 6; j++) { const a = j * 1.047 + 0.3; X.beginPath(); X.moveTo(x + Math.cos(a) * 16 * k, y + Math.sin(a) * 16 * k); X.lineTo(x + Math.cos(a) * 38 * k, y + Math.sin(a) * 38 * k); X.stroke(); } X.restore(); }
      });
    }
    // blood thinners card
    const kc = at(t, tMed - 0.1, tMed + 0.5, 'expoOut') * (1 - at(t, sc.end - 0.5, sc.end - 0.1));
    if (kc > 0) {
      X.save(); X.globalAlpha = kc; X.translate(0, (1 - kc) * 40);
      X.fillStyle = 'rgba(11,22,38,0.86)'; X.strokeStyle = 'rgba(229,72,77,0.55)'; X.lineWidth = 3; X.beginPath(); X.roundRect(110, 175, 860, 300, 34); X.fill(); X.stroke();
      X.save(); X.translate(842, 258); X.rotate(-0.6); X.fillStyle = P.ink; X.beginPath(); X.roundRect(-58, -26, 58, 52, [26, 0, 0, 26]); X.fill(); X.fillStyle = P.clay; X.beginPath(); X.roundRect(0, -26, 58, 52, [0, 26, 26, 0]); X.fill(); X.restore();
      ctx.text(X, 'תרופות לדילול דם', 740, 278, { family: 'display', weight: 700, size: 60, color: P.ink, dir: 'rtl', align: 'right' });
      const k2 = at(t, w('l11', 3).s, w('l11', 3).s + 0.5, 'expoOut'); X.globalAlpha = kc * k2;
      X.save(); X.translate(842, 400); X.fillStyle = P.clay; X.beginPath(); X.moveTo(0, -40); X.bezierCurveTo(26, -8, 32, 8, 32, 18); X.arc(0, 18, 32, 0, Math.PI); X.bezierCurveTo(-32, 8, -26, -8, 0, -40); X.fill(); X.restore();
      ctx.text(X, 'יותר סיכון לדימום', 740, 420, { family: 'body', weight: 800, size: 54, color: P.clay, dir: 'rtl', align: 'right' });
      X.restore();
    }
    headline(ctx, t, 'עם הגיל', 540, 300, { size: 118, times: [w('l8', 0).s, tAge], out: tThin - 0.45 });
    sub(ctx, t, 'כל השכבות משתנות', 540, 392, { t0: w('l8', 2).s, size: 52, color: P.ink, out: tThin - 0.45 });
    headline(ctx, t, 'העור נעשה דק', 540, 300, { size: 110, t0: tThin - 0.15, out: tFat - 0.4 });
    headline(ctx, t, 'פחות שומן מרפד', 540, 300, { size: 104, t0: tFat - 0.1, out: tVes - 0.4 });
    headline(ctx, t, 'כלי דם שבריריים', 540, 300, { size: 104, t0: tVes - 0.05, out: tMed - 0.4, colors: [null, null, P.clay] });
    sub(ctx, t, 'ונקרעים בקלות', 540, 392, { t0: tTear, size: 52, color: P.ink, out: tMed - 0.4 });
    caption(ctx, t);
  },
});
