// s8 — a sharp twist, a hard pull, a knock on the bed rail (real photos) → a fracture (render).
import { caption, headline } from '../lib/ui.js';
import { kb, mapper, drawPhoto, shade, heat, arrow, pill, ring, shake } from '../lib/photo.js';

MOTION.scene({
  id: 's8',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tTw = w('l19', 0).s, tPull = w('l19', 6).s, tHit = w('l19', 9).s, tBreak = w('l20', 2).s;
    const shots = [['cgTwist', tTw - 0.5, kb({ s: 1.1, cx: 600, cy: 800 })], ['cgLift', tPull - 0.25, kb({ s: 1.15, cx: 500, cy: 950 })], ['rail', tHit - 0.25, kb({ s: 1.15, cx: 640, cy: 1000 })], ['spiral', w('l20', 0).s - 0.25, kb({ s: 1.0, cx: 560, cy: 970 })]];
    let cur = 0; for (let i = 0; i < shots.length; i++) if (t >= shots[i][1]) cur = i;
    for (let i = Math.max(0, cur - 1); i <= cur; i++) {
      const [img, t0, K0] = shots[i], a = i === cur ? at(t, t0, t0 + 0.3) : 1;
      const K = { ...K0, s: K0.s + 0.05 * at(t, t0, t0 + 3) };
      const [sx, sy] = img === 'rail' ? shake(ctx, t, w('l19', 10).s, 16, 7) : img === 'spiral' ? shake(ctx, t, tBreak, 22, 6) : [0, 0]; K.dx = sx; K.dy = sy;
      X.save(); X.globalAlpha = i === cur && cur > 0 ? a : 1; drawPhoto(ctx, X, img, K); shade(ctx, X); X.restore();
    }
    const M = mapper(shots[cur][2]);
    if (cur === 0) { const c = M([600, 700]), k = at(t, tTw, tTw + 0.8, 'cubicOut');
      X.save(); X.globalAlpha = k * 0.35; X.strokeStyle = P.clay; X.lineWidth = 10; X.beginPath(); X.ellipse(c[0], c[1], 260, 80, 0, Math.PI * 0.05, Math.PI * 0.95); X.stroke(); X.restore();
      arrow(ctx, X, [[c[0] + 250, c[1] - 30], [c[0], c[1] - 85], [c[0] - 250, c[1] - 30]], k, { color: P.clay, width: 12 }); }
    if (cur === 1) arrow(ctx, X, [M([760, 980]), M([420, 900])], at(t, tPull, tPull + 0.6), { color: P.clay, width: 14, smooth: false });
    if (cur === 2) { const [x, y] = M([640, 1020]), k = at(t, w('l19', 10).s - 0.05, w('l19', 10).s + 0.25, 'expoOut'); if (k > 0) { X.save(); X.strokeStyle = P.clay; X.lineWidth = 8; X.lineCap = 'round'; for (let j = 0; j < 10; j++) { const a = j * 0.628; X.beginPath(); X.moveTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40); X.lineTo(x + Math.cos(a) * (70 + 50 * k), y + Math.sin(a) * (70 + 50 * k)); X.stroke(); } X.restore(); } }
    if (cur === 3) { heat(ctx, X, ...M([560, 970]), 200, at(t, tBreak - 0.1, tBreak + 0.3) * (0.8 + 0.2 * Math.sin(t * 7))); ring(ctx, X, ...M([560, 970]), 170, t, at(t, tBreak, tBreak + 0.5));
      const fl = t >= tBreak ? Math.exp(-9 * (t - tBreak)) : 0; if (fl > 0.01) { X.save(); X.globalAlpha = 0.35 * fl; X.fillStyle = '#FFFFFF'; X.fillRect(0, 0, ctx.W, ctx.H); X.restore(); } }
    headline(ctx, t, 'סיבוב חד', 540, 320, { size: 120, times: [tTw, w('l19', 1).s], out: tPull - 0.35 });
    headline(ctx, t, 'משיכה חזקה', 540, 320, { size: 116, times: [tPull, w('l19', 7).s], out: tHit - 0.4 });
    headline(ctx, t, 'מכה במעקה', 540, 320, { size: 116, times: [tHit, w('l19', 10).s], out: w('l20', 0).s - 0.3 });
    headline(ctx, t, 'שבר', 540, 330, { size: 170, times: [tBreak], color: P.clay });
    caption(ctx, t);
  },
});
