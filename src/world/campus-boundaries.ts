import * as T from 'three';
import { northBoundaryRuns } from './north-boundary-layout.ts';
import { southBoundaryRuns } from './south-boundary-layout.ts';
import { Builder } from './geometry.ts';
import type { Materials } from './materials.ts';

/** Map-traced railings. The western north-campus public-street boundary still
 * requires reference verification; all dimensions are model approximations. */
export function createCampusBoundaries(mats: Materials) {
  const b = new Builder();
  const stone = new T.MeshStandardMaterial({ name: 'campus-boundary-stone', color: 0xb9c0ba, map: mats.textures.get('stone-grain.webp'), roughness: .94 });
  const cap = new T.MeshStandardMaterial({ name: 'campus-boundary-coping', color: 0xabb3ad, roughness: .9 });
  const iron = new T.MeshStandardMaterial({ name: 'campus-boundary-iron', color: 0x293832, roughness: .65, metalness: .35 });
  const joint = new T.MeshStandardMaterial({ name: 'campus-boundary-stone-joint', color: 0x676d67, roughness: .98 });
  const group = b.finish('campus perimeter boundaries');
  const cameraSolids: T.Object3D[] = [...group.children];
  const proxy = new Builder();
  const boxGeometry = new T.BoxGeometry(1, 1, 1), badgeGeometry = new T.PlaneGeometry(1, 1);
  const badge = new T.MeshStandardMaterial({ name: 'campus-boundary-emblem', map: mats.textures.get('nju-emblem.png'), color: 0x8b9189, alphaTest: .35, roughness: .98 });
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
  const stoneBays: { x: number; z: number; width: number; angle: number }[] = [];
  for (const run of [...southBoundaryRuns, ...northBoundaryRuns]) {
    const baseHeight = 'baseHeight' in run && typeof run.baseHeight === 'number' ? run.baseHeight : .46;
    let bayIndex = 0;
    for (let i = 1; i < run.points.length; i++) {
      const [ax, az] = run.points[i - 1], [bx, bz] = run.points[i];
      const length = Math.hypot(bx - ax, bz - az), angle = Math.atan2(az - bz, bx - ax);
      const put = (u: number, y: number, w: number, h: number, d: number, mat: T.Material, v = 0, face = 0) =>
        add(mat === badge ? badgeGeometry : boxGeometry, mat, ax + u * Math.cos(angle) + v * Math.sin(angle), y, az - u * Math.sin(angle) + v * Math.cos(angle), w, h, d, angle + face);
      put(length / 2, baseHeight / 2, length + .10, baseHeight, .4, stone);
      put(length / 2, baseHeight + .04, length + .12, .08, .48, cap);
      const count = Math.ceil(length / 4.8), width = length / count;
      for (let j = 0; j <= count; j++) {
        // The next segment supplies its starting pillar, keeping joins closed.
        if (j === count && i < run.points.length - 1) continue;
        put(j * width, 1.53, .4, 3.06, .46, stone);
        put(j * width, 3.10, .5, .10, .56, cap);
      }
      for (let j = 0; j < count; j++, bayIndex++, bays++) {
        const u = (j + .5) * width;
        if (bayIndex % 4 === 2 && width > 2) {
          // User photo: an engraved crest on a broad granite panel, never
          // attached to the ironwork. Bay spacing and dimensions approximate.
          const wallWidth = width - .30, centerSlab = Math.min(1.65, wallWidth - .20);
          put(u, 1.53, wallWidth, 3.06, .42, stone);
          put(u, 3.10, width, .10, .56, cap);
          for (const face of [-1, 1]) {
            for (const du of [-centerSlab / 2, centerSlab / 2]) put(u + du, 1.53, .015, 3.06, .008, joint, face * .214);
            for (let y = .40; y < 3; y += .40) {
              // The crest occupies one uninterrupted central stone slab.
              if (y > 1.30 && y < 2.75) {
                const sideWidth = (wallWidth - centerSlab) / 2;
                for (const side of [-1, 1]) put(u + side * (centerSlab + sideWidth) / 2, y, sideWidth, .015, .008, joint, face * .214);
              } else put(u, y, wallWidth, .015, .008, joint, face * .214);
            }
            put(u, 2.02, 1.25 * 52 / 79, 1.25, 1, badge, face * .222, face < 0 ? Math.PI : 0);
          }
          stoneBays.push({ x: ax + u * Math.cos(angle), z: az - u * Math.sin(angle), width: wallWidth, angle });
          emblems++;
        } else {
          for (const y of [baseHeight + .26, 2.65, 2.96]) put(u, y, width, .06, .075, iron);
          const n = Math.ceil(width / .18);
          for (let k = 1; k < n; k++) put(j * width + k * width / n, 1.79 + (baseHeight - .46) / 2, .032, 2.50 - (baseHeight - .46), .032, iron);
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
  cameraSolids.push(...proxy.finish('campus perimeter camera panels', 64).children);
  group.userData = { northRuns: northBoundaryRuns, northComplete: false, southRuns: southBoundaryRuns, panels, height: 3.15, bays, emblems, stoneBays, emblemMount: 'engraved granite panels', instances, renderBatches: batches.size, sharedGeometries: 2, approximate: true };
  return { group, solids: b.solids, cameraSolids };
}
