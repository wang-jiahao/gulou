import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
const directory='docs/validation/south-boundary';
await mkdir(directory,{recursive:true});
const reportPath=`${directory}/collision-${Date.now()}.json`;
const report={passed:false,scope:'CPU perimeter, shop and gate colliders; rendered railing bases. Excludes surrounding props and full-scene dynamics.'};
let world;
try {
 const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
 const context=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
 globalThis.document={createElement:()=>({getContext:()=>context})};
 const result=await build({stdin:{contents:`import {Builder} from './geometry.ts';import {buildNjuMemory} from './nju-memory.ts';import {createCampusBoundaries} from './campus-boundaries.ts';import {createAccessControls,campusEntrances} from './access-controls.ts';import {createGuangzhouGate} from './guangzhou-gate.ts';export function fixture(f,m){const b=new Builder(),meshes=[],camera=[],doors=[];buildNjuMemory(f,b,meshes,camera,doors);return {meshes,doors,boundary:createCampusBoundaries(m),access:createAccessControls(m),gate:createGuangzhouGate(m),campusEntrances};}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
 const {fixture}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
 const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8')),material=new T.MeshStandardMaterial();
 const data=fixture(map.features.find(f=>f.id==='plan-76'),{stone:material,path:material,textures:new Map([['stone-grain.webp',new T.Texture()],['nju-emblem.png',new T.Texture()]])});
 await RAPIER.init();world=new RAPIER.World({x:0,y:-9.81,z:0});
 for(const s of [...data.boundary.solids,...data.access.solids,...data.gate.solids]) world.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z).setRotation({x:0,y:Math.sin((s.angle||0)/2),z:0,w:Math.cos((s.angle||0)/2)}));
 for(const m of data.meshes)world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices,m.indices));
 world.step();data.boundary.group.updateMatrixWorld(true);
 const capsule=new RAPIER.Capsule(.57,.27),raycaster=new T.Raycaster();
 const cast=(a,b,shape=capsule,yaw=0)=>world.castShape(a,{x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)},{x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},shape,0,1,true);
 const runs=data.boundary.group.userData.southRuns;
 // Inspect rendered instance matrices: metadata alone cannot catch crests
 // still mounted on pickets or continuous rails hidden inside stone panels.
 const instances=name=>{
  const output=[];
  data.boundary.group.traverse(mesh=>{
   if(!mesh.isInstancedMesh||mesh.material.name!==name)return;
   for(let i=0;i<mesh.count;i++){
    const m=new T.Matrix4();mesh.getMatrixAt(i,m);m.premultiply(mesh.matrixWorld);
    const position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();m.decompose(position,rotation,scale);
    output.push({position,rotation,scale});
   }
  });return output;
 };
 const walls=instances('campus-boundary-stone').filter(i=>i.scale.x>1&&i.scale.y>3);
 const badges=instances('campus-boundary-emblem'),iron=instances('campus-boundary-iron');
 assert.ok(walls.length>0,'rendered granite crest walls exist');
 assert.equal(badges.length,walls.length*2,'two face crests per granite wall');
 const matched=new Set();
 for(const wall of walls){
  const inverse=wall.rotation.clone().invert();
  const local=i=>i.position.clone().sub(wall.position).applyQuaternion(inverse);
  const faces=[];
  badges.forEach((badge,i)=>{
   const q=local(badge);
   if(Math.abs(q.x)<.01&&Math.abs(Math.abs(q.z)-.222)<.01){
    assert.ok(Math.abs(q.y-.49)<.01,'crest height on central slab');
    assert.ok(Math.abs(badge.scale.x/badge.scale.y-52/79)<1e-5,'crest aspect ratio');
    assert.ok(Math.abs(q.z)>wall.scale.z/2,'crest in front of stone');
    faces.push(Math.sign(q.z));matched.add(i);
   }
  });assert.deepEqual(faces.sort(),[-1,1],'one crest on each stone face');
  for(const bar of iron){
   const q=local(bar),axis=new T.Vector3(1,0,0).applyQuaternion(bar.rotation).applyQuaternion(inverse);
   if(Math.abs(q.z)<.05&&Math.abs(axis.x)>.999)
    assert.ok(Math.abs(q.x)-bar.scale.x/2>=wall.scale.x/2-.02,'iron must stop before crest wall');
  }
 }
 assert.equal(matched.size,badges.length,'no crest left on iron-only bays');
 Object.assign(report,{crestWalls:walls.length,crestFaces:badges.length,ironInstances:iron.length});
 let fenceSamples=0,visualBaseSamples=0,jointSamples=0,shopSamples=0;
 for(const run of runs)for(let j=1;j<run.points.length;j++) {
  const a=run.points[j-1],b=run.points[j],length=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=(b[1]-a[1])/length,nz=(a[0]-b[0])/length;
  for(let i=0,n=Math.ceil(length/.8);i<=n;i++)for(const side of[-1,1]) {
   const x=a[0]+i/n*(b[0]-a[0]),z=a[1]+i/n*(b[1]-a[1]);
   for(const y of[.15,1.1,2.95]) {
    assert.ok(world.castRay(new RAPIER.Ray({x:x+side*nx*2,y,z:z+side*nz*2},{x:-side*nx,y:0,z:-side*nz}),4,true),`fence leak at ${x},${z},${y}`);fenceSamples++;
   }
   raycaster.set(new T.Vector3(x+side*nx*2,.2,z+side*nz*2),new T.Vector3(-side*nx,0,-side*nz));raycaster.far=4;
   assert.ok(raycaster.intersectObject(data.boundary.group,true).length,`rendered base missing at ${x},${z}`);visualBaseSamples++;
  }
 }
 for(const run of runs)for(const[x,z]of run.points)for(let i=0;i<16;i++) {
  const nx=Math.cos(i*Math.PI/8),nz=Math.sin(i*Math.PI/8);
  assert.ok(cast({x:x+nx*2,y:1.1,z:z+nz*2},{x:x-nx*2,y:1.1,z:z-nz*2}),`railing joint leak at ${x},${z}`);jointSamples++;
 }
 for(let x=-151;x<=-98;x+=.16){assert.ok(cast({x,y:1.1,z:369},{x,y:1.1,z:403}),`shop closure leak at ${x}`);shopSamples++;}
 Object.assign(report,{fenceSamples,visualBaseSamples,jointSamples,shopSamples});
 const routes=[];
 for(const e of data.campusEntrances.filter(e=>['guangzhou','south-north','south-east'].includes(e.id)))for(const mode of['walk','bicycle-envelope'])for(const u of[0,...e.pedestrians]) {
  const shape=mode==='walk'?capsule:new RAPIER.Cuboid(.34,.7,1.05);
  const point=v=>({x:e.x+u*Math.cos(e.angle)+v*Math.sin(e.angle),y:1.1,z:e.z-u*Math.sin(e.angle)+v*Math.cos(e.angle)});
  for(const side of[-1,1]) {
   assert.equal(cast(point(side*9),point(-side*9),shape,e.angle),null,`${e.id}:${mode}:${u}:${side}`);
   routes.push(`${e.id}:${mode}:${u}:${side}`);
  }
 }
 for(const[a,b]of[[{x:-137,y:1.1,z:375},{x:-99,y:1.1,z:375}],[{x:-45,y:1.1,z:724},{x:-24,y:1.1,z:724}],[{x:128.784,y:1.1,z:528},{x:128.784,y:1.1,z:546}]])for(const[from,to]of[[a,b],[b,a]]) {
  assert.equal(cast(from,to),null,'public road remains traversable');routes.push('public-pavement');
 }
 Object.assign(report,{passed:true,routes});
} catch(error) {
 report.error=error.stack;throw error;
} finally {
 world?.free();await writeFile(reportPath,JSON.stringify(report,null,2),{flag:'wx'});
 console.log(JSON.stringify({passed:report.passed,reportPath,fenceSamples:report.fenceSamples,visualBaseSamples:report.visualBaseSamples,jointSamples:report.jointSamples,shopSamples:report.shopSamples,routes:report.routes?.length}));
}
