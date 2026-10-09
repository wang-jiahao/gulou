import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// Actual directory integration + property-centre shell + fountain. Canvas art
// is mocked here; root's normal in-game inspection verifies its final appearance.
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const gradient={addColorStop(){}};
const ctx=new Proxy({measureText:()=>({width:50}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const built=await build({stdin:{contents:`import {createCampusDirectory} from './campus-directory.ts';import {buildOrdinaryBuildings} from './ordinary-buildings.ts';import {createNanyuanFountain,nanyuanFountain} from './nanyuan-fountain.ts';import {appendNanyuanFrontage} from './north-gate-frontage.ts';import {Builder} from './geometry.ts';import {insidePolygon} from './campus-map.ts';export {insidePolygon};export function fixture(map,mats){const b=new Builder();const frontage=appendNanyuanFrontage(b,{masonry:mats.brick,surround:mats.stone,roof:mats.stone});return{directory:createCampusDirectory(map,mats),property:buildOrdinaryBuildings(map.features.filter(f=>f.id==='plan-89'),mats,map.roads),fountain:createNanyuanFountain(mats),fountainLayout:nanyuanFountain,frontage,frontageGroup:b.finish('frontage fixture'),frontageSolids:b.solids};}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {fixture,insidePolygon}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8')),mats={textures:new Map(['historic-brick.webp','stone-grain.webp','nju-emblem.png','lawn.webp'].map(n=>[n,new T.Texture()]))};for(const n of ['stone','grass','path','brick','wood','metal','bark'])mats[n]=new T.MeshStandardMaterial({name:n});
const data=fixture(map,mats),{directory,frontage}=data,screen=frontage.screen;
directory.group.updateMatrixWorld(true);
assert.ok(directory.group.children.every(m=>m.isMesh),'camera targets remain direct mesh children');
assert.equal(screen.screenText,'欢迎2026级新生');
assert.equal(screen.referenceYear,2023,'historical geometry reference stays separately documented');
assert.equal(screen.referenceScreenText,'热烈欢迎南京大学2023级新生');
assert.deepEqual(directory.group.userData.frontage.screen,screen,'actual directory includes the placed display');
let triangles=0;
directory.group.traverse(o=>{assert.ok(!o.isLight);if(!o.isMesh)return;for(const a of Object.values(o.geometry.attributes))assert.ok([...a.array].every(Number.isFinite));triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
// Sample new physical wall faces, including the screen corners. None can
// intrude into the road or into plan-89's footprint.
const property=map.features.find(f=>f.id==='plan-89');let vergeSamples=0;
for(const s of data.frontageSolids){
 const c=Math.cos(s.angle??0),sn=Math.sin(s.angle??0);
 for(let i=0;i<=10;i++)for(const side of [-1,1]){
  const u=(i/10-.5)*s.w,v=side*s.d/2,x=s.x+u*c+v*sn,z=s.z-u*sn+v*c;
  assert.ok(!insidePolygon(x,z,property),`wall intersects property ${x},${z}`);
  assert.ok(!map.roads.some(r=>insidePolygon(x,z,r)),`wall intersects mapped road ${x},${z}`);vergeSamples++;
 }
}
await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0}),walls=new RAPIER.World({x:0,y:0,z:0});
world.createCollider(RAPIER.ColliderDesc.cuboid(60,.1,55).setTranslation(-80,-.1,440));
const add=(target,s)=>{const a=s.angle??0;target.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z).setRotation({x:0,y:Math.sin(a/2),z:0,w:Math.cos(a/2)}));};
for(const s of directory.solids){add(world,s);add(walls,s);}for(const s of data.fountain.solids)add(world,s);
for(const m of data.property.fixedMeshes)world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices,m.indices));world.step();walls.step();
const walks=[],sweeps=[],rays=[];
function walk(name,start,target,radius=.27,blocked=false){
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x,.61+radius,start.z));
 const capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.57,radius),body),motor=world.createCharacterController(.02);motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);world.step();
 let reached=false;
 for(let i=0;i<1100;i++){
  const a=body.translation(),dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz);if(d<.07){reached=true;break;}
  motor.computeColliderMovement(capsule,{x:dx/d*.05,y:-.04,z:dz/d*.05});const m=motor.computedMovement();body.setNextKinematicTranslation({x:a.x+m.x,y:a.y+m.y,z:a.z+m.z});world.step();
 }
 const end=body.translation();assert.equal(reached,!blocked,`${name} ${JSON.stringify(end)}`);assert.ok(end.y>.76&&end.y<1.4,'supported');walks.push({name,reached,end});world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
const at=(u,v,y=1.3)=>({x:screen.x+u*Math.cos(screen.angle)+v*Math.sin(screen.angle),y,z:screen.z-u*Math.sin(screen.angle)+v*Math.cos(screen.angle)});
for(const radius of [.27,.62])for(const direction of [-1,1]){
 const line=[{x:-67,z:455.4},{x:-42.2,z:455.4}];if(direction<0)line.reverse();walk(`south road radius${radius} dir${direction}`,...line,radius);
 const east=[{x:-42.2,z:436},{x:-42.2,z:455.4}];if(direction<0)east.reverse();walk(`east road radius${radius} dir${direction}`,...east,radius);
 const view=[at(-8.9,1.25),at(8.9,1.25)];if(direction<0)view.reverse();walk(`screen frontage radius${radius} dir${direction}`,...view,radius);
}
const [x,z,nx,nz]=data.property.records[0].frontage;assert.ok(nx>.99,'existing property east entry');
for(const u of [-1.1,0,1.1])for(const direction of [-1,1]){
 const line=[{x:x+nx*5+u*nz,z:z+nz*5-u*nx},{x:x+nx*2.1+u*nz,z:z+nz*2.1-u*nx}];if(direction<0)line.reverse();walk(`property doorstep ${u} dir${direction}`,...line);
}
for(const u of [-5,0,5])walk(`screen blocks ${u}`,at(u,1.4),at(u,-1.3),.27,true);
// Wide torso capsules approximate cycling width above the existing low curbs,
// covering both NE ring-road edges and the fountain's north/east approaches.
const f=data.fountainLayout;
function sweep(name,a,b,radius=.62){const hit=walls.castShape({x:a.x,y:1.24,z:a.z},{x:0,y:0,z:0,w:1},{x:b.x-a.x,y:0,z:b.z-a.z},new RAPIER.Capsule(.35,radius),0,1,true);assert.equal(hit,null,name);sweeps.push({name,a,b,radius});}
for(const r of [19.5,21.3])for(let i=0;i<20;i++){
 const a=-Math.PI/2+i*Math.PI/40,b=a+Math.PI/40;
 sweep(`fountain arc r${r} ${i}`,{x:f.x+Math.cos(a)*r,z:f.z+Math.sin(a)*r},{x:f.x+Math.cos(b)*r,z:f.z+Math.sin(b)*r});
}
for(const direction of [-1,1]){
 const north=[{x:f.x,z:435},{x:f.x,z:445}],east=[{x:-75,z:f.z},{x:-42,z:f.z}];if(direction<0){north.reverse();east.reverse();}sweep(`north fountain opening ${direction}`,...north);sweep(`east fountain opening ${direction}`,...east);
}
function camera(name,origin,target,blocked){const delta=new T.Vector3(target.x,target.y,target.z).sub(new T.Vector3(origin.x,origin.y,origin.z));const ray=new T.Raycaster(new T.Vector3(origin.x,origin.y,origin.z),delta.clone().normalize(),0,delta.length());assert.equal(ray.intersectObjects(directory.group.children,false).length>0,blocked,name);rays.push(name);}
for(const u of [-5,0,5])for(const y of [.78,2.2,3.48])camera(`screen ${u} height${y}`,at(u,2,y),at(u,-.6,y),true);
camera('above screen',at(0,2,3.8),at(0,-.6,3.8),false);
for(const s of frontage.segments){const c=Math.cos(s.angle),sn=Math.sin(s.angle);camera(`connecting wall ${s.x}`,{x:s.x+sn*2,y:1.5,z:s.z+c*2},{x:s.x-sn,y:1.5,z:s.z-c},true);}
const report={passed:true,triangles,screen,vergeSamples,walks,sweeps,rays,scope:'Actual directory integration, plan89 exterior collisions and fountain solids. Tests walking and wide capsule clearances; does not verify bicycle steering, art readability, trees, GPU cost or visual fit.'};
await mkdir('docs/validation/life-facilities',{recursive:true});await writeFile(`docs/validation/life-facilities/property-frontage-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});world.free();walls.free();console.log(JSON.stringify({passed:true,triangles,vergeSamples,walks:walks.length,sweeps:sweeps.length,rays:rays.length}));
