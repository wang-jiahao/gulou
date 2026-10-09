import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';

// Offline fixture, deliberately independent of browser automation and scene internals.
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const bundle=await build({stdin:{contents:`
import * as T from 'three';export {T};
export {createNanyuanFountain,nanyuanFountain} from './nanyuan-fountain.ts';
`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {T,createNanyuanFountain,nanyuanFountain:layout}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const data=createNanyuanFountain({textures:new Map([['stone-grain.webp',null],['lawn.webp',null]])});
data.group.updateMatrixWorld(true);
const face=data.group.children.find(mesh=>mesh.material?.name==='fountain-mascot-art');
assert.ok(face,'mascot front artwork exists');
const facing=new T.Vector3(0,0,1).transformDirection(face.matrixWorld);
assert.ok(facing.z<-.999,'mascot artwork faces north toward Hankou Gate');
for(const dx of [-4.35,-1.45,1.45,4.35]){
 const ray=new T.Raycaster(new T.Vector3(layout.x+dx,1.8,layout.z-8),new T.Vector3(0,0,1),0,6);
 assert.ok(ray.intersectObject(face,false).length,`artwork visible from the north: ${dx}`);
 ray.set(new T.Vector3(layout.x+dx,1.8,layout.z),new T.Vector3(0,0,-1));
 assert.equal(ray.intersectObject(face,false).length,0,`front artwork is not mirrored onto the back: ${dx}`);
}
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const render={};let triangles=0;
data.group.traverse(m=>{
 if(!m.isMesh)return;
 for(const a of Object.values(m.geometry.attributes))assert.ok(a.array.every(Number.isFinite),'finite attributes');
 const index=m.geometry.index?.array;
 if(index)assert.ok(index.every(i=>i<m.geometry.attributes.position.count),'valid indices');
 triangles+=(index?.length??m.geometry.attributes.position.count)/3;
 const g={attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,Array.from(a.array)])),index:index&&Array.from(index)};
 render[m.material.name]=hash(g);
});
const snapshot={layout,solids:data.solids,render};
const dir='docs/validation/v0.104';await mkdir(dir,{recursive:true});
if(process.argv.includes('--before')){
 await writeFile(`${dir}/fountain-before.json`,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});
 console.log('Saved exclusive fountain baseline.');
}else{
 const before=JSON.parse(await readFile(`${dir}/fountain-before.json`,'utf8'));
 assert.deepEqual(layout,before.layout,'unchanged plaza layout');
 assert.deepEqual(data.solids.slice(0,before.solids.length),before.solids,'unchanged old colliders');
 for(const [material,digest]of Object.entries(before.render))assert.equal(render[material],digest,`preserved ${material}`);
 assert.equal(data.group.userData.mascots,4,'four mascot cutouts');
 const physics=await checkPhysics();
 const output='docs/validation/v0.109';await mkdir(output,{recursive:true});
 await writeFile(`${output}/fountain-after-${Date.now()}.json`,JSON.stringify({render,triangles,facing:facing.toArray(),physics,scope:'Fountain fixture only. Full-scene visual QA and GPU performance are separate.'},null,2)+'\n',{flag:'wx'});
 console.log(`PASS: original paving/planting/57 colliders preserved; finite geometry; ${physics.walks.length} walks / ${physics.rays.length} camera rays; ${triangles} triangles. Separate visual QA required.`);
}

async function checkPhysics(){
 await RAPIER.init();
 const {x,z}=layout,world=new RAPIER.World({x:0,y:-9.81,z:0}),walks=[],rays=[];
 world.createCollider(RAPIER.ColliderDesc.cuboid(40,.1,40).setTranslation(x,-.1,z));
 for(const s of data.solids){
  assert.ok(Object.values(s).every(Number.isFinite),'finite solid');
  const a=s.angle??0;
  world.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z).setRotation({x:0,y:Math.sin(a/2),z:0,w:Math.cos(a/2)}));
 }
 world.step();
 function walk(name,start,target,blocked=false){
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x+start[0],.91,z+start[1]));
  const capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);
  motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);world.step();let reached=false,minY=.91,maxY=.91;
  for(let i=0;i<1000;i++){
   const p=body.translation(),dx=x+target[0]-p.x,dz=z+target[1]-p.z,d=Math.hypot(dx,dz);
   if(d<.06){reached=true;break;}
   motor.computeColliderMovement(capsule,{x:dx/d*.045,y:-.035,z:dz/d*.045});const m=motor.computedMovement();
   body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();minY=Math.min(minY,body.translation().y);maxY=Math.max(maxY,body.translation().y);
  }
  const p=body.translation(),result={name,reached,end:[p.x-x,p.y,p.z-z],minY,maxY};
  assert.equal(reached,!blocked,JSON.stringify(result));assert.ok(minY>.8&&maxY<1.05,JSON.stringify(result));walks.push(result);
  world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
 }
 for(const side of [-1,1]){
  walk(`east/west exit ${side}`,[0,0],[side*18,0]);
  walk(`north/south exit ${side}`,[0,side*10],[0,side*18]);
 }
 walk('plaza centre',[-10,0],[10,0]);
 walk('mascot back',[-9,-2],[9,-2]);
 walk('north map arrival',[0,437.286-z],[0,-10]);
 for(const side of [-1,1])walk(`island side ${side}`,[side*7,0],[side*7,-11]);
 for(const dx of [-4.35,-1.45,1.45,4.35])walk(`mascot base ${dx}`,[dx,-1],[dx,-4.2],true);
 const objects=data.cameraSolids??data.group.children;for(const m of objects)m.updateMatrixWorld(true);
 function ray(name,from,to,blocked){
  const origin=new T.Vector3(x+from[0],from[1],z+from[2]),end=new T.Vector3(x+to[0],to[1],z+to[2]),direction=end.clone().sub(origin);
  const hits=new T.Raycaster(origin,direction.clone().normalize(),0,direction.length()).intersectObjects(objects,false);
  assert.equal(hits.length>0,blocked,name);rays.push({name,blocked,distance:hits[0]?.distance});
 }
 for(const dx of [-4.35,-1.45,1.45,4.35]){
  ray(`base ${dx}`,[dx,.3,-2],[dx,.3,-4.5],true);
  ray(`cutout body ${dx}`,[dx,1.8,-2],[dx,1.8,-4.2],true);
  ray(`clear above cutout ${dx}`,[dx,4.5,-2],[dx,4.5,-4.2],false);
 }
 ray('central gap',[0,1.8,-2],[0,1.8,-4.2],false);
 ray('outside silhouette',[-5.45,3,-2],[-5.45,3,-4.2],false);
 world.free();return{walks,rays};
}
