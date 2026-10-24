// lib/brand.js — opening card: the Eshkolot logo (official vector parts) + glossy 3D gold Hebrew lettering.
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import FONT from './brand_font.js';
export const BRAND = {
  kicker: 'חטיבת טכנולוגיה',
  title: 'בית אבות אשכולות אורנים',
  lines: ['למידה בדרך שונה ואחרת', 'לזקנה איכותית ובטוחה'],
};
const rtl = s => [...s].reverse().join('');          // three lays glyphs out left→right; Hebrew has no joining, so reversing is enough
/* 3D gold text mesh, centred on its bounding box */
export function goldText(ctx, str, o = {}) {
  const T = ctx.THREE, font = new Font(FONT);
  const g = new TextGeometry(rtl(str), { font, size: o.size ?? 1, depth: o.depth ?? 0.34, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.035, bevelSegments: 3 });
  g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
  const face = new T.MeshStandardMaterial({ color: 0xFFD66B, metalness: 0.9, roughness: 0.18, envMapIntensity: 1.0, emissive: 0x4A3200, emissiveIntensity: 0.1, transparent: true });
  const side = new T.MeshStandardMaterial({ color: 0xC28E2E, metalness: 0.95, roughness: 0.3, envMapIntensity: 0.9, emissive: 0x2A1A00, emissiveIntensity: 0.08, transparent: true });
  const m = new T.Mesh(g, [face, side]); m.userData.w = b.max.x - b.min.x; m.userData.h = b.max.y - b.min.y;
  return m;
}
