import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,basename} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
async function fixture(revision){
 const result=await build({stdin:{contents:`
import * as T from 'three';
import {Builder} from './geometry.ts';
import {buildSpecific} from './specific-buildings.ts';
import {entranceMaterials} from './building-entrances.ts';
import {insidePolygon} from './campus-map.ts';
import {yifuHallCourtyardLayout,createYifuHallCourtyardGround} from './yifu-hall-courtyard.ts';
export function fixture(f){
 const b=new Builder(),meshes=[],camera=[],doors=[];
 const record=buildSpecific(f,{},b,meshes,camera,doors,entranceMaterials());
 const layout=yifuHallCourtyardLayout();
 const court=createYifuHallCourtyardGround(layout,{stone:new T.MeshStandardMaterial(),grass:new T.MeshStandardMaterial(),textures:new Map()});
 return{T,insidePolygon,record,meshes,camera,doors,group:b.finish('yifu hall'),court,layout};
}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',plugins:revision?[{name:'baseline',setup(b){b.onLoad({filter:/(specific-buildings|yifu-hall-facade)\.ts$/},args=>({contents:execFileSync('git',['show',`${revision}:src/world/${basename(args.path)}`],{encoding:'utf8'}),loader:'ts',resolveDir:resolve('src/world')}));}}]:[]});
 const mod=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
 return mod.fixture(map.features.find(f=>f.id==='plan-34'));
}
const baseCommit='ad49c88',data=await fixture(),before=await fixture(baseCommit),{T}=data;
assert.deepEqual(data.record.sections,before.record.sections);
const s=data.record.yifuSideEntrance;assert.ok(s,'registered side entry');
const [cx,cz,nx,nz]=s.frontage;
const point=(u,v,y=.91)=>({x:cx+u*nz+v*nx,y,z:cz-u*nx+v*nz});
const uv=p=>[(p.x-cx)*nz-(p.z-cz)*nx,(p.x-cx)*nx+(p.z-cz)*nz];
await RAPIER.init();
function physics(d,court=false){
 const w=new RAPIER.World({x:0,y:-9.81,z:0});
 for(const mesh of [...d.meshes,...(court?d.court.fixedMeshes:[])])w.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));
 if(court)for(const s of d.court.solids)w.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z).setRotation(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),s.angle??0)));
 w.createCollider(RAPIER.ColliderDesc.cuboid(90,.1,90).setTranslation(cx,-.1,cz));w.step();return w;
}
const world=physics(data,true),baseline=physics(before);
for(const d of[data,before]){d.group.updateMatrixWorld(true);for(const c of d.camera)c.updateMatrixWorld(true);}
let heightChecks=0;
// The upper flight is inside the recess. Sample below its soffit rather than
// from above the building, where a downward ray correctly hits the ceiling.
const sampleY=s.ceiling-.15;
for(let i=0;i<s.risers;i++)for(const u of[-2,0,2]){
 const v=s.landing+(i+.5)*s.tread,p=point(u,v,sampleY),expected=s.entryHeight-i*s.rise;
 const hit=world.castRay(new RAPIER.Ray(p,{x:0,y:-1,z:0}),8,true);
 const ray=new T.Raycaster(new T.Vector3(p.x,p.y,p.z),new T.Vector3(0,-1,0));
 for(const distance of[hit?.timeOfImpact,ray.intersectObjects(data.camera,false)[0]?.distance,ray.intersectObject(data.group,true)[0]?.distance])assert.ok(Math.abs(sampleY-distance-expected)<.003,`tread ${i}, u=${u}: ${distance}`);
 if(v<s.inset){
  const origin=point(u,v,expected+.02),up={x:0,y:1,z:0};
  const ceiling=world.castRay(new RAPIER.Ray(origin,up),8,true);
  assert.ok(ceiling?.timeOfImpact>2.4,'recess has standing headroom');
  assert.ok(Math.abs(origin.y+ceiling.timeOfImpact-s.ceiling)<.003,'soffit remains intact');
 }
 for(const bed of data.layout.beds)assert.ok(!data.insidePolygon(p.x,p.z,bed.polygon),'stair does not enter bed');heightChecks+=3;
}
const walks=[];
function motorWalk(name,start,end,{blocked=false}={}){
 const p=point(...start),target=point(...end),body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x,p.y,p.z));
 const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);
 motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);world.step();let reached=false;
 for(let i=0;i<600;i++){
  const p=body.translation(),dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz);if(len<.07){reached=true;break;}
  motor.computeColliderMovement(collider,{x:dx/len*.045,y:-.035,z:dz/len*.045});const d=motor.computedMovement();
  body.setNextKinematicTranslation({x:p.x+d.x,y:p.y+d.y,z:p.z+d.z});world.step();
 }
 const at={...body.translation()},endUV=uv(at);assert.equal(reached,!blocked,`${name}: ${JSON.stringify({endUV,y:at.y})}`);
 walks.push({name,reached,endUV,y:at.y});world.removeCharacterController(motor);world.removeRigidBody(body);world.step();return at;
}
for(const u of[-2,0,2]){
 const at=motorWalk(`up fourteen risers ${u}`,[u,6.4],[u,.4]);assert.ok(Math.abs(at.y-2.96)<.05,'landing elevation');
 const closed=motorWalk(`recess and closed door ${u}`,[u,.4,2.97],[u,-2],{blocked:true});assert.ok(uv(closed)[1]<-.35&&uv(closed)[1]>-.65,'real shallow recess');
 const out=motorWalk(`descend ${u}`,[u,.4,2.97],[u,6.4]);assert.ok(out.y<1,'returns to court');
}
for(const direction of[-1,1]){
 motorWalk(`landing lateral ${direction}`,[-2*direction,.45,2.97],[2*direction,.45]);
 const at=motorWalk(`cheek blocks ${direction}`,[0,.45,2.97],[5*direction,.45],{blocked:true});assert.ok(Math.abs(uv(at)[0])>2.7&&Math.abs(uv(at)[0])<2.9,'solid side cheek');
}
let recessChecks=0,oppositeChecks=0;
for(const u of[-2.5,-1,0,1,2.5]){
 const p=point(u,.4,3.5),ray=new T.Raycaster(new T.Vector3(p.x,p.y,p.z),new T.Vector3(-nx,0,-nz));
 const distances=[world.castRay(new RAPIER.Ray(p,{x:-nx,y:0,z:-nz}),4,true)?.timeOfImpact,ray.intersectObjects(data.camera,false)[0]?.distance,ray.intersectObject(data.group,true)[0]?.distance];
 for(const d of distances)assert.ok(d>.99&&d<1.31,`open recess u=${u}: ${d}`);recessChecks+=3;
 }
let oppositeHits=0;
// Sweep the actual northern footprint, including the gap opposite the stair.
// Start outside it so an accidental cut through the far wall cannot hide.
for(let u=-20;u<=20;u+=1)for(const y of[2.8,3.5,4.4]){
 const p=point(u,80,y),r=new RAPIER.Ray(p,{x:-nx,y:0,z:-nz}),a=baseline.castRay(r,72,true),b=world.castRay(r,72,true);
 assert.equal(Boolean(a),Boolean(b),'opposite footprint hit preserved');
 if(a){assert.ok(Math.abs(a.timeOfImpact-b.timeOfImpact)<.002,'bounded cut preserves opposite wing');oppositeHits++;}
 oppositeChecks++;
}
assert.ok(oppositeHits>5,'sweep includes solid northern wing');

function render(d){let meshes=0,triangles=0;d.group.traverse(o=>{if(o.isMesh){meshes++;triangles+=o.geometry.index.count/3;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});return{meshes,triangles};}
const {version}=JSON.parse(await readFile('package.json','utf8')),dir=`docs/validation/v${version.replace(/\.0$/,'')}`;
const report={passed:true,version,baseCommit,side:s,walks,heightChecks,recessChecks,oppositeChecks,oppositeHits,before:render(before),after:render(data),scope:'Plan-34 shell, side stair and courtyard including bed caps; no async GLB tree or full-scene prop colliders. Registration and dimensions approximate.'};
await mkdir(dir,{recursive:true});await writeFile(`${dir}/side-motor-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});
world.free();baseline.free();console.log(JSON.stringify({passed:true,walks:walks.length,heightChecks,recessChecks,oppositeChecks,oppositeHits,before:report.before,after:report.after}));
