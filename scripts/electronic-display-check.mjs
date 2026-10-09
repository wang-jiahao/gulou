import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';

// Offline geometry and collision fixture. This does not verify campus placement,
// appearance in the game, source accuracy, or whole-campus frame rate.
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const labels=[];
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),fillText:text=>labels.push(text)}, {get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const bundle=await build({stdin:{contents:`import * as T from 'three';export {T};export {createNanyuanElectronicDisplay} from './nanyuan-electronic-display.ts';`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {T,createNanyuanElectronicDisplay}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const result=createNanyuanElectronicDisplay();result.group.updateMatrixWorld(true);
assert.deepEqual(labels,['热烈欢迎南京大学2023级新生'],'no fabricated poster event copy');
assert.equal(result.group.userData.placement,'unverified; not in the campus world');
let triangles=0;
result.group.traverse(o=>{
 assert.ok(!o.isLight,'asset uses no new lights');
 if(!o.isMesh)return;
 for(const a of Object.values(o.geometry.attributes))assert.ok(Array.from(a.array).every(Number.isFinite),'finite geometry');
 triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
});
await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});
world.createCollider(RAPIER.ColliderDesc.cuboid(20,.1,10).setTranslation(0,-.1,0));
for(const s of result.solids)world.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z));
world.step();
const routes=[];
function route(name,start,target,radius,blocked=false){
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start[0],.61+radius,start[1]));
 const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.57,radius),body),controller=world.createCharacterController(.02);
 controller.enableSnapToGround(.3);world.step();let reached=false;
 for(let i=0;i<1200;i++){
  const p=body.translation(),dx=target[0]-p.x,dz=target[1]-p.z,d=Math.hypot(dx,dz);
  if(d<.07){reached=true;break;}
  controller.computeColliderMovement(collider,{x:dx/d*.04,y:-.035,z:dz/d*.04});const m=controller.computedMovement();
  body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();
 }
 const end=body.translation();assert.equal(reached,!blocked,`${name}: ${JSON.stringify(end)}`);assert.ok(end.y>.75,'supported by ground');
 routes.push({name,reached});world.removeCharacterController(controller);world.removeRigidBody(body);world.step();
}
for(const radius of [.27,.62])for(const z of [-1.25,1.25])for(const direction of [-1,1])route(`front/back transit radius ${radius} z ${z} direction ${direction}`,[-9*direction,z],[9*direction,z],radius);
for(const side of [-1,1])route(`body blocks from ${side}`,[0,side*2],[0,-side*2],.27,true);
for(const x of [-8,8])route(`outside end ${x}`,[x,-2],[x,2],.62);
const rays=[];
for(const [name,from,to,blocked] of [
 ['front body',[0,1.6,2],[0,1.6,-2],true],['rear body',[0,1.6,-2],[0,1.6,2],true],
 ['canopy',[0,3.48,2],[0,3.48,-2],true],['above',[0,3.7,2],[0,3.7,-2],false],
 ['left edge',[-7.5,1.6,2],[-7.5,1.6,-2],false],['right edge',[7.5,1.6,2],[7.5,1.6,-2],false],
 ]){
 const origin=new T.Vector3(...from),delta=new T.Vector3(...to).sub(origin),ray=new T.Raycaster(origin,delta.clone().normalize(),0,delta.length());
 assert.equal(ray.intersectObjects(result.cameraSolids,false).length>0,blocked,name);rays.push(name);
}
world.free();
console.log(JSON.stringify({status:'passed',triangles,meshes:result.group.children.length,solids:result.solids.length,routes:routes.length,cameraRays:rays.length,scope:'Unplaced asset only; artwork, actual cycling and campus integration require separate verification.'}));
