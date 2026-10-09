import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const written=[];const ctx=new Proxy({measureText:()=>({width:50}),fillText:(s)=>written.push(s)},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const result=await build({stdin:{contents:`
import * as T from 'three';
import {buildOrdinaryBuildings} from './ordinary-buildings.ts';
import {buildingProfiles,getBuildingProfile} from './building-profiles.ts';
export {T};export {getPlaceStory,placeStories} from './place-stories.ts';
export function fixture(feature,roads,levels){
 const profile=buildingProfiles[feature.id],old=profile.levels;
 if(levels)profile.levels=levels;
 try{return{...buildOrdinaryBuildings([feature],{textures:new Map([['stone-grain.webp',null],['historic-brick.webp',null]])},roads),profile:getBuildingProfile(feature)}}
 finally{profile.levels=old;}
}
export function shellControl(f,roads){
 buildingProfiles['southeast-shell-control']={...buildingProfiles[f.id]};
 try{return buildOrdinaryBuildings([{...f,id:'southeast-shell-control'}],{textures:new Map([['stone-grain.webp',null],['historic-brick.webp',null]])},roads)}
 finally{delete buildingProfiles['southeast-shell-control'];}
}
`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {T,fixture,shellControl,getPlaceStory,placeStories}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8')),feature=id=>map.features.find(f=>f.id===id);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const before=fixture(feature('plan-122'),map.roads,6),after=fixture(feature('plan-122'),map.roads);
assert.equal(before.records[0].height,19.5);assert.equal(after.records[0].height,13);assert.equal(after.profile.levels,4);
assert.deepEqual(after.records[0].frontage,before.records[0].frontage);assert.deepEqual(after.doors,before.doors);
assert.equal(after.profile.wall,before.profile.wall);assert.equal(after.profile.frame,before.profile.frame);
assert.ok(after.records[0].windows<before.records[0].windows);assert.deepEqual(after.fixedMeshes.slice(1),before.fixedMeshes.slice(1));
assert.equal(getPlaceStory('南园十一舍'),placeStories['南园11舍']);
assert.ok(getPlaceStory('南园11舍').summary.includes('四层'));
const control=shellControl(feature('plan-44'),map.roads),southeast=fixture(feature('plan-44'),map.roads),e=southeast.group.userData.southeastEntrance;
assert.equal(hash(southeast.fixedMeshes[0]),hash(control.fixedMeshes[0]),'existing building shell unchanged');
assert.equal(southeast.records[0].height,control.records[0].height);assert.ok(e.frontage[2]<-.98);
assert.deepEqual(written.filter(s=>s==='南京大学'||s==='医学院'),['南京大学','医学院']);
assert.equal(e.plaque.text,'南京大学医学院');assert.ok(e.plaque.u>0);assert.equal(southeast.doors[0].y,e.landing);
assert.equal(getPlaceStory('南京大学医学院临床模拟教学中心'),placeStories['东南楼']);
const report={passed:false,scope:'Full local generated building fixtures including unchanged original shells, real Rapier walking and camera surfaces. Full scene vegetation/GPU and final browser appearance separate.',dormitory:{previousHeight:19.5,height:13,levels:4,frontage:after.records[0].frontage,doorRetained:true,windowCount:after.records[0].windows},entrance:{...e,boxes:e.boxes.length},walks:[],rays:[]};
for(const data of [after,southeast])data.group.traverse(m=>{if(m.isMesh)for(const a of Object.values(m.geometry.attributes))assert.ok(a.array.every(Number.isFinite));});
await RAPIER.init();
const world=new RAPIER.World({x:0,y:-9.81,z:0});
for(const mesh of [...southeast.fixedMeshes,...after.fixedMeshes])world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));
for(const id of ['plan-44','plan-122']){const p=feature(id).points;world.createCollider(RAPIER.ColliderDesc.cuboid(100,.1,100).setTranslation(p[0][0],-.1,p[0][1]));}world.step();
const [cx,cz,nx,nz]=e.frontage;
const point=(u,v,y=.86)=>({x:cx+u*nz+v*nx,y,z:cz-u*nx+v*nz});
function walk(name,a,b,{blocked=false,height=.86}={}){
 const start=point(...a),end=point(...b),body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x,start.y,start.z));
 const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);motor.setMaxSlopeClimbAngle(Math.PI/4);motor.setMinSlopeSlideAngle(Math.PI/3);world.step();
 let reached=false,vy=0,minY=99,maxY=-99;
 for(let i=0;i<1800;i++){
  const p=body.translation(),dx=end.x-p.x,dz=end.z-p.z,d=Math.hypot(dx,dz);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);if(d<.065){reached=true;break;}
  vy=Math.max(-18,vy-9.81/60);motor.computeColliderMovement(collider,{x:dx/d*.055,y:vy/60,z:dz/d*.055});const m=motor.computedMovement();if(motor.computedGrounded())vy=-.5;body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();
 }
 const p=body.translation(),summary={name,reached,u:(p.x-cx)*nz-(p.z-cz)*nx,v:(p.x-cx)*nx+(p.z-cz)*nz,y:p.y,minY,maxY};assert.equal(reached,!blocked,JSON.stringify(summary));assert.ok(Math.abs(p.y-height)<.12,JSON.stringify(summary));assert.ok(minY>.80&&maxY<e.landing+1.03,JSON.stringify(summary));report.walks.push(summary);world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
for(const u of [-1.1,0,1.1]){walk(`west entrance up ${u}`,[u,11],[u,1.9],{height:e.landing+.86});walk(`west entrance down ${u}`,[u,1.9,e.landing+.86],[u,11]);}
walk('closed doorway',[0,1.9,e.landing+.86],[0,-1],{blocked:true,height:e.landing+.86});
for(const s of [-1,1]){walk(`landing side rail ${s}`,[0,1.9,e.landing+.86],[s*5,1.9],{blocked:true,height:e.landing+.86});walk(`front walk ${s}`,[s*14,12],[-s*14,12]);}
for(const m of [...southeast.cameraSolids,...after.cameraSolids])m.updateMatrixWorld(true);
function ray(name,origin,direction,max,expected=true){const hits=new T.Raycaster(new T.Vector3(origin.x,origin.y,origin.z),direction,0,max).intersectObjects([...southeast.cameraSolids,...after.cameraSolids],false);assert.equal(!!hits.length,expected,name);report.rays.push({name,hit:!!hits.length,distance:hits[0]?.distance??null});}
ray('portal lintel',point(0,1.5,5),new T.Vector3(0,1,0),3);
ray('closed door',point(0,1.5,3.5),new T.Vector3(-nx,0,-nz),2);
ray('landing surface',point(0,1.9,5),new T.Vector3(0,-1,0),3);
ray('lower stair surface',point(0,7.3,3),new T.Vector3(0,-1,0),3);
for(let i=0;i<=14;i++)ray(`stair seam ${i}`,point(0,2.68+i*.42,3),new T.Vector3(0,-1,0),3);
const [dx,dz]=after.records[0].frontage;const c=feature('plan-122').points,center={x:c.reduce((s,p)=>s+p[0],0)/c.length,z:c.reduce((s,p)=>s+p[1],0)/c.length};
ray('dorm roof lowered to four floors',{x:center.x,y:30,z:center.z},new T.Vector3(0,-1,0),30);
const roofRay=report.rays.at(-1);assert.ok(Math.abs(roofRay.distance-17)<.4,'four-storey roof collision');
assert.ok(Number.isFinite(dx)&&Number.isFinite(dz));world.free();report.passed=true;report.stories=Object.keys(placeStories).length;
const out='docs/validation/signs-stories';await mkdir(out,{recursive:true});await writeFile(`${out}/southeast-nanyuan11-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,levels:4,walks:report.walks.length,rays:report.rays.length,stories:report.stories}));
