import * as T from 'three';
import { Builder } from './geometry.ts';
import { insidePolygon, type CampusMap, type MapPolygon } from './campus-map.ts';
import type { Materials } from './materials.ts';

type Edge = { x: number; z: number; nx: number; nz: number; length: number; angle: number };

/** Low kerbs and yellow margins seen in official VR gl-1-06 / gl-1-17.
 * Fit them to existing road/lawn boundaries; widths and heights are estimates.
 * Do not turn schematic white gaps into invented metre-wide pavements. */
export function createSouthRoadDetails(map: CampusMap, mats: Materials) {
  const b = new Builder(), edges: Edge[] = [];
  const bounded = (polygons: MapPolygon[]) => polygons.map(p => ({
    p, minX: Math.min(...p.points.map(q => q[0])), maxX: Math.max(...p.points.map(q => q[0])),
    minZ: Math.min(...p.points.map(q => q[1])), maxZ: Math.max(...p.points.map(q => q[1])),
  }));
  const roadBounds = bounded(map.roads), lawnBounds = bounded(map.lawns);
  const buildingBounds = bounded(map.features.filter(f => f.tags.building));
  const within = (x: number, z: number, list: ReturnType<typeof bounded>) => list.some(a =>
    x >= a.minX && x <= a.maxX && z >= a.minZ && z <= a.maxZ && insidePolygon(x, z, a.p));
  const onRoad = (x: number, z: number) => within(x, z, roadBounds);
  const marking = new T.MeshStandardMaterial({name:'nanyuan-edge-paint',color:0xcdb15b,roughness:.94,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});

  for (const road of map.roads) for (const ring of [road.points, ...(road.holes ?? [])]) {
    for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 1.5) continue;
      const pieces = Math.ceil(length / 2), span = length / pieces;
      for (let piece = 0; piece < pieces; piece++) {
        const t = (piece + .5) / pieces, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        if (x < -115 || x > 95 || z < 400 || z > 675) continue;
        let nx = -(bz - az) / length, nz = (bx - ax) / length;
        if (!onRoad(x + nx * .3, z + nz * .3)) { nx = -nx; nz = -nz; }
        // Check both ends as well as the centre. Internal seams and junctions
        // have road on both sides and must remain completely open.
        const clear = [-.43, 0, .43].every(offset => {
          const px = x + (bx - ax) / length * span * offset, pz = z + (bz - az) / length * span * offset;
          return onRoad(px + nx * .3, pz + nz * .3) && !onRoad(px - nx * .3, pz - nz * .3)
            && [.6, 1, 1.5, 2].some(d => within(px - nx * d, pz - nz * d, lawnBounds))
            && !within(px - nx * .2, pz - nz * .2, buildingBounds);
        });
        if (!clear) continue;
        const angle = Math.atan2(bx - ax, bz - az);
        b.box(.18, .14, span + .006, x - nx * .095, .07, z - nz * .095, mats.stone, true, angle);
        b.box(.10, .004, span - .02, x + nx * .30, .040, z + nz * .30, marking, false, angle);
        edges.push({x, z, nx, nz, length:span, angle});
      }
    }
  }
  const group = b.finish('Nanyuan road kerbs and edge markings', 100);
  group.userData.edges = edges;
  group.userData.source = 'official VR gl-1-06 / gl-1-17; plan-fitted approximate road/lawn margins';
  for (const mesh of group.children) mesh.castShadow = false;
  return {group, solids:b.solids, edges};
}
