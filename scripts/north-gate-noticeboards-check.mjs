import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const gradient={addColorStop(){}};
const ctx=new Proxy({measureText:()=>({width:50}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const built=await build({stdin:{contents:`import {createCampusDirectory,nanyuanNoticeboardRuns} from './campus-directory.ts';import {buildOrdinaryBuildings} from './ordinary-buildings.ts';import {createSonglinGarden,songlinGarden} from './songlin-garden.ts';export function fixture(map,mats){return{directory:createCampusDirectory(map,mats),college:buildOrdinaryBuildings(map.features.filter(f=>f.id==='plan-85'),mats,map.roads),garden:createSonglinGarden(mats),path:songlinGarden.path,runs:nanyuanNoticeboardRuns};}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {fixture}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8')),mats={textures:new Map(['historic-brick.webp','stone-grain.webp','nju-emblem.png'].map(n=>[n,new T.Texture()]))};for(const n of ['stone','grass','path','brick','wood','metal','bark'])mats[n]=new T.MeshStandardMaterial({name:n});
const data=fixture(map,mats),{directory}=data,boards=directory.group.userData.boards;let triangles=0;
directory.group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.getAttribute('position');assert.ok([...p.array].every(Number.isFinite),o.name);assert.ok([...g.getAttribute('normal').array].every(Number.isFinite),o.name);for(const i of g.index.array)assert.ok(i<p.count);triangles+=g.index.count/3;});
assert.equal(boards.length,4);assert.ok(directory.group.userData.panelCount>=18);
const p=(board,u,v,y=.92)=>({x:board.x+u*Math.cos(board.angle)+v*Math.sin(board.angle),y,z:board.z-u*Math.sin(board.angle)+v*Math.cos(board.angle)});
for(const board of boards){assert.equal(directory.nearby(p(board,0,1.5,0))?.id,board.id);assert.equal(directory.nearby(p(board,0,-1,0)),null);assert.equal(directory.nearby(p(board,0,1.5,2.3)),null);}
assert.ok(directory.nearby({...directory.arrival,y:0}));assert.equal(directory.board.name,'南园导览栏');
await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0}),wallWorld=new RAPIER.World({x:0,y:0,z:0});
for(let x=-136;x<-48;x+=16)for(let z=376;z<456;z+=16)world.createCollider(RAPIER.ColliderDesc.cuboid(8,.1,8).setTranslation(x+8,-.1,z+8));
const addSolid=(target,s)=>{const a=s.angle??0;target.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z).setRotation({x:0,y:Math.sin(a/2),z:0,w:Math.cos(a/2)}));};
for(const s of directory.solids){addSolid(world,s);addSolid(wallWorld,s);}for(const s of data.garden.solids)addSolid(world,s);
for(const m of [...data.college.fixedMeshes,...data.garden.fixedMeshes])world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices,m.indices));world.step();wallWorld.step();
const walks=[],rays=[],sweeps=[];
function walk(name,start,target,blocked=false){
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x,start.y??.92,start.z)),capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);world.step();
 let reached=false,minY=2,maxY=-2;for(let i=0;i<1500;i++){const a=body.translation(),dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz);if(d<.065){reached=true;break;}motor.computeColliderMovement(capsule,{x:dx/d*.055,y:-.035,z:dz/d*.055});const m=motor.computedMovement();body.setNextKinematicTranslation({x:a.x+m.x,y:a.y+m.y,z:a.z+m.z});world.step();minY=Math.min(minY,body.translation().y);maxY=Math.max(maxY,body.translation().y);}
 const result={name,reached,end:body.translation(),minY,maxY};assert.equal(reached,!blocked,JSON.stringify(result));assert.ok(minY>.76&&maxY<1.13,JSON.stringify(result));walks.push(result);world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
for(const board of boards){
 for(const u of [-board.width*.28,0,board.width*.28]){
  walk(`${board.id} solid glazed wall ${u.toFixed(1)}`,p(board,u,2),p(board,u,-1),true);
  const ray=new RAPIER.Ray(p(board,u,3,1.35),{x:-Math.sin(board.angle),y:0,z:-Math.cos(board.angle)}),hit=wallWorld.castRay(ray,5,true);assert.ok(hit);assert.ok(Math.abs(3-hit.timeOfImpact-.31)<.025);rays.push({board:board.id,u,front:3-hit.timeOfImpact});
 }
}
for(const direction of [-1,1]){
 const west=[{x:-94.64,z:391},{x:-93.31,z:427}],east=[{x:-79.42,z:391},{x:-77.20,z:438}];
 for(const [name,line]of [['west-side pavement',west],['east-side pavement',east]]){if(direction<0)line.reverse();walk(`${name} ${direction}`,...line);}
 walk(`west z430 junction ${direction}`,{x:direction>0?-121:-83,z:430},{x:direction>0?-83:-121,z:430});
 walk(`fountain northern ring approach ${direction}`,{x:direction>0?-103:-70,z:439.4},{x:direction>0?-70:-103,z:439.4});
}
const college=data.college.records.find(r=>r.id==='plan-85'),[cx,cz,nx,nz]=college.frontage;assert.ok(nx>.9,'checked east-facing college entry');
for(const u of [-1.2,0,1.2])for(const direction of [-1,1]){
 const a={x:cx+u*nz+nx*4,z:cz-u*nx+nz*4},b={x:cx+u*nz+nx*2.12,z:cz-u*nx+nz*2.12};walk(`plan85 doorway ${u} ${direction}`,...(direction>0?[a,b]:[b,a]));
}
for(const z of [420.4,420.8,421.2])for(const direction of [-1,1])walk(`Songlin existing path ${z} ${direction}`,{x:direction>0?-84:-73,z},{x:direction>0?-73:-84,z});
// Check the entire original Songlin corridor against the new walls; the
// existing stone table at its east end is intentionally in the full fixture.
for(const z of [data.path.minZ+.3,420.8,data.path.maxZ-.3]){
 const a={x:data.path.minX-.5,y:1.05,z},b={x:data.path.maxX+.3,y:1.05,z},shape=new RAPIER.Capsule(.57,.27);for(const [start,end]of [[a,b],[b,a]]){assert.equal(wallWorld.castShape(start,{x:0,y:0,z:0,w:1},{x:end.x-start.x,y:0,z:0},shape,0,1,true),null,'no new obstruction anywhere on Songlin path');sweeps.push({name:'Songlin complete path',z});}
}
for(const [name,points]of [['west carriageway',[[-93.35,398],[-92.95,414],[-92.45,424]]],['east carriageway',[[-83.35,398],[-82.55,414],[-80.2,438]]]])for(let i=1;i<points.length;i++){
 const [a,b]=[points[i-1],points[i]].map(([x,z])=>({x,y:1.05,z}));for(const [start,end]of [[a,b],[b,a]]){assert.equal(wallWorld.castShape(start,{x:0,y:0,z:0,w:1},{x:end.x-start.x,y:0,z:end.z-start.z},new RAPIER.Capsule(.57,.3),0,1,true),null,name);sweeps.push({name,segment:i});}
}
const report={passed:true,triangles,boards:boards.map(({id,x,z,width,angle})=>({id,x,z,width,angle})),panelCount:directory.group.userData.panelCount,arrival:directory.arrival,walks,rays,sweeps,scope:'Actual directory + ordinary plan85 entrance + Songlin path/table colliders with tiled flat ground. Four solid display walls, side pavements, junction, fountain approach, college doorway and Songlin tested with Rapier controller. Full game visual/GPU/trees and final gate joins remain separate.'};
await mkdir('docs/validation/life-facilities',{recursive:true});await writeFile(`docs/validation/life-facilities/north-walls-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});world.free();wallWorld.free();console.log(JSON.stringify({passed:true,triangles,panels:report.panelCount,walks:walks.length,rays:rays.length,sweeps:sweeps.length}));
