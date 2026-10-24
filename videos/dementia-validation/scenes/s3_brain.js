// s3 — the brain: Alzheimer's starts deep inside, in the hippocampus; new things pass through it to be stored as memory.
import { headline, tag } from '../lib/ui.js';
import { kb, drawPhoto, shade } from '../lib/photo.js';
import { cap, glow } from '../lib/dv.js';
const HIP = [680, 1000];
const CORTEX = [[300, 720], [420, 640], [560, 650], [700, 700], [820, 800], [380, 860], [880, 950], [250, 960]];
MOTION.scene({
  id: 's3',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const kB = at(t, sc.start, sc.start + 1.4, 'cubicInOut');
    if (kB < 1) { drawPhoto(ctx, X, 'b0', kb({ s: 1.35 + 0.3 * kB, cx: 623, cy: 812, dx: (540 - 623), dy: (860 - 812) })); }
    X.save(); X.globalAlpha = kB; drawPhoto(ctx, X, 'b1', kb({ s: 1.02 + 0.06 * at(t, sc.start, sc.end, 'sineInOut'), cx: 540, cy: 960 })); X.restore();
    shade(ctx, X, { topH: 430 });
    const kH = at(t, w('l7', 10).s - 0.2, w('l7', 10).s + 0.6);
    glow(ctx, X, HIP[0], HIP[1], 190, '46,196,182', kH * (0.6 + 0.4 * Math.sin(t * 2.4)) * (1 - 0.5 * at(t, w('l8', 4).s, w('l8', 4).s + 0.5)));
    tag(ctx, X, HIP[0], HIP[1], 360, 1200, 'היפוקמפוס', kH, { size: 50 });
    // new experiences flow in through the hippocampus and settle in the cortex as memories
    const t0 = w('l8', 4).s, t1 = w('l8', 10).e;
    for (let i = 0; i < CORTEX.length; i++) {
      const s = t0 + i * (t1 - t0 - 1.2) / CORTEX.length, u = at(t, s, s + 1.0, 'cubicIn'), v = at(t, s + 1.0, s + 1.9, 'cubicOut');
      if (u <= 0) continue;
      const sx = 540 + (i % 2 ? 1 : -1) * 120, sy = 380;
      let x, y; if (v <= 0) { x = sx + (HIP[0] - sx) * u; y = sy + (HIP[1] - sy) * u; } else { x = HIP[0] + (CORTEX[i][0] - HIP[0]) * v; y = HIP[1] + (CORTEX[i][1] - HIP[1]) * v; }
      glow(ctx, X, x, y, 46, '245,194,107', 1);
      X.fillStyle = P.hi; X.beginPath(); X.arc(x, y, 9, 0, 6.283); X.fill();
      if (v > 0.98) glow(ctx, X, x, y, 30 + 6 * Math.sin(t * 3 + i), '245,194,107', 0.6);
    }
    headline(ctx, t, 'אלצהיימר', 540, 300, { size: 100, t0: w('l7', 2).s, out: w('l8', 0).s - 0.3 });
    headline(ctx, t, 'למידה וזיכרון', 540, 300, { size: 100, times: [w('l8', 2).s, w('l8', 3).s], color: P.hi });
    cap(ctx, t);
  },
});
