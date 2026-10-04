import * as T from 'three';
import { southBoundaryRuns } from './south-boundary-layout.ts';
import { Builder } from './geometry.ts';
import type { Materials } from './materials.ts';

type Point = readonly [number, number];
type Boundary = { name: string; kind: 'wall'; points: Point[] };

/** Existing north-side masonry is retained pending the next perimeter phase.
 * South perimeter follows the registered map and the user's current railing
 * description; heights, bay spacing and unseen details remain approximate. */
const boundaries: Boundary[] = [
  { name: 'hankou-north-west', kind: 'wall', points: [[-106.20, 343.85], [-115, 346.7], [-138.7, 347.4]] },
  { name: 'hankou-north-east', kind: 'wall', points: [[-75.90, 343.85], [-67.8, 348], [-43.7, 348.7]] },
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
      box(length / 2, 1.25, length, 2.5, .38, stone, true);
      box(length / 2, .15, length, .3, .45, cap);
      box(length / 2, 2.54, length + .12, .12, .5, cap);
      // Narrow mortar lines sit outside the wall surface, without coplanar faces.
      for (const side of [-1, 1]) {
        for (const y of [.65, 1.25, 1.85]) box(length / 2, y, length, .014, .008, joint, false, side * .195);
        const bays = Math.ceil(length / 3.8);
        for (let k = 1; k < bays; k++) box(k * length / bays, 1.4, .014, 2.18, .008, joint, false, side * .195);
      }
    }
  }
  const group = b.finish('campus perimeter boundaries');
  const cameraSolids: T.Object3D[] = [...group.children];
  const proxy = new Builder();
  const boxGeometry = new T.BoxGeometry(1, 1, 1), badgeGeometry = new T.PlaneGeometry(1, 1);
  const badge = new T.MeshStandardMaterial({ name: 'campus-boundary-emblem', map: mats.textures.get('nju-emblem.png'), color: 0xd7c89b, alphaTest: .35, roughness: .6, metalness: .2 });
  // Thousands of bars reuse one unit box. Cells retain frustum culling while
  // simple closed panels handle camera/physics collisions without picket rays.
  const batches = new Map<string, { geometry: T.BufferGeometry; material: T.Material; matrices: T.Matrix4[] }>();
  const transform = new T.Object3D();
  const add = (geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number, w: number, h: number, d: number, angle: number) => {
    const key = `${material.uuid}:${Math.floor(x / 64)}:${Math.floor(z / 64)}`;
    const batch = batches.get(key) ?? { geometry, material, matrices: [] };
    transform.position.set(x, y, z); transform.rotation.set(0, angle, 0); transform.scale.set(w, h, d); transform.updateMatrix();
    batch.matrices.push(transform.matrix.clone()); batches.set(key, batch);
  };
  const panels: { x: number; y: number; z: number; w: number; h: number; d: number; angle: number }[] = [];
  let bays = 0, emblems = 0;
  for (const run of southBoundaryRuns) {
    let bayIndex = 0;
    for (let i = 1; i < run.points.length; i++) {
      const [ax, az] = run.points[i - 1], [bx, bz] = run.points[i];
      const length = Math.hypot(bx - ax, bz - az), angle = Math.atan2(az - bz, bx - ax);
      const put = (u: number, y: number, w: number, h: number, d: number, mat: T.Material, v = 0, face = 0) =>
        add(mat === badge ? badgeGeometry : boxGeometry, mat, ax + u * Math.cos(angle) + v * Math.sin(angle), y, az - u * Math.sin(angle) + v * Math.cos(angle), w, h, d, angle + face);
      put(length / 2, .23, length + .10, .46, .4, stone);
      put(length / 2, .50, length + .12, .08, .48, cap);
      for (const y of [.72, 2.65, 2.96]) put(length / 2, y, length + .06, .06, .075, iron);
      const count = Math.ceil(length / 4.8), width = length / count;
      for (let j = 0; j <= count; j++) {
        // The next segment supplies its starting pillar, keeping joins closed.
        if (j === count && i < run.points.length - 1) continue;
        put(j * width, 1.53, .4, 3.06, .46, stone);
        put(j * width, 3.10, .5, .10, .56, cap);
      }
      for (let j = 0; j < count; j++, bayIndex++, bays++) {
        const n = Math.ceil(width / .18);
        for (let k = 1; k < n; k++) put(j * width + k * width / n, 1.79, .032, 2.50, .032, iron);
        if (bayIndex % 2 === 0) {
          const u = (j + .5) * width;
          put(u, 1.91, .69, .71, .07, iron);
          // Two front faces avoid mirrored lettering on the campus side.
          put(u, 1.91, .61, .61, 1, badge, .041);
          put(u, 1.91, .61, .61, 1, badge, -.041, Math.PI);
          emblems++;
        }
      }
      const panel = { x: (ax + bx) / 2, y: 1.575, z: (az + bz) / 2, w: length + .34, h: 3.15, d: .48, angle };
      panels.push(panel); b.solids.push(panel);
      proxy.box(panel.w, panel.h, panel.d, panel.x, panel.y, panel.z, iron, false, angle);
    }
  }
  let instances = 0;
  for (const [cell, batch] of batches) {
    const mesh = new T.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix)); mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere(); mesh.name = batch.material.name; mesh.userData.spatialCell = cell.split(':').slice(1).join(':');
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); instances += mesh.count;
  }
  cameraSolids.push(...proxy.finish('south perimeter camera panels', 64).children);
  group.userData = { boundaries, southRuns: southBoundaryRuns, panels, height: 3.15, bays, emblems, instances, renderBatches: batches.size, sharedGeometries: 2, approximate: true };
  return { group, solids: b.solids, cameraSolids };
}
