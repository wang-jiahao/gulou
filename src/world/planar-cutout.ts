import { ShapeUtils, Vector2 } from 'three';
import type { MapPolygon } from './campus-map.ts';

type Ring = number[][];
const epsilon = 1e-8;
const area = (ring: Ring) => ring.reduce((sum, a, i) => {
  const b = ring[(i + 1) % ring.length]; return sum + a[0] * b[1] - b[0] * a[1];
}, 0) / 2;
const bounds = (ring: Ring) => [Math.min(...ring.map(p => p[0])), Math.min(...ring.map(p => p[1])), Math.max(...ring.map(p => p[0])), Math.max(...ring.map(p => p[1]))];
const overlaps = (a: number[], b: number[]) => a[0] < b[2] - epsilon && a[2] > b[0] + epsilon && a[1] < b[3] - epsilon && a[3] > b[1] + epsilon;
function clean(ring: Ring) {
  const result = ring.filter((p, i) => {
    const q = ring[(i + 1) % ring.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > epsilon;
  });
  return result.length >= 3 && Math.abs(area(result)) > epsilon ? result : [];
}
function clip(ring: Ring, a: number[], b: number[], sign: number, side: number) {
  const distance = (p: number[]) => {
    const d = sign * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    return Math.abs(d) < epsilon ? 0 : d;
  };
  const output: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length], dp = distance(p), dq = distance(q);
    const pin = side * dp >= 0, qin = side * dq >= 0;
    if (pin) output.push(p);
    if (pin !== qin) {
      const t = dp / (dp - dq); output.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return clean(output);
}

/** Subtract a possibly concave, holed mask from a convex surface fragment.
 * Triangulate the mask once; clipping against the whole concave ring would
 * incorrectly erase its re-entrant corners. Coordinates stay double precision. */
export function createPlanarCutout(polygon: MapPolygon) {
  const rings = [polygon.points, ...(polygon.holes ?? [])].map(r => r.map(([x, z]) => new Vector2(x, z)));
  const indices = ShapeUtils.triangulateShape(rings[0], rings.slice(1)), points = rings.flat();
  const triangles = indices.map(ids => {
    const ring = ids.map(i => [points[i].x, points[i].y]); return { ring, bbox: bounds(ring), sign: Math.sign(area(ring)) };
  });
  const bbox = bounds(polygon.points);
  return {
    intersects(ring: Ring) { return overlaps(bounds(ring), bbox); },
    subtract(ring: Ring): Ring[] {
      if (!overlaps(bounds(ring), bbox)) return [ring];
      let fragments = [ring];
      for (const triangle of triangles) {
        const next: Ring[] = [];
        for (const fragment of fragments) {
          if (!overlaps(bounds(fragment), triangle.bbox)) { next.push(fragment); continue; }
          let inside = fragment;
          const outside: Ring[] = [];
          for (let i = 0; i < 3 && inside.length; i++) {
            const a = triangle.ring[i], b = triangle.ring[(i + 1) % 3];
            const part = clip(inside, a, b, triangle.sign, -1);
            if (part.length) outside.push(part);
            inside = clip(inside, a, b, triangle.sign, 1);
          }
          // No intersection: retain the original triangulation/UVs exactly.
          next.push(...(inside.length ? outside : [fragment]));
        }
        fragments = next;
      }
      return fragments;
    },
  };
}
export type PlanarCutout = ReturnType<typeof createPlanarCutout>;
