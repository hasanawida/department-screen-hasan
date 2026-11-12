// s1 — the hook: two moments every caregiver knows. She is at the door with her bag: she has to pick the children up from
// kindergarten (they are parents themselves now). He stands at the door in his coat: he has to go home to his mother, who
// died long ago. We explain → an argument → agitation. "Sound familiar?" — what really happens in the brain, and what to answer.
import { headline } from '../lib/ui.js';
import { kb, drawPhoto, shade } from '../lib/photo.js';
import { cap, polaroid, glow, alarm, calm } from '../lib/dv.js';

/* an old photo card (sepia print with a cream border) */
function card(ctx, X, name, cx, cy, w, rot, k, o = {}) {
  if (k <= 0.01) return; const im = ctx.img(name); if (!im) return;
  const h = w * im.height / im.width, b = 14, s = 0.92 + 0.08 * ctx.E.cubicOut(k);
  X.save(); X.globalAlpha *= Math.min(1, k * 1.4); X.translate(cx, cy + (1 - k) * 30); X.rotate(rot); X.scale(s, s);
  X.shadowColor = 'rgba(0,0,0,0.55)'; X.shadowBlur = 40; X.shadowOffsetY = 14;
  X.fillStyle = '#EFE6D2'; X.fillRect(-w / 2 - b, -h / 2 - b, w + 2 * b, h + 2 * b); X.shadowColor = 'transparent';
  if (o.filter) X.filter = o.filter;
  X.drawImage(im, -w / 2, -h / 2, w, h);
  X.restore();
}
/* a dotted "thought" line from a head to a memory */
function thought(ctx, X, a, b, k) {
  if (k <= 0.01) return;
  X.save(); X.globalAlpha = k * 0.8; X.setLineDash([2, 18]); X.lineCap = 'round'; X.strokeStyle = ctx.P.hi; X.lineWidth = 9;
  X.beginPath(); X.moveTo(a[0], a[1]); X.quadraticCurveTo((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 50, b[0], b[1]); X.stroke(); X.restore();
}
const greyF = g => g > 0 ? `grayscale(${g}) brightness(${1 - 0.35 * g})` : undefined;

MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    const tB = w('h2', 0).s - 0.5, tC = w('h3', 0).s - 0.4, tD = w('h3', 5).s - 0.3, tE = w('h4', 4).s - 0.3, tF = w('h4', 9).s - 0.3;
    const kB = at(t, tB, tB + 0.8), kC = at(t, tC, tC + 0.7), kD = at(t, tD, tD + 0.6), kE = at(t, tE, tE + 0.8), kF = at(t, tF, tF + 0.8);
    // A) her: at the door with her bag — "the children are waiting at kindergarten"
    if (kB < 1) drawPhoto(ctx, X, 'h0', kb({ s: 1.12 + 0.1 * at(t, sc.start, tB + 0.8, 'sineInOut'), cx: 760, cy: 860 }));
    // B) him: at the door in his coat — going home to his mother
    if (kB > 0 && kC < 1) { X.save(); X.globalAlpha = kB; drawPhoto(ctx, X, 'd0', kb({ s: 1.0 + 0.1 * at(t, tB, tC + 0.7, 'sineInOut'), cx: 700, cy: 900 })); X.restore(); }
    // C) the explanation turns into an argument → agitation
    if (kC > 0 && kE < 1) {
      X.save(); X.globalAlpha = kC * (1 - kD); drawPhoto(ctx, X, 'd1', kb({ s: 1.04 + 0.05 * at(t, tC, tD + 0.6), cx: 600, cy: 900 })); X.restore();
      X.save(); X.globalAlpha = kC * kD; drawPhoto(ctx, X, 'd4', kb({ s: 1.06 + 0.06 * at(t, tD, tE + 0.8), cx: 620, cy: 900, dy: 110 })); X.restore();
    }
    // D) "sound familiar?" → what happens in the brain → what to answer
    if (kE > 0 && kF < 1) { X.save(); X.globalAlpha = kE; drawPhoto(ctx, X, 'b1', kb({ s: 1.05 + 0.08 * at(t, tE, tF + 0.8), cx: 680, cy: 1000 })); X.restore(); }
    if (kF > 0) { X.save(); X.globalAlpha = kF; drawPhoto(ctx, X, 'd11', kb({ s: 1.04 + 0.06 * at(t, tF, sc.end), cx: 540, cy: 960 })); X.restore(); }
    const tQ = w('h4', 0).s;
    shade(ctx, X, { dim: at(t, tQ - 0.3, tQ + 0.3) * (1 - kE) });
    // the memories: her children at kindergarten (A), his mother (B) — both fade to grey when the truth is said
    const kK = at(t, w('h1', 5).s - 0.2, w('h1', 5).s + 0.8, 'cubicOut') * (1 - kB), gK = at(t, w('h1', 7).s - 0.1, w('h1', 7).e + 0.6);
    thought(ctx, X, [700, 640], [470, 600], kK);
    glow(ctx, X, 330, 640, 260, '242,163,58', kK * 0.35 * (1 - gK));
    card(ctx, X, 'h1', 330, 640, 250, -0.06 + 0.01 * Math.sin(t * 0.8), kK, { filter: greyF(gK) });
    const kM = at(t, w('h2', 12).s - 0.2, w('h2', 12).s + 0.8, 'cubicOut') * (1 - kC), gM = at(t, w('h2', 15).s - 0.1, w('h2', 15).e + 0.5);
    thought(ctx, X, [690, 560], [590, 545], kM);
    glow(ctx, X, 450, 560, 260, '242,163,58', kM * 0.35 * (1 - gM));
    polaroid(ctx, X, 450, 560, 220, -0.06 + 0.01 * Math.sin(t * 0.8), kM, { filter: greyF(gM) });
    // the alarm in his head, the calm at the end
    alarm(ctx, X, t, 700, 760, at(t, w('h3', 6).s, w('h3', 6).s + 0.5) * (1 - at(t, tQ - 0.3, tQ + 0.3)), { r: 60 });
    glow(ctx, X, 680, 1000, 320, '43,196,178', kE * (1 - kF) * (0.5 + 0.2 * Math.sin(t * 2)));
    calm(ctx, X, t, 540, 860, at(t, w('h4', 14).s, w('h4', 14).s + 0.8), { r: 90 });
    // headlines
    const H = (txt, t0, out, o = {}) => headline(ctx, t, txt, 540, o.y ?? 300, { size: o.size ?? 92, t0, out, color: o.color });
    H('הילדים מחכים לי בגן', w('h1', 0).s, w('h1', 7).s - 0.4, { color: P.hi, size: 84 });
    H('הילדים שלה כבר הורים', w('h1', 7).s, tB, { color: P.mut, size: 84 });
    H('אני חייב ללכת הביתה', w('h2', 7).s, w('h2', 14).s - 0.4, { color: P.hi, size: 84 });
    H('אמא שלו נפטרה מזמן', w('h2', 14).s, tC, { color: P.mut, size: 84 });
    H('מסבירים לו', w('h3', 0).s, w('h3', 3).s - 0.3);
    H('ויכוח', w('h3', 3).s, w('h3', 5).s - 0.3, { color: P.clay, size: 110 });
    H('אי שקט', w('h3', 5).s, tQ - 0.3, { color: P.clay, size: 120 });
    H('מוכר לכם?', tQ, w('h4', 2).s + 0.2, { color: P.hi, size: 130, y: 860 });
    H('מה קורה במוח?', w('h4', 4).s, tF, { color: P.acc, size: 96 });
    H('מה נכון לענות?', w('h4', 9).s, sc.end + 2, { color: P.acc, size: 96 });
    H('להרגיע, לא להחמיר', w('h4', 13).s, sc.end + 2, { size: 72, y: 420 });
    cap(ctx, t);
  },
});
