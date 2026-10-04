import * as T from 'three';
import { Builder } from './geometry.ts';
import type { Materials } from './materials.ts';

type Point = readonly [number, number];
type Boundary = { name: string; kind: 'wall' | 'railing'; points: Point[] };

/** Short, visible stretches only: official VR gl-2-01 / gl-2-40 and the 2024
 * campus plan. Setbacks/heights are estimates adjusted to the model's road and
 * building footprints. Unseen extensions and the Guangzhou boundary stay open. */
const boundaries: Boundary[] = [
  { name: 'hankou-north-west', kind: 'wall', points: [[-106.20, 343.85], [-115, 346.7], [-138.7, 347.4]] },
  { name: 'hankou-north-east', kind: 'wall', points: [[-75.90, 343.85], [-67.8, 348], [-43.7, 348.7]] },
  { name: 'hankou-south-west', kind: 'railing', points: [[-161, 383.1], [-139, 382.55]] },
  { name: 'hankou-south-east', kind: 'railing', points: [[-50, 381.2], [-19, 380.425]] },
];

export function createCampusBoundaries(mats: Materials) {
  const b = new Builder();
  const stone = new T.MeshStandardMaterial({ name: 'campus-boundary-stone', color: 0xb9c0ba, map: mats.textures.get('stone-grain.webp'), roughness: .94 });
  const cap = new T.MeshStandardMaterial({ name: 'campus-boundary-coping', color: 0xabb3ad, roughness: .9 });
  const joint = new T.MeshStandardMaterial({ name: 'campus-boundary-joints', color: 0x909b96, roughness: .96 });
  const iron = new T.MeshStandardMaterial({ name: 'campus-boundary-iron', color: 0x293832, roughness: .65, metalness: .35 });
  for (const boundary of boundaries) {
    for (let i = 1; i < boundary.points.length; i++) {
      const [ax, az] = boundary.points[i - 1], [bx, bz] = boundary.points[i];
      const length = Math.hypot(bx - ax, bz - az), angle = Math.atan2(az - bz, bx - ax);
      const box = (u: number, y: number, w: number, h: number, d: number, mat: T.Material, solid = false, v = 0) => {
        b.box(w, h, d, ax + u * Math.cos(angle) + v * Math.sin(angle), y, az - u * Math.sin(angle) + v * Math.cos(angle), mat, solid, angle);
      };
      if (boundary.kind === 'wall') {
        box(length / 2, 1.25, length, 2.5, .38, stone, true);
        box(length / 2, .15, length, .3, .45, cap);
        box(length / 2, 2.54, length + .12, .12, .5, cap);
        // Narrow mortar lines sit outside the wall surface, without coplanar faces.
        for (const side of [-1, 1]) {
          for (const y of [.65, 1.25, 1.85]) box(length / 2, y, length, .014, .008, joint, false, side * .195);
          const bays = Math.ceil(length / 3.8);
          for (let k = 1; k < bays; k++) box(k * length / bays, 1.4, .014, 2.18, .008, joint, false, side * .195);
        }
      } else {
        box(length / 2, .3, length, .6, .38, stone, true);
        box(length / 2, .63, length, .08, .45, cap);
        // One continuous collider per railing panel, rather than one per picket.
        b.solids.push({ x: (ax + bx) / 2, y: 1.43, z: (az + bz) / 2, w: length, h: 1.66, d: .14, angle });
        for (const y of [.82, 2.06]) box(length / 2, y, length, .055, .065, iron);
        const pickets = Math.ceil(length / .18);
        for (let k = 0; k <= pickets; k++) box(k * length / pickets, 1.46, .028, 1.6, .028, iron);
        const bays = Math.ceil(length / 4.4);
        for (let k = 0; k <= bays; k++) {
          box(k * length / bays, 1.18, .43, 2.36, .49, stone, true);
          box(k * length / bays, 2.39, .53, .1, .59, cap);
        }
      }
    }
  }
  const group = b.finish('汉口门局部墙栏 · reference stretches');
  group.userData.boundaries = boundaries;
  return { group, solids: b.solids };
}
