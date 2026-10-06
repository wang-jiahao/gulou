import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const ctx=new Proxy({measureText:()=>({width:50})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
async function fixture(source,revision){
 const result=await build({stdin:{contents:source+`\nexport function fixture(f){const b=new Builder(),meshes=[],camera=[],doors=[];const record=buildSpecific(f,{},b,meshes,camera,doors,entranceMaterials());return {record,meshes,camera,doors,T,group:b.finish('yifu-hall')};}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',plugins:revision?[{name:'frozen-facade',setup(b){b.onLoad({filter:/yifu-hall-facade\.ts$/},()=>({contents:execFileSync('git',['show',`${revision}:src/world/yifu-hall-facade.ts`],{encoding:'utf8'}),loader:'ts',resolveDir:resolve('src/world')}));}}]:[]});
 const {fixture}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
 return fixture(map.features.find(f=>f.id==='plan-34'));
}
const baseCommit='9a15235';
const before=await fixture(execFileSync('git',['show',`${baseCommit}:src/world/specific-buildings.ts`],{encoding:'utf8'}),baseCommit);
const {version}=JSON.parse(await readFile('package.json','utf8'));
const reportDir=`docs/validation/v${version.replace(/\.0$/,'')}`;
const data=await fixture(await readFile('src/world/specific-buildings.ts','utf8'));
assert.deepEqual(data.record.sections,before.record.sections,'original footprint/height sections retained');
assert.equal(data.doors.length,1);
function render(group){const r={meshes:0,triangles:0};group.traverse(m=>{if(m.isMesh){r.meshes++;r.triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));}});return r;}
await RAPIER.init();
const world=new RAPIER.World({x:0,y:-9.81,z:0});
for(const mesh of data.meshes){assert.ok(mesh.vertices.every(Number.isFinite));world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));}
const[cx,cz,nx,nz]=data.record.frontage;
world.createCollider(RAPIER.ColliderDesc.cuboid(70,.1,70).setTranslation(cx,-.1,cz));world.step();
const point=(u,v,y=.87)=>({x:cx+u*nz+v*nx,y,z:cz-u*nx+v*nz});
const walks=[];
for(const u of[-4,0,4]){
 const start=point(u,4),body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x,start.y,start.z));
 const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);
 motor.enableAutostep(.3,.2,false);motor.enableSnapToGround(.4);world.step();
 const advance=(direction,target)=>{for(let i=0;i<200;i++){
  motor.computeColliderMovement(collider,{x:nx*direction*.045,y:-.035,z:nz*direction*.045});
  const p=body.translation(),d=motor.computedMovement();body.setNextKinematicTranslation({x:p.x+d.x,y:p.y+d.y,z:p.z+d.z});world.step();
  const at=body.translation(),v=(at.x-cx)*nx+(at.z-cz)*nz;
  if(direction<0?v<=target:v>=target)return i+1;
 }};
 const inFrames=advance(-1,.75),entered={...body.translation()};
 assert.ok(inFrames,`motor reaches landing u=${u}: ${JSON.stringify(entered)}`);
 assert.ok(entered.y>1.40&&entered.y<1.53,'standing on 0.60m landing');
 const porchFrames=advance(-1,-.8);assert.ok(porchFrames,'walks behind front line between piers');
 const inPorch={...body.translation()};assert.ok(inPorch.y>1.40&&inPorch.y<1.53,'porch floor stays level');
 advance(-1,-3);const stopped={...body.translation()},v=(stopped.x-cx)*nx+(stopped.z-cz)*nz;
 assert.ok(v> -1.45&&v< -1.05,`recessed wall/door stops entry: ${u} at ${v}`);
 const outFrames=advance(1,4),exited={...body.translation()};assert.ok(outFrames,'motor exits');assert.ok(exited.y<.95,'motor descends');
 walks.push({u,inFrames,porchFrames,outFrames,entered,inPorch,stopped,exited});world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
let blocked=0;
for(let u=-9;u<=9;u++){
 const a=point(u,4,2),b=point(u,-4,2),hit=world.castShape(a,{x:0,y:0,z:0,w:1},{x:b.x-a.x,y:0,z:b.z-a.z},new RAPIER.Capsule(.57,.27),0,1,true);
 assert.ok(hit,`closed building envelope u=${u}`);blocked++;
}
const {T}=data;
data.group.updateMatrixWorld(true);for(const object of data.camera)object.updateMatrixWorld(true);
let porchRays=0;
function rayAt(u,v,y,du,dv,dy){const p=point(u,v,y);return new T.Raycaster(new T.Vector3(p.x,p.y,p.z),new T.Vector3(du*nz+dv*nx,dy,-du*nx+dv*nz),0,10);}
for(const u of[-8,-6,-4,-2,0,2,4,6,8]){
 const a=point(u,2,1.8),hit=world.castRay(new RAPIER.Ray(a,{x:-nx,y:0,z:-nz}),5,true);
 assert.ok(hit&&hit.timeOfImpact>3.35&&hit.timeOfImpact<3.70,`recessed collision face u=${u}`);
 const cameraHit=rayAt(u,2,1.8,0,-1,0).intersectObjects(data.camera,false)[0];
 const renderHit=rayAt(u,2,1.8,0,-1,0).intersectObject(data.group,true)[0];
 assert.ok(cameraHit&&cameraHit.distance>3.35&&cameraHit.distance<3.70,`recessed camera face u=${u}`);
 assert.ok(renderHit&&renderHit.distance>3.30&&renderHit.distance<3.70,`recessed visible face u=${u}`);
 for(const [dy,expected]of[[-1,1.2],[1,1.35]]){
  const roof=world.castRay(new RAPIER.Ray(point(u,-.8,1.8),{x:0,y:dy,z:0}),3,true);
  assert.ok(roof&&Math.abs(roof.timeOfImpact-expected)<.02,'closed porch floor/soffit');
 }
 porchRays+=5;
}
let pierChecks=0;
for(const u of[-9,-3,3,9]){
 const a=point(u,2,1.8),hit=world.castShape(a,{x:0,y:0,z:0,w:1},{x:-nx,y:0,z:-nz},new RAPIER.Capsule(.57,.27),0,3,true);
 assert.ok(hit&&hit.time_of_impact<1.3,'solid stone pier blocks character');
 const cameraHit=rayAt(u,2,1.8,0,-1,0).intersectObjects(data.camera,false)[0];
 assert.ok(cameraHit&&Math.abs(cameraHit.distance-1.48)<.02,'camera sees pier');pierChecks+=2;
}
// Walk laterally inside all three bays, behind the piers, to both end returns.
for(const direction of[-1,1]){
 const start=point(0,-.8,1.47),body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x,start.y,start.z));
 const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.57,.27),body),motor=world.createCharacterController(.02);world.step();
 for(let i=0;i<300;i++){
  motor.computeColliderMovement(collider,{x:nz*direction*.045,y:-.035,z:-nx*direction*.045});
  const p=body.translation(),d=motor.computedMovement();body.setNextKinematicTranslation({x:p.x+d.x,y:p.y+d.y,z:p.z+d.z});world.step();
 }
 const p=body.translation(),u=(p.x-cx)*nz-(p.z-cz)*nx;
 assert.ok(u*direction>8.85&&u*direction<9.1,`porch ends closed after crossing bays: ${u}`);
 assert.ok(p.y>1.40&&p.y<1.53,'lateral porch route stays on landing');
 walks.push({direction,lateral:true,stopped:{...p}});world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
const baselineWorld=new RAPIER.World({x:0,y:0,z:0});
for(const mesh of before.meshes)baselineWorld.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));baselineWorld.step();
let envelopeChecks=0;
// Start beyond both projecting wings. A ray starting at v=12 can be inside
// the original wing and hit a new internal section seam rather than its shell.
for(const y of[1.8,4,6,12,22])for(let u=-45;u<=45;u+=.5)for(const side of[-1,1]){
 if(side===1&&y<3.15&&Math.abs(u)<9.7)continue;
 const ray=new RAPIER.Ray(point(u,side*80,y),{x:-nx*side,y:0,z:-nz*side});
 const old=baselineWorld.castRay(ray,160,true),now=world.castRay(ray,160,true);
 assert.equal(Boolean(now),Boolean(old),`unchanged outer envelope hit u=${u} y=${y} side=${side}`);
 if(old)assert.ok(Math.abs(old.timeOfImpact-now.timeOfImpact)<.003,`upper/side envelope unchanged u=${u} y=${y} side=${side}: old=${old.timeOfImpact} now=${now.timeOfImpact}`);
 envelopeChecks++;
}
baselineWorld.free();
const report={version,passed:true,baseCommit,before:render(before.group),after:render(data.group),sectionsUnchanged:data.record.sections.length,collisionMeshesBefore:before.meshes.length,collisionMeshesAfter:data.meshes.length,blocked,motorWalks:8,porchRays,pierChecks,envelopeChecks,walks,record:data.record,scope:'Isolated plan-34 footprint, facade and character motor. No whole-scene performance or adjacent-prop collision claim.'};
await mkdir(reportDir,{recursive:true});await writeFile(`${reportDir}/geometry-motor-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});
world.free();console.log(JSON.stringify({passed:true,before:report.before,after:report.after,blocked,motorWalks:report.motorWalks,porchRays,pierChecks,envelopeChecks}));
