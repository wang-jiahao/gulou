import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const bundle=await build({stdin:{contents:`
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAvatar} from './src/player/avatar.ts';
export {T};
export async function fixture(kind,buffer){
 const loader=new GLTFLoader();
 GLTFLoader.prototype.loadAsync=()=>loader.parseAsync(buffer,'');
 T.TextureLoader.prototype.loadAsync=async()=>new T.Texture();
 return createAvatar(kind);
}`,loader:'ts',resolveDir:resolve('.')},bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env.BASE_URL':'""'}});
const {T,fixture}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const cases=[['idle',0,false,false,undefined],['walk',1.3,false,false,undefined],['run',4.2,false,false,undefined],['sit',0,true,false,undefined],['ride',0,false,false,1.2],['fly',0,false,true,undefined]];
let samples=0;const inputs=[];
for(const kind of ['male','female']){
 const raw=await readFile(`public/assets/characters/student-${kind}.glb`),doc=await io.readBinary(raw);
 // Node lacks a DOM image decoder. Decode meshopt and strip images only in an
 // in-memory copy, preserving geometry, joints and inverse bind matrices.
 const embeddedTexturesStripped=doc.getRoot().listTextures().length;
 for(const texture of doc.getRoot().listTextures())texture.dispose();
 for(const extension of doc.getRoot().listExtensionsUsed())if(extension.extensionName==='EXT_meshopt_compression')extension.dispose();
 const bytes=await io.writeBinary(doc),avatar=await fixture(kind,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 inputs.push({kind,sourceBytes:raw.byteLength,embeddedTexturesStripped});
 for(const [name,speed,seated,flying,cyclingPhase] of cases){
  for(let i=0;i<30;i++)avatar.update(1/60,speed,seated,flying,.55,cyclingPhase===undefined?undefined:cyclingPhase+i*.03);
  avatar.root.updateMatrixWorld(true);
  avatar.root.traverse(mesh=>{
   if(!mesh.isSkinnedMesh)return;
   mesh.skeleton.update();
   for(let i=0;i<mesh.geometry.attributes.position.count;i+=37){
    const p=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld);
    assert.ok(p.toArray().every(Number.isFinite),`${kind}/${name}: finite deformed mesh`);
    assert.ok(Math.abs(p.x)<2&&Math.abs(p.z)<2&&p.y>-.3&&p.y<2.2,`${kind}/${name}: bounded deformed mesh`);samples++;
   }
  });
 }
 avatar.dispose();
}
const report={passed:true,characters:2,poses:cases.map(c=>c[0]),deformedVertexSamples:samples,inputs,scope:'Actual formal avatar and public GLBs in Node; images stripped and meshopt decoded only in memory, fabric texture stubbed. No GLB writes, GPU rendering/release or campus collision test.'};
await mkdir('docs/validation/v0.111',{recursive:true});
await writeFile(`docs/validation/v0.111/character-poses-${Date.now()}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
