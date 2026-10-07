import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';

const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
const bundle=await build({stdin:{contents:`
import * as T from 'three';
import {Builder} from './geometry.ts';
import {buildWestHeritage} from './west-heritage.ts';
export {T};
export function fixture(f){
 const b=new Builder(),meshes=[],camera=[],doors=[];
 const record=buildWestHeritage(f,b,meshes,camera,doors);
 return {record,meshes,camera,doors,group:b.finish('west heritage')};
}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {T,fixture}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
await RAPIER.init();
const reports=[];
for(const id of ['plan-38','plan-51']){
 const data=fixture(map.features.find(f=>f.id===id)),r=data.record,law=id==='plan-51';
 const [cx,cz,nx,nz]=r.frontage;
 const point=(u,v,y=.91)=>({x:cx+u*nz+v*nx,y,z:cz-u*nx+v*nz});
 const uv=p=>[(p.x-cx)*nz-(p.z-cz)*nx,(p.x-cx)*nx+(p.z-cz)*nz];
 let renderMeshes=0,triangles=0;
 data.group.traverse(m=>{if(m.isMesh){renderMeshes++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;for(const attr of Object.values(m.geometry.attributes))assert.ok(attr.array.every(Number.isFinite),`${id} finite render geometry`);}});
 const world=new RAPIER.World({x:0,y:-9.81,z:0});
 for(const m of data.meshes){assert.ok(m.vertices.every(Number.isFinite));assert.ok(m.indices.every(i=>i<m.vertices.length/3));world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices,m.indices));}
 world.createCollider(RAPIER.ColliderDesc.cuboid(100,.1,100).setTranslation(cx,-.1,cz));world.step();
 const walks=[];
 function walk(name,start,end,{blocked=false,height,stopV,stopU}={}){
  const s=point(...start),target=point(...end),body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(s.x,s.y,s.z));
  const capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);
  motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);world.step();
  let reached=false,minY=s.y,maxY=s.y;
  for(let i=0;i<1500;i++){
   const p=body.translation(),dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
   if(d<.06){reached=true;break;}
   motor.computeColliderMovement(capsule,{x:dx/d*.045,y:-.035,z:dz/d*.045});
   const m=motor.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();
   minY=Math.min(minY,body.translation().y);maxY=Math.max(maxY,body.translation().y);
  }
  const at={...body.translation()},endUV=uv(at),description=`${id} ${name}: ${JSON.stringify({reached,endUV,y:at.y})}`;
  assert.equal(reached,!blocked,description);
  if(height!==undefined)assert.ok(Math.abs(at.y-height)<.09,description);
  if(stopV)assert.ok(endUV[1]>stopV[0]&&endUV[1]<stopV[1],description);
  if(stopU)assert.ok(Math.abs(endUV[0])>stopU[0]&&Math.abs(endUV[0])<stopU[1],description);
  assert.ok(minY>.80&&maxY<r.landing+1.15,`${description} no falling through or climbing rails`);
  walks.push({name,reached,endUV,y:at.y,minY,maxY});world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
 }
 const outer=law?16:7,lanes=law?[-2,0,2]:[-.9,0,.9],standing=r.landing+.86;
 for(const u of lanes){walk(`stairs ascend ${u}`,[u,outer],[u,1.3],{height:standing});walk(`stairs descend ${u}`,[u,1.3,standing],[u,outer],{height:.86});}
 walk('closed front door',[r.doorU,1.3,standing],[r.doorU,-1],{blocked:true,height:standing,stopV:[.5,.8]});
 if(law){
  for(const s of[-1,1])walk(`upper stair rail ${s}`,[0,5,3.65],[s*5,5],{blocked:true,stopU:[3.1,3.55]});
  for(const s of[-1,1]){walk(`lower terrace ascend ${s}`,[s*7,16],[s*7,9],{height:2});walk(`lower terrace descend ${s}`,[s*7,9,2],[s*7,16],{height:.86});}
 }else{
  // Aim at the column centre: a destination beyond a round column can legitimately
  // be reached by sliding around it, which is not a collision failure.
  for(const s of[-1,1])walk(`front column ${s}`,[0,2.63,standing],[s*2.18,2.63],{blocked:true,height:standing,stopU:[1.5,1.8]});
  walk('landing to offset red door',[.7,1.1,standing],[-1.22,1.1],{height:standing});
 }
 // Proxies must survive Builder.finish(), including upward ceiling rays and roof rays.
 for(const m of data.camera)m.updateMatrixWorld(true);
 const cameraSamples=[];
 function ray(name,u,v,y,dir,max=100,minDistance=0){
  const p=point(u,v,y),direction=new T.Vector3(...dir),hits=new T.Raycaster(new T.Vector3(p.x,p.y,p.z),direction,0,max).intersectObjects(data.camera,false);
  assert.ok(hits.length&&hits[0].distance>=minDistance,`${id} camera ${name}`);cameraSamples.push({name,distance:hits[0].distance});
 }
 ray('door',r.doorU,1.3,r.landing+1.4,[-nx,0,-nz],1.3);
 for(const u of lanes)ray(`landing ${u}`,u,1.3,r.landing+2,[0,-1,0],2.2);
 for(const u of[-1,1])ray(`roof ${u}`,u,-4,25,[0,-1,0],25,25-r.height-.1);
 if(!law)ray('balcony ceiling',0,1.3,3,[0,1,0],2);
 assert.equal(data.doors.length,1);assert.equal(data.doors[0].name,r.name);
 reports.push({id,name:r.name,renderMeshes,triangles,collisionMeshes:data.meshes.length,walks,cameraSamples});world.free();
}
const dir='docs/validation/v0.101';await mkdir(dir,{recursive:true});
await writeFile(`${dir}/west-heritage-${Date.now()}.json`,JSON.stringify({passed:true,reports,scope:'Actual registered footprints and entrance geometry using Rapier capsule/character controller. Includes door, column, stair rail and camera proxies after render geometry merging. Full-scene props and asynchronous vegetation are not instantiated; photo-obscured dimensions approximate.'},null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,buildings:reports.map(r=>({id:r.id,meshes:r.renderMeshes,triangles:r.triangles,walks:r.walks.length,cameraSamples:r.cameraSamples.length}))}));
