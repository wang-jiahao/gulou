import * as T from 'three';
import { Builder } from './geometry.ts';
import type { Materials } from './materials.ts';
import type { MapFeature } from './campus-map.ts';

export type Pitch = { x: number; z: number; angle: number; width: number; length: number; groundY: number; goalWidth: number; goalHeight: number };
export function pitchPoint(p: Pitch, x: number, y: number, z: number) { return new T.Vector3(p.x + x * Math.cos(p.angle) + z * Math.sin(p.angle), p.groundY + y, p.z - x * Math.sin(p.angle) + z * Math.cos(p.angle)); }
export function pitchLocal(p: Pitch, point: T.Vector3) { const x = point.x - p.x, z = point.z - p.z; return new T.Vector3(x * Math.cos(p.angle) - z * Math.sin(p.angle), point.y - p.groundY, x * Math.sin(p.angle) + z * Math.cos(p.angle)); }

export function createFootballPitch(features: MapFeature[], mats: Materials) {
  const inner = features.find(f => f.tags.leisure === 'track')?.holes?.[0];
  const pitch: Pitch = { x: -192.78, z: -9.01, angle: -.032, width: 60, length: 90, groundY: .075, goalWidth: 7.32, goalHeight: 2.44 };
  if (inner?.length === 4) {
    pitch.x = inner.reduce((n, p) => n + p[0], 0) / 4; pitch.z = inner.reduce((n, p) => n + p[1], 0) / 4;
    pitch.angle = Math.atan2(inner[1][0] - inner[0][0] + inner[2][0] - inner[3][0], inner[1][1] - inner[0][1] + inner[2][1] - inner[3][1]);
  }
  const b = new Builder();
  const paint = new T.MeshStandardMaterial({ color: 0xe3e7d9, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const steel = new T.MeshStandardMaterial({ color: 0xe8e9e0, metalness: .12, roughness: .6 });
  b.box(pitch.width + 4, .08, pitch.length + 4, pitch.x, .035, pitch.z, mats.grass, true, pitch.angle, 3.6);
  // Alternating bands run across the field in the official west/east panoramas.
  const turfBands=mats.grass.clone();turfBands.name='Suzhe transverse turf bands';turfBands.color.multiplyScalar(.82);
  for(let row=0;row<12;row+=2){const p=pitchPoint(pitch,0,.003,-pitch.length/2+(row+.5)*pitch.length/12);b.box(pitch.width,.003,pitch.length/12,p.x,p.y,p.z,turfBands,false,pitch.angle,3.6);}
  const line = (x: number, z: number, w: number, d: number) => { const p = pitchPoint(pitch, x, .008, z); b.box(w, .006, d, p.x, p.y, p.z, paint, false, pitch.angle); };
  for (const side of [-1, 1]) { line(side * pitch.width / 2, 0, .11, pitch.length); line(0, side * pitch.length / 2, pitch.width, .11); }
  line(0, 0, pitch.width, .11);
  b.add(new T.RingGeometry(9.095, 9.205, 72).rotateX(-Math.PI / 2), paint, pitch.x, pitch.groundY + .011, pitch.z);
  const spot = (z: number) => { const p = pitchPoint(pitch, 0, .011, z); b.add(new T.CircleGeometry(.13, 14).rotateX(-Math.PI / 2), paint, p.x, p.y, p.z); };
  spot(0);
  const netCanvas = document.createElement('canvas'); netCanvas.width = netCanvas.height = 64; const ctx = netCanvas.getContext('2d')!;
  ctx.strokeStyle = '#e0e6d5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(64, 0); ctx.moveTo(0, 0); ctx.lineTo(0, 64); ctx.stroke();
  const netTexture = new T.CanvasTexture(netCanvas); netTexture.colorSpace = T.SRGBColorSpace; netTexture.wrapS = netTexture.wrapT = T.RepeatWrapping;
  const netMaterial = new T.MeshStandardMaterial({ map: netTexture, side: T.DoubleSide, alphaTest: .35, roughness: 1 });
  const nets = new T.Group();
  const net = (w: number, h: number, x: number, y: number, z: number, yaw: number, horizontal = false) => {
    const g = new T.PlaneGeometry(w, h), uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / .16, uv.getY(i) * h / .16);
    if (horizontal) g.rotateX(-Math.PI / 2);
    const mesh = new T.Mesh(g, netMaterial); mesh.position.copy(pitchPoint(pitch, x, y, z)); mesh.rotation.y = pitch.angle + yaw; mesh.receiveShadow = true; nets.add(mesh);
  };
  for (const end of [-1, 1]) {
    const z = end * pitch.length / 2;
    for (const [width, depth] of [[40.3, 16.5], [18.3, 5.5]]) { line(0, z - end * depth, width, .11); for (const side of [-1, 1]) line(side * width / 2, z - end * depth / 2, .11, depth); }
    spot(z - end * 11);
    for (const side of [-1, 1]) {
      const x = side * pitch.goalWidth / 2, foot = pitchPoint(pitch, x, 0, z), top = pitchPoint(pitch, x, pitch.goalHeight, z), rear = pitchPoint(pitch, x, 0, z + end * 1.8);
      b.cylinder(foot, top, .06, .06, steel, 12); b.cylinder(top, rear, .045, .045, steel, 10);
      b.solids.push({ x: foot.x, y: pitch.groundY + pitch.goalHeight / 2, z: foot.z, w: .12, h: pitch.goalHeight, d: .12, angle: pitch.angle });
      const sideCenter = pitchPoint(pitch, x, pitch.goalHeight / 2, z + end * .9);
      b.solids.push({ x: sideCenter.x, y: sideCenter.y, z: sideCenter.z, w: .055, h: pitch.goalHeight, d: 1.8, angle: pitch.angle });
      net(1.8, pitch.goalHeight, x, pitch.goalHeight / 2, z + end * .9, Math.PI / 2);
    }
    b.cylinder(pitchPoint(pitch, -pitch.goalWidth / 2, pitch.goalHeight, z), pitchPoint(pitch, pitch.goalWidth / 2, pitch.goalHeight, z), .06, .06, steel, 12);
    const crossbar = pitchPoint(pitch, 0, pitch.goalHeight, z), back = pitchPoint(pitch, 0, pitch.goalHeight / 2, z + end * 1.8);
    b.solids.push({ x: crossbar.x, y: crossbar.y, z: crossbar.z, w: pitch.goalWidth, h: .12, d: .12, angle: pitch.angle });
    b.solids.push({ x: back.x, y: back.y, z: back.z, w: pitch.goalWidth, h: pitch.goalHeight, d: .055, angle: pitch.angle });
    net(pitch.goalWidth, pitch.goalHeight, 0, pitch.goalHeight / 2, z + end * 1.8, 0);
    net(pitch.goalWidth, 1.8, 0, pitch.goalHeight, z + end * .9, 0, true);
  }
  const group = b.finish('Suzhe football practice pitch');
  // Flat turf and painted lines only receive shadows. Casting a shadow onto
  // their own shallow surface produces bands at the far end of the pitch.
  for (const object of group.children) if (object instanceof T.Mesh && (object.material === mats.grass || object.material === turfBands || object.material === paint)) object.castShadow = false;
  group.add(...nets.children.slice());
  group.userData = { source: 'inner field traced from the supplied campus plan', layout: 'approximate 90×60 m practice markings; regulation-size goal mouths' };
  return { group, solids: b.solids, pitch };
}
