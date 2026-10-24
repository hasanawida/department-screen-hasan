// lib/steps.js — shared bits for the walker video: stage names, caption filter, stage photo plate.
import { caption } from './ui.js';
import { kb, lerpKB, mapper, drawPhoto, shade, stepper } from './photo.js';
export const STAGES = ['קצה המיטה', 'רגליים וידיים', 'קימה', 'יציבות', 'צעדים', 'ישיבה'];
export const cap = (ctx, t) => caption(ctx, t, { skip: /^c/ });
/* a stage plate: photo with slow push, shade, stepper; returns the mapper */
export function plate(ctx, X, t, img, stage, A, B, o = {}) {
  const sc = ctx.scene, K = lerpKB(ctx, kb(A), kb(B || A), ctx.at(t, sc.start, sc.end + 0.6, 'sineInOut'));
  drawPhoto(ctx, X, img, K); shade(ctx, X, { dim: o.dim || 0 });
  if (stage) stepper(ctx, X, stage, 1, { steps: STAGES });
  return { K, M: mapper(K) };
}
