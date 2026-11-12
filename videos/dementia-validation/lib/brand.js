// lib/brand.js — opening card: glossy 3D Hebrew title in the OTTRIX palette (white face, teal sides) + the purpose statement.
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import FONT from './brand_font.js';
export const BRAND = {
  lines: ['כלים להתמודדות', 'עם דמנציה'],
  statement: ['הסרטון נועד להעלות מודעות', 'ולתת כלים לתקשורת נכונה', 'עם חולי דמנציה', 'ולהתמודדות עם המצב.'],
};
const rtl = s => [...s].reverse().join('');          // three lays glyphs out left→right; Hebrew has no joining, so reversing is enough
/* 3D title text mesh (white face, brand-teal sides), centred on its bounding box */
export function goldText(ctx, str, o = {}) {
  const T = ctx.THREE, font = new Font(FONT);
  const g = new TextGeometry(rtl(str), { font, size: o.size ?? 1, depth: o.depth ?? 0.34, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.035, bevelSegments: 3 });
  g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
  const face = new T.MeshStandardMaterial({ color: 0xF4FBFA, metalness: 0.15, roughness: 0.28, envMapIntensity: 0.9, emissive: 0x0E3B45, emissiveIntensity: 0.05, transparent: true });
  const side = new T.MeshStandardMaterial({ color: 0x2BC4B2, metalness: 0.35, roughness: 0.35, envMapIntensity: 0.8, emissive: 0x0E3B45, emissiveIntensity: 0.1, transparent: true });
  const m = new T.Mesh(g, [face, side]); m.userData.w = b.max.x - b.min.x; m.userData.h = b.max.y - b.min.y;
  return m;
}
