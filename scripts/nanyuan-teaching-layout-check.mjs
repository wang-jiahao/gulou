import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const result=await build({stdin:{contents:`import {Builder} from './geometry.ts';import {buildNanyuanTeaching} from './nanyuan-teaching.ts';export function fixture(f){const b=new Builder(),meshes=[],camera=[],doors=[];const record=buildNanyuanTeaching(f,b,meshes,camera,doors);return {record,meshes,camera,doors,group:b.finish('teaching')};}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {fixture}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
const data=fixture(map.features.find(f=>f.id==='plan-105'));
await RAPIER.init();
const world=new RAPIER.World({x:0,y:-9.81,z:0});
for(const mesh of data.meshes){
 assert.ok(mesh.vertices.every(Number.isFinite),'finite collision vertices');
 world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));
}
world.createCollider(RAPIER.ColliderDesc.cuboid(100,.1,100).setTranslation(-84,-.1,516));world.step();
const [cx,cz,nx,nz]=data.record.frontage;
const point=(u,v,y=1.2)=>({x:cx+u*nz+v*nx,y,z:cz-u*nx+v*nz});
const capsule=new RAPIER.Capsule(.57,.27),rotation={x:0,y:0,z:0,w:1};
function cast(a,b){return world.castShape(a,rotation,{x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},capsule,0,1,true);}
assert.ok(nz<-.99,'the entrance faces north toward the fountain');
let routes=0,blocked=0;
for(const u of[-4.5,0,4.5]){
 const a=point(u,4),b=point(u,-1.5);
 assert.equal(cast(a,b),null,'porch approach envelope');assert.equal(cast(b,a),null,'porch exit envelope');routes+=2;
 assert.ok(cast(b,point(u,-4)),'inner wall stays closed');blocked++;
}
for(const u of[-2.4,2.4,-8,8]){assert.ok(cast(point(u,4),point(u,-4)),'columns and flanking walls block passage');blocked++;}
for(let u=-32;u<=32;u+=2){assert.ok(cast(point(u,4),point(u,-40)),'no through-building route');blocked++;}
for(const u of[-5,0,5]){
 const ray=new RAPIER.Ray(point(u,-10,20),{x:0,y:-1,z:0});
 const hit=world.castRay(ray,25,true);assert.ok(hit&&hit.timeOfImpact<12,'central roof supports landings');blocked++;
}
// Run Rapier's actual character motor with the game's capsule, clearance,
// autostep and snap settings. This checks steps in both directions, rather
// than treating a raised horizontal capsule sweep as a walking simulation.
const walks=[];
for(const u of[-4.5,0,4.5]){
 const start=point(u,3,.88),body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x,start.y,start.z));
 const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);
 motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);world.step();
 const advance=(direction,target)=>{for(let i=0;i<160;i++){
  motor.computeColliderMovement(collider,{x:nx*direction*.045,y:-.035,z:nz*direction*.045});
  const p=body.translation(),d=motor.computedMovement();body.setNextKinematicTranslation({x:p.x+d.x,y:p.y+d.y,z:p.z+d.z});world.step();
  const at=body.translation(),v=(at.x-cx)*nx+(at.z-cz)*nz;
  if(direction<0?v<=target:v>=target)return i+1;
 }};
 const inFrames=advance(-1,-1.5);const entered={...body.translation()},v=(entered.x-cx)*nx+(entered.z-cz)*nz;
 assert.ok(v< -1.2&&v> -1.9,`motor reaches porch: ${u} at ${v}`);assert.ok(entered.y>1.06&&entered.y<1.16,'motor climbed the two low steps');
 const outFrames=advance(1,3);const exited={...body.translation()};assert.ok((exited.x-cx)*nx+(exited.z-cz)*nz>2.5,'motor walks out');assert.ok(exited.y<.95,'motor descends to street');
 walks.push({u,entered,exited,inFrames,outFrames});world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
const render={meshes:0,triangles:0};data.group.traverse(m=>{if(m.isMesh){render.meshes++;render.triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));}});
const version=JSON.parse(await readFile('package.json','utf8')).version;
const outputDir=`docs/validation/v${version.split('.').slice(0,2).join('.')}`;
const report={version,passed:true,routes,blocked,walks,record:data.record,render,scope:'Isolated building colliders and Rapier motor; no browser input/camera or adjacent props. Official reference and whole-scene appearance reviewed separately.'};
await mkdir(outputDir,{recursive:true});await writeFile(`${outputDir}/layout-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});
world.free();console.log(JSON.stringify({passed:true,routes,blocked,motorWalks:walks.length*2,render}));
