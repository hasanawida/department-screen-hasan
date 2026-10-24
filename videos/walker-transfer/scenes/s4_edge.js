// s4 — stage 1: move to the edge of the bed, one side at a time.
import { headline } from '../lib/ui.js';
import { arrow, pill, bubble, heat } from '../lib/photo.js';
import { plate, cap } from '../lib/steps.js';
MOTION.scene({
  id: 's4',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx;
    const { M } = plate(ctx, X, t, 'w1', 1, { s: 1.0, cx: 620, cy: 1150 }, { s: 1.08, cx: 760, cy: 1150 });
    const tc = w('c1', 0).s;
    arrow(ctx, X, [M([930, 1240]), M([760, 1240])], at(t, w('c1', 2).s, w('c1', 4).e), { color: P.acc, width: 12, smooth: false });
    arrow(ctx, X, [M([930, 1310]), M([780, 1310])], at(t, w('c1', 5).s, w('c1', -1).e), { color: P.acc, width: 12, smooth: false });
    pill(ctx, X, ...M([850, 1420]), 'צד אחרי צד', at(t, w('c1', 5).s, w('c1', 5).s + 0.5), { color: P.acc, size: 42 });
    bubble(ctx, X, t, 'c1', ...M([420, 700]), { y: 560 });
    headline(ctx, t, 'לקצה המיטה', 540, 330, { size: 112, times: [w('n7', 2).s, w('n7', 3).s], out: tc - 0.4 });
    cap(ctx, t);
  },
});
