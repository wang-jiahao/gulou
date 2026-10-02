import * as T from 'three';
import { Builder, rng } from './geometry.ts';
import type { Materials } from './materials.ts';

function textPlate(text: string, width: number, height: number, color: string, background?: string, font = 'STKaiti, "Kaiti SC", KaiTi, "Songti SC", serif') {
  const canvas = document.createElement('canvas'); canvas.height = 256; canvas.width = Math.max(256, Math.round(256 * width / height));
  const ctx = canvas.getContext('2d')!;
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.fillStyle = color; ctx.font = `bold ${Math.min(170, canvas.width / text.length * .72)}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const gap = canvas.width / (text.length + 1);
  [...text].forEach((character, i) => ctx.fillText(character, gap * (i + 1), 137));
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshStandardMaterial({ map, transparent: !background, alphaTest: .15, roughness: .64, metalness: background ? .05 : .42, polygonOffset: true, polygonOffsetFactor: -1 }));
}

function nationalFlag(time: { value: number }) {
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
  const geometry = new T.PlaneGeometry(1.8, 1.2, 16, 8).translate(.9, 0, 0);
  const flag = new T.Mesh(geometry, material); flag.name = 'five-star national flag'; flag.receiveShadow = true; return flag;
}

/** Main gate massing follows the official VR front/side views; dimensions are estimated. */
export function createHankouGate(point: number[], mats: Materials) {
  const gx = point[0], gz = point[1] - 7, b = new Builder();
  const concrete = new T.MeshStandardMaterial({ color: 0xd7d8ce, map: mats.textures.get('stone-grain.webp'), bumpMap: mats.textures.get('stone-grain.webp'), bumpScale: .008, roughness: .92 });
  const baseStone = new T.MeshStandardMaterial({ color: 0x919d97, roughness: .85 });
  const joints = new T.MeshStandardMaterial({ color: 0x9da7a0, roughness: .92 });
  const glass = new T.MeshStandardMaterial({ name: 'window-glass-warm', color: 0x314a4c, roughness: .22, metalness: .58 });
  const frame = new T.MeshStandardMaterial({ color: 0x515e59, metalness: .25, roughness: .7 });
  const paint = new T.MeshStandardMaterial({ color: 0xdadbd1, roughness: .97, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // The revised opening is 8.7 m wide. Both pedestrian passages beside it remain open.
  for (const side of [-1, 1]) {
    const postX = gx + side * 5.35, boothX = gx + side * 11.4;
    b.box(2, 5.45, 1.9, postX, 2.725, gz, concrete, true);
    b.box(2.16, .5, 2.04, postX, .25, gz, baseStone, true);
    b.box(2.18, .2, 2.08, postX, 5.5, gz, concrete);
    for (const y of [.52, 1.55, 2.58, 3.61]) b.box(2.008, .014, 1.91, postX, y, gz, joints);
    b.box(4.8, 4.2, 5, boothX, 2.1, gz - .45, concrete, true);
    b.box(4.92, .48, 5.08, boothX, .24, gz - .45, baseStone, true);
    b.box(8.35, .23, 5.35, gx + side * 9.95, 4.39, gz - .45, concrete, true);
    b.box(8.55, .12, 5.53, gx + side * 9.95, 4.56, gz - .45, baseStone);
    // Glazing, deep outer frame, sill, muntins and an inward-facing booth door.
    b.box(2.68, 1.56, .06, boothX, 2.38, gz + 2.061, frame);
    b.box(2.48, 1.36, .07, boothX, 2.38, gz + 2.103, glass);
    for (const dx of [-1.23, 0, 1.23]) b.box(.055, 1.43, .12, boothX + dx, 2.38, gz + 2.16, frame);
    for (const y of [1.67, 2.37, 3.09]) b.box(2.58, .055, .12, boothX, y, gz + 2.16, frame);
    b.box(2.9, .13, .44, boothX, 1.58, gz + 2.15, baseStone);
    const doorX = gx + side * 8.97;
    b.box(.08, 2.65, 1.25, doorX, 1.325, gz - .5, frame);
    b.box(.085, 1.35, 1.02, doorX - side * .045, 1.78, gz - .5, glass);
    b.box(.12, .16, .07, doorX - side * .09, 1.14, gz - .04, mats.metal);
  }
  b.box(12.95, .98, 2.12, gx, 5.09, gz, concrete, true);
  b.box(13.35, .16, 2.42, gx, 5.66, gz, baseStone);
  b.box(13.65, .11, 2.58, gx, 5.8, gz, concrete);
  b.box(9.5, .11, .28, gx, 4.59, gz + 1.02, baseStone);
  b.cylinder(new T.Vector3(gx, 5.86, gz - .35), new T.Vector3(gx, 11.1, gz - .35), .035, .025, mats.metal, 10);
  b.add(new T.SphereGeometry(.072, 12, 8), mats.metal, gx, 11.17, gz - .35);
  // Stone bollards mark the pedestrian forecourt, leaving the central route unobstructed.
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const x = gx + side * (3.8 + i * 1.9), z = gz + 6 + i * 1.55;
    b.add(new T.CylinderGeometry(.33, .37, .12, 20), baseStone, x, .06, z);
    b.add(new T.SphereGeometry(.31, 14, 10), concrete, x, .42, z);
    b.solids.push({ x, y: .37, z, w: .64, h: .74, d: .64 });
  }
  // Crossing stripes follow the road in front of the gate; paint has no collision.
  for (let i = 0; i < 12; i++) b.box(7.1, .008, .48, gx, .065, gz + 10 + i * .92, paint);
  const planter = new T.MeshStandardMaterial({ color: 0x982e37, roughness: .85 });
  const soil = new T.MeshStandardMaterial({ color: 0x343b27, roughness: 1 });
  const pink = new T.MeshStandardMaterial({ color: 0xc77c96, roughness: .9 });
  const lightFlower = new T.MeshStandardMaterial({ color: 0xe3c1c7, roughness: .9 });
  const random = rng(2212);
  for (const side of [-1, 1]) for (const offset of [0, 3.3]) {
    const x = gx + side * (14.9 + offset), z = gz + 3.8;
    b.box(1.6, .58, .75, x, .29, z, planter, true);
    b.box(1.72, .08, .86, x, .62, z, planter);
    b.box(1.48, .06, .66, x, .62, z, soil);
    for (let i = 0; i < 42; i++) b.add(new T.SphereGeometry(.065 + random() * .035, 6, 4), i % 3 ? pink : lightFlower, x + (random() - .5) * 1.45, .69 + random() * .17, z + (random() - .5) * .65);
  }
  const group = b.finish('Hankou gate piers booths and forecourt');
  const name = textPlate('南京大学', 6.8, .79, '#b49a47'); name.position.set(gx, 5.1, gz + 1.07); group.add(name);
  const rearName = textPlate('南京大学', 6.8, .79, '#b49a47'); rearName.position.set(gx, 5.1, gz - 1.07); rearName.rotation.y = Math.PI; group.add(rearName);
  const address = textPlate('22', .36, .21, '#f6f5ed', '#294d75', 'sans-serif'); address.position.set(gx - 13.1, 2.2, gz + 2.09); group.add(address);
  const flag = nationalFlag(mats.windTime); flag.position.set(gx, 10.4, gz - .35); group.add(flag);
  group.userData = { reference: 'NJU official VR scene_gl-2-01, front and sides', accuracy: 'photograph-based approximate dimensions; temporary anniversary banners omitted' };
  return { group, solids: b.solids };
}
