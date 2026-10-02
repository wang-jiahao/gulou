import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, simplify, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await mkdir('public/assets/vegetation', { recursive: true });
for (const [lod, ratio] of [['near', .028], ['far', .008], ['distant', .00085]]) {
  const doc = await io.read('assets/source-models/tree-small/tree.gltf');
  for (const material of doc.getRoot().listMaterials()) {
    material.setDoubleSided(true).setAlphaMode('OPAQUE').setRoughnessFactor(.94).setMetallicFactor(0);
  }
  await doc.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: .09, lockBorder: false }), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 85 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  let triangles = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) triangles += p.getIndices().getCount() / 3;
  await io.write(`public/assets/vegetation/tree-${lod}.glb`, doc);
  console.log(lod, triangles, 'triangles');
}
