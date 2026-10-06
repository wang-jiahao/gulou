import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
const result=await build({stdin:{contents:`
import * as T from 'three';
import {Builder} from './geometry.ts';
import {buildSpecific} from './specific-buildings.ts';
import {entranceMaterials} from './building-entrances.ts';
import {createPlanarCutout} from './planar-cutout.ts';
import {yifuHallCourtyardLayout,createYifuHallCourtyardGround} from './yifu-hall-courtyard.ts';
export {T,createPlanarCutout};
export function fixture(f){
 const b=new Builder(),meshes=[],camera=[],doors=[];
 const record=buildSpecific(f,{},b,meshes,camera,doors,entranceMaterials());
 const layout=yifuHallCourtyardLayout();
 const court=createYifuHallCourtyardGround(layout,{stone:new T.MeshStandardMaterial(),grass:new T.MeshStandardMaterial(),textures:new Map()});
 return {record,meshes,doors,building:b.finish('yifu hall'),layout,court};
}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {T,createPlanarCutout,fixture}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const data=fixture(map.features.find(f=>f.id==='plan-34')),{layout,court}=data;
const area=ring=>Math.abs(ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);
function triangles(p){const rings=[p.points,...(p.holes??[])].map(r=>r.map(([x,z])=>new T.Vector2(x,z))),points=rings.flat();return T.ShapeUtils.triangulateShape(rings[0],rings.slice(1)).map(ids=>ids.map(i=>[points[i].x,points[i].y]));}
function intersection(a,b){const cut=createPlanarCutout(b);return triangles(a).reduce((s,t)=>s+area(t)-cut.subtract(t).reduce((n,r)=>n+area(r),0),0);}
const overlap=intersection(layout.outline,layout.northPath);
assert.ok(Math.abs(overlap)<1e-6,`paving seam overlaps ${overlap}m²`);
const neighbours=[];
for(const f of map.features.filter(f=>f.kind==='building'))for(const p of layout.outlines){
 const overlap=intersection(p,f);assert.ok(overlap<1e-5,`paving enters ${f.id}: ${overlap}m²`);
 neighbours.push({id:f.id,overlap});
}
for(const bed of layout.beds)assert.ok(Math.abs(intersection(layout.outline,bed.polygon)-area(bed.polygon.points))<1e-5,`${bed.id} bed contained in court`);
const slab=court.group.children[0].children.find(m=>m.name==='yifu hall grey stone paving');
let slabArea=0;const p=slab.geometry.attributes.position,index=slab.geometry.index;
for(let i=0;i<index.count;i+=3){const ring=[0,1,2].map(j=>[p.getX(index.getX(i+j)),p.getZ(index.getX(i+j))]);slabArea+=area(ring);for(const bed of layout.beds)assert.ok(intersection({points:ring},bed.polygon)<.0001,'slab must not fill plant bed');}
const expectedArea=area(layout.outline.points)-layout.beds.reduce((s,b)=>s+area(b.polygon.points),0);
assert.ok(Math.abs(slabArea-expectedArea)<.003,'rendered slabs cover courtyard minus beds');
let meshes=0,trianglesCount=0;
court.group.traverse(m=>{if(m.isMesh){meshes++;trianglesCount+=m.geometry.index.count/3;for(const attr of Object.values(m.geometry.attributes))assert.ok(attr.array.every(Number.isFinite));}});
await RAPIER.init();
const world=new RAPIER.World({x:0,y:-9.81,z:0});
for(const mesh of [...data.meshes,...court.fixedMeshes])world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));
for(const s of court.solids){const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),s.angle??0);world.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z).setRotation(rotation));}
const {cx,cz,nx,nz}=layout.frame;
world.createCollider(RAPIER.ColliderDesc.cuboid(90,.1,90).setTranslation(cx,-.1,cz));world.step();
const point=(u,v,y=.91)=>{const[x,z]=layout.point(u,v);return{x,y,z};};
const uv=p=>[(p.x-cx)*nz-(p.z-cz)*nx,(p.x-cx)*nx+(p.z-cz)*nz];
const walks=[];
function walk(name,start,end,{blocked=false,landing=false}={}){
 const s=point(...start),body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(s.x,s.y,s.z));
 const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);
 motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);world.step();
 const target=point(...end);let reached=false,minTreeClearance=Infinity;
 for(let i=0;i<1500;i++){
  const p=body.translation(),dx=target.x-p.x,dz=target.z-p.z,length=Math.hypot(dx,dz);
  if(length<.07){reached=true;break;}
  for(const tree of layout.trees)minTreeClearance=Math.min(minTreeClearance,Math.hypot(p.x-tree.x,p.z-tree.z));
  motor.computeColliderMovement(collider,{x:dx/length*.045,y:-.035,z:dz/length*.045});
  const d=motor.computedMovement();body.setNextKinematicTranslation({x:p.x+d.x,y:p.y+d.y,z:p.z+d.z});world.step();
 }
 const at={...body.translation()},endUV=uv(at);
 if(blocked){assert.ok(!reached,`${name}: expected blocked`);assert.ok(endUV[0]>-6.8,`${name}: high bed stops character`);}
 else {assert.ok(reached,`${name}: stopped at ${JSON.stringify({endUV,y:at.y})}`);assert.ok(minTreeClearance>.85,`${name}: tree envelope clearance ${minTreeClearance}`);}
 if(landing)assert.ok(at.y>1.4&&at.y<1.53,`${name}: landing height`);
 walks.push({name,reached,endUV,y:at.y,minTreeClearance});world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
for(const u of[-4,0,4]){walk(`entrance inward ${u}`,[u,35],[u,.75],{landing:true});walk(`entrance outward ${u}`,[u,.75,1.47],[u,35]);}
walk('south wing approach', [4,20],[-6.3,20]);walk('south wing return',[-6.3,20],[4,20]);
walk('north red path outward',[8,25.3],[28,25.3]);walk('north red path inward',[28,25.3],[8,25.3]);
walk('low north edging outward',[4,16],[12,16]);walk('low north edging inward',[12,16,1.1],[4,16]);
walk('south high bed blocks walking',[-4,8],[-8,8],{blocked:true});
let closedFacadeSamples=0;
for(let u=-9;u<=9;u++){
 const a=point(u,4,2),b=point(u,-4,2),hit=world.castShape(a,{x:0,y:0,z:0,w:1},{x:b.x-a.x,y:0,z:b.z-a.z},new RAPIER.Capsule(.57,.27),0,1,true);
 assert.ok(hit,`closed facade ${u}`);closedFacadeSamples++;
}
// Camera proxies remain raycastable after the render builder merges/disposes originals.
let cameraHits=0;
for(const [u,v]of[[0,12],[-8,8],[10,16],[24,25]]){
 const q=point(u,v,5),ray=new T.Raycaster(new T.Vector3(q.x,q.y,q.z),new T.Vector3(0,-1,0));
 const hits=ray.intersectObjects(court.cameraSolids,false);assert.ok(hits.length,'camera sees courtyard surface');cameraHits++;
}
const {version}=JSON.parse(await readFile('package.json','utf8'));
const reportDir=`docs/validation/v${version.replace(/\.0$/,'')}`;
const report={version,passed:true,slabArea,expectedArea,pavingOverlap:overlap,buildingPolygonsChecked:neighbours.length/2,meshes,triangles:trianglesCount,fixedMeshes:court.fixedMeshes.length,stoneCapSolids:court.solids.length,closedFacadeSamples,cameraHits,walks,scope:'Actual plan-34 facade + courtyard meshes and caps with Rapier character motor. Five tree positions checked for route clearance; async GLB tree colliders and full-scene props not instantiated. Approximate map registration is not a surveyed boundary.'};
await mkdir(reportDir,{recursive:true});await writeFile(`${reportDir}/courtyard-motor-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});
world.free();console.log(JSON.stringify({passed:true,meshes,triangles:trianglesCount,walks:walks.length,closedFacadeSamples,cameraHits,slabArea}));
