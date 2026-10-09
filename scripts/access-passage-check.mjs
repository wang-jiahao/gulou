import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import RAPIER from '@dimforge/rapier3d-compat';

// Offline audit of the REAL factory. No browser, server, baseline write, or
// replacement sensor logic. Actor dimensions/speeds match controller.ts.
// Rendered moving gate boxes are compared with real Rapier actor shapes;
// overlaps describe visual penetration (the moving arms have no game collider).
const sourceFiles=['src/world/access-controls.ts','src/world/access-sensor.ts','src/game/game.ts','src/player/controller.ts'];
const digest=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const sources=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,await digest(p)])));
const out=process.env.ACCESS_PASSAGE_OUT||`docs/validation/access-passage/run-${Date.now()}.json`;
const report={scope:'Real access factory; fixed input trajectories and exact rendered-box/actor-shape intersections. No browser, terrain, game movement response, or GPU validation.',sources,passages:[],cases:[],findings:[],limits:[]};
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const ctx=new Proxy({measureText:()=>({width:80})},{get:(o,p)=>p in o?o[p]:()=>{}});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const bundle=await build({stdin:{contents:`import * as T from 'three';export {T};export {createAccessControls,campusEntrances} from './access-controls.ts';`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {T,createAccessControls,campusEntrances}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
await RAPIER.init();
const access=createAccessControls({stone:new T.MeshStandardMaterial({name:'stone'})});
access.group.updateMatrixWorld(true);
const initial=access.snapshot();
assert.equal(initial.entrances,9);assert.equal(initial.readers.length,17);assert.equal(initial.booms.length,9);
const round=x=>Number(x.toFixed(5));
const far=new T.Vector3(3000,.035,3000);
function reset(){for(let i=0;i<200;i++)access.update(.05,far,true);}
function note(key,detail){report.findings.push({key,...detail});}
const targets=[];
for(const [kind,entries] of [['reader',initial.readers],['boom',initial.booms]])entries.forEach((record,index)=>{
 const entrance=campusEntrances.find(e=>e.id===record.entrance),local=access.group.children.find(g=>g.name===entrance.name);
 assert.ok(local,record.entrance);
 let meshes;
 if(kind==='reader'){
  const siblings=entries.filter(r=>r.entrance===record.entrance),lane=siblings.indexOf(record);
  meshes=local.children.filter(g=>g.userData.side!==undefined).slice(lane*2,lane*2+2).map(g=>g.children[0]);
  assert.equal(meshes.length,2);
 }else{
  const pivot=local.children.find(g=>g.isGroup&&g.children.some(m=>m.isMesh&&m.geometry.parameters?.width===6));
  assert.ok(pivot,'real boom pivot');meshes=pivot.children.filter(m=>m.geometry?.parameters?.width===6);
 }
 const boxes=meshes.map(mesh=>{
  mesh.geometry.computeBoundingBox();const size=mesh.geometry.boundingBox.getSize(new T.Vector3());
  return{mesh,shape:new RAPIER.Cuboid(size.x/2,size.y/2,size.z/2),centre:mesh.geometry.boundingBox.getCenter(new T.Vector3())};
 });
 targets.push({kind,index,entrance:record.entrance,x:record.x,z:record.z,angle:entrance.angle,local,boxes});
});
const actorProfiles=[
 {name:'walk',speed:1.65,halfLength:.27,shape:new RAPIER.Capsule(.57,.27)},
 {name:'run',speed:4.2,halfLength:.27,shape:new RAPIER.Capsule(.57,.27)},
 {name:'bicycle',speed:4.5,halfLength:.95,shape:new RAPIER.Cuboid(.34,.84,.95)},
 {name:'bicycle-boost',speed:9,halfLength:.95,shape:new RAPIER.Cuboid(.34,.84,.95)},
];
const position=(t,across,along,y=.035)=>new T.Vector3(t.x+across*Math.cos(t.angle)+along*Math.sin(t.angle),y,t.z-across*Math.sin(t.angle)+along*Math.cos(t.angle));
const state=t=>{const s=access.snapshot();return(t.kind==='reader'?s.readers:s.booms)[t.index];};
const update=(t,across,along,dt=1/60,y=.035,active=true,travel={})=>{access.update(dt,position(t,across,along,y),active,travel);return state(t);};
const hold=(t,across,along,seconds=2,dt=1/60,y=.035,active=true,travel={})=>{
 let result;for(let i=0;i<Math.ceil(seconds/dt);i++)result=update(t,across,along,dt,y,active,travel);return result;
};
function check(name,t,actual,expected,details={}){
 const passed=actual===expected;report.cases.push({name,entrance:t.entrance,kind:t.kind,index:t.index,passed,...details});
 if(!passed)note(name,{entrance:t.entrance,kind:t.kind,index:t.index,...details});
}
function runPassage(t,profile,direction,dt,across=0){
 reset();const start=5,end=4,total=(start+end)/profile.speed;
 const travel={riding:profile.name.startsWith('bicycle')};
 const actorRotation={x:0,y:Math.sin(t.angle/2),z:0,w:Math.cos(t.angle/2)};
 let firstActivation=null,leading=null,centre=null,previous={remaining:start,open:0},overlapFrames=0,firstOverlap=null,maxPenetration=0;
 update(t,across,-direction*start,dt,.035,true,travel);
 for(let frame=1;frame<=Math.ceil(total/dt);frame++){
  const elapsed=frame*dt,along=-direction*start+direction*profile.speed*elapsed,remaining=-direction*along;
  const p=position(t,across,along),s=update(t,across,along,dt,.035,true,travel);
  if(firstActivation===null&&s.open>1e-5)firstActivation={remaining:round(remaining),time:round(elapsed)};
  for(const [threshold,setter] of [[profile.halfLength,v=>{leading=v;}],[0,v=>{centre=v;}]]){
   if(previous.remaining>threshold&&remaining<=threshold){const fraction=(previous.remaining-threshold)/(previous.remaining-remaining);setter(round(previous.open+(s.open-previous.open)*fraction));}
  }
  if(Math.abs(along)<profile.halfLength+.65){
   t.local.updateMatrixWorld(true);
   let hit=false;
   for(const b of t.boxes){
    const centre=b.centre.clone().applyMatrix4(b.mesh.matrixWorld),rotation=b.mesh.getWorldQuaternion(new T.Quaternion());
    const contact=b.shape.contactShape(centre,rotation,profile.shape,{x:p.x,y:p.y+.86,z:p.z},actorRotation,0);
    if(contact&&contact.distance<-.0001){hit=true;maxPenetration=Math.max(maxPenetration,-contact.distance);}
   }
   if(hit){overlapFrames++;firstOverlap??={remaining:round(remaining),open:round(s.open),secondsBeforeCentre:round(remaining/profile.speed)};}
  }
  previous={remaining,open:s.open};
 }
 const result={entrance:t.entrance,kind:t.kind,index:t.index,mode:profile.name,direction,hz:round(1/dt),across,firstActivation,openAtLeadingEdge:leading,openAtCentre:centre,overlapFrames,overlapDuration:round(overlapFrames*dt),maxPenetration:round(maxPenetration),firstOverlap};
 report.passages.push(result);
 if(overlapFrames)note('moving-mesh-overlap',result);
 if(centre===null||leading===null)throw Error('Incomplete crossing sample');
 const closed=hold(t,across,direction*6,5,.05,.035,true,travel).open;
 if(closed>.001)note('fails-to-close-after-passage',{entrance:t.entrance,kind:t.kind,closed});
}

// All 17 pedestrian lanes and 9 centre arms, all map orientations, both travel
// directions, all four steady speeds, including the game's maximum dt=.05.
for(const t of targets)for(const profile of actorProfiles)for(const direction of [-1,1])for(const dt of [1/120,1/60,.05])runPassage(t,profile,direction,dt);
// Centre-arm edge crossings check the short lever near its housing as well.
for(const t of targets.filter(t=>t.kind==='boom'))for(const across of [-2.2,2.2])for(const direction of [-1,1])runPassage(t,actorProfiles[3],direction,1/60,across);

for(const t of targets){
 for(const side of [-1,1]){
  reset();const nearby=t.kind==='reader'?1.0:1.6;
  const idle=hold(t,0,side*nearby);check('stationary-nearby-stays-closed',t,idle.open<.0001,true,{side,open:round(idle.open)});
  reset();const outside=t.kind==='reader'?.9:3.3;
  let max=0;for(let a=-5;a<=5;a+=.035)max=Math.max(max,update(t,side*outside,a).open);
  check('parallel-outside-lane-stays-closed',t,max<.0001,true,{side,maxOpen:round(max)});
  reset();const high=hold(t,0,0,2,1/60,5,true,{flying:true});check('high-flight-stays-closed',t,high.open<.0001,true,{open:round(high.open)});
  reset();hold(t,0,side*4,.1);
  const teleported=update(t,0,side*nearby);check('teleport-to-approach-stays-closed',t,teleported.open<.0001,true,{side,open:round(teleported.open)});
 }
 reset();const occupied=hold(t,0,0,3);check('occupied-stationary-stays-open',t,occupied.open>.999,true,{open:round(occupied.open)});
 const paused=JSON.stringify(access.snapshot());hold(t,0,5,2,1/60,.035,false);
 check('pause-freezes-all-gates',t,JSON.stringify(access.snapshot())===paused,true);
 const resumed=hold(t,0,0,1);check('resume-while-occupied-opens',t,resumed.open>.999,true,{open:round(resumed.open)});
 const cleared=hold(t,0,6,6);check('leave-closes',t,cleared.open<.001,true,{open:round(cleared.open)});
 reset();const safety=hold(t,0,0,1);check('teleport-into-throat-opens-for-safety',t,safety.open>.99,true,{open:round(safety.open)});
 reset();const lowFlight=hold(t,0,0,1,1/60,.5,true,{flying:true});
 check('low-flight-stays-closed',t,lowFlight.open<.0001,true,{height:.5,open:round(lowFlight.open)});
 hold(t,0,0,2);const flightRelease=hold(t,0,0,6,1/60,.5,true,{flying:true});
 check('launch-releases-existing-hold',t,flightRelease.open<.001,true,{open:round(flightRelease.open)});
 reset();const near=t.kind==='reader'?1:1.6;hold(t,0,near+1,.1);
 const shortJump=update(t,0,near);
 check('short-position-jump-does-not-authorize-approach',t,shortJump.open<.0001,true,{metres:1,dt:1/60,open:round(shortJump.open)});
}

for(const t of targets.filter(t=>t.kind==='boom')){
 // The actual pedestrian lanes, in world space, must never raise the centre arm.
 const entrance=campusEntrances.find(e=>e.id===t.entrance);
 for(const lane of entrance.pedestrians)for(const side of [-1,1]){
  reset();let max=0;for(let along=-5;along<=5;along+=.04)max=Math.max(max,update(t,lane,side*along).open);
  check('pedestrian-lane-does-not-raise-centre-arm',t,max<.0001,true,{lane,side,maxOpen:round(max)});
 }
 // A road crossing perpendicular to the gate must remain closed. The second
 // path drifts only 2cm longitudinally per metre: still overwhelmingly lateral.
 for(const drift of [0,-.02])for(const direction of [-1,1]){
  reset();let max=0,first=null;
  for(let travelled=0;travelled<=16;travelled+=1.65/60){
   const across=direction*(-8+travelled),along=1.60+drift*travelled,s=update(t,across,along);
   max=Math.max(max,s.open);if(s.open>.0001&&first===null)first={across:round(across),along:round(along),open:round(s.open)};
  }
  check('lateral-road-crossing-stays-closed',t,max<.0001,true,{direction,drift,maxOpen:round(max),first});
 }
}

const changed=[];for(const p of sourceFiles)if(await digest(p)!==sources[p])changed.push(p);
report.sourcesChangedDuringRun=changed;
if(changed.length)note('source-edited-during-audit',{files:changed});
const summarize=items=>{
 const groups=new Map();for(const p of items){const key=`${p.kind}/${p.mode}/${p.hz}Hz`;
  const g=groups.get(key)||{key,runs:0,overlappingRuns:0,minLeadingOpen:1,minCentreOpen:1,maxPenetration:0};
  g.runs++;g.overlappingRuns+=p.overlapFrames>0?1:0;g.minLeadingOpen=Math.min(g.minLeadingOpen,p.openAtLeadingEdge);g.minCentreOpen=Math.min(g.minCentreOpen,p.openAtCentre);g.maxPenetration=Math.max(g.maxPenetration,p.maxPenetration);groups.set(key,g);
 }return[...groups.values()].map(g=>({...g,minLeadingOpen:round(g.minLeadingOpen),minCentreOpen:round(g.minCentreOpen)}));
};
report.summary={entrances:9,readers:17,booms:9,passages:report.passages.length,behaviourCases:report.cases.length,behaviourFailed:report.cases.filter(c=>!c.passed).length,overlappingPassages:report.passages.filter(p=>p.overlapFrames).length,byMode:summarize(report.passages),findingCounts:Object.fromEntries([...new Set(report.findings.map(f=>f.key))].map(k=>[k,report.findings.filter(f=>f.key===k).length]))};
report.status=report.findings.length?'failed':'passed';
await mkdir(resolve(out,'..'),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,path:out,...report.summary}));
if(report.findings.length)process.exitCode=1;
