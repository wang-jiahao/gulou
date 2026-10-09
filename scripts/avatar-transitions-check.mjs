import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';

const root=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');

async function main(){
  await MeshoptDecoder.ready;
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  // Import the real runtime. Only its asset-loading boundary is replaced.
  const bundle=await build({stdin:{contents:`
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAvatar} from './src/player/avatar.ts';
export {T};
export async function fixture(kind,bytes){
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const fabric=new T.Texture();fabric.name='stub fabric';
  GLTFLoader.prototype.loadAsync=async()=>gltf;
  T.TextureLoader.prototype.loadAsync=async()=>fabric;
  return {avatar:await createAvatar(kind),fabric};
}`,loader:'ts',resolveDir:root},bundle:true,write:false,platform:'node',format:'esm',
    logLevel:'silent',define:{'import.meta.env.BASE_URL':'""'}});
  const {T,fixture}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const characters=[];
  for(const kind of ['male','female']){
    const path=new URL(`../public/assets/characters/student-${kind}.glb`,import.meta.url);
    const raw=await readFile(path),doc=await io.readBinary(raw),sourceTextureCount=doc.getRoot().listTextures().length;
    // Node has no DOM image decoder. Decode meshopt and remove images only in
    // memory; retain geometry, hierarchy, quantization and inverse bind data.
    for(const texture of doc.getRoot().listTextures())texture.dispose();
    for(const extension of doc.getRoot().listExtensionsUsed())if(extension.extensionName==='EXT_meshopt_compression')extension.dispose();
    const bytes=await io.writeBinary(doc),transitions=[];
    for(const action of ['basketball-release-to-idle','ride-dismount-to-idle']){
      const {avatar}=await fixture(kind,bytes),rest=new Map();
      avatar.root.traverse(bone=>{
        if(bone.isBone&&(bone.name.endsWith('Hand')||bone.name.includes('Finger')))rest.set(bone,bone.quaternion.clone());
      });
      assert.equal([...rest.keys()].filter(b=>b.name.endsWith('Hand')).length,2,`${kind}: two hand joints`);
      let activeHandRotation=0;
      try{
        for(let frame=1;frame<=120;frame++){
          const riding=action==='ride-dismount-to-idle'&&frame>20&&frame<=65;
          avatar.update(1/60,0,false,false,.55,riding?1.2+(frame-1)*Math.PI*2/60:undefined);
          if(action==='basketball-release-to-idle'){
            if(frame<=20)avatar.poseBasketball(true,0);
            else if(frame<=47)avatar.poseBasketball(false,Math.max(0,1-(frame-21)/27));
          }
          for(const [bone,initial]of rest){
            assert.ok(bone.quaternion.toArray().every(Number.isFinite),`${kind}/${action}: finite ${bone.name}`);
            if(bone.name.endsWith('Hand'))activeHandRotation=Math.max(activeHandRotation,bone.quaternion.angleTo(initial));
          }
        }
        assert.ok(activeHandRotation>.1,`${kind}/${action}: fixture must exercise hand rotation`);
        const residuals=[...rest].map(([bone,initial])=>({bone:bone.name,radians:bone.quaternion.angleTo(initial)}));
        const failed=residuals.filter(r=>r.radians>1e-5);
        assert.deepEqual(failed,[],`${kind}/${action}: hands and fingers return to standing orientation`);
        transitions.push({action,passed:true,maxResidualRadians:Math.max(...residuals.map(r=>r.radians))});
      }finally{avatar.dispose();}
    }

    const {avatar,fabric}=await fixture(kind,bytes);
    const materials=[...avatar.materials].filter(m=>m instanceof T.MeshStandardMaterial);
    assert.ok(materials.length>=3,`${kind}: material fixtures`);
    const [a,b,c]=materials,shared=new T.Texture(),roughness=new T.Texture(),normal=new T.Texture(),late=new T.Texture();
    shared.name='shared color';roughness.name='shared roughness/metalness';normal.name='normal';late.name='late-bound texture';
    // Attach after creation: disposal must inspect current material slots.
    a.map=shared;b.map=shared;a.roughnessMap=roughness;a.metalnessMap=roughness;b.normalMap=normal;c.emissiveMap=late;
    const textures=new Set([fabric]),counts=new Map();let referenceSlots=0;
    for(const material of materials)for(const value of Object.values(material))if(value instanceof T.Texture){textures.add(value);referenceSlots++;}
    assert.equal(textures.size,5,`${kind}: five unique textures across shared slots`);
    for(const texture of textures){counts.set(texture,0);texture.addEventListener('dispose',()=>counts.set(texture,counts.get(texture)+1));}
    avatar.dispose();
    for(const [texture,count]of counts)assert.equal(count,1,`${kind}: ${texture.name} disposed once`);
    assert.equal(hash(await readFile(path)),hash(raw),`${kind}: source GLB unchanged during check`);
    characters.push({kind,glbSha256:hash(raw),sourceTextureCount,transitions,
      disposal:{passed:true,uniqueTextures:textures.size,materialReferenceSlots:referenceSlots,events:[...counts].map(([t,count])=>({name:t.name,count}))}});
  }
  console.log(JSON.stringify({passed:true,characters,
    scope:'Actual src/player/avatar.ts and public GLBs; two hand-recovery transitions and a five-texture disposal event simulation. GLBs are never written. In-memory image stripping enables Node loading; it does not verify image decoding, GPU rendering, GPU release, or absence of memory leaks.'}));
}
main().catch(error=>{console.error(`${error.name}: ${error.message}`);process.exitCode=1;});
