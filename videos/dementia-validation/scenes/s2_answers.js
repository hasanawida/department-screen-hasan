// s2 — the three common answers, each with the caregiver's line in a bubble: arguing, correcting reality, lying.
// Then all three side by side, each crossed out, and we go inside his head.
import { headline, badge } from '../lib/ui.js';
import { kb, drawPhoto, shade, bubble, pill } from '../lib/photo.js';
import { cap, glow } from '../lib/dv.js';
const ANS = [['c1', 'd1', 'ויכוח', [461, 624], 760], ['c2', 'd2', 'תיקון המציאות', [215, 642], 700], ['c3', 'd3', 'שקר', [270, 642], 700]];
MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w, lineSpan: ls } = ctx, sc = ctx.scene;
    const tTri = w('l5', 0).s - 0.5, tIn = w('l6', 8).s, tHead = w('l6', 11).s - 0.2;
    // opening: the door photo, dimmed, "three answers"
    const k0 = 1 - at(t, ls('c1').s - 0.6, ls('c1').s - 0.1);
    if (k0 > 0) { drawPhoto(ctx, X, 'd0', kb({ s: 1.1, cx: 700, cy: 900 }), { alpha: 1 }); shade(ctx, X, { dim: 0.6 }); }
    // the three answers, one after another
    ANS.forEach(([id, img, label, mouth, by], i) => {
      const s = ls(id), nx = ANS[i + 1] ? ls(ANS[i + 1][0]).s : tTri;
      const k = at(t, s.s - 0.6, s.s - 0.1) * (1 - at(t, nx - 0.6, nx - 0.1));
      if (k <= 0) return;
      X.save(); X.globalAlpha = k; drawPhoto(ctx, X, img, kb({ s: 1.04 + 0.04 * at(t, s.s, nx), cx: 540, cy: 900 })); shade(ctx, X); X.restore();
      X.save(); X.globalAlpha = k; pill(ctx, X, 540, 250, `${i + 1} · ${label}`, at(t, s.s - 0.4, s.s + 0.2), { color: P.clay, size: 52 }); X.restore();
      X.save(); X.globalAlpha = k; bubble(ctx, X, t, id, mouth[0], mouth[1] - 30, { x: 540, y: 470, hold: 0.6 }); X.restore();
    });
    // triptych: argue / correct / lie — all crossed out
    const kT = at(t, tTri, tTri + 0.6) * (1 - at(t, tIn, tIn + 0.7));
    if (kT > 0) {
      X.fillStyle = P.bg; X.globalAlpha = kT; X.fillRect(0, 0, 1080, 1920); X.globalAlpha = 1;
      const words = [w('l5', 0).s, w('l5', 1).s, w('l5', 5).s];
      ANS.forEach(([, img, label], i) => {
        const k = at(t, words[i] - 0.3, words[i] + 0.4, 'expoOut') * kT; if (k <= 0) return;
        const pw = 320, ph = 760, x = 900 - i * 360, y = 420;
        X.save(); X.globalAlpha = k; X.translate(0, (1 - k) * 40);
        X.beginPath(); X.roundRect(x - pw / 2, y, pw, ph, 28); X.save(); X.clip();
        const im = ctx.img(img); X.drawImage(im, (540 - 270) * im.width / 1080, 380 * im.height / 1920, 540 * im.width / 1080, 1280 * im.height / 1920, x - pw / 2, y, pw, ph);
        const kx = at(t, w('l6', 4).s + i * 0.25, w('l6', 7).e);
        if (kx > 0) { X.fillStyle = `rgba(11,22,38,${0.45 * kx})`; X.fillRect(x - pw / 2, y, pw, ph); }
        X.restore();
        X.strokeStyle = 'rgba(242,246,250,0.35)'; X.lineWidth = 3; X.stroke();
        ctx.text(X, label, x, y + ph + 70, { family: 'display', weight: 900, size: 52, color: P.ink, dir: 'rtl' });
        X.restore();
        badge(ctx, X, x, y + ph / 2, 62, 'x', at(t, w('l6', 4).s + i * 0.25, w('l6', 7).e) * kT);
      });
      headline(ctx, t, 'נשמעות הגיוניות', 540, 300, { size: 84, t0: w('l6', 0).s, out: w('l6', 4).s - 0.2 });
      headline(ctx, t, 'אבל עלולות לפגוע', 540, 300, { size: 84, t0: w('l6', 4).s, color: P.clay });
    }
    // inside: back to him, then the head with the brain
    const kIn = at(t, tIn, tIn + 0.7);
    if (kIn > 0) {
      const z = at(t, tIn, sc.end + 0.5, 'cubicIn');
      X.save(); X.globalAlpha = kIn * (1 - at(t, tHead, tHead + 0.8)); drawPhoto(ctx, X, 'd0', kb({ s: 1 + 1.6 * z, cx: 736, cy: 600, dx: (540 - 736) * z, dy: (800 - 600) * z })); shade(ctx, X); X.restore();
      const kH = at(t, tHead, tHead + 0.8);
      if (kH > 0) { const zz = at(t, tHead, sc.end + 0.6, 'sineInOut'); X.save(); X.globalAlpha = kH; drawPhoto(ctx, X, 'b0', kb({ s: 1 + 0.35 * zz, cx: 623, cy: 812, dx: (540 - 623) * zz, dy: (860 - 812) * zz })); X.restore();
        glow(ctx, X, 540 + (623 - 540) * (1 - zz), 860 + (812 - 860) * (1 - zz), 220, '46,196,182', kH * at(t, w('l6', 13).s, w('l6', 13).e)); }
      headline(ctx, t, 'למה?', 540, 300, { size: 110, t0: w('l6', 10).s, out: w('l6', 12).s, color: P.hi });
      headline(ctx, t, 'למוח', 540, 300, { size: 110, t0: w('l6', 13).s, color: P.acc });
    }
    cap(ctx, t);
  },
});
