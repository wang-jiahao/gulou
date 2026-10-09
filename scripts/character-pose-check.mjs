import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const bundle=await build({stdin:{contents:`
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createAvatar} from './src/player/avatar.ts';
export {T};
export async function fixture(kind,buffer){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 GLTFLoader.prototype.loadAsync=()=>loader.parseAsync(buffer,'');
 T.TextureLoader.prototype.loadAsync=async()=>new T.Texture();
 return createAvatar(kind);
}`,loader:'ts',resolveDir:resolve('.')},bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env.BASE_URL':'""'}});
const {T,fixture}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const cases=[['idle',0,false,false,undefined],['walk',1.3,false,false,undefined],['run',4.2,false,false,undefined],['sit',0,true,false,undefined],['ride',0,false,false,1.2],['fly',0,false,true,undefined]];
let samples=0;
for(const kind of ['male','female']){
 const raw=await readFile(`public/assets/characters/student-${kind}.glb`),avatar=await fixture(kind,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
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
const report={passed:true,characters:2,poses:cases.map(c=>c[0]),deformedVertexSamples:samples,scope:'Actual avatar animation + generated GLB in Node; texture stub only, no GPU or campus collision test'};
await writeFile(`docs/validation/v0.107/character-poses-${Date.now()}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
