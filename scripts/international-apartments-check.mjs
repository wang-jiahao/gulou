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
let apartments;

for(const id of ['plan-120','plan-117','plan-121','plan-123']){
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
 if(id==='plan-120')apartments={...d,f,r};
 snapshots[id]={footprint:hash(f.points),collision:hash(d.fixedMeshes),camera:hash(camera),frontage:r.frontage,height:r.height,windows:r.windows,render:hash(geometry),boxes:hash(d.boxes),glass:hash(d.windows)};
}
const dir='docs/validation/v0.103';await mkdir(dir,{recursive:true});
if(process.argv.includes('--before')){
 await writeFile(`${dir}/apartments-before.json`,JSON.stringify(snapshots,null,2)+'\n',{flag:'wx'});
 console.log('Saved exclusive apartments baseline.');
}else{
 const before=JSON.parse(await readFile(`${dir}/apartments-before.json`,'utf8'));
 for(const id of ['plan-117','plan-121','plan-123'])assert.deepEqual(snapshots[id],before[id],`${id}: unrelated neighbour unchanged`);
 for(const key of ['footprint','frontage'])assert.deepEqual(snapshots['plan-120'][key],before['plan-120'][key],`plan-120: preserved ${key}`);
 for(const key of ['render','collision'])assert.notEqual(snapshots['plan-120'][key],before['plan-120'][key],`plan-120: revised ${key}`);
 assert.equal(apartments.f.tags['building:levels'],'4');assert.equal(apartments.r.levels,4);assert.equal(apartments.r.wingLevels,3);
 assert.ok(apartments.r.frontage[3]<-.99,'entrance faces the northern lane');
 assert.ok(apartments.r.height<15,'four storey silhouette');
 const area=points=>Math.abs(points.reduce((sum,[x,z],i)=>{const[xx,zz]=points[(i+1)%points.length];return sum+x*zz-xx*z;},0))/2;
 const rings=[[0,1,2,5,6,7],[2,3,4,5]].map(indices=>indices.map(i=>apartments.f.points[i]));
 assert.ok(Math.abs(rings.reduce((sum,p)=>sum+area(p),0)-area(apartments.f.points))<1e-6,'main and wing cover registered footprint');
 const physics=await checkApartments(apartments);
 await writeFile(`${dir}/apartments-after-${Date.now()}.json`,JSON.stringify({snapshots,physics,scope:'Registered apartment geometry and capsule/camera against its own solids. Excludes other scene props, trees and GPU performance; hidden elevations and heights approximate.'},null,2)+'\n',{flag:'wx'});
 console.log(`PASS: finite geometry; footprint/frontage and three neighbours preserved; four-storey main/lower wing; ${physics.walks.length} walks / ${physics.rays.length} camera rays. Browser visual QA is separate.`);
}

async function checkApartments(data){
 await RAPIER.init();
 const [cx,cz,nx,nz]=data.r.frontage,world=new RAPIER.World({x:0,y:-9.81,z:0});
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
 const door=data.r.doorU;
 for(const u of [door-.65,door,door+.65]){
  walk(`landing approach ${u}`,[u,4],[u,2.27],{height:1});
  walk(`landing depart ${u}`,[u,2.27,1],[u,4]);
  walk(`closed door ${u}`,[u,4],[u,1],{blocked:true,height:1,stopV:[2.15,2.28]});
 }
 walk('northern lane',[-12,4],[43,4]);
 walk('southern lane',[-12,-17],[43,-17]);
 walk('main north wall',[-4,4],[-4,-2],{blocked:true,stopV:[.27,.35]});
 walk('wing north wall',[24,4],[24,-5],{blocked:true});
 walk('main east wall',[-12,-6],[-6,-6],{blocked:true});
 walk('wing west wall',[43,-7],[36,-7],{blocked:true});
 for(const m of data.cameraSolids)m.updateMatrixWorld(true);
 function ray(name,u,v,y,dir,max){
  const p=point(u,v,y),hits=new T.Raycaster(new T.Vector3(p.x,p.y,p.z),new T.Vector3(...dir),0,max).intersectObjects(data.cameraSolids,false);
  assert.ok(hits.length,`camera ${name}`);rays.push({name,distance:hits[0].distance});
 }
 ray('closed door',door,3,1.4,[-nx,0,-nz],2);
 ray('landing',door,2.1,2,[0,-1,0],2);
 ray('canopy underside',door,1,3.8,[0,1,0],1);
 ray('canopy top',door,1,5,[0,-1,0],1);
 ray('main roof',0,-5,16,[0,-1,0],2);
 ray('wing roof',24,-7,12,[0,-1,0],2);
 for(const s of [-1,1])ray(`vestibule side ${s}`,door+s*2.3,1,2,[-s*nz,0,s*nx],1);
 world.free();return {walks,rays};
}
