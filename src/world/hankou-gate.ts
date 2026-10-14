import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Builder, rng } from './geometry.ts';
import type { Materials } from './materials.ts';

/** Rendered lettering, not pixels from the reference photograph. */
function lettering(font: Font, text: string, width: number, height: number, color: number, centres: readonly number[], vertical = false) {
  const group = new T.Group();
  const material = new T.MeshStandardMaterial({ color, roughness: .32, metalness: .4 });
  [...text].forEach((letter, i) => {
    const geometry = new TextGeometry(letter, { font, size: 1, depth: .025, curveSegments: 5, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2 });
    geometry.computeBoundingBox(); const box = geometry.boundingBox!, size = box.getSize(new T.Vector3());
    const glyph = font.data.glyphs[letter] as { displayScale?: number };
    // Restore relative photo heights once, then fit the whole inscription to its face.
    // Separate group X/Y fitting approximately rectifies the oblique source photograph.
    const scale = (vertical ? 80 : 76) * (glyph.displayScale ?? 1) / size.y;
    geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, 0); geometry.scale(scale, scale, 1);
    const mesh = new T.Mesh(geometry, material); mesh.name = `gate glyph ${letter}`;
    mesh.position.set(vertical ? 0 : centres[i], vertical ? -centres[i] : 0, 0);
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  });
  const bounds = new T.Box3().setFromObject(group), centre = bounds.getCenter(new T.Vector3()), size = bounds.getSize(new T.Vector3());
  const sx = width / size.x, sy = height / size.y;
  for (const child of group.children) {
    const mesh = child as T.Mesh<T.BufferGeometry>;
    mesh.geometry.scale(sx, sy, 1);
    mesh.position.set((mesh.position.x - centre.x) * sx, (mesh.position.y - centre.y) * sy, 0);
  }
  return group;
}

export function nationalFlag(time: { value: number }) {
  const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 400;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#bb1828'; ctx.fillRect(0, 0, 600, 400);
  const star = (x: number, y: number, r: number, rotation: number) => {
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = rotation + i * Math.PI / 5, radius = i % 2 ? r * .382 : r; const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius; if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fillStyle = '#f4d75b'; ctx.fill();
  };
  star(100, 100, 60, -Math.PI / 2);
  for (const [x, y] of [[200, 40], [240, 80], [240, 140], [200, 180]]) star(x, y, 20, Math.atan2(100 - y, 100 - x));
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  const material = new T.MeshStandardMaterial({ map, side: T.DoubleSide, roughness: .86 });
  material.onBeforeCompile = shader => {
    shader.uniforms.uFlagTime = time;
    shader.vertexShader = 'uniform float uFlagTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z+=sin(uFlagTime*1.5+uv.x*7.)*.085*pow(uv.x,1.4);transformed.y+=sin(uFlagTime*.8+uv.x*4.)*.025*uv.x;');
  };
  material.customProgramCacheKey = () => 'gulou-national-flag';
  const flag = new T.Mesh(new T.PlaneGeometry(1.8, 1.2, 20, 10).translate(.9, 0, 0), material); flag.name = 'five-star national flag'; flag.receiveShadow = true; return flag;
}

/** Geometry is proportioned against the user's gate photo and official VR, not a survey. */
export function createHankouGate(point: number[], mats: Materials, font: Font) {
  const gx = point[0], gz = point[1] - 7, b = new Builder();
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!, pixels = ctx.createImageData(256, 256), random = rng(6217);
  for (let i = 0; i < pixels.data.length; i += 4) { const value = 231 + (random() - .5) * 22 - (random() > .985 ? 50 : 0); pixels.data.set([value, value, value, 255], i); }
  ctx.putImageData(pixels, 0, 0); const grain = new T.CanvasTexture(canvas); grain.colorSpace = T.SRGBColorSpace; grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.repeat.set(4, 4); grain.anisotropy = 8;
  const granite = new T.MeshStandardMaterial({ name: 'gate-granite', color: 0xc6ccca, map: grain, bumpMap: grain, bumpScale: .002, roughness: .7 });
  const baseStone = new T.MeshStandardMaterial({ color: 0x909d99, map: grain, roughness: .8 });
  const joints = new T.MeshStandardMaterial({ color: 0x7c8784, roughness: .94 });
  const ceiling = new T.MeshStandardMaterial({ color: 0xadb5b1, roughness: .86 });
  const glass = new T.MeshStandardMaterial({ name: 'window-glass-warm', color: 0x314a4c, roughness: .19, metalness: .52 });
  const frame = new T.MeshStandardMaterial({ color: 0x636f6d, metalness: .6, roughness: .4 });
  const paint = new T.MeshStandardMaterial({ color: 0xdadbd1, roughness: .97, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const bevelBox = (w: number, h: number, d: number, x: number, y: number, z: number, mat: T.Material, solid = false) => {
    b.add(new RoundedBoxGeometry(w, h, d, 2, Math.min(.035, h / 6)), mat, x, y, z);
    if (solid) b.solids.push({ x, y, z, w, h, d });
  };
  for (const side of [-1, 1]) {
    const postX = gx + side * 5.1, boothX = gx + side * 11.5;
    bevelBox(2.25, 6.25, 2.4, postX, 3.125, gz, granite, true);
    bevelBox(2.44, 1.25, 2.58, postX, .625, gz, baseStone, true);
    bevelBox(2.52, .16, 2.66, postX, 1.32, gz, granite);
    for (let y = 1.53; y < 6; y += .77) {
      b.box(2.255, .012, 2.406, postX, y, gz, joints);
      b.box(.012, .76, .008, postX + (Math.round(y / .77) % 2 ? .27 : -.32), y + .39, gz + 1.204, joints);
    }
    // Side corridors remain open; the glazed guard rooms sit behind their portals.
    bevelBox(4.5, 4.1, 5, boothX, 2.05, gz - 2.05, granite, true);
    bevelBox(8.4, .82, 3.1, gx + side * 10.75, 4.36, gz - .2, granite, true);
    bevelBox(8.7, .18, 3.42, gx + side * 10.75, 4.85, gz - .2, baseStone);
    bevelBox(.72, 4.0, .85, gx + side * 15.15, 2, gz - .2, granite, true);
    for (const offset of [-1.05, .4]) {
      b.box(1.24, 1.75, .09, boothX + offset, 2.15, gz + .501, frame);
      b.box(1.09, 1.58, .05, boothX + offset, 2.15, gz + .559, glass);
      for (const dx of [-.53, 0, .53]) b.box(.032, 1.63, .10, boothX + offset + dx, 2.15, gz + .604, frame);
      b.box(1.2, .035, .10, boothX + offset, 2.43, gz + .609, frame);
      b.box(1.34, .09, .3, boothX + offset, 1.26, gz + .62, baseStone);
    }
    const doorX = gx + side * 9.23;
    b.box(.075, 2.6, 1.2, doorX, 1.3, gz - 1.45, frame);
    b.box(.08, 1.8, 1.03, doorX - side * .045, 1.6, gz - 1.45, glass);
    b.box(.11, .32, .035, doorX - side * .10, 1.1, gz - 1.08, mats.metal);
    // Retractable fence is folded against the piers, leaving a wide walkable centre.
    for (let i = 0; i < 8; i++) {
      const x = gx + side * (3.03 + i * .075);
      b.cylinder(new T.Vector3(x, .1, gz - .6), new T.Vector3(x, 1.18, gz - .6), .013, .013, frame, 6);
      b.cylinder(new T.Vector3(x, .15, gz - .6), new T.Vector3(x + side * .25, 1.08, gz - .6), .010, .010, frame, 6);
    }
    b.solids.push({ x: gx + side * 3.3, y: .6, z: gz - .6, w: .7, h: 1.2, d: .2 });
  }
  // Deep flat canopy, recessed fascia, stone panel joints and underside coffer lines.
  bevelBox(12.65, 1.22, 2.68, gx, 5.56, gz, granite, true);
  bevelBox(14.2, .24, 4.5, gx, 6.27, gz - .18, baseStone, true);
  bevelBox(14.4, .12, 4.7, gx, 6.45, gz - .18, granite);
  for (const side of [-1, 1]) {
    b.box(.18, .48, 4.62, gx + side * 7.05, 6.67, gz - .18, granite);
    b.box(14.1, .48, .16, gx, 6.67, gz - .18 + side * 2.26, granite);
  }
  b.box(12.4, .065, 2.6, gx, 4.918, gz, ceiling);
  for (let x = -5.4; x <= 5.4; x += .9) b.box(.018, .018, 2.62, gx + x, 4.877, gz, joints);
  for (const z of [-.85, 0, .85]) b.box(12.4, .018, .018, gx, 4.877, gz + z, joints);
  for (const side of [-1, 1]) for (const [w, h, y] of [[3.2, .32, 6.98], [1.7, .37, 7.315]]) bevelBox(w, h, .22, gx, y, gz + side * 2.24, granite);
  b.cylinder(new T.Vector3(gx, 6.95, gz - .35), new T.Vector3(gx, 13.5, gz - .35), .042, .028, mats.metal, 12);
  b.add(new T.SphereGeometry(.082, 16, 10), frame, gx, 13.58, gz - .35);
  const red = new T.MeshStandardMaterial({ color: 0xb51f2d, roughness: .58 }), gold = new T.MeshStandardMaterial({ color: 0xc7a149, metalness: .6, roughness: .36 });
  // Lanterns follow the supplied photograph; the temporary welcome banner is omitted.
  for (const offset of [-2.65, -.9, .9, 2.65]) {
    const x = gx + offset, z = gz + .38;
    b.cylinder(new T.Vector3(x, 4.89, z), new T.Vector3(x, 4.65, z), .012, .012, gold, 6);
    b.add(new T.SphereGeometry(.36, 28, 16).scale(1, .72, 1), red, x, 4.43, z);
    for (const y of [4.17, 4.69]) b.add(new T.CylinderGeometry(.085, .085, .055, 16), gold, x, y, z);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, points: T.Vector3[] = [];
      for (let j = 1; j <= 11; j++) { const t = j / 12 * Math.PI; points.push(new T.Vector3(x + Math.sin(t) * Math.cos(a) * .363, 4.43 + Math.cos(t) * .26, z + Math.sin(t) * Math.sin(a) * .363)); }
      b.line(points, .004, gold, 3);
    }
    for (let i = -2; i <= 2; i++) b.cylinder(new T.Vector3(x + i * .015, 4.15, z), new T.Vector3(x + i * .018, 3.94 - Math.abs(i) * .015, z), .005, .005, red, 4);
  }
  const bollardOffsets = [3.7, 5.15, 6.6, 9.1, 10.55, 12];
  for (const side of [-1, 1]) for (let i = 0; i < bollardOffsets.length; i++) {
    // Leave a clear approach at ±7.6 m for both pedestrian portals.
    const x = gx + side * bollardOffsets[i], z = gz + 5.1 + i * .62;
    b.add(new T.CylinderGeometry(.30, .32, .09, 24), baseStone, x, .045, z);
    b.add(new T.SphereGeometry(.30, 24, 16), granite, x, .36, z);
    b.solids.push({ x, y: .32, z, w: .6, h: .64, d: .6 });
  }
  for (let i = 0; i < 12; i++) b.box(6.7, .008, .46, gx, .065, gz + 9.5 + i * .94, paint);
  const group = b.finish('Hankou gate stone panels canopy lettering and forecourt');
  // Letter centres traced from the local photograph; face dimensions are VR-checked estimates.
  const titleCentres = [551, 631, 717, 798];
  const name = lettering(font, '南京大学', 5.25, 1.04, 0xe5b452, titleCentres); name.position.set(gx, 5.56, gz + 1.351); group.add(name);
  for (const [side, text] of [[-1, '严肃活泼'], [1, '团结紧张']] as const) {
    const centres = side < 0 ? [541.5, 615, 685.5, 751.5] : [564.5, 617, 684.5, 752];
    const motto = lettering(font, text, side < 0 ? 1.42 : 1.10, 3.28, 0xa31425, centres, true); motto.position.set(gx + side * 5.1, 3.23, gz + 1.216); group.add(motto);
  }
  const flag = nationalFlag(mats.windTime); flag.position.set(gx, 12.45, gz - .35); group.add(flag);
  // Camera proxies elsewhere use shallow traversal, so expose the relief meshes too.
  for (const child of [...group.children]) if (child instanceof T.Group) { child.updateMatrix(); for (const mesh of [...child.children]) { mesh.applyMatrix4(child.matrix); group.add(mesh); } group.remove(child); }
  group.userData = { reference: 'user-provided Hankou gate photo and NJU official VR', accuracy: 'photo-based approximate proportions; temporary welcome banner omitted; lanterns reflect photo decoration' };
  return { group, solids: b.solids };
}
