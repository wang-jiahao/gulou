import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';
const directory='docs/validation/v0.98';
await mkdir(directory,{recursive:true});
const reportPath=`${directory}/fei-entry-${Date.now()}.json`;
const report={passed:false,scope:'Actual Fei builder collision meshes, character motor and camera proxies; excludes surrounding props and GPU rendering.',walks:[],barriers:[],surfaces:[]};
let world;
try {
 const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
 const bundle=await build({stdin:{contents:`
import * as T from 'three';
import {Builder} from './geometry.ts';
import {buildFeiYimin} from './fei-yimin.ts';
import {entranceMaterials} from './building-entrances.ts';
export {T};
export function fixture(f){const b=new Builder(),meshes=[],camera=[],doors=[];
const record=buildFeiYimin(f,{textures:new Map()},b,meshes,camera,doors,entranceMaterials());
return {record,meshes,camera,doors,building:b.finish('fei')};}
`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
 const {T,fixture}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
 const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
 const data=fixture(map.features.find(f=>f.id==='plan-4'));
 const {origin,angle}=data.record.localFrame,co=Math.cos(angle),si=Math.sin(angle);
 const p=(u,v,y=.91)=>({x:origin[0]+u*co-v*si,y,z:origin[1]+u*si+v*co});
 await RAPIER.init();world=new RAPIER.World({x:0,y:-9.81,z:0});
 world.createCollider(RAPIER.ColliderDesc.cuboid(1000,.1,1000).setTranslation(0,-.1,0));
 for(const m of data.meshes)world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices,m.indices));
 world.step();data.camera.forEach(m=>m.updateMatrixWorld(true));data.building.updateMatrixWorld(true);
 const raycaster=new T.Raycaster();
 function hits(from,to){
  const a=p(...from),b=p(...to),delta=new T.Vector3(b.x-a.x,b.y-a.y,b.z-a.z),length=delta.length();delta.normalize();
  raycaster.set(new T.Vector3(a.x,a.y,a.z),delta);raycaster.far=length;
  const physics=world.castRay(new RAPIER.Ray(a,delta),length,true);
  return {physics,camera:raycaster.intersectObjects(data.camera,true)[0],render:raycaster.intersectObject(data.building,true)[0],length};
 }
 for(const[name,from,to,blocked]of[
  ['passage west lane',[50.1,49,1.5],[50.1,74,1.5],false],
  ['passage east lane',[53.9,49,1.5],[53.9,74,1.5],false],
  ['red centre pier',[52,68,1.5],[52,73,1.5],true],
  ['entry back wall',[12.7,36,1.5],[12.7,32,1.5],true],
  ['slogan recess back wall',[36,54,1.5],[36,59,1.5],true],
  ['northwest columns',[-3,30,1.5],[1,30,1.5],true],
  ['northwest open bay',[-3,27,1.5],[5,27,1.5],false],
  ['ramp outer handrail',[4.8,38.6,.8],[4.8,40,.8],true],
  ['canopy overhead',[12.7,45,6.8],[12.7,45,8.5],true],
  ['passage ceiling',[50.1,64,3],[50.1,64,5],true],
 ]){
  const h=hits(from,to);assert.equal(!!h.physics,blocked,`${name}: physics`);assert.equal(!!h.camera,blocked,`${name}: camera`);
  if(blocked)assert.ok(Math.abs(h.physics.timeOfImpact-h.camera.distance)<.03,`${name}: physics/camera distance`);
  report.barriers.push(name);
 }
 // A transformed-twice ramp can look correct while its collider is elsewhere.
 for(const u of[1.5,4.8,8]){
  const h=hits([u,38.525,2],[u,38.525,-.05]),expected=.015+(u-.6)/8.4*.165;
  for(const[key,distance]of[['physics',h.physics?.timeOfImpact],['camera',h.camera?.distance],['render',h.render?.distance]])
   assert.ok(Math.abs(2-distance-expected)<.005,`ramp ${u} ${key}: ${2-distance} expected ${expected}`);
  report.surfaces.push({u,height:expected});
 }
 async function walk(name,from,to){
  const a=p(...from),target=p(...to),body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(a.x,a.y,a.z));
  const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);
  motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);world.step();
  let distance=Infinity;
  try{
   for(let i=0;i<1500;i++){
    const q=body.translation(),dx=target.x-q.x,dz=target.z-q.z;distance=Math.hypot(dx,dz);
    if(distance<.07)break;
    const step=Math.min(.045,distance);motor.computeColliderMovement(collider,{x:dx/distance*step,y:-.035,z:dz/distance*step});
    const d=motor.computedMovement();body.setNextKinematicTranslation({x:q.x+d.x,y:q.y+d.y,z:q.z+d.z});world.step();
   }
   assert.ok(distance<.07,`${name}: stopped ${distance.toFixed(3)}m before destination`);
   report.walks.push({name,finalHeight:body.translation().y});
  }finally{world.removeCharacterController(motor);world.removeRigidBody(body);}
 }
 for(const[name,a,b]of[
  ['west passage',[50.1,49],[50.1,74]],['east passage',[53.9,49],[53.9,74]],
  ['school entry',[12.7,47],[12.7,35.5,1.04]],
  ['accessible ramp',[0,38.525],[12.7,38.525,1.04]],
  ['northwest undercroft',[3,22],[3,36.5]],
  ['northwest side exit',[-3,27],[5,27]],
  ['slogan alcove',[36,49],[36,55]],
 ]){await walk(`${name} forward`,a,b);await walk(`${name} reverse`,b,a);}
 Object.assign(report,{passed:true,meshCount:data.meshes.length,cameraCount:data.camera.length});
}catch(error){report.error=error.stack;throw error;}
finally{world?.free();await writeFile(reportPath,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({passed:report.passed,reportPath,walks:report.walks.length,barriers:report.barriers.length,rampSurfaces:report.surfaces.length}));}
