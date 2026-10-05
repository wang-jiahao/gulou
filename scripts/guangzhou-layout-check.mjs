import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// CPU-only fixture: no browser, GPU, or running game required. The canvas stub
// is sufficient for geometry/collision checks, not visual lettering validation.
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const context=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>context})};
async function factory(source){
 const result=await build({stdin:{contents:source,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
 return(await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)).createGuangzhouGate;
}
const baselineRef='e7debfd',file='src/world/guangzhou-gate.ts';
const beforeFactory=await factory(execFileSync('git',['show',`${baselineRef}:${file}`],{encoding:'utf8'}));
const afterFactory=await factory(await readFile(file,'utf8'));
const mats={textures:new Map([['stone-grain.webp',new T.Texture()]]),path:new T.MeshStandardMaterial()};
const before=beforeFactory(mats),after=afterFactory(mats),gx=-35.067;
assert.equal(after.solids.length,before.solids.length);
const changed=[];
for(let i=0;i<before.solids.length;i++){
 const a=before.solids[i],b=after.solids[i];
 if(JSON.stringify(a)===JSON.stringify(b))continue;
 assert.equal(a.x,gx-11);assert.equal(b.x,gx+11);
 assert.deepEqual({...a,x:b.x},b,'all other collider properties preserved');changed.push(b);
}
assert.equal(changed.length,2,'only two plaque colliders move');
assert.deepEqual(changed.map(s=>s.w),[5.7,5.2]);
const mesh=after.group.children.find(o=>o.material?.name==='guangzhou-gate-bilingual-lettering');
mesh.geometry.computeBoundingBox();const center=mesh.geometry.boundingBox.getCenter(new T.Vector3());
assert.ok(Math.abs(center.x-(gx+11))<1e-5);assert.ok(center.z>720.8);
assert.equal(mesh.geometry.attributes.normal.getZ(0),1,'lettering faces street');
assert.ok(after.solids.some(s=>s.x===gx-11&&s.d===4.8),'guard pavilion stays left');
await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
for(const s of after.solids)world.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z).setRotation({x:0,y:Math.sin((s.angle||0)/2),z:0,w:Math.cos((s.angle||0)/2)}));
world.step();const routes=[];
function cast(name,a,b,shape,yaw=0){
 const delta={x:b.x-a.x,y:0,z:b.z-a.z};
 const hit=world.castShape(a,{x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)},delta,shape,0,1,true);
 assert.equal(hit,null,name);routes.push(name);
}
for(const mode of['walk','bicycle-envelope'])for(const direction of[-1,1]){
 const shape=mode==='walk'?new RAPIER.Capsule(.5,.32):new RAPIER.Cuboid(.42,.7,1.1);
 for(const u of[-5.2,0,5.2])cast(`${mode}:gate:${u}:${direction}`,{x:gx+u,y:1.1,z:720+direction*11},{x:gx+u,y:1.1,z:720-direction*13},shape);
 for(const side of[-1,1]){
  const point=t=>({x:-35+t*Math.cos(.025)+side*11.6*Math.sin(.025),y:1.1,z:739-t*Math.sin(.025)+side*11.6*Math.cos(.025)});
  cast(`${mode}:street:${side}:${direction}`,point(-25*direction),point(25*direction),shape,Math.PI/2+.025);
 }
}
for(const s of changed){
 const hit=world.castRay(new RAPIER.Ray({x:s.x,y:1.2,z:724},{x:0,y:0,z:-1}),5,true);assert.ok(hit,'right plaque blocks passage');
}
world.free();
const report={version:'0.84.0',baselineRef,passed:true,changedColliders:changed,unchangedColliders:after.solids.length-changed.length,routes,scope:'gate factory solids only; bicycle bounding envelope, not full player dynamics; UI checked separately'};
await mkdir('docs/validation/v0.84',{recursive:true});
await writeFile(`docs/validation/v0.84/layout-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,changed:changed.length,unchanged:report.unchangedColliders,routes:routes.length}));
