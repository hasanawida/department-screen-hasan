// s16 — outro: the moment we just saw is a page of the booklet "תפור לפי מידה". The real page 232 arrives on a phone and the
// camera moves in to the line «שואלים על האדם: "ספרי לי על אמא שלך"»; real pages turn (217, 223 — the camera follows the
// sections as they are named — then 238 from the Validation chapter); the real numbers grid of page 10 (184 and 20 lit);
// end card. Every page is a screenshot of the booklet itself (Hebrew, 430 px phone width, 3x): nothing redrawn or retyped.
import { headline, caption } from '../lib/ui.js';
import { mark, glow } from '../lib/dv.js';

const Z = 2.7, CY = 725;             // reading zoom (frame px per page px) and the frame line the reading point sits on
const ZP = 500 / 430;                // phone on screen: 500 px wide
const CARD_X = 16, CARD_W = 398, CARD_TOP = 100;   // page card inside the phone viewport (page px)
// boxes from the capture (page px, relative to the card): [x, y, w, h]
const LINE232 = [30, 404.6, 338, 16.3];             // שואלים על האדם: "ספרי לי על אמא שלך"
const TILE184 = [201, 411, 178, 52], TILE20 = [19, 411, 178, 52];   // page 10: 184 פעילויות · 20 מצבים קשים
const FLIP = 0.7;

/* a page card (3x screenshot) with page point (199, cy) on the frame point (540 + dx, CY); s = extra scale */
function card(ctx, X, name, cy, dx = 0, s = 1, alpha = 1) {
  const im = ctx.img(name); if (!im || alpha <= 0.001) return;
  const z = Z * s, w = im.width / 3 * z, h = im.height / 3 * z;
  X.save(); X.globalAlpha *= alpha; X.drawImage(im, 540 + dx - 199 * z, CY - cy * z, w, h); X.restore();
}
/* the transform of a page box for card() */
const boxOf = (b, cy, dx = 0, s = 1) => { const z = Z * s; return [540 + dx + (b[0] - 199) * z, CY + (b[1] - cy) * z, b[2] * z, b[3] * z]; };

MOTION.scene({
  id: 's16',
  setup(ctx) {
    const r = ctx.seeded(16);
    this.dust = Array.from({ length: 34 }, () => ({ x: r.range(0, 1080), y: r.range(0, 1920), s: r.range(1.2, 3.0), sp: r.range(8, 22), ph: r.range(0, 6.28) }));
  },
  draw(t, lt, ctx) {
    const { X, P, at, wordTime: w } = ctx, sc = ctx.scene, T0 = sc.start;
    const o1 = ctx.timeline.vo.find(v => v.id === 'o1'), o2 = ctx.timeline.vo.find(v => v.id === 'o2'), o4 = ctx.timeline.vo.find(v => v.id === 'o4');
    // beats
    const tZ = o1.start + 0.15, tHi = tZ + 1.2;                    // zoom into page 232, then the marker
    const f1 = o1.end + 0.47;                                      // 232 → 217
    const f2 = w('o2', 6).s - 0.25;                                // 217 → 223 ("מה האדם…": the list starts)
    const f3 = o2.end + 0.1;                                       // 223 → 238 (Validation)
    const f4 = w('o3', 4).s - 0.15;                                // 238 → page 10 (after "ו־184 פעילויות")
    const tE = o4.start - 0.6;                                     // → end card
    const kE = at(t, tE, tE + 0.5, 'cubicInOut');
    // background
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const g = X.createRadialGradient(540, 900, 60, 540, 900, 1100); g.addColorStop(0, 'rgba(43,196,178,0.16)'); g.addColorStop(1, 'rgba(43,196,178,0)'); X.fillStyle = g; X.fillRect(0, 0, ctx.W, ctx.H);
    X.save(); X.globalCompositeOperation = 'lighter';
    for (const [j, p] of this.dust.entries()) { const y = (p.y - (t - T0) * p.sp + 1920) % 1920, a = 0.22 + 0.22 * Math.sin(t * 2 + p.ph); X.fillStyle = (j % 3 ? 'rgba(43,196,178,' : 'rgba(242,163,58,') + a + ')'; X.beginPath(); X.arc(p.x, y, p.s, 0, 6.283); X.fill(); }
    X.restore();

    // ── the pages (until the end card) ──
    if (kE < 1) {
      X.save(); X.globalAlpha = 1 - kE; const sE = 1 - 0.08 * kE; X.translate(540, CY); X.scale(sE, sE); X.translate(-540, -CY);
      const ease = k => ctx.E.cubicInOut(Math.min(1, Math.max(0, k)));
      const fl = t0 => ease((t - t0) / FLIP);                       // flip progress
      const dip = k => 1 - 0.06 * Math.sin(Math.PI * k);            // pages lift a little while turning
      // page 232 on the phone → zoom
      const k1 = fl(f1);
      if (k1 < 1) {
        const kIn = at(t, T0, T0 + 0.8, 'cubicOut'), kz = at(t, tZ, tZ + 1.3, 'cubicInOut');
        const zs = ZP * Math.pow(Z / ZP, kz), ay = ctx.lerp(466, CARD_TOP + 271, kz), fy = ctx.lerp(780, CY, kz) + (1 - kIn) * 140;
        const dx = 1100 * k1, sD = dip(k1);
        X.save(); X.globalAlpha *= kIn; X.translate(540 + dx, fy); X.scale(sD, sD);
        // phone: bezel + the real screen
        const sw = 430 * zs, sh = 932 * zs, sx = -215 * zs, sy = -ay * zs, r = 50 * zs, bz = 12 * zs;
        X.fillStyle = '#0B1A1E'; X.strokeStyle = 'rgba(255,255,255,0.14)'; X.lineWidth = 3;
        X.shadowColor = 'rgba(0,0,0,0.5)'; X.shadowBlur = 50; X.shadowOffsetY = 18;
        X.beginPath(); X.roundRect(sx - bz, sy - bz, sw + 2 * bz, sh + 2 * bz, r + bz); X.fill(); X.shadowColor = 'transparent'; X.stroke();
        X.save(); X.beginPath(); X.roundRect(sx, sy, sw, sh, r); X.clip();
        const im = ctx.img('p232'); if (im) X.drawImage(im, sx, sy, sw, sh);
        // the marker on «ספרי לי על אמא שלך», drawn right → left
        const kh = at(t, tHi, tHi + 0.6, 'cubicOut');
        if (kh > 0) {
          const bx = (CARD_X + LINE232[0] - 5 - 215) * zs, by = (CARD_TOP + LINE232[1] - 3 - ay) * zs, bw = (LINE232[2] + 10) * zs, bh = (LINE232[3] + 6) * zs;
          X.globalCompositeOperation = 'multiply'; X.fillStyle = 'rgba(242,163,58,0.62)';
          X.beginPath(); X.roundRect(bx + bw * (1 - kh), by, bw * kh, bh, 4 * zs); X.fill(); X.globalCompositeOperation = 'source-over';
        }
        X.restore(); X.restore();
      }
      // page 217 ("רוצה הביתה")
      const k2 = fl(f2);
      if (k1 > 0 && k2 < 1) card(ctx, X, 'p217', 281, -1100 * (1 - k1) + 1100 * k2, dip(k1) * dip(k2));
      // page 223 — the camera follows the sections as they are named
      const k3 = fl(f3);
      if (k2 > 0 && k3 < 1) {
        const pan = ctx.lerp(276, 506, at(t, w('o2', 11).s, w('o2', 19).s + 0.4, 'sineInOut'));
        card(ctx, X, 'p223', pan, -1100 * (1 - k2) + 1100 * k3, dip(k2) * dip(k3));
      }
      // page 238 (Validation: "להיכנס לנעליים של האדם")
      const k4 = fl(f4);
      if (k3 > 0 && k4 < 1) card(ctx, X, 'p238', 216, -1100 * (1 - k3) + 1100 * k4, dip(k3) * dip(k4));
      // page 10: the numbers — 184 and 20 lit
      if (k4 > 0) {
        const dx = -1100 * (1 - k4), s = dip(k4); card(ctx, X, 'p10', 490, dx, s);
        const ring = (b, t0) => {
          const k = at(t, t0, t0 + 0.6, 'cubicOut'); if (k <= 0) return;
          const [x, y, bw, bh] = boxOf(b, 490, dx, s), pad = 8 * (1 - k) + 6;
          X.save(); X.globalCompositeOperation = 'multiply'; X.fillStyle = `rgba(242,163,58,${0.28 * k})`; X.beginPath(); X.roundRect(x, y, bw, bh, 26); X.fill(); X.restore();
          X.save(); X.strokeStyle = P.hi; X.lineWidth = 7; X.globalAlpha = k; X.beginPath(); X.roundRect(x - pad, y - pad, bw + 2 * pad, bh + 2 * pad, 30); X.stroke(); X.restore();
        };
        ring(TILE184, f4 + FLIP + 0.1); ring(TILE20, f4 + FLIP + 0.6);
      }
      X.restore();
      // keep the top (watermark) and the bottom (captions) readable over the light pages
      const kp = at(t, T0 + 0.3, T0 + 1.0);
      const top = X.createLinearGradient(0, 0, 0, 240); top.addColorStop(0, `rgba(10,44,52,${0.85 * kp * (1 - kE)})`); top.addColorStop(1, 'rgba(10,44,52,0)'); X.fillStyle = top; X.fillRect(0, 0, 1080, 240);
      const bot = X.createLinearGradient(0, 1150, 0, 1920); bot.addColorStop(0, 'rgba(10,44,52,0)'); bot.addColorStop(0.12, `rgba(10,44,52,${0.94 * kp * (1 - kE)})`); bot.addColorStop(1, `rgba(10,44,52,${0.97 * kp * (1 - kE)})`); X.fillStyle = bot; X.fillRect(0, 1150, 1080, 770);
    }

    // ── end card ──
    if (kE > 0) {
      const logo = ctx.img('ottrix_h');
      if (logo) { const k = at(t, tE + 0.45, tE + 1.1, 'cubicOut'), lw = 560, lh = lw * logo.height / logo.width; X.save(); X.globalAlpha = k; X.translate(540, 500 + (1 - k) * 24); X.drawImage(logo, -lw / 2, -lh / 2, lw, lh); X.restore(); }
      glow(ctx, X, 540, 820, 420, '43,196,178', 0.25 * kE);
      headline(ctx, t, 'תפור לפי מידה', 540, 800, { size: 132, times: [w('o4', 0).s, w('o4', 1).s, w('o4', 2).s], color: P.ink });
      const fade = (t0, d = 0.5) => at(t, t0, t0 + d, 'cubicOut');
      const txt = (s, y, t0, o) => { const k = fade(t0); if (k <= 0) return; X.save(); X.globalAlpha = k; ctx.text(X, s, 540, y + (1 - k) * 16, { dir: 'rtl', align: 'center', ...o }); X.restore(); };
      txt('חוברת הפעלה לצוות ולמשפחה', 905, w('o4', 2).s + 0.1, { family: 'body', weight: 800, size: 52, color: P.acc });
      const kd = fade(w('o4', 2).s + 0.3, 0.6);
      if (kd > 0) { const gd = X.createLinearGradient(340, 0, 740, 0); gd.addColorStop(0, P.hi); gd.addColorStop(1, P.acc); X.fillStyle = gd; X.fillRect(540 - 200 * kd, 968, 400 * kd, 5); }
      txt('חסן עווידה, מרפא בעיסוק וגרונטולוג', 1060, w('o4', 2).s + 0.45, { family: 'body', weight: 700, size: 46, color: P.ink });
      txt('ottrix.app', 1160, w('o4', 2).s + 0.6, { family: 'num', weight: 800, size: 60, color: P.hi });
      const kl = fade(w('o4', 3).s - 0.05, 0.5);
      if (kl > 0) {
        const s = 'הקישור בפרופיל', size = 50; X.save(); X.font = ctx.font('body', 800, size); const tw = X.measureText(s).width; X.restore();
        X.save(); X.globalAlpha = kl; X.translate(540, 1300 + (1 - kl) * 18); X.fillStyle = P.hi;
        X.beginPath(); X.roundRect(-tw / 2 - 40, -size * 0.95, tw + 80, size * 1.6, size * 0.8); X.fill();
        ctx.text(X, s, 0, size * 0.32, { family: 'body', weight: 800, size, color: P.bg, dir: 'rtl', align: 'center' }); X.restore();
      }
    }

    // the last frame of the film, fading into the outro
    const kF = 1 - at(t, T0, T0 + 0.6, 'sineInOut');
    if (kF > 0) { const im = ctx.img('s15last'); if (im) { X.save(); X.globalAlpha = kF; X.drawImage(im, 0, 0, 1080, 1920); X.restore(); } }
    if (kE < 1 && kF < 1) { X.save(); X.globalAlpha = 1 - kE; mark(ctx); X.restore(); }
    caption(ctx, t, { skip: /^(c|o4$)/ });
  },
});
