import { writeFile, mkdir } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildBeidalou } from '../src/world/beidalou.ts';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

globalThis.FileReader = class {
  result = null;
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
  async readAsDataURL(blob) { this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.(); }
};
const { group, solids } = buildBeidalou();
await mkdir('public/assets/buildings', { recursive: true });
const data = await new GLTFExporter().parseAsync(group, { binary: true, onlyVisible: true });
await writeFile('public/assets/buildings/beidalou.glb', Buffer.from(data));
await writeFile('public/data/beidalou-collision.json', JSON.stringify(solids));
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read('public/assets/buildings/beidalou.glb');
// Materials are attached at runtime: preserve their UV channels even though the
// authoring GLB contains only material names and colors.
await doc.transform(dedup(), weld(), prune({ keepAttributes: true }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write('public/assets/buildings/beidalou.glb', doc);
console.log(`Beidalou exported and Meshopt compressed; ${solids.length} collision solids`);
