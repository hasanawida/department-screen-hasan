// s3 — under the skin (aged skin block): an ordinary sheet → friction, the skin sticks while the body keeps moving →
// the layers slide over each other (shear) → small vessels stretch and tear → hematoma, sometimes a skin tear.
import { headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, feather, arrow, pill } from '../lib/photo.js';
import { cap } from '../lib/steps.js';
const YB = 738;                                  // dermis | fat boundary (photo px) — the shear plane
const CAP = [150, 250, 350, 450, 550, 640];      // capillaries crossing it (photo x)
const SHEET = [[40, 452], [700, 460], [985, 398], [300, 382]];
MOTION.scene({
  id: 's3',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const K = lerpKB(ctx, kb({ s: 0.8, cx: 540, cy: 900, dy: -30 }), kb({ s: 0.84, cx: 540, cy: 900, dy: -30 }), at(t, sc.start, sc.end, 'sineInOut')), M = mapper(K);
    const tF = w('n6', 0).s, tSh = w('n7', 0).s, tTear = w('n8', 3).s, tHem = w('n8', 5).s, tCut = w('n8', 8).s, tOld = w('n8', 11).s;
    const shear = at(t, tSh, w('n7', 2).e, 'cubicInOut'), dx = 64 * shear;
    // two slabs: the skin (top) stays, the deep layers (bottom) move with the body
    const yb = M([0, YB])[1];
    X.save(); X.beginPath(); X.rect(0, yb, ctx.W, ctx.H - yb); X.clip(); drawPhoto(ctx, X, 'skinO', { ...K, dx: K.dx + dx }); X.restore();
    X.save(); X.beginPath(); X.rect(0, 0, ctx.W, yb); X.clip(); drawPhoto(ctx, X, 'skinO', K); X.restore();
    feather(ctx, X, K, 1, 140);
    if (shear > 0) { X.save(); X.globalAlpha = shear * 0.9; X.strokeStyle = P.clay; X.lineWidth = 3; X.setLineDash([10, 8]); X.beginPath(); X.moveTo(M([40, YB])[0], yb); X.lineTo(M([700, YB])[0] + dx, yb); X.stroke(); X.restore(); }
    // capillaries: stretch with the shear, then tear
    const kCap = at(t, tSh - 0.3, tSh + 0.3), snap = at(t, tTear, tTear + 0.35);
    if (kCap > 0) {
      X.save(); X.globalAlpha = kCap; X.lineCap = 'round';
      CAP.forEach((x, i) => {
        const a = M([x, YB - 46]), b = [M([x, YB + 46])[0] + dx, M([x, YB + 46])[1]], st = Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.max(1, M([0, YB + 46])[1] - M([0, YB - 46])[1]);
        X.strokeStyle = st > 1.3 ? '#FF5A5F' : '#D63A3A'; X.lineWidth = 5 / Math.max(1, st * 0.8);
        if (snap < 1) { X.beginPath(); X.moveTo(...a); X.lineTo(...b); X.stroke(); }
        else { const m1 = [a[0] + (b[0] - a[0]) * 0.35, a[1] + (b[1] - a[1]) * 0.35], m2 = [a[0] + (b[0] - a[0]) * 0.65, a[1] + (b[1] - a[1]) * 0.65];
          X.beginPath(); X.moveTo(...a); X.lineTo(...m1); X.moveTo(...m2); X.lineTo(...b); X.stroke();
          const g = at(t, tTear + 0.3, tTear + 1.6); X.fillStyle = '#9E1B2C';
          for (let j = 0; j < 4; j++) { X.beginPath(); X.arc((m1[0] + m2[0]) / 2 + Math.sin(i * 7 + j * 3) * 16 * g, (m1[1] + m2[1]) / 2 + Math.cos(i * 5 + j * 2) * 12 * g, (3 + 4 * g) * (1 - j * 0.15), 0, 6.283); X.fill(); } }
      });
      X.restore();
    }
    // hematoma: blood pools in the dermis, the surface turns purple
    const kH = at(t, tHem, tHem + 1.8, 'cubicOut');
    if (kH > 0) {
      const c = M([420, 650]), s = K.s;
      X.save(); X.globalCompositeOperation = 'multiply'; X.translate(c[0], c[1]); X.scale(250 * s, 105 * s);
      let g = X.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(120,20,40,${0.85 * kH})`); g.addColorStop(0.6, `rgba(150,60,110,${0.5 * kH})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      X.fillStyle = g; X.beginPath(); X.arc(0, 0, 1, 0, 6.283); X.fill(); X.restore();
      const c2 = M([420, 445]);
      X.save(); X.globalCompositeOperation = 'multiply'; X.translate(c2[0], c2[1]); X.scale(230 * s, 34 * s);
      g = X.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(110,60,140,${0.75 * kH})`); g.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = g; X.beginPath(); X.arc(0, 0, 1, 0, 6.283); X.fill(); X.restore();
    }
    // skin tear on the surface edge
    const kT = at(t, tCut, tCut + 0.8);
    if (kT > 0) { const pts = [[290, 466], [330, 474], [360, 462], [400, 478], [440, 466], [480, 476]].map(M); X.save(); X.globalAlpha = kT; X.strokeStyle = '#7A1020'; X.lineWidth = 6; X.lineJoin = 'round';
      ctx.drawPath(X, pts, kT, { width: 6, color: '#7A1020', smooth: false }); X.restore(); pill(ctx, X, ...M([385, 395]), 'קרע בעור', kT, { color: P.clay, size: 34 }); }
    // the ordinary sheet on top: friction, the skin sticks
    const kSheet = at(t, w('n6', 1).s, w('n6', 2).e) * (1 - at(t, tHem - 0.6, tHem));
    if (kSheet > 0) {
      const q = SHEET.map(M); X.save(); X.globalAlpha = 0.86 * kSheet; X.fillStyle = '#EDEFF2'; X.beginPath(); q.forEach((p, i) => i ? X.lineTo(p[0], p[1] - 10) : X.moveTo(p[0], p[1] - 10)); X.closePath(); X.fill(); X.restore();
      const kFr = at(t, w('n6', 4).s, w('n6', 4).s + 0.4);
      if (kFr > 0) { X.save(); X.globalAlpha = kFr * kSheet; X.strokeStyle = P.clay; X.lineWidth = 3;
        for (let x = 70; x < 690; x += 36) { const a = M([x, 460]), f = Math.sin(t * 30 + x) * 4; X.beginPath(); X.moveTo(a[0] - 8, a[1] + f); X.lineTo(a[0], a[1] - 9 - f); X.lineTo(a[0] + 8, a[1] + f); X.stroke(); } X.restore(); }
      const kSt = at(t, w('n6', 6).s, w('n6', 6).s + 0.4);
      [160, 380, 600].forEach(x => { const a = M([x, 456]); X.save(); X.globalAlpha = kSt * kSheet; X.fillStyle = P.hi; X.fillRect(a[0] - 4, a[1] - 22, 8, 40); X.restore(); });
      pill(ctx, X, ...M([380, 380]), 'העור נצמד לסדין', kSt * kSheet * (1 - at(t, tSh - 0.3, tSh)), { color: P.hi, size: 34 });
    }
    const kMove = at(t, w('n6', 8).s, w('n6', 10).e) * (1 - at(t, tHem - 0.6, tHem));
    arrow(ctx, X, [M([280, 1120]), M([760, 1120])], kMove, { color: P.clay, width: 12, smooth: false });
    pill(ctx, X, ...M([700, 1210]), 'הגוף ממשיך לזוז', kMove, { color: P.clay, size: 36 });
    pill(ctx, X, 800, 1180, 'עור מבוגר: דק ושביר', at(t, tOld, tOld + 0.5), { color: P.hi, size: 38 });
    headline(ctx, t, 'מתחת לעור', 540, 330, { size: 116, times: [w('n5', 2).s, w('n5', 3).s], out: tF - 0.4 });
    headline(ctx, t, 'חיכוך', 540, 330, { size: 124, times: [w('n6', 4).s], color: P.hi, out: tSh - 0.4 });
    headline(ctx, t, 'גזירה', 540, 330, { size: 124, times: [w('n7', 7).s], color: P.clay, out: tHem - 0.4 });
    headline(ctx, t, 'המטומה וקרע בעור', 540, 330, { size: 96, times: [tHem, tHem + 0.1, w('n8', 9).s], colors: [P.clay, null, P.clay] });
    sub(ctx, t, 'השכבות מחליקות זו על זו', 540, 420, { t0: w('n7', 2).s, size: 44, color: P.ink, out: tHem - 0.4 });
    cap(ctx, t);
  },
});
