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
async function fixture(source){
 const result=await build({stdin:{contents:source+`\nexport function fixture(f){const b=new Builder(),meshes=[],camera=[],doors=[];const record=buildSpecific(f,{},b,meshes,camera,doors,entranceMaterials());return {record,meshes,camera,doors,group:b.finish('yifu-hall')};}`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
 const {fixture}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
 return fixture(map.features.find(f=>f.id==='plan-34'));
}
const before=await fixture(execFileSync('git',['show','f7810d6:src/world/specific-buildings.ts'],{encoding:'utf8'}));
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
 advance(-1,-1);const stopped={...body.translation()},v=(stopped.x-cx)*nx+(stopped.z-cz)*nz;
 assert.ok(v>.25&&v<.8,`closed facade stops entry: ${u} at ${v}`);
 const outFrames=advance(1,4),exited={...body.translation()};assert.ok(outFrames,'motor exits');assert.ok(exited.y<.95,'motor descends');
 walks.push({u,inFrames,outFrames,entered,stopped,exited});world.removeCharacterController(motor);world.removeRigidBody(body);world.step();
}
let blocked=0;
for(let u=-9;u<=9;u++){
 const a=point(u,4,2),b=point(u,-4,2),hit=world.castShape(a,{x:0,y:0,z:0,w:1},{x:b.x-a.x,y:0,z:b.z-a.z},new RAPIER.Capsule(.57,.27),0,1,true);
 assert.ok(hit,`closed building envelope u=${u}`);blocked++;
}
const report={version:'0.88.0',passed:true,baseCommit:'f7810d6',before:render(before.group),after:render(data.group),sectionsUnchanged:data.record.sections.length,collisionMeshesBefore:before.meshes.length,collisionMeshesAfter:data.meshes.length,blocked,motorWalks:walks.length*2,walks,record:data.record,scope:'Isolated plan-34 footprint, facade and character motor. No whole-scene performance or adjacent-prop collision claim.'};
await mkdir('docs/validation/v0.88',{recursive:true});await writeFile(`docs/validation/v0.88/geometry-motor-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});
world.free();console.log(JSON.stringify({passed:true,before:report.before,after:report.after,blocked,motorWalks:report.motorWalks}));
