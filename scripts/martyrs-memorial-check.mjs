import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';

const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const canvasCalls=[];
const ctx=new Proxy({fillText:(...args)=>canvasCalls.push(args)},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const bundle=await build({stdin:{contents:`
import * as T from 'three';
import {createMartyrsMemorial,martyrsMemorial} from './martyrs-memorial.ts';
export {T,martyrsMemorial};
export {placeStories,getPlaceStory} from './place-stories.ts';
export {extraPlaces,locationName} from './place-index.ts';
export const data=createMartyrsMemorial({textures:new Map([['stone-grain.webp',new T.Texture()]]),path:new T.MeshStandardMaterial(),grass:new T.MeshStandardMaterial()});
`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {T,data,martyrsMemorial:r,extraPlaces,locationName,placeStories,getPlaceStory}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
const report={passed:false,scope:'New memorial geometry, real Rapier capsule, camera rays, source/name/arrival integration. Does not claim full-scene vegetation, GPU or reference dimensions measured.',walks:[],rays:[]};
assert.equal(canvasCalls.map(a=>a[0]).join(''),'革命烈士永垂不朽');
assert.equal(data.group.userData.steps.length,13);
assert.equal(extraPlaces.find(p=>p.name===r.name).z,81.4);
assert.equal(locationName(map,r.x,r.z),r.name);
assert.ok(placeStories[r.name].summary.includes('南高路北侧'));
assert.notEqual(getPlaceStory(r.name),getPlaceStory('金陵大学难民收容所纪念碑'));
for(const name of [r.name,'苏浙运动场','南园导览栏']){
 const s=placeStories[name];assert.match(s.source,/^https:\/\//);assert.ok(s.summary&&s.detail&&s.sourceLabel);
}
let meshes=0,triangles=0;
data.group.traverse(m=>{if(m.isMesh){meshes++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;for(const a of Object.values(m.geometry.attributes))assert.ok(a.array.every(Number.isFinite));}});
for(const s of data.solids)assert.ok(Object.values(s).every(Number.isFinite));
// New solids stay north of the crossing and cannot close public streets.
for(const s of data.solids)assert.ok(s.z+s.d/2<79,'memorial solids remain inside northern enclosure');
await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});
world.createCollider(RAPIER.ColliderDesc.cuboid(40,.1,40).setTranslation(r.x,-.1,r.z));
for(const s of data.solids){const c=RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z);if(s.angle)c.setRotation({x:0,y:Math.sin(s.angle/2),z:0,w:Math.cos(s.angle/2)});world.createCollider(c);}
for(const m of data.fixedMeshes){assert.ok(m.vertices.every(Number.isFinite));assert.ok(m.indices.every(i=>i<m.vertices.length/3));world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices,m.indices));}
world.step();
function walk(name,start,end,{blocked=false,height=.86,step=.045}={}){
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(r.x+start[0],start[2]??.86,r.z+start[1]));
 const capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);motor.setMaxSlopeClimbAngle(Math.PI/4);motor.setMinSlopeSlideAngle(Math.PI/3);world.step();
 let reached=false,minY=99,maxY=-99,velocityY=0;
 for(let i=0;i<1800;i++){
  const p=body.translation(),dx=r.x+end[0]-p.x,dz=r.z+end[1]-p.z,d=Math.hypot(dx,dz);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);if(d<.065){reached=true;break;}
  velocityY=Math.max(-18,velocityY-9.81/60);motor.computeColliderMovement(capsule,{x:dx/d*step,y:velocityY/60,z:dz/d*step});const m=motor.computedMovement();if(motor.computedGrounded())velocityY=-.5;body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();
 }
 const endPosition=body.translation(),result={name,reached,x:endPosition.x-r.x,v:endPosition.z-r.z,y:endPosition.y,minY,maxY};
 assert.equal(reached,!blocked,JSON.stringify(result));assert.ok(Math.abs(result.y-height)<.1,JSON.stringify(result));assert.ok(minY>.80&&maxY<r.platformHeight+1.03,JSON.stringify(result));report.walks.push(result);world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
for(const u of [-.9,0,.9]){walk(`both flights up ${u}`,[u,13],[u,2.5],{height:r.platformHeight+.86});walk(`both flights down ${u}`,[u,2.5,r.platformHeight+.86],[u,13]);}
for(const step of [.02,.08])walk(`both flights varied stride ${step}`,[0,13],[0,2.5],{height:r.platformHeight+.86,step});
for(const side of [-1,1])walk(`terrace rail ${side}`,[0,1.8,r.platformHeight+.86],[side*8,1.8],{blocked:true,height:r.platformHeight+.86});
walk('tablet plinth',[0,2.5,r.platformHeight+.86],[0,0],{blocked:true,height:r.platformHeight+.86});
for(const v of [15,17])for(const s of [-1,1])walk(`south road ${v} ${s}`,[s*15,v],[-s*15,v]);
for(const mesh of data.cameraSolids)mesh.updateMatrixWorld(true);
for(const [name,u,v,y,dir,max]of [['front tablet',0,2,4.8,[0,0,-1],3],['left rail',0,1.8,3.22,[-1,0,0],7],['right rail',0,1.8,3.22,[1,0,0],7],['upper landing',0,2.5,5,[0,-1,0],3],['lower stairs',0,10.8,3,[0,-1,0],3]]){
 const hits=new T.Raycaster(new T.Vector3(r.x+u,y,r.z+v),new T.Vector3(...dir),0,max).intersectObjects(data.cameraSolids,false);assert.ok(hits.length,`camera ${name}`);report.rays.push({name,distance:hits[0].distance});
}
world.free();Object.assign(report,{passed:true,meshes,triangles,solids:data.solids.length,fixedMeshes:data.fixedMeshes.length,stories:Object.keys(placeStories).length});
const out='docs/validation/signs-stories';await mkdir(out,{recursive:true});await writeFile(`${out}/memorial-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,meshes,triangles,walks:report.walks.length,rays:report.rays.length,stories:report.stories}));
