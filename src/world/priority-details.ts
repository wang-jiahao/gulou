import * as T from 'three';
import { Builder } from './geometry.ts';
import { geographic, type CampusMap } from './campus-map.ts';
import { createHankouGate } from './hankou-gate.ts';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import type { Materials } from './materials.ts';

function lettering(text: string, width: number, height: number, background = '#aba38d', color = '#3d3b32') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 192);
  ctx.fillStyle = color; ctx.font = '76px "Songti SC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 100);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshStandardMaterial({ map: texture, roughness: .85 }));
}

/** Facade proportions follow the official VR; heights and details remain approximate. */
export function createPriorityDetails(map: CampusMap, mats: Materials, gateFont: Font) {
  const b = new Builder();
  const plaster = new T.MeshStandardMaterial({ color: 0xc9c2ac, roughness: .9 });
  const roof = new T.MeshStandardMaterial({ name: 'teaching-roof', color: 0x494c46, roughness: .9 });
  const glass = new T.MeshStandardMaterial({ name: 'window-glass-warm', color: 0x263b42, metalness: .32, roughness: .22 });
  const x = -85, z = 136.4;
  // Central teaching-building bay: columns, recessed glazing, cornice, roof dormers.
  b.box(14, 15.9, 1, x, 8.1, z - .35, plaster);
  for (const dx of [-4.6, 0, 4.6]) {
    b.box(2.65, 3.2, .22, x + dx, 2.3, z + .25, glass);
    b.box(2.5, 9.1, .14, x + dx, 9.1, z + .3, glass);
    for (const y of [5.8, 9, 12.2]) b.box(2.7, .16, .3, x + dx, y, z + .45, plaster);
  }
  for (const dx of [-6.9, -2.25, 2.25, 6.9]) {
    b.box(.55, 14.2, .58, x + dx, 8, z + .45, plaster);
    b.box(.8, .3, .85, x + dx, 1, z + .45, mats.stone);
    b.box(.85, .25, .9, x + dx, 15.1, z + .45, plaster);
  }
  b.box(14.7, .55, 1.8, x, 4.6, z + .4, plaster);
  b.box(15, .45, 2.1, x, 15.8, z + .15, plaster);
  b.box(15, .32, 19.5, x, 16.75, 127.1, roof);
  for (const dx of [-4.4, 0, 4.4]) {
    const arch = new T.Shape(); arch.moveTo(-1.35, 0); arch.lineTo(-1.35, 1.2); arch.absarc(0, 1.2, 1.35, Math.PI, 0, true); arch.lineTo(1.35, 0);
    b.add(new T.ExtrudeGeometry(arch, { depth: .65, bevelEnabled: false }), plaster, x + dx, 16.7, z - .2);
    b.box(1.6, 1.6, .15, x + dx, 17.6, z + .5, glass);
    b.box(.12, 1.7, .19, x + dx, 17.6, z + .59, plaster);
  }
  // Three shallow steps remain within the plan's forecourt, clear of 两江路.
  for (let i = 0; i < 3; i++) b.box(13.5, .14, 1.4 - i * .32, x, .07 + i * .14, z + 1 - i * .16, mats.stone, true);
  const group = b.finish('teaching building entrance details');
  const gate = createHankouGate(map.gates.hankou, mats, gateFont); group.add(...gate.group.children.slice()); b.solids.push(...gate.solids);
  const teaching = lettering('教 学 楼', 4, .6); teaching.position.set(x, 4.65, z + 1.33); group.add(teaching);
  for (const [label, px, pz] of [['中大路', -75, 202], ['两江路', -68, 150], ['金大路', 7, 59]] as const) {
    const sign = lettering(label, 1.55, .36, '#485b4c', '#f1ead9'); sign.position.set(px, 2.1, pz); group.add(sign);
    const pole = new T.Mesh(new T.CylinderGeometry(.035, .04, 2.1, 6), mats.metal); pole.position.set(px, 1.05, pz); group.add(pole);
  }
  return { group, solids: b.solids };
}

export function createSkyline() {
  const b = new Builder(), p = geographic(32.06247, 118.77806);
  const glass = new T.MeshStandardMaterial({ color: 0x81969e, metalness: .64, roughness: .26 });
  const trim = new T.MeshStandardMaterial({ color: 0xa9b7b7, metalness: .52, roughness: .4, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const crown = new T.MeshStandardMaterial({ color: 0x849995, metalness: .68, roughness: .3 });
  // Geographic position is fixed. Setbacks, rounded crown and fins follow reference silhouettes.
  for (const [w, d, h, y, dx] of [[64, 56, 170, 85, 0], [54, 46, 110, 225, 1], [44, 39, 62, 311, 4]]) {
    b.box(w, h, d, p.x + dx, y, p.y, glass);
    for (let level = y - h / 2 + 4; level < y + h / 2; level += 4) b.box(w + .2, .16, d + .2, p.x + dx, level, p.y, trim);
    for (let offset = -w / 2 + 1; offset < w / 2; offset += 1.6) for (const side of [-1, 1]) b.box(.14, h, .16, p.x + dx + offset, y, p.y + side * d / 2, trim);
    for (let offset = -d / 2 + 1; offset < d / 2; offset += 1.6) for (const side of [-1, 1]) b.box(.16, h, .14, p.x + dx + side * w / 2, y, p.y + offset, trim);
  }
  const fin = new T.Shape(); fin.moveTo(9, 331); fin.lineTo(9, 391); fin.lineTo(21, 405); fin.lineTo(21, 331); fin.closePath();
  b.add(new T.ExtrudeGeometry(fin, { depth: 32, bevelEnabled: false }), glass, p.x, 0, p.y - 16);
  for (const side of [-1, 1]) for (let x = 9; x <= 21; x += 1.5) b.box(.18, 391 + (x - 9) * 14 / 12 - 331, .18, p.x + x, (331 + 391 + (x - 9) * 14 / 12) / 2, p.y + side * 16, trim);
  b.cylinder(new T.Vector3(p.x - 3, 340, p.y + 1), new T.Vector3(p.x - 3, 390, p.y + 1), 12, 10.5, crown, 32);
  b.cylinder(new T.Vector3(p.x - 3, 385, p.y + 1), new T.Vector3(p.x - 3, 421, p.y + 1), 7.2, 6.8, crown, 28);
  for (let y = 344; y < 419; y += 4.2) {
    const radius = y < 386 ? 12 - (y - 340) * .03 : 7.25;
    b.add(new T.TorusGeometry(radius, .16, 4, 40).rotateX(Math.PI / 2), trim, p.x - 3, y, p.y + 1);
  }
  b.cylinder(new T.Vector3(p.x - 3, 420, p.y + 1), new T.Vector3(p.x - 3, 450, p.y + 1), .65, .15, trim, 8);
  b.box(105, 23, 80, p.x, 11.5, p.y, trim);
  const group = b.finish('紫峰大厦 · geographic anchor and reconstructed crown');
  group.traverse(o => { if (o instanceof T.Mesh) o.castShadow = false; });
  group.userData = { latitude: 32.06247, longitude: 118.77806, heightMetres: 450, source: 'https://en.wikipedia.org/wiki/Zifeng_Tower', accuracy: 'geographic anchor; approximate facade and crown from photographs' };
  return group;
}

/** OSM locates the nearby tower; facade and 78 m overall height are photograph estimates. */
export function createFireTower() {
  const b = new Builder(), x = -30.3, z = -95.5;
  const stone = new T.MeshStandardMaterial({ color: 0xb9beb9, roughness: .78 });
  const glass = new T.MeshStandardMaterial({ color: 0x668290, metalness: .48, roughness: .3 });
  const dark = new T.MeshStandardMaterial({ color: 0x58656c, roughness: .64, metalness: .3 });
  b.box(23, 62, 21, x, 31, z, glass, true);
  b.box(26, 3, 24, x, 1.5, z, stone, true);
  for (const side of [-1, 1]) {
    for (const offset of [-10.8, -5, 5, 10.8]) b.box(.8, 61, .65, x + offset, 32, z + side * 10.7, stone);
    for (let y = 4; y < 62; y += 3) b.box(23.5, .35, .7, x, y, z + side * 10.7, stone);
    for (const offset of [-9.7, 9.7]) b.box(.65, 61, .8, x + side * 11.7, 32, z + offset, stone);
    for (let y = 4; y < 62; y += 3) b.box(.7, .35, 21.6, x + side * 11.7, y, z, stone);
  }
  b.box(18, 5, 17, x, 64.5, z, glass, true); b.box(11, 4, 10, x, 69, z, dark, true);
  for (const dx of [-5.5, 5.5]) for (const dz of [-5, 5]) b.box(.22, 5, .22, x + dx, 70, z + dz, stone);
  for (const y of [68,70,72]) { b.box(11.4,.2,10.4,x,y,z,stone,true); }
  b.cylinder(new T.Vector3(x,72,z),new T.Vector3(x,78,z),.1,.045,stone,8);
  const group = b.finish('消防大厦 · skyline west of North Building');
  group.userData = { source: 'https://www.openstreetmap.org/way/100949347', heightApproximate: 78, visualIdentification: 'nearby west-side tower reference; not a surveyed facade' };
  group.traverse(o => { if (o instanceof T.Mesh) o.castShadow = false; });
  return { group, solids: b.solids };
}
