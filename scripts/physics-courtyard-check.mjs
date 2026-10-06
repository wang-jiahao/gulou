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
import {buildPhysicsBuilding} from './physics-building.ts';
import {createPlanarCutout} from './planar-cutout.ts';
import {physicsCourtyardLayout,createPhysicsCourtyardGround} from './physics-courtyard.ts';
export {T,createPlanarCutout};
export function fixture(f){
 const b=new Builder(),meshes=[],camera=[],doors=[];
 const record=buildPhysicsBuilding(f,b,meshes,camera,doors);
 const layout=physicsCourtyardLayout();
 const court=createPhysicsCourtyardGround(layout,{stone:new T.MeshStandardMaterial(),grass:new T.MeshStandardMaterial(),textures:new Map()});
 return {record,meshes,camera,doors,building:b.finish('physics building'),layout,court};
}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {T,createPlanarCutout,fixture}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const data=fixture(map.features.find(f=>f.id==='plan-70')),{layout,court}=data;
const area=ring=>Math.abs(ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);
function triangles(p){const rings=[p.points,...(p.holes??[])].map(r=>r.map(([x,z])=>new T.Vector2(x,z))),points=rings.flat();return T.ShapeUtils.triangulateShape(rings[0],rings.slice(1)).map(ids=>ids.map(i=>[points[i].x,points[i].y]));}
function intersection(a,b){const cut=createPlanarCutout(b);return triangles(a).reduce((s,t)=>s+area(t)-cut.subtract(t).reduce((n,r)=>n+area(r),0),0);}
const neighbours=[];
for(const f of map.features.filter(f=>f.tags.building))for(const p of [layout.outline]){
 const overlap=intersection(p,f);assert.ok(overlap<1e-5,`paving enters ${f.id}: ${overlap}m²`);
 neighbours.push({id:f.id,overlap});
}
for(const bed of layout.beds)assert.ok(Math.abs(intersection(layout.outline,bed.polygon)-area(bed.polygon.points))<1e-5,`${bed.id} bed contained in court`);
let roadsChecked=0;
for(const f of map.roads)for(const bed of layout.beds){
 const overlap=intersection(bed.polygon,f);assert.ok(overlap<1e-5,`planting enters mapped road ${f.id}: ${overlap}m²`);roadsChecked++;
}
assert.ok(roadsChecked>0,'mapped roads were checked');
assert.ok(neighbours.length>0,'mapped building footprints were checked');
for(const tree of layout.trees){
 const u=(tree.x-layout.frame.cx)*layout.frame.nz-(tree.z-layout.frame.cz)*layout.frame.nx;
 const v=(tree.x-layout.frame.cx)*layout.frame.nx+(tree.z-layout.frame.cz)*layout.frame.nz;
 assert.ok(Math.abs(u)>9&&Math.abs(u)<21&&v>13&&v<47,'tree trunk inside planting, clear of roads');
}
const slab=court.group.children[0].children.find(m=>m.name==='physics courtyard asphalt');
// Match the Float32 vertex coordinates used by both rendered bed and paving.
// The source-double bed edge differed by <8 micrometres over a 36m edge.
const renderedBeds=layout.beds.map(b=>({...b.polygon,points:b.polygon.points.map(p=>p.map(Math.fround))}));
let slabArea=0;const p=slab.geometry.attributes.position,index=slab.geometry.index;
for(let i=0;i<index.count;i+=3){const ring=[0,1,2].map(j=>[p.getX(index.getX(i+j)),p.getZ(index.getX(i+j))]);slabArea+=area(ring);for(const bed of renderedBeds){const overlap=intersection({points:ring},bed);assert.ok(overlap<.0001,`slab must not fill plant bed: ${overlap}m² triangle ${JSON.stringify(ring)}`);}}
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
function walk(name,start,end,{blocked=false,closedDoor=false,landing=false}={}){
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
 if(closedDoor){assert.ok(!reached,`${name}: closed door must block`);assert.ok(endUV[1]>1.7&&endUV[1]<1.85,`${name}: stopped before glass at ${endUV[1]}`);}
 else if(blocked){assert.ok(!reached,`${name}: expected hedge to block`);assert.ok(Math.abs(endUV[0])<8.8,`${name}: hedge stops character before bed`);}
 else {assert.ok(reached,`${name}: stopped at ${JSON.stringify({endUV,y:at.y})}`);assert.ok(minTreeClearance>.85,`${name}: tree envelope clearance ${minTreeClearance}`);}
 if(landing)assert.ok(at.y>1.30&&at.y<1.42,`${name}: landing height`);
 walks.push({name,reached,endUV,y:at.y,minTreeClearance});world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
for(const u of[-3.6,0,3.6]){walk(`entrance inward ${u}`,[u,52],[u,2.2],{landing:true});walk(`entrance outward ${u}`,[u,2.2,1.34],[u,52]);}
for(const u of[-3.6,0,3.6])walk(`closed entrance ${u}`,[u,7],[u,.5],{closedDoor:true,landing:true});
walk('behind columns east',[-4.8,2.15,1.34],[4.8,2.15],{landing:true});
walk('behind columns west',[4.8,2.15,1.34],[-4.8,2.15],{landing:true});
walk('transverse walkway east',[-29,7.5],[29,7.5]);walk('transverse walkway west',[29,7.5],[-29,7.5]);
walk('Zhongda Road east',[-29,55],[29,55]);walk('Zhongda Road west',[29,55],[-29,55]);
for(const side of[-1,1])walk(`hedge blocks ${side}`,[side*4,25],[side*11,25],{blocked:true});
let closedFacadeSamples=0;
for(let u=-9;u<=9;u++){
 const a=point(u,1,2),b=point(u,-4,2),hit=world.castShape(a,{x:0,y:0,z:0,w:1},{x:b.x-a.x,y:0,z:b.z-a.z},new RAPIER.Capsule(.57,.27),0,1,true);
 assert.ok(hit,`closed facade ${u}`);closedFacadeSamples++;
}
// Camera proxies remain raycastable after the render builder merges/disposes originals.
for(const mesh of data.camera)mesh.updateMatrixWorld(true);
const entranceSamples=[];
for(const u of[-6,-5,-4.55,-3.6,-2.65,-2,-1.4,0,1.4,2,2.65,3.6,4.55,5,6]){
 const q=point(u,2.3,2),direction={x:-nx,y:0,z:-nz};
 const hit=world.castShape(q,{x:0,y:0,z:0,w:1},direction,new RAPIER.Ball(.025),0,1.05,true);
 assert.ok(hit,`entrance wall/door collision at ${u}`);
 const ray=new T.Raycaster(new T.Vector3(q.x,q.y,q.z),new T.Vector3(-nx,0,-nz),0,1.05);
 const hits=ray.intersectObjects(data.camera,false);assert.ok(hits.length,`camera sees entrance wall/door at ${u}`);
 entranceSamples.push({u,collisionToi:hit.time_of_impact,cameraDistance:hits[0].distance});
}
for(const u of[-3.6,0,3.6]){
 const q=point(u,2.1,2.7),ray=new T.Raycaster(new T.Vector3(q.x,q.y,q.z),new T.Vector3(0,1,0),0,1.6);
 assert.ok(ray.intersectObjects(data.camera,false).length,`camera sees porch ceiling ${u}`);
}
let cameraHits=0;
for(const [u,v]of[[0,12],[-15,20],[15,35],[0,51]]){
 const q=point(u,v,5),ray=new T.Raycaster(new T.Vector3(q.x,q.y,q.z),new T.Vector3(0,-1,0));
 const hits=ray.intersectObjects(court.cameraSolids,false);assert.ok(hits.length,'camera sees courtyard surface');cameraHits++;
}
const {version}=JSON.parse(await readFile('package.json','utf8'));
const reportDir=`docs/validation/v${version.replace(/\.0$/,'')}`;
const report={version,passed:true,slabArea,expectedArea,buildingPolygonsChecked:neighbours.length,roadsChecked,meshes,triangles:trianglesCount,fixedMeshes:court.fixedMeshes.length,stoneCapSolids:court.solids.length,closedFacadeSamples,cameraHits,entranceSamples,walks,scope:'Actual plan-70 building and courtyard geometry, kerbs and hedge cores with Rapier character motor. Eight tree positions checked for route clearance; async GLB tree colliders and full-scene props not instantiated. Species, sizes and map registration approximate.'};
await mkdir(reportDir,{recursive:true});await writeFile(`${reportDir}/physics-courtyard-motor-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});
world.free();console.log(JSON.stringify({passed:true,meshes,triangles:trianglesCount,walks:walks.length,closedFacadeSamples,cameraHits,entranceSamples:entranceSamples.length,slabArea}));
