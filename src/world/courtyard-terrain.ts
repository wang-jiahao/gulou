import * as T from 'three';
import { Builder } from './geometry.ts';
import { planShape, type MapPolygon } from './campus-map.ts';
import type { Materials } from './materials.ts';

// The walk at 17:10–17:25 shows the entire garden above the auditorium approach.
// Seven 18 cm risers are a visual estimate, not a surveyed elevation. Side and
// rear grades are fitted transitions where the references do not fix a section.
export const terraceHeight = 1.26;
const clamp = (n: number) => T.MathUtils.clamp(n, 0, 1);
export function terrainHeight(x: number, z: number) {
  return terraceHeight * clamp((43 - Math.abs(x)) / 4) * clamp((z + 30) / 8) * clamp((85.85 - z) / 3.85);
}

/** Clip planar triangles at every grade break before lifting them. This keeps
 * long traced road polygons from interpolating straight across the terrace. */
export function terrainSurface(polygon: MapPolygon, offset: number) {
  const source = new T.ShapeGeometry(planShape(polygon));
  const p = source.getAttribute('position'), index = source.getIndex()!;
  const output: number[] = [], uv: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    let polygons = [Array.from({ length: 3 }, (_, j) => [p.getX(index.getX(i + j)), -p.getY(index.getX(i + j))])];
    for (const [axis, value] of [[0,-43],[0,-39],[0,39],[0,43],[1,-30],[1,-22],[1,82],[1,85.85]]) {
      const split: number[][][] = [];
      for (const ring of polygons) {
        if (ring.every(q => q[axis] <= value) || ring.every(q => q[axis] >= value)) { split.push(ring); continue; }
        for (const side of [-1, 1]) {
          const clipped: number[][] = [];
          for (let j = 0; j < ring.length; j++) {
            const a = ring[j], b = ring[(j + 1) % ring.length];
            const ain = side * (a[axis] - value) >= 0, bin = side * (b[axis] - value) >= 0;
            if (ain) clipped.push(a);
            if (ain !== bin) { const t = (value - a[axis]) / (b[axis] - a[axis]); clipped.push([a[0] + t*(b[0]-a[0]), a[1] + t*(b[1]-a[1])]); }
          }
          if (clipped.length >= 3) split.push(clipped);
        }
      }
      polygons = split;
    }
    for (const ring of polygons) for (let j = 1; j < ring.length - 1; j++) for (const [x,z] of [ring[0],ring[j],ring[j+1]]) {
      output.push(x, terrainHeight(x,z) + offset, z); uv.push(x/3.6,-z/3.6);
    }
  }
  source.dispose();
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(output,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.computeVertexNormals(); return g;
}

export function createCourtyardSteps(mats: Materials) {
  const b = new Builder();
  for (let i = 0; i < 7; i++) {
    const top = (i+1)*.18 + .035, z = 85.85 - (i+.5)*.55;
    b.box(6.4,top,.55,0,top/2,z,mats.stone,true);
    // Narrow stone nosing makes each individual tread legible at eye level.
    b.box(6.4,.035,.08,0,top+.008,z+.235,mats.path);
  }
  for (const side of [-1,1]) {
    for (let i=0;i<7;i++) {
      const top=(i+1)*.18+.48,z=85.85-(i+.5)*.55;
      b.box(.42,top,.55,side*3.42,top/2,z,mats.stone,true);
      b.box(.50,.07,.55,side*3.42,top+.035,z,mats.path);
    }
    b.box(.5,.5,2,side*3.42,terraceHeight+.27,81,mats.stone,true);
  }
  return { group:b.finish('North garden south stair and stone cheeks'), solids:b.solids };
}
