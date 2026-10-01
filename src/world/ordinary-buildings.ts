import * as T from 'three';
import { Builder } from './geometry.ts';
import type { Materials } from './materials.ts';
import type { CollisionMesh } from './collision-mesh.ts';
import { planShape, type MapFeature } from './campus-map.ts';

export const heroIds = ['88778620', '88778613', '88778615', '88778619'];
export function buildOrdinaryBuildings(features: MapFeature[], mats: Materials) {
  const b = new Builder(), fixedMeshes: CollisionMesh[] = [], cameraSolids: T.Object3D[] = [];
  const cameraMaterial = new T.MeshBasicMaterial({ side: T.DoubleSide });
  const roof = new T.MeshStandardMaterial({ name: 'background-roof', color: 0x626a66, roughness: .94, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const cream = new T.MeshStandardMaterial({ name: 'campus-plaster', color: 0xc5bca9, roughness: .94 });
  const warm = new T.MeshStandardMaterial({ name: 'window-glass-warm', color: 0x35464b, roughness: .3, metalness: .35 });
  const cool = new T.MeshStandardMaterial({ name: 'window-glass-cool', color: 0x4c5b61, roughness: .3, metalness: .35 });
  for (const f of features) {
    if (!f.tags.building || heroIds.includes(f.id) || f.points.length < 3) continue;
    const teaching = f.id === 'teaching-priority', points = f.points;
    const shape = planShape(f), levels = Number(f.tags['building:levels']);
    const height = teaching ? 16.6 : Number.isFinite(levels) && levels > 0 ? Math.min(55, levels * 3.3) : 12;
    const geometry = new T.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 }).rotateX(-Math.PI / 2);
    const uv = geometry.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4);
    const p = geometry.getAttribute('position'), vertices = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) vertices.set([p.getX(i), p.getY(i), p.getZ(i)], i * 3);
    cameraSolids.push(new T.Mesh(geometry.clone(), cameraMaterial));
    fixedMeshes.push({ vertices, indices: Uint32Array.from({ length: p.count }, (_, i) => i) });
    b.add(geometry, f.kind === 'historic' ? mats.brick : cream);
    b.add(new T.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, height + .08, 0), roof);
    for (const ring of [points, ...(f.holes ?? [])]) for (let edge = 0; edge < ring.length; edge++) {
      const [x0, z0] = ring[edge], [x1, z1] = ring[(edge + 1) % ring.length], len = Math.hypot(x1 - x0, z1 - z0);
      if (len < .5) continue;
      const angle = -Math.atan2(z1 - z0, x1 - x0), bays = Math.floor((len - 1.2) / 3.4);
      b.box(len, .32, .24, (x0 + x1) / 2, height + .16, (z0 + z1) / 2, mats.stone, false, angle);
      for (let j = 0; j < bays; j++) for (let y = 2.4; y < height - 1; y += 3.3) {
        const t = (j + 1) / (bays + 1), x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        b.box(1.55, 1.9, .14, x, y, z, j % 4 ? warm : cool, false, angle);
        b.box(1.78, .13, .35, x, y - 1.02, z, mats.stone, false, angle);
        if (teaching) {
          b.box(.075, 1.95, .19, x, y, z, cream, false, angle);
          b.box(1.58, .08, .19, x, y + .28, z, cream, false, angle);
        }
      }
      if (teaching) for (const y of [4.7, 8, 11.3, 14.6]) b.box(len, .18, .4, (x0 + x1) / 2, y, (z0 + z1) / 2, mats.stone, false, angle);
    }
  }
  return { group: b.finish('plan-based campus buildings'), fixedMeshes, cameraSolids };
}
