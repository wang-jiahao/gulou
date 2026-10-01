import * as T from 'three';

export type MapPolygon = { points: number[][]; holes?: number[][][] };
export type MapFeature = MapPolygon & { id: string; tags: Record<string, string>; kind?: string };
export type CampusMap = {
  features: MapFeature[]; roads: MapPolygon[]; lawns: MapPolygon[];
  spawn: number[]; priorityRoute: { name: string; point: number[] }[];
  gates: { hankou: number[]; guangzhou: number[] };
};
export const bounds = { minX: -615, maxX: 155, minZ: -275, maxZ: 745 };
export function planShape(polygon: MapPolygon) {
  const shape = new T.Shape(polygon.points.map(([x, z]) => new T.Vector2(x, -z)));
  for (const hole of polygon.holes ?? []) shape.holes.push(new T.Path(hole.map(([x, z]) => new T.Vector2(x, -z))));
  return shape;
}
export function insideRing(x: number, z: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}
export function insidePolygon(x: number, z: number, p: MapPolygon) {
  return insideRing(x, z, p.points) && !(p.holes ?? []).some(h => insideRing(x, z, h));
}
export function geographic(lat: number, lon: number) {
  const x = (lon - 118.775750) * 111320 * Math.cos(32.059064 * Math.PI / 180), z = -(lat - 32.059064) * 111320, a = .143;
  return new T.Vector2(x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a));
}
