import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Solid = { x: number; y: number; z: number; w: number; h: number; d: number; angle?: number };
export const rng = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/** All decorative architecture is merged by material; collision has separate simple solids. */
export class Builder {
  private buckets = new Map<T.Material, T.BufferGeometry[]>();
  solids: Solid[] = [];
  add(g: T.BufferGeometry, mat: T.Material, x = 0, y = 0, z = 0, rotation = new T.Euler()) {
    g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(rotation), new T.Vector3(1, 1, 1)));
    if (!g.getAttribute('uv')) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    const a = this.buckets.get(mat) ?? []; a.push(g); this.buckets.set(mat, a);
  }
  box(w: number, h: number, d: number, x: number, y: number, z: number, mat: T.Material, solid = false, angle = 0, textureScale = 2) {
    const g = new T.BoxGeometry(w, h, d), uv = g.getAttribute('uv');
    for (let face = 0; face < 6; face++) {
      const u = (face < 2 ? d : w) / textureScale, v = (face === 2 || face === 3 ? d : h) / textureScale;
      for (let j = 0; j < 4; j++) { const i = face * 4 + j; uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v); }
    }
    this.add(g, mat, x, y, z, new T.Euler(0, angle, 0));
    if (solid) this.solids.push({ x, y, z, w, h, d, angle });
  }
  line(points: T.Vector3[], radius: number, mat: T.Material, sides = 5) {
    this.add(new T.TubeGeometry(new T.CatmullRomCurve3(points), Math.max(3, points.length * 3), radius, sides, false), mat);
  }
  cylinder(a: T.Vector3, b: T.Vector3, r1: number, r2: number, mat: T.Material, sides = 8) {
    const delta = b.clone().sub(a), center = a.clone().add(b).multiplyScalar(0.5);
    const g = new T.CylinderGeometry(r2, r1, delta.length(), sides, 1);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()));
    this.add(g, mat, center.x, center.y, center.z);
  }
  finish(name: string) {
    const group = new T.Group(); group.name = name;
    for (const [mat, geometries] of this.buckets) {
      const parts = geometries.map(g => g.index ? g.toNonIndexed() : g);
      const geo = mergeGeometries(parts);
      for (let i=0;i<parts.length;i++) if(parts[i]!==geometries[i])parts[i].dispose();
      for (const g of geometries) g.dispose();
      if (!geo) continue;
      geo.computeBoundingSphere(); const mesh = new T.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = mat.name; group.add(mesh);
    }
    // Distance-controlled facade cells retain their Builder. Do not retain all
    // the unmerged window/trim buffers alongside the merged render geometry.
    this.buckets.clear();
    return group;
  }
}

export function curvedRoof(b: Builder, x: number, z: number, w: number, d: number, y: number, rise: number, mat: T.Material, trim: T.Material, detail = true, ridgeHalf?: number) {
  const ridge = ridgeHalf ?? Math.max(0.15, (w - d) / 2), hx = w / 2, hz = d / 2;
  const sides = [
    [new T.Vector2(-ridge, 0), new T.Vector2(ridge, 0), new T.Vector2(-hx, hz), new T.Vector2(hx, hz)],
    [new T.Vector2(ridge, 0), new T.Vector2(-ridge, 0), new T.Vector2(hx, -hz), new T.Vector2(-hx, -hz)],
    [new T.Vector2(ridge, 0), new T.Vector2(ridge, 0), new T.Vector2(hx, hz), new T.Vector2(hx, -hz)],
    [new T.Vector2(-ridge, 0), new T.Vector2(-ridge, 0), new T.Vector2(-hx, -hz), new T.Vector2(-hx, hz)],
  ];
  const roofY = (t: number, edge: number) => y + rise * Math.pow(1 - t, 1.65) + Math.pow(t, 8) * (0.28 + 0.5 * Math.pow(Math.abs(edge * 2 - 1), 8));
  for (const [p0, p1, p2, p3] of sides) {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [], columns = 24, rows = 10;
    for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++) {
      const t = i / rows, u = j / columns, a = p0.clone().lerp(p1, u), c = p2.clone().lerp(p3, u), p = a.lerp(c, t);
      pos.push(x + p.x, roofY(t, u), z + p.y); uv.push(p.x / 2, p.y / 2);
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) {
      const a = i * (columns + 1) + j, c = a + columns + 1; idx.push(a, a + 1, c, a + 1, c + 1, c);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); b.add(g, mat);
    if (detail) {
      const n = Math.ceil(p2.distanceTo(p3) / 0.3);
      for (let k = 0; k <= n; k++) {
        const u = k / n, points: T.Vector3[] = [];
        for (let l = 0; l <= 8; l++) { const t = l / 8, p = p0.clone().lerp(p1, u).lerp(p2.clone().lerp(p3, u), t); points.push(new T.Vector3(x + p.x, roofY(t, u) + 0.045, z + p.y)); }
        b.line(points, 0.065, trim, 4);
      }
      for (let row=1;row<18;row++) {
        const t=row/18, points:T.Vector3[]=[];
        for(let i=0;i<=12;i++){const u=i/12,p=p0.clone().lerp(p1,u).lerp(p2.clone().lerp(p3,u),t);points.push(new T.Vector3(x+p.x,roofY(t,u)+.02,z+p.y));}
        b.line(points,.018,mat,3);
      }
    }
    const edgePoints: T.Vector3[] = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12, p = p2.clone().lerp(p3, u); edgePoints.push(new T.Vector3(x + p.x, roofY(1, u), z + p.y)); }
    b.line(edgePoints, 0.12, trim, 6);
  }
  b.line([new T.Vector3(x - ridge, y + rise + 0.18, z), new T.Vector3(x, y + rise + 0.18, z), new T.Vector3(x + ridge, y + rise + 0.18, z)], 0.18, trim, 8);
  for (const sign of [-1, 1]) b.line([new T.Vector3(x + sign * ridge, y + rise, z), new T.Vector3(x + sign * (ridge + 0.45), y + rise + 0.55, z), new T.Vector3(x + sign * (ridge + 0.2), y + rise + 0.95, z)], 0.19, trim, 8);
}
