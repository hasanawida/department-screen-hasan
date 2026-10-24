// s2 — break the transfer into four stages (real photo thumbnails).
import { caption, headline, sub } from '../lib/ui.js';
import { kb, drawPhoto } from '../lib/photo.js';

const CARDS = [['grip', 'אחיזה', 560, 1020, 1.25], ['lift', 'הרמה', 420, 980, 1.3], ['twist', 'סיבוב', 600, 830, 1.15], ['drop', 'הורדה', 560, 1150, 1.2]];

MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene;
    drawPhoto(ctx, X, 'establish', kb({ s: 1.12, cx: 540, cy: 1000 }), { filter: 'blur(14px) brightness(0.32)' });
    const t0 = w('l3', 2).s, cw = 440, ch = 420;
    CARDS.forEach(([img, name, fx, fy, s], i) => {
      const k = at(t, t0 + i * 0.32, t0 + i * 0.32 + 0.6, 'expoOut');
      if (k <= 0) return;
      const col = i % 2, row = (i / 2) | 0, cx = col === 0 ? 778 : 302, cy = 700 + row * (ch + 40);
      X.save(); X.globalAlpha = k; X.translate(cx, cy + (1 - k) * 60);
      X.beginPath(); X.roundRect(-cw / 2, -ch / 2, cw, ch, 28); X.save(); X.clip();
      const im = ctx.img(img), sh = s * cw / 1080 * 1.6;   // crop around the action
      X.drawImage(im, 0, 0, 1080, 1920, -fx * sh, -fy * sh + 30, 1080 * sh, 1920 * sh);
      const g = X.createLinearGradient(0, ch / 2 - 140, 0, ch / 2); g.addColorStop(0, 'rgba(11,22,38,0)'); g.addColorStop(1, 'rgba(11,22,38,0.92)');
      X.fillStyle = g; X.fillRect(-cw / 2, ch / 2 - 140, cw, 140);
      X.restore();
      X.strokeStyle = 'rgba(46,196,182,0.7)'; X.lineWidth = 3; X.stroke();
      X.fillStyle = P.acc; X.beginPath(); X.arc(cw / 2 - 52, ch / 2 - 52, 30, 0, 6.283); X.fill();
      ctx.text(X, String(i + 1), cw / 2 - 52, ch / 2 - 40, { family: 'num', weight: 800, size: 36, color: P.bg });
      ctx.text(X, name, cw / 2 - 100, ch / 2 - 38, { family: 'display', weight: 700, size: 52, color: P.ink, dir: 'rtl', align: 'right' });
      X.restore();
    });
    headline(ctx, t, 'נפרק לשלבים', 540, 300, { size: 112, times: [w('l3', 1).s, w('l3', 4).s] });
    sub(ctx, t, 'ונראה מה קורה לשניהם', 540, 392, { t0: w('l3', 5).s, size: 52, color: P.ink });
    caption(ctx, t);
  },
});
