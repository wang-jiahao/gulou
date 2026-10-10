import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const built=await build({stdin:{contents:`import {Builder} from './geometry.ts';import {buildEducationStore} from './education-store.ts';import {buildNanyuanParcel} from './nanyuan-parcel.ts';import {buildNjuMemory} from './nju-memory.ts';import {createCampusBoundaries} from './campus-boundaries.ts';export function fixture(map,mats){const b=new Builder(),meshes=[],camera=[],doors=[];const records=[['plan-109',buildEducationStore],['plan-100',buildNanyuanParcel],['plan-76',buildNjuMemory]].map(([id,fn])=>fn(map.features.find(f=>f.id===id),b,meshes,camera,doors));return{group:b.finish('life facilities'),records,meshes,camera,doors,boundary:createCampusBoundaries(mats)};}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {fixture}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));map.features.find(f=>f.id==='plan-100').tags.name='南园快递取件点';
const data=fixture(map,{textures:new Map([['stone-grain.webp',new T.Texture()],['nju-emblem.png',new T.Texture()]])});
let triangles=0;data.group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.getAttribute('position');assert.ok([...p.array].every(Number.isFinite),o.name);assert.ok([...g.getAttribute('normal').array].every(Number.isFinite),o.name);const index=g.index.array;for(const i of index)assert.ok(i<p.count);triangles+=index.length/3;});
const store=data.records.find(r=>r.id==='plan-109'),parcel=data.records.find(r=>r.id==='plan-100'),memory=data.records.find(r=>r.id==='plan-76');
assert.equal(store.storeys,2);assert.equal(parcel.storeys,1);assert.equal(parcel.parcelEntrance.steps,3);assert.equal(memory.takeaway.banks,2);assert.equal(memory.takeaway.canopies,0);assert.equal(data.doors.filter(d=>d.name==='教育超市').length,2);
await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});
for(const r of data.records)world.createCollider(RAPIER.ColliderDesc.cuboid(24,.1,20).setTranslation(r.frontage[0]+5*r.frontage[2],-.1,r.frontage[1]+5*r.frontage[3]));
for(const m of data.meshes)world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices,m.indices));
for(const s of data.boundary.solids){const yaw=s.angle??0;world.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z).setRotation({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}));}world.step();
const point=(front,u,v,y=.91)=>({x:front[0]+u*front[3]+v*front[2],y,z:front[1]-u*front[2]+v*front[3]});
const walks=[],rays=[];
function walk(name,start,target,expectedY=.91,blocked=false){
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...[start.x,start.y,start.z]));
 const capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);world.step();
 let reached=false;for(let i=0;i<900;i++){const p=body.translation(),dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.065){reached=true;break;}motor.computeColliderMovement(capsule,{x:dx/d*.05,y:-.035,z:dz/d*.05});const m=motor.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();}
 for(let i=0;i<20;i++){motor.computeColliderMovement(capsule,{x:0,y:-.035,z:0});const p=body.translation(),m=motor.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();}
 const p=body.translation(),result={name,reached,end:p};walks.push(result);assert.equal(reached,!blocked,JSON.stringify(result));assert.ok(Math.abs(p.y-expectedY)<.11,JSON.stringify(result));world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
for(const [record,entries,entryY]of [[store,[-6.4,6.4],.32],[parcel,[0],.48]]){
 for(const u of entries){walk(`${record.id} approach and climb ${u}`,point(record.frontage,u,5),point(record.frontage,u,.69),.87+entryY);walk(`${record.id} descent ${u}`,point(record.frontage,u,.69,.87+entryY),point(record.frontage,u,5));walk(`${record.id} closed door ${u}`,point(record.frontage,u,5),point(record.frontage,u,-1),.87+entryY,true);}
 for(const direction of[-1,1])walk(`${record.id} front lane ${direction}`,point(record.frontage,-7*direction,3),point(record.frontage,7*direction,3));
}
const front=memory.takeaway.frontage;
for(const direction of[-1,1])walk(`postal public-side pavement ${direction}`,point(front,-5*direction,2.35),point(front,5*direction,2.35));
for(const u of[-1.82,1.82])walk(`postal cabinet approach ${u}`,point(front,u,4),point(front,u,1.43));
for(const [record,u]of [[store,-6.4],[store,6.4],[parcel,0]]){
 const f=record.frontage,o=point(f,u,3,1.8),hit=world.castRay(new RAPIER.Ray(o,{x:-f[2],y:0,z:-f[3]}),4,true);assert.ok(hit);rays.push({name:record.id,u,surface:3-hit.timeOfImpact});assert.ok(3-hit.timeOfImpact>.17&&3-hit.timeOfImpact<.32);
}
for(const u of[-1.82,1.82]){const hit=world.castRay(new RAPIER.Ray(point(front,u,3,1.7),{x:-front[2],y:0,z:-front[3]}),4,true);assert.ok(hit);rays.push({name:'locker front',u,surface:3-hit.timeOfImpact});assert.ok(Math.abs(3-hit.timeOfImpact-.98)<.03);}
// All three buildings and added facilities stay west of the north/south public
// streets. Sweep both directions against the fixture, including retained fence.
for(const [name,ends]of [['小粉桥',[[123,460],[124.1,474]]],['金银街',[[-379.413,-117.376],[-383.808,-91.037]]],['汉口路店前人行道',[[-151,375],[-85,375]]]]){
 const shape=new RAPIER.Capsule(.57,.30),[a,c]=ends.map(([x,z])=>({x,y:1.1,z}));
 for(const [start,end]of [[a,c],[c,a]])assert.equal(world.castShape(start,{x:0,y:0,z:0,w:1},{x:end.x-start.x,y:0,z:end.z-start.z},shape,0,1,true),null,`${name} remains open in facility fixture`);
}
// All changed geometry remains in Nanyuan; it cannot reach northern Nanxiu
// village. The boundary implementation and all public-road coordinates stay unchanged.
for(const mesh of data.meshes)for(let i=2;i<mesh.vertices.length;i+=3)assert.ok(mesh.vertices[i]>375,'no facility reaches the northern public roads');
await mkdir('docs/validation/life-facilities',{recursive:true});await writeFile(`docs/validation/life-facilities/geometry-${Date.now()}.json`,JSON.stringify({passed:true,triangles,records:data.records,walks,rays,scope:'CPU fixture: new facility geometry, player-shaped character-controller stairs and local approach, retained campus boundary and three public-road envelopes. Full game visual/performance verification separate.'},null,2),{flag:'wx'});world.free();console.log(JSON.stringify({passed:true,triangles,walks:walks.length,rays:rays.length,publicStreetSweeps:6}));
