// s6 — finger pressure + sideways stretch on the skin render → torn capillaries → blood spreads → hematoma.
import { AN, caption, headline, sub } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, heat, arrow, pill, ring, spotlight, feather } from '../lib/photo.js';

const POOL = [400, 965], TEARS = [[324, 740], [464, 735], [560, 770], [650, 760]];

MOTION.scene({
  id: 's6',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tPress = w('l14', 1).s, tShear = w('l14', 3).s, tL15 = w('l15', 0).s, tTear = w('l15', 3).s, tOut = w('l15', 4).s, tPool = w('l16', 1).s, tHem = w('l16', -1).s;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const K = lerpKB(ctx, kb({ s: 0.8, cx: 540, cy: 960, dy: -40 }), kb({ s: 0.88, cx: 470, cy: 960, dy: -40 }), at(t, sc.start, sc.end, 'sineInOut')), M = mapper(K);
    drawPhoto(ctx, X, 'press', K);
    const lift = at(t, tL15 - 0.3, tL15 + 0.4, 'cubicInOut');
    if (lift > 0) { X.save(); X.globalAlpha = lift; drawPhoto(ctx, X, 'skinY', K); X.restore(); }
    // blood spreads from the pool centre
    const R = 760 * at(t, tTear + 0.1, tPool + 1.4, 'cubicInOut');
    if (R > 1) { const [cx, cy] = M(POOL); X.save(); X.beginPath(); X.arc(cx, cy, R * K.s, 0, 6.283); X.clip(); drawPhoto(ctx, X, 'hem', K); X.restore(); }
    feather(ctx, X, K);
    const dSh = at(t, tShear - 0.2, tShear + 0.4) * (1 - at(t, tL15 - 0.4, tL15 + 0.2));
    spotlight(ctx, X, M([0, 440])[1], M([0, 910])[1], dSh);
    shade(ctx, X);
    // pressure ↓
    const kP = at(t, tPress, tPress + 0.4) * (1 - at(t, tL15 - 0.4, tL15));
    if (kP > 0) { for (const x of [430, 720]) { const a = M([x, 330]), b = M([x, 450]); arrow(ctx, X, [[a[0], a[1] - 14 * Math.sin((t - tPress) * 6)], b], kP, { color: P.clay, width: 12, smooth: false }); } heat(ctx, X, ...M([560, 480]), 150, kP * 0.9); }
    // stretch →
    if (dSh > 0) { arrow(ctx, X, [M([380, 600]), M([840, 600])], dSh, { color: P.clay, width: 12, smooth: false }); pill(ctx, X, ...M([610, 530]), 'מתיחה', dSh, { color: P.clay, size: 42 });
      X.save(); X.strokeStyle = 'rgba(245,194,107,0.7)'; X.lineWidth = 3; X.globalAlpha = dSh; for (let i = 0; i < 5; i++) { const [x, y] = M([300 + i * 90, 700 + (i % 2) * 60]); X.beginPath(); X.moveTo(x - 30, y); X.lineTo(x + 30 + 30 * dSh, y - 8); X.stroke(); } X.restore(); }
    // tears
    TEARS.forEach(([x0, y0], i) => { const [x, y] = M([x0, y0]), k = at(t, tTear + i * 0.12, tTear + i * 0.12 + 0.3, 'expoOut') * (1 - at(t, tTear + 1.3, tTear + 2)); if (k <= 0) return;
      X.save(); X.strokeStyle = P.clay; X.lineWidth = 6; X.lineCap = 'round'; for (let j = 0; j < 6; j++) { const a = j * 1.047 + 0.4; X.beginPath(); X.moveTo(x + Math.cos(a) * 14 * k, y + Math.sin(a) * 14 * k); X.lineTo(x + Math.cos(a) * 36 * k, y + Math.sin(a) * 36 * k); X.stroke(); } X.restore(); });
    const kH = at(t, tHem, tHem + 0.6);
    ring(ctx, X, ...M(POOL), 190, t, kH * 0.9, { color: AN.bruiseLight });
    pill(ctx, X, ...M([400, 1190]), 'המטומה', kH, { color: AN.bruiseLight, size: 50 });
    pill(ctx, X, ...M([600, 470]), 'סימן כחול על העור', at(t, w('l16', 3).s, w('l16', 3).s + 0.5), { color: AN.bruiseLight, size: 38 });
    headline(ctx, t, 'לחץ', 540, 300, { size: 124, times: [tPress], out: tShear - 0.35, colors: [P.clay] });
    sub(ctx, t, 'האצבעות לוחצות על העור', 540, 392, { t0: w('l14', 0).s, size: 50, color: P.ink, out: tShear - 0.35 });
    headline(ctx, t, 'ומתיחה הצידה', 540, 300, { size: 110, times: [tShear, w('l14', -1).s], out: tL15 - 0.3, colors: [P.clay, null] });
    headline(ctx, t, 'כלי הדם נקרעים', 540, 300, { size: 104, times: [tL15, w('l15', 1).s, tTear], out: tPool - 0.6, colors: [null, null, P.clay] });
    sub(ctx, t, 'והדם יוצא אל הרקמה', 540, 392, { t0: tOut, size: 50, color: P.ink, out: tPool - 0.6 });
    headline(ctx, t, 'המטומה', 540, 300, { size: 132, times: [tHem], color: AN.bruiseLight });
    sub(ctx, t, 'דם שהצטבר מתחת לעור', 540, 392, { t0: tPool, size: 52, color: P.ink });
    caption(ctx, t);
  },
});
