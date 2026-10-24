// s6 — stage 3: the sling — behind the lower back, under the arms, clipped to the lifting arm; the patient holds the handles.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, ring } from '../lib/photo.js';
import { plate, cap, check } from '../lib/steps.js';
MOTION.scene({
  id: 's6',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    const { M } = plate(ctx, X, t, 'm2', 3, { s: 1.0, cx: 700, cy: 1000 }, { s: 1.08, cx: 760, cy: 1000 });
    const tC = w('c2', 0).s, outA = 1 - at(t, w('c2', 7).s - 0.4, w('c2', 7).s);
    const kBack = at(t, w('n14', 5).s, w('n14', 7).e), kArm = at(t, w('n14', 8).s, w('n14', 9).e), kAtt = at(t, w('n14', 10).s, w('n14', 12).e);
    ring(ctx, X, ...M([975, 1110]), 64, t, kBack * outA, { color: P.acc });
    arrow(ctx, X, [M([990, 1160]), M([960, 1060]), M([900, 1000]), M([820, 968])], kArm * outA, { color: P.acc, width: 10 });
    arrow(ctx, X, [M([820, 968]), M([700, 935]), M([598, 912])], kAtt * outA, { color: P.acc, width: 10 });
    ring(ctx, X, ...M([578, 905]), 44, t, at(t, w('n14', 12).s - 0.2, w('n14', 12).s + 0.3) * outA, { color: P.hi });
    pill(ctx, X, ...M([850, 1235]), 'מאחורי הגב התחתון', kBack > 0 ? at(t, w('n14', 5).s, w('n14', 5).s + 0.5) * outA : 0, { color: P.acc, size: 36 });
    pill(ctx, X, ...M([830, 1080]), 'מתחת לזרועות', at(t, w('n14', 8).s, w('n14', 8).s + 0.5) * outA, { color: P.acc, size: 36 });
    pill(ctx, X, ...M([470, 830]), 'מחברים לזרוע', at(t, w('n14', 10).s, w('n14', 10).s + 0.5) * outA, { color: P.hi, size: 36 });
    const kHold = at(t, w('c2', 7).s, w('c2', 9).e);
    ring(ctx, X, ...M([567, 940]), 56, t, kHold, { color: P.acc });
    check(ctx, X, ...M([440, 1060]), 'אוחז בידיות', at(t, w('c2', 8).s, w('c2', 8).s + 0.5), { size: 36 });
    bubble(ctx, X, t, 'c2', ...M([610, 620]), { y: 440 });
    headline(ctx, t, 'הרתמה', 540, 330, { size: 124, times: [w('n14', 2).s], out: tC - 0.4 });
    cap(ctx, t);
  },
});
