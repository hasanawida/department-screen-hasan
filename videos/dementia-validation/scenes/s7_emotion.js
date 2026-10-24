// s7 — what remains: emotion. The amygdala, the alarm system. The Iowa study: memory of sad film clips faded within
// minutes, the sadness stayed (up to ~30 minutes). Memory erased — the feeling stays.
import { headline, tag } from '../lib/ui.js';
import { kb, drawPhoto, shade, pill } from '../lib/photo.js';
import { cap, glow, alarm } from '../lib/dv.js';
const AMY = [605, 1049];
MOTION.scene({
  id: 's7',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tStudy = w('l24', 0).s - 0.3, tEnd = w('l26', 0).s - 0.2;
    const kBr = 1 - at(t, tStudy, tStudy + 0.7) + at(t, tEnd, tEnd + 0.7);
    const K = kb({ s: 1.05 + 0.08 * at(t, sc.start, tStudy, 'sineInOut'), cx: AMY[0], cy: AMY[1] - 60 });
    const M = ([x, y]) => [(x - K.cx) * K.s + K.cx, (y - K.cy) * K.s + K.cy], A = M(AMY);
    if (kBr > 0) {
      X.save(); X.globalAlpha = Math.min(1, kBr); drawPhoto(ctx, X, 'b2', K);
      const kA = at(t, w('l23', 3).s - 0.2, w('l23', 3).e + 0.3); X.globalAlpha = Math.min(1, kBr) * kA; drawPhoto(ctx, X, 'b4', K); X.restore();
      alarm(ctx, X, t, A[0], A[1], Math.min(1, kBr) * at(t, w('l23', 5).s, w('l23', 5).e + 0.3) * (1 - at(t, tStudy - 0.4, tStudy)), { r: 60 });
      tag(ctx, X, A[0], A[1], 330, 1190, 'אמיגדלה', at(t, w('l23', 3).s, w('l23', 3).e + 0.5) * (1 - at(t, tStudy - 0.4, tStudy)), { color: P.clay, size: 48 });
      pill(ctx, X, 700, 560, 'פחד', at(t, w('l23', 10).s, w('l23', 10).s + 0.4) * (1 - at(t, tStudy - 0.4, tStudy)), { color: P.clay, size: 50 });
      pill(ctx, X, 420, 560, 'כעס', at(t, w('l23', 11).s, w('l23', 11).s + 0.4) * (1 - at(t, tStudy - 0.4, tStudy)), { color: P.clay, size: 50 });
      shade(ctx, X, { topH: 430 });
    }
    // the study: a chart, memory vs sadness over ~30 minutes
    const kS = at(t, tStudy, tStudy + 0.7) * (1 - at(t, tEnd, tEnd + 0.6));
    if (kS > 0) {
      X.save(); X.globalAlpha = kS;
      X.fillStyle = 'rgba(11,22,38,0.92)'; X.fillRect(0, 0, 1080, 1920);
      ctx.text(X, 'אוניברסיטת איווה', 540, 300, { family: 'display', weight: 900, size: 78, color: P.ink, dir: 'rtl' });
      ctx.text(X, 'מטופלים עם אלצהיימר צפו בקטעי סרטים עצובים', 540, 380, { family: 'body', weight: 600, size: 40, color: P.mut, dir: 'rtl' });
      const gx0 = 150, gx1 = 930, gy0 = 1240, gy1 = 560;               // time runs right→left (RTL): 0 at the right
      X.strokeStyle = 'rgba(242,246,250,0.35)'; X.lineWidth = 3; X.beginPath(); X.moveTo(gx1, gy1 - 20); X.lineTo(gx1, gy0); X.lineTo(gx0 - 10, gy0); X.stroke();
      ctx.text(X, 'סוף הסרט', gx1, gy0 + 58, { family: 'body', weight: 700, size: 36, color: P.mut, dir: 'rtl' });
      ctx.text(X, '30 דק׳', gx0 + 10, gy0 + 58, { family: 'body', weight: 700, size: 36, color: P.mut, dir: 'rtl' });
      const X0 = u => gx1 - (gx1 - gx0) * u, Y0 = v => gy0 - (gy0 - gy1) * v;
      const mem = u => 0.06 + 0.9 * Math.exp(-u * 14), sad = u => u < 0.18 ? 1 - 0.45 * u / 0.18 : 0.55 - 0.12 * (u - 0.18) / 0.82;
      const curve = (f, k, col, lab, ly) => {
        if (k <= 0) return; const pts = []; for (let i = 0; i <= 60 * k; i++) { const u = i / 60; pts.push([X0(u), Y0(f(u))]); }
        X.strokeStyle = col; X.lineWidth = 9; X.lineCap = 'round'; X.lineJoin = 'round'; X.beginPath(); pts.forEach((p, i) => i ? X.lineTo(...p) : X.moveTo(...p)); X.stroke();
        const e = pts[pts.length - 1]; X.fillStyle = col; X.beginPath(); X.arc(e[0], e[1], 13, 0, 6.283); X.fill();
        ctx.text(X, lab, e[0] - 20, ly ?? e[1] - 30, { family: 'display', weight: 900, size: 52, color: col, dir: 'rtl', align: 'right', alpha: ctx.at(k, 0.4, 1) });
      };
      curve(mem, at(t, w('l25', 3).s, w('l25', 12).e, 'sineInOut'), P.mut, 'זיכרון', null);
      curve(sad, at(t, w('l25', 13).s, w('l25', 19).e, 'sineInOut'), P.hi, 'עצב', null);
      pill(ctx, X, 540, 470, 'עד חצי שעה', at(t, w('l25', 17).s, w('l25', 19).e), { color: P.hi, size: 46 });
      X.restore();
    }
    if (t > tEnd) { const k = at(t, tEnd, tEnd + 0.7); X.save(); X.fillStyle = `rgba(11,22,38,${0.78 * k})`; X.fillRect(0, 0, 1080, 1920); X.restore(); }
    headline(ctx, t, 'הרגש נשאר', 540, 300, { size: 104, t0: w('l22', 8).s, out: w('l23', 0).s - 0.2, color: P.hi });
    headline(ctx, t, 'מערכת האזעקה', 540, 300, { size: 96, t0: w('l23', 4).s, out: tStudy - 0.3, color: P.clay });
    // memory erased — feeling stays
    headline(ctx, t, 'הזיכרון נמחק.', 540, 640, { size: 96, t0: w('l26', 0).s, color: P.mut });
    headline(ctx, t, 'הרגש נשאר.', 540, 790, { size: 112, t0: w('l26', 2).s, color: P.hi });
    cap(ctx, t);
  },
});
