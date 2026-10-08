import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';

// Offline geometry regression only; this does not replace browser visual QA.
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
const bundle=await build({stdin:{contents:`
import * as T from 'three';
export {T};
import {Builder} from './geometry.ts';
import {buildOrdinaryBuildings} from './ordinary-buildings.ts';
import {getBuildingProfile} from './building-profiles.ts';
export function fixture(f,roads){
 const boxes=[],windows=[],originalBox=Builder.prototype.box,originalAdd=Builder.prototype.add;
 Builder.prototype.box=function(w,h,d,x,y,z,m,solid=false,angle=0,...rest){
  boxes.push({w,h,d,x,y,z,angle,material:m.name,color:m.color?.getHex(),solid});
  if(m.name.startsWith('window-glass'))windows.push({w,h,x,y,z,angle,color:m.color.getHex()});
  return originalBox.call(this,w,h,d,x,y,z,m,solid,angle,...rest);
 };
 Builder.prototype.add=function(g,m,x=0,y=0,z=0,rotation,...rest){
  if(g.type==='PlaneGeometry'&&m.name.startsWith('window-glass'))windows.push({w:g.parameters.width,h:g.parameters.height,x,y,z,angle:rotation?.y??0,color:m.color.getHex()});
  return originalAdd.call(this,g,m,x,y,z,rotation,...rest);
 };
 try{return {...buildOrdinaryBuildings([f],{textures:new Map([['stone-grain.webp',null],['historic-brick.webp',null]])},roads),boxes,windows,profile:getBuildingProfile(f)};}
 finally{Builder.prototype.box=originalBox;Builder.prototype.add=originalAdd;}
}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {T,fixture}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const snapshots={};
let entranceData;
for(const id of ['plan-123','plan-119','plan-122']){
 const f=map.features.find(f=>f.id===id),d=fixture(f,map.roads??[]),geometry=[];
 d.group.traverse(m=>{if(!m.isMesh)return;
  for(const a of Object.values(m.geometry.attributes))assert.ok(a.array.every(Number.isFinite),`${id}: finite render attributes`);
  const index=m.geometry.index?.array;
  if(index)assert.ok(index.every(i=>i<m.geometry.attributes.position.count),`${id}: valid render indices`);
  geometry.push({attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,v])=>[k,Array.from(v.array)])),index:index&&Array.from(index),material:m.material.name,color:m.material.color?.getHex()});
 });
 for(const m of d.fixedMeshes){
  assert.ok(m.vertices.every(Number.isFinite),`${id}: finite collision`);
  assert.ok(m.indices.every(i=>i<m.vertices.length/3),`${id}: valid collision indices`);
 }
 const camera=d.cameraSolids.map(m=>{
  m.updateWorldMatrix(true,false);
  const p=m.geometry.attributes.position.array,index=m.geometry.index?.array;
  assert.ok(p.every(Number.isFinite),`${id}: finite camera geometry`);
  if(index)assert.ok(index.every(i=>i<p.length/3),`${id}: valid camera indices`);
  return {positions:Array.from(p),index:index&&Array.from(index),matrix:m.matrixWorld.elements};
 });
 const r=d.records[0];
 snapshots[id]={collision:hash(d.fixedMeshes),camera:hash(camera),frontage:r.frontage,height:r.height,windows:r.windows,render:hash(geometry),boxes:hash(d.boxes),glass:hash(d.windows)};
 if(id==='plan-123'&&!process.argv.includes('--before')){
  assert.equal(f.kind,'dormitory');assert.equal(f.tags['building:levels'],'6');
  assert.equal(d.profile.roof,'flat');assert.equal(d.profile.levels,6);
  assert.equal(d.profile.wall,0xd8d4b6);assert.equal(d.profile.frame,0x695748);
  assert.ok(d.boxes.some(b=>b.material==='window-guard'));
  assert.ok(d.boxes.some(b=>b.color===0x969f9c));
  assert.ok(d.boxes.some(b=>b.color===d.profile.wall&&b.h>15&&b.w<.3));
  const units=d.boxes.filter(b=>b.material==='utility-casing'&&b.h===.45);
  assert.ok(units.length>0);assert.ok(units.some(b=>b.y<3.25),'ground-floor AC units');
  for(const ac of units){
   const matching=d.windows.filter(w=>Math.abs(w.angle-ac.angle)<1e-6&&Math.abs((ac.x-w.x)*Math.sin(ac.angle)+(ac.z-w.z)*Math.cos(ac.angle))<.9);
   assert.ok(matching.length>0,'unit belongs to a window face');
   for(const w of matching){
    const du=(ac.x-w.x)*Math.cos(ac.angle)-(ac.z-w.z)*Math.sin(ac.angle);
    const overlapX=Math.abs(du)<(ac.w+w.w)/2+.06;
    const overlapY=Math.abs(ac.y-w.y)<(ac.h+w.h)/2;
    assert.ok(!(overlapX&&overlapY),'AC clears glass and its frame');
   }
  }
  const e=d.group.userData.nanyuanEightEntrance;
  assert.equal(e.number,'8');assert.equal(e.panes.length,15);
  const [cx,cz,nx,nz]=e.frontage;
  for(const ac of units){
   const u=(ac.x-cx)*nz-(ac.z-cz)*nx,v=(ac.x-cx)*nx+(ac.z-cz)*nz;
   if(Math.abs(v-.56)<.01&&ac.y<6.7)assert.ok(Math.abs(u)-ac.w/2>2.975,'AC clears portal piers');
  }
  entranceData={...d,e};
  snapshots[id].units=units.length;
  snapshots[id].originalCollision=hash(d.fixedMeshes.slice(0,2));
  snapshots[id].originalCamera=hash(camera.slice(0,1));
 }
}
const dir='docs/validation/v0.102';await mkdir(dir,{recursive:true});
if(process.argv.includes('--before')){
 await writeFile(`${dir}/dormitory-before.json`,JSON.stringify(snapshots,null,2)+'\n',{flag:'wx'});
 console.log('Saved exclusive dormitory baseline.');
}else{
 const before=JSON.parse(await readFile(`${dir}/dormitory-before.json`,'utf8'));
 for(const id of ['plan-119','plan-122'])assert.deepEqual(snapshots[id],before[id],`${id}: unrelated dorm unchanged`);
 for(const key of ['frontage','height'])assert.deepEqual(snapshots['plan-123'][key],before['plan-123'][key],`plan-123: preserved ${key}`);
 assert.equal(snapshots['plan-123'].originalCollision,before['plan-123'].collision,'original shell and door preserved');
 assert.equal(snapshots['plan-123'].originalCamera,before['plan-123'].camera,'original shell camera preserved');
 assert.notEqual(snapshots['plan-123'].render,before['plan-123'].render,'facade changed');
 const physics=await checkEntrance(entranceData);
 await writeFile(`${dir}/dormitory-after-${Date.now()}.json`,JSON.stringify({snapshots,physics,scope:'Registered dormitory footprints, entrance and Rapier capsule; excludes other scene props and asynchronous trees. Photo-obscured dimensions approximate.'},null,2)+'\n',{flag:'wx'});
 console.log(`PASS: finite geometry, ${snapshots['plan-123'].units} AC units clear glass/portal; original shell/door/frontage and two control dorms unchanged; ${physics.walks.length} walks / ${physics.rays.length} camera rays. Browser visual QA pending.`);
}

async function checkEntrance(data){
 await RAPIER.init();
 const [cx,cz,nx,nz]=data.e.frontage,world=new RAPIER.World({x:0,y:-9.81,z:0});
 const point=(u,v,y=.91)=>({x:cx+u*nz+v*nx,y,z:cz-u*nx+v*nz});
 const uv=p=>[(p.x-cx)*nz-(p.z-cz)*nx,(p.x-cx)*nx+(p.z-cz)*nz];
 for(const m of data.fixedMeshes)world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices,m.indices));
 world.createCollider(RAPIER.ColliderDesc.cuboid(100,.1,100).setTranslation(cx,-.1,cz));world.step();
 const walks=[],rays=[];
 function walk(name,start,end,{blocked=false,height=.86,stopV}={}){
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
  const at={...body.translation()},endUV=uv(at),result={name,reached,endUV,y:at.y,minY,maxY},msg=JSON.stringify(result);
  assert.equal(reached,!blocked,msg);assert.ok(Math.abs(at.y-height)<.09,msg);
  if(stopV)assert.ok(endUV[1]>stopV[0]&&endUV[1]<stopV[1],msg);
  assert.ok(minY>.8&&maxY<1.1,msg);walks.push(result);
  world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
 }
 for(const u of[-1,0,1]){
  walk(`landing ascend ${u}`,[u,5],[u,2.05],{height:.99});
  walk(`landing descend ${u}`,[u,2.05,.99],[u,5]);
  walk(`closed door ${u}`,[u,2.05,.99],[u,.7],{blocked:true,height:.99,stopV:[1.77,1.89]});
 }
 for(const s of[-1,1]){
  // Approach the pier's inner edge: its centre line first meets the
  // neighbouring planter once the capsule radius is included.
  walk(`portal pier ${s}`,[s*2.15,5],[s*2.15,1],{blocked:true,height:.99,stopV:[1.77,1.9]});
  walk(`planter ${s}`,[s*3.28,5],[s*3.28,1.28],{blocked:true,stopV:[2.4,2.6]});
  walk(`outside entrance ${s}`,[s*4.5,5],[s*4.5,1]);
 }
 walk('cross-front path',[-6,3],[6,3]);
 for(const m of data.cameraSolids)m.updateMatrixWorld(true);
 function ray(name,u,v,y,dir,max){
  const p=point(u,v,y),hits=new T.Raycaster(new T.Vector3(p.x,p.y,p.z),new T.Vector3(...dir),0,max).intersectObjects(data.cameraSolids,false);
  assert.ok(hits.length,`camera ${name}`);rays.push({name,distance:hits[0].distance});
 }
 ray('closed door',0,2,1.4,[-nx,0,-nz],1);
 ray('landing',0,2,2,[0,-1,0],2);
 ray('canopy underside',0,1.9,6.6,[0,1,0],1);
 ray('canopy top',0,1.9,8,[0,-1,0],1);
 for(const s of[-1,1]){
  ray(`portal ${s}`,s*2.45,2,4,[-nx,0,-nz],1);
  ray(`planter ${s}`,s*3.28,3,.4,[-nx,0,-nz],1);
 }
 world.free();return {walks,rays};
}
