// s5 — an everyday transfer, bed → chair (same people as video 2): hard grip on the arm, pulling by the hand.
import { caption, headline, sub, badge } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, heat, arrow, pill } from '../lib/photo.js';

MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tBed = w('l12', 4).s, tChair = w('l12', 5).s, tGrip = w('l13', 0).s, tPull = w('l13', 4).s;
    const sw1 = at(t, tGrip - 0.6, tGrip - 0.1, 'cubicInOut'), sw2 = at(t, tPull - 0.45, tPull + 0.05, 'cubicInOut');
    if (sw1 < 1) { const K = lerpKB(ctx, kb({ s: 1.0, cx: 540, cy: 1050 }), kb({ s: 1.06, cx: 540, cy: 1050 }), at(t, sc.start, tGrip)), M = mapper(K);
      drawPhoto(ctx, X, 'establish', K); shade(ctx, X);
      arrow(ctx, X, [M([880, 1150]), M([560, 900]), M([150, 1100])], at(t, tBed - 0.1, tChair + 0.6, 'cubicInOut'), { color: P.acc, width: 12 });
      pill(ctx, X, ...M([880, 1330]), 'מיטה', at(t, tBed, tBed + 0.5), { size: 42 }); pill(ctx, X, ...M([140, 1330]), 'כיסא', at(t, tChair, tChair + 0.5), { size: 42 }); }
    if (sw1 > 0 && sw2 < 1) { X.save(); X.globalAlpha = sw1; const K = kb({ s: 1.12 + 0.04 * at(t, tGrip, tPull), cx: 760, cy: 1000 }), M = mapper(K);
      drawPhoto(ctx, X, 'cgGrip', K); shade(ctx, X);
      heat(ctx, X, ...M([872, 990]), 130, at(t, w('l13', 1).s, w('l13', 1).s + 0.5) * (0.75 + 0.25 * Math.sin(t * 6)));
      badge(ctx, X, ...M([960, 820]), 46, 'x', at(t, w('l13', 2).s, w('l13', 2).s + 0.6)); X.restore(); }
    if (sw2 > 0) { X.save(); X.globalAlpha = sw2; const K = kb({ s: 1.08 + 0.04 * at(t, tPull, sc.end), cx: 500, cy: 1000 }), M = mapper(K);
      drawPhoto(ctx, X, 'cgLift', K); shade(ctx, X);
      arrow(ctx, X, [M([760, 980]), M([420, 900])], at(t, tPull, tPull + 0.6), { color: P.clay, width: 14, smooth: false });
      heat(ctx, X, ...M([655, 905]), 120, at(t, tPull, tPull + 0.5));
      badge(ctx, X, ...M([880, 640]), 46, 'x', at(t, w('l13', 7).s, w('l13', 7).s + 0.6)); X.restore(); }
    headline(ctx, t, 'מעבר', 540, 320, { size: 130, t0: sc.start + 0.35, out: tGrip - 0.4 });
    sub(ctx, t, 'מהמיטה לכיסא', 540, 420, { t0: tBed, size: 56, color: P.ink, out: tGrip - 0.4 });
    headline(ctx, t, 'תפיסה חזקה בזרוע', 540, 320, { size: 96, times: [tGrip, w('l13', 1).s, w('l13', 2).s], out: tPull - 0.35, colors: [null, P.clay, null] });
    headline(ctx, t, 'משיכה ביד', 540, 320, { size: 112, times: [tPull, w('l13', -1).s], out: sc.end - 0.35, colors: [P.clay, null] });
    caption(ctx, t);
  },
});
