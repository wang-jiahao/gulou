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
for(const id of ['plan-118','plan-116','plan-119','plan-123']){
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
 snapshots[id].shellCollision=hash(d.fixedMeshes.slice(0,1));
 snapshots[id].shellCamera=hash(camera.slice(0,1));
 if(id==='plan-118')entranceData=d;
}
const dir='docs/validation/v0.105';await mkdir(dir,{recursive:true});
if(process.argv.includes('--before')){
 await writeFile(`${dir}/taoyuan-before.json`,JSON.stringify(snapshots,null,2)+'\n',{flag:'wx'});
 console.log('Saved exclusive Taoyuan baseline.',JSON.stringify(snapshots['plan-118']));
}else{
 const before=JSON.parse(await readFile(`${dir}/taoyuan-before.json`,'utf8'));
 for(const id of ['plan-116','plan-119','plan-123'])assert.deepEqual(snapshots[id],before[id],`${id}: control unchanged`);
 for(const key of ['height','shellCollision','shellCamera'])assert.deepEqual(snapshots['plan-118'][key],before['plan-118'][key],`preserved ${key}`);
 assert.notEqual(snapshots['plan-118'].render,before['plan-118'].render);
 const e=entranceData.group.userData.taoyuanThreeEntrance;
 assert.equal(e.number,'3');assert.ok(e.entryU<0);assert.equal(entranceData.profile.levels,6);
 const physics=await checkEntrance({...entranceData,e});
 await writeFile(`${dir}/taoyuan-after-${Date.now()}.json`,JSON.stringify({snapshots,physics,scope:'Local building fixture; excludes scene props/trees. Unseen heights and dimensions approximate.'},null,2)+'\n',{flag:'wx'});
 console.log(`PASS: preserved shell/height and three controls; ${physics.walks.length} walks / ${physics.rays.length} camera rays. Browser QA separate.`);
}
async function checkEntrance(data){
 await RAPIER.init();
 const [cx,cz,nx,nz]=data.e.frontage,world=new RAPIER.World({x:0,y:-9.81,z:0});
 const point=(u,v,y=.91)=>({x:cx+u*nz+v*nx,y,z:cz-u*nx+v*nz});
 const uv=p=>[(p.x-cx)*nz-(p.z-cz)*nx,(p.x-cx)*nx+(p.z-cz)*nz];
 for(const m of data.fixedMeshes)world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices,m.indices));
 world.createCollider(RAPIER.ColliderDesc.cuboid(100,.1,100).setTranslation(cx,-.1,cz));world.step();
 const walks=[],rays=[];
 function walk(name,start,end,{blocked=false,height=.86,stopV,stopU}={}){
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
  if(stopU)assert.ok(endUV[0]>stopU[0]&&endUV[0]<stopU[1],msg);
  assert.ok(minY>.8&&maxY<1.45,msg);walks.push(result);
  world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
 }
 for(const u of [-6.7,-6,-5.3]){
  walk(`stairs ascend ${u}`,[u,5],[u,1.8],{height:1.34});
  walk(`stairs descend ${u}`,[u,1.8,1.34],[u,5]);
  walk(`closed left door ${u}`,[u,1.8,1.34],[u,.2],{blocked:true,height:1.34,stopV:[.98,1.06]});
 }
 for(const v of [1.55,1.83]){
  walk(`ramp ascend ${v}`,[-.15,v],[-6,v],{height:1.34});
  walk(`ramp descend ${v}`,[-6,v,1.34],[-.15,v]);
 }
 walk('left round column',[-8.7,2.77],[-7.53,2.77],{blocked:true,stopU:[-7.95,-7.85]});
 walk('right round column',[-3.2,2.77],[-4.47,2.77],{blocked:true,stopU:[-4.15,-4.05]});
 walk('cross-front public approach',[-9,4.8],[9,4.8]);
 walk('blank panel has no old projected entrance',[1,4.8],[1,.8]);
 walk('shell cannot be entered',[1,2],[1,-2],{blocked:true,stopV:[.25,.4]});
 for(const m of data.cameraSolids)m.updateWorldMatrix(true,false);
 function ray(name,u,v,y,dir,max){
  const p=point(u,v,y),hits=new T.Raycaster(new T.Vector3(p.x,p.y,p.z),new T.Vector3(...dir),0,max).intersectObjects(data.cameraSolids,false);
  assert.ok(hits.length,`camera ${name}`);rays.push({name,distance:hits[0].distance});
 }
 ray('closed left door',-6,1.5,1.9,[-nx,0,-nz],1);
 ray('landing',-6,1.8,1,[0,-1,0],.6);
 ray('canopy underside',-6,2,3,[0,1,0],.5);
 ray('canopy top',-6,2,4,[0,-1,0],.6);
 for(const u of [-7.53,-4.47])ray(`round column ${u}`,u,3.5,2,[-nx,0,-nz],1);
 ray('ramp surface',-2.5,1.69,1,[0,-1,0],1);
 for(const v of [1.13,2.25])ray(`sloped railing ${v}`,-2.5,v-.2,.7,[nx,0,nz],.4);
 for(let floor=1;floor<6;floor++){
  const base=3.25*floor+.1;
  ray(`balcony slab ${floor}`,5.85,1,base+.5,[0,-1,0],.5);
  ray(`solid balcony parapet ${floor}`,6.64,2,base+.6,[-nx,0,-nz],.6);
 }
 world.free();return {walks,rays};
}
