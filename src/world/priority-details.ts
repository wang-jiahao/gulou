import * as T from 'three';
import { Builder } from './geometry.ts';
import { geographic, type CampusMap } from './campus-map.ts';
import type { Materials } from './materials.ts';

function lettering(text: string, width: number, height: number, background = '#aba38d', color = '#3d3b32') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 192);
  ctx.fillStyle = color; ctx.font = '76px "Songti SC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 100);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshStandardMaterial({ map: texture, roughness: .85 }));
}

/** Facade proportions follow the official VR; heights and details remain approximate. */
export function createPriorityDetails(map: CampusMap, mats: Materials) {
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
  const gate = map.gates.hankou, gx = gate[0], gz = gate[1] - 7;
  for (const side of [-1, 1]) {
    b.box(1.25, 5.1, 1.6, gx + side * 6.3, 2.55, gz, plaster, true);
    b.box(1.55, .27, 1.9, gx + side * 6.3, 5.2, gz, mats.stone);
    b.box(7, 3.4, 4.3, gx + side * 11, 1.7, gz - .6, plaster, true);
    b.box(7.4, .32, 4.7, gx + side * 11, 3.52, gz - .6, mats.stone);
    b.box(3.6, 1.3, .12, gx + side * 11, 2.1, gz + 1.61, glass);
  }
  b.box(14, .75, 1.95, gx, 5.12, gz, plaster, true);
  b.box(14.7, .25, 2.2, gx, 5.6, gz, mats.stone);
  // The central opening stays traversable. The official photograph's temporary banners are omitted.
  b.cylinder(new T.Vector3(gx, 5.75, gz), new T.Vector3(gx, 11.6, gz), .035, .025, mats.metal);
  b.box(1.65, 1.04, .025, gx + .85, 10.9, gz, new T.MeshStandardMaterial({ color: 0x9c302d, side: T.DoubleSide }));
  const group = b.finish('teaching building entrance and Hankou gate');
  const title = lettering('南京大学', 7, 1.15, '#c0b9a5'); title.position.set(gx, 5.13, gz + 1.02); group.add(title);
  const teaching = lettering('教 学 楼', 4, .6); teaching.position.set(x, 4.65, z + 1.33); group.add(teaching);
  for (const [label, px, pz] of [['中大路', -75, 202], ['两江路', -68, 150], ['金大路', 7, 59]] as const) {
    const sign = lettering(label, 1.55, .36, '#485b4c', '#f1ead9'); sign.position.set(px, 2.1, pz); group.add(sign);
    const pole = new T.Mesh(new T.CylinderGeometry(.035, .04, 2.1, 6), mats.metal); pole.position.set(px, 1.05, pz); group.add(pole);
  }
  return { group, solids: b.solids };
}

export function createSkyline() {
  const b = new Builder(), p = geographic(32.06247, 118.77806);
  const glass = new T.MeshStandardMaterial({ color: 0x74858a, metalness: .5, roughness: .32 });
  const trim = new T.MeshStandardMaterial({ color: 0x9ba6a6, metalness: .35, roughness: .52 });
  // 450 m architectural height. Facade, setbacks and spire are simplified.
  for (const [w, d, h, y, dx] of [[66, 57, 190, 95, 0], [53, 49, 115, 247.5, 3], [40, 42, 62, 336, 7], [29, 33, 35, 384.5, 11], [15, 19, 24, 414, 15]]) {
    b.box(w, h, d, p.x + dx, y, p.y, glass);
    for (let level = y - h / 2 + 4; level < y + h / 2; level += 4.2) b.box(w + .4, .48, d + .4, p.x + dx, level, p.y, trim);
    for (let offset = -w / 2 + 3; offset < w / 2; offset += 5) for (const side of [-1, 1]) b.box(.48, h, .42, p.x + dx + offset, y, p.y + side * d / 2, trim);
  }
  b.cylinder(new T.Vector3(p.x + 15, 426, p.y), new T.Vector3(p.x + 15, 450, p.y), 2.5, .3, trim);
  b.box(105, 23, 80, p.x, 11.5, p.y, trim);
  const group = b.finish('紫峰大厦 · geographic position, simplified facade');
  group.traverse(o => { if (o instanceof T.Mesh) o.castShadow = false; });
  group.userData = { latitude: 32.06247, longitude: 118.77806, heightMetres: 450, source: 'https://en.wikipedia.org/wiki/Zifeng_Tower', accuracy: 'geographic anchor; approximate silhouette' };
  return group;
}
