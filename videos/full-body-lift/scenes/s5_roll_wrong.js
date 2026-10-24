// s5 — stage 2: rolling (to get the sling in) is a sensitive moment. The wrong ways: pulling by the arm/wrist
// (narrow grip on thin skin → hematoma, skin tear; strong pull → shoulder injury, even a broken arm bone) and turning by
// the leg (the leg twists while the body stays → load on the thigh bone → fracture in thin bone).
import { headline, badge } from '../lib/ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, stepper, arrow, pill, ring, heat, lens } from '../lib/photo.js';
import { plate, cap, STAGES } from '../lib/steps.js';
function crack(ctx, X, a, b, k, o = {}) {           // jagged fracture line from a to b
  if (k <= 0) return; const n = 9, pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n, j = (i % 2 ? 1 : -1) * (i > 0 && i < n ? 14 : 0); pts.push([a[0] + (b[0] - a[0]) * u - (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]) * j, a[1] + (b[1] - a[1]) * u + (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]) * j]); }
  X.save(); X.shadowColor = 'rgba(229,72,77,0.9)'; X.shadowBlur = 16; ctx.drawPath(X, pts, k, { width: o.width || 7, color: '#FF5A5F', smooth: false }); X.restore();
}
MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const tA = w('r2', 0).s, tL = w('r3', 0).s, sA = at(t, tA - 0.4, tA + 0.3, 'cubicInOut'), sL = at(t, tL - 0.4, tL + 0.3, 'cubicInOut');
    // r1 — the roll (both caregivers), a sensitive moment
    if (sA < 1) {
      const { M } = plate(ctx, X, t, 'h2', 2, { s: 1.12, cx: 540, cy: 1000, dy: -200 }, { s: 1.15, cx: 560, cy: 1000, dy: -200 });
      ring(ctx, X, ...M([420, 1050]), 90, t, at(t, w('r1', 11).s, w('r1', 13).e), { color: P.hi });
      pill(ctx, X, 540, 470, 'רגע רגיש', at(t, w('r1', 12).s, w('r1', 12).s + 0.5), { color: P.hi, size: 44 });
      headline(ctx, t, 'גלגול', 540, 330, { size: 124, times: [w('r1', 2).s], out: tA - 0.4 });
    }
    // r2 — pulling by the arm / wrist
    if (sA > 0 && sL < 1) {
      const K = lerpKB(ctx, kb({ s: 1.08, cx: 540, cy: 1000, dy: -120 }), kb({ s: 1.13, cx: 520, cy: 1000, dy: -120 }), at(t, tA, tL, 'sineInOut')), M = mapper(K);
      X.save(); X.globalAlpha = sA; drawPhoto(ctx, X, 'r1', K, { filter: 'saturate(0.85)' }); shade(ctx, X, { dim: 0.1 }); stepper(ctx, X, 2, 1, { steps: STAGES }); X.restore();
      const kP = at(t, w('r2', 2).s, w('r2', 9).e);
      heat(ctx, X, ...M([640, 905]), 120, kP);
      arrow(ctx, X, [M([680, 900]), M([840, 840])], kP, { color: P.clay, width: 10, smooth: false });
      pill(ctx, X, ...M([700, 1010]), 'משיכה ביד', at(t, w('r2', 5).s, w('r2', 5).s + 0.5) * (1 - at(t, w('r2', 24).s - 0.4, w('r2', 24).s)), { color: P.clay, size: 38 });
      const kG = at(t, w('r2', 10).s - 0.2, w('r2', 10).s + 0.4) * (1 - at(t, w('r2', 19).s - 0.4, w('r2', 19).s));
      lens(ctx, X, 'grip', 790, 520, 135, { x: 560, y: 1260, s: 0.5 }, kG, { from: M([640, 905]), color: P.clay });
      const kH = at(t, w('r2', 19).s - 0.2, w('r2', 19).s + 0.4) * (1 - at(t, w('r2', 24).s - 0.4, w('r2', 24).s));
      lens(ctx, X, 'bruises', 790, 520, 135, { x: 440, y: 1030, s: 0.55 }, kH, { from: M([640, 905]), color: P.clay });
      pill(ctx, X, 790, 690, 'המטומה וקרע בעור', at(t, w('r2', 20).s, w('r2', 20).s + 0.5) * (1 - at(t, w('r2', 24).s - 0.4, w('r2', 24).s)), { color: P.clay, size: 34 });
      const kS = at(t, w('r2', 24).s, w('r2', 29).e);
      ring(ctx, X, ...M([380, 995]), 62, t, kS, { color: P.clay }); heat(ctx, X, ...M([380, 995]), 120, kS);
      pill(ctx, X, ...M([380, 880]), 'פגיעה בכתף', at(t, w('r2', 29).s, w('r2', 29).s + 0.5), { color: P.clay, size: 36 });
      crack(ctx, X, M([410, 985]), M([560, 945]), at(t, w('r2', 31).s, w('r2', 34).e), { width: 7 });
      pill(ctx, X, 540, 470, 'שבר בעצם הזרוע', at(t, w('r2', 33).s, w('r2', 33).s + 0.5), { color: P.clay, size: 42 });
      badge(ctx, X, 900, 330, 50, 'x', at(t, tA, tA + 0.6));
    }
    // r3 — turning by the leg
    if (sL > 0) {
      const K = lerpKB(ctx, kb({ s: 1.08, cx: 540, cy: 1000, dy: -120 }), kb({ s: 1.13, cx: 560, cy: 1000, dy: -120 }), at(t, tL, sc.end, 'sineInOut')), M = mapper(K);
      X.save(); X.globalAlpha = sL; drawPhoto(ctx, X, 'r2', K, { filter: 'saturate(0.85)' }); shade(ctx, X, { dim: 0.1 }); stepper(ctx, X, 2, 1, { steps: STAGES }); X.restore();
      const kT = at(t, w('r3', 1).s, w('r3', 4).e + 0.6), c = M([560, 1060]), R = 80, a0 = -2.4, a1 = a0 + 4.2 * kT;
      if (kT > 0) { const pts = []; for (let i = 0; i <= 30; i++) { const a = a0 + (a1 - a0) * i / 30; pts.push([c[0] + R * Math.cos(a), c[1] + R * 0.55 * Math.sin(a)]); } arrow(ctx, X, pts, 1, { color: P.clay, width: 9 }); }
      pill(ctx, X, ...M([700, 920]), 'סיבוב ברגל', at(t, w('r3', 4).s, w('r3', 4).s + 0.5) * (1 - at(t, w('r3', 13).s - 0.3, w('r3', 13).s)), { color: P.clay, size: 38 });
      const kF = at(t, w('r3', 13).s, w('r3', 16).e);
      heat(ctx, X, ...M([500, 1120]), 140, kF);
      pill(ctx, X, ...M([470, 960]), 'עצם הירך', at(t, w('r3', 15).s, w('r3', 15).s + 0.5), { color: P.clay, size: 38 });
      const kX = at(t, w('r3', 17).s - 0.2, w('r3', 17).s + 0.4);
      lens(ctx, X, 'spiral', 300, 540, 150, { x: 560, y: 960, s: 0.42 }, kX, { from: M([500, 1120]), color: P.clay });
      pill(ctx, X, 300, 725, 'שבר בעצם דלילה', at(t, w('r3', 22).s - 0.3, w('r3', 22).s + 0.3), { color: P.clay, size: 34 });
      badge(ctx, X, 900, 330, 50, 'x', at(t, tL, tL + 0.6));
    }
    headline(ctx, t, 'לא נכון', 540, 330, { size: 124, times: [tA + 0.1, w('r2', 1).s], colors: [P.clay, P.clay] });
    cap(ctx, t);
  },
});
