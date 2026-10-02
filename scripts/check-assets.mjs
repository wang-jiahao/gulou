import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { ShapeUtils } from 'three';

async function files(path) {
  const out = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = `${path}/${entry.name}`; if (entry.isDirectory()) out.push(...await files(name)); else out.push(name);
  }
  return out;
}
let count = 0;
for (const path of await files('public')) {
  if (path.endsWith('.glb')) {
    const b = await readFile(path); assert.equal(b.toString('utf8',0,4),'glTF',path); assert.equal(b.readUInt32LE(8),b.length,`${path} is truncated`);
    const json = JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
    if (/\/(beidalou|east|west|auditorium)\.glb$/.test(path)) for (const mesh of json.meshes) for (const primitive of mesh.primitives) assert.ok(primitive.attributes.TEXCOORD_0 !== undefined, 'Runtime-textured architecture must retain UVs after optimization');
    if(/student-(natural|male|female)\.glb$/.test(path))assert.ok(json.skins?.length>0,'Student must retain a deformable skeleton');
    for (const image of json.images ?? []) assert.ok(!image.uri || image.uri.startsWith('data:'),`${path} unexpectedly depends on an external image`);
    count++;
  } else if (/\.(png|webp|jpg)$/.test(path)) {
    const meta = await sharp(path, { failOn: 'warning' }).stats(); assert.ok(meta.channels.length > 0,path); count++;
  } else if (path.endsWith('.wav')) { const b = await readFile(path); assert.equal(b.toString('ascii',0,4),'RIFF'); assert.equal(b.toString('ascii',8,12),'WAVE'); assert.equal(b.readUInt32LE(4)+8,b.length); count++;
  } else if (path.endsWith('.json')) {
    const data = JSON.parse(await readFile(path,'utf8'));
    if (path.endsWith('/gate-lettering.typeface.json')) {
      const font = new FontLoader().parse(data);
      for (const letter of '南京大学严肃活泼团结紧张') {
        assert.ok(data.glyphs[letter], `Missing gate character ${letter}`);
        const area = font.generateShapes(letter, 1).reduce((sum, shape) => {
          const p = shape.extractPoints(5);
          return sum + Math.abs(ShapeUtils.area(p.shape)) - p.holes.reduce((a, h) => a + Math.abs(ShapeUtils.area(h)), 0);
        }, 0);
        assert.ok(area > .1, `${letter}: filled strokes missing; check exterior/hole winding`);
      }
    }
    count++;
  }
}
console.log(`Verified ${count} models, images and data files.`);
