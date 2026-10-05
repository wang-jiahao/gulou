import {chromium} from 'playwright';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,open,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Resolve Vite's compiler through Vite so this also works with pnpm's strict layout.
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');

const out='docs/validation/phase84',stage=process.env.ACCESS_STAGE||`run-${Date.now()}`,channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
const file=await open(`${out}/${stage}-${channel}.json`,'wx');
const syncGpu=process.env.ACCESS_SYNC_GPU==='1';
const report={stage,channel,timing:syncGpu?'drain GPU before each CPU sample; also record completion time':'normal animation-frame submission',errors:[],missing:[],views:[]};let browser;
try{
 // Keep the pre-change factory local, outside the product bundle. Compare both
 // factories in the same renderer, alternating order to limit thermal bias.
 const baselineRef=process.env.ACCESS_BASELINE_REF||'5f886a1';
 const source=process.env.ACCESS_BASELINE?await readFile(process.env.ACCESS_BASELINE,'utf8'):execFileSync('git',['show',`${baselineRef}:src/world/access-controls.ts`],{encoding:'utf8'});
 report.baseline=process.env.ACCESS_BASELINE||baselineRef;
 const baseline=await build({stdin:{contents:source,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'accessBaseline'});
 browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto(`${process.env.BASE_URL||'http://localhost:4173'}/?debug=1`);
 await page.waitForFunction(()=>window.__GULOU__?.stats().sectors===3&&!document.querySelector('#enter').disabled,null,{timeout:90000});
 await page.click('#enter');await page.addScriptTag({content:baseline.outputFiles[0].text});
 report.structure=await page.evaluate(()=>{
  const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');g.player.avatar.root.visible=false;
  const current=g.world.access,pier=current.group.children[2].getObjectByName('entrance equipment').children.find(o=>o.material.name==='stone')?.material;
  if(!pier)throw Error('Cannot locate original gate stone material');
  const before=window.accessBaseline.createAccessControls({stone:pier});g.world.root.add(before.group);
  const materials=new Set();before.group.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial&&!materials.has(o.material)&&o.material!==pier){materials.add(o.material);const key=o.material.customProgramCacheKey();g.csm.setupMaterial(o.material);o.material.customProgramCacheKey=()=>`gulou-csm:${key}`;o.material.needsUpdate=true;}});
  before.group.visible=false;window.accessPair={before,current};
  const count=group=>{let meshes=0,triangles=0,shadowTriangles=0;const textures=new Set(),geometries=new Set();group.traverse(o=>{if(o.isMesh){meshes++;const n=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;triangles+=n;if(o.castShadow)shadowTriangles+=n;if(o.material.map)textures.add(o.material.map);geometries.add(o.geometry);}});return{meshes,triangles,shadowTriangles,textures:textures.size,geometries:geometries.size};};
  if(JSON.stringify(before.solids)!==JSON.stringify(current.solids))throw Error('Collision changed');
  return{before:count(before.group),after:count(current.group),solids:current.solids.length};
 });
 assert.equal(report.structure.before.triangles,report.structure.after.triangles);
 assert.equal(report.structure.before.shadowTriangles,report.structure.after.shadowTriangles);
 assert.ok(report.structure.after.meshes<report.structure.before.meshes);
 report.transitions=await page.evaluate(()=>{
  const g=window.__GULOU__.game,{before,current}=window.accessPair,far=g.player.position.clone().set(2000,0,2000),results=[];
  const update=(position,active=true)=>{for(const a of[before,current])a.update(1/60,position,active);};
  const compare=()=>{const a=before.snapshot(),b=current.snapshot();if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Access animation state differs');
   for(const [i,e]of current.group.children.entries()){
    const oldGroups=before.group.children[i].children.filter(o=>o.isGroup&&o.name!=='entrance equipment'),newGroups=e.children.filter(o=>o.isGroup&&o.name!=='entrance equipment');
    if(JSON.stringify(oldGroups.map(o=>o.rotation.toArray()))!==JSON.stringify(newGroups.map(o=>o.rotation.toArray())))throw Error('Moving flap/boom pose changed');
    const displays=e.children.filter(o=>o.name==='paired reader displays'),readers=b.readers.filter(r=>r.entrance===window.accessBaseline.campusEntrances[i].id);
    displays.forEach((o,j)=>{if(o.material.name!==(readers[j].display==='pass'?'access-screen-pass':'access-screen-wait'))throw Error('Reader display out of sync');});
   }return b;
  };
  for(let i=0;i<240;i++)update(far);
  for(const target of [...current.snapshot().readers,...current.snapshot().booms]){
   const p=far.clone().set(target.x,0,target.z);for(let i=0;i<50;i++)update(p);compare();
   const state=JSON.stringify(current.snapshot());update(far,false);if(state!==JSON.stringify(compare()))throw Error('Paused control changed');
   for(let i=0;i<360;i++)update(far);const closed=compare();
   results.push({entrance:target.entrance,x:target.x,z:target.z,closed:Math.max(...closed.readers.map(r=>r.open),...closed.booms.map(b=>b.open))});
  }return results;
 });
 assert.ok(report.transitions.every(t=>t.closed<.00001));
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const[name,eye,look,openLane]of[
  ['north-flight',[-90,145,350],[-110,0,80]],['south-flight',[-110,145,650],[-110,0,400]],
  ['hankou',[-90,2,335],[-90,2,350]],['reader-closed',[-98.65,1.6,347.2],[-98.65,1.45,344.25]],
  ['reader-open',[-98.65,1.6,347.2],[-98.65,1.45,344.25],true],
 ]){
  const view=await page.evaluate(async({name,eye,look,openLane,syncGpu})=>{
   const g=window.__GULOU__.game,{before,current}=window.accessPair,gl=g.renderer.getContext();
   g.player.teleport(...eye);g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=62;g.camera.updateProjectionMatrix();g.camera.updateMatrixWorld();
   g.atmosphere.update(0,false,g.camera.position);g.world.updateVegetation(g.camera.position,g.quality,eye[1]>10,g.camera.position);g.csm.update();
   const position=g.player.position.clone().set(openLane?-98.6546:2000,0,openLane?344.25:2000);for(let i=0;i<480;i++){before.update(1/60,position,true);current.update(1/60,position,true);}
   const rounds=[],counts={},pixels={};
   for(let round=0;round<6;round++)for(const mode of(round%2?['after','before']:['before','after'])){
    before.group.visible=mode==='before';current.group.visible=mode==='after';
    for(let i=0;i<5;i++){g.renderer.render(g.scene,g.camera);await new Promise(requestAnimationFrame);}
    const samples=[],completed=[];for(let i=0;i<24;i++){await new Promise(requestAnimationFrame);if(syncGpu)gl.finish();const t=performance.now();g.renderer.render(g.scene,g.camera);samples.push(performance.now()-t);if(syncGpu){gl.finish();completed.push(performance.now()-t);}}
    rounds.push({round,mode,samples,completed});
    if(round===0){g.renderer.render(g.scene,g.camera);const data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);pixels[mode]=data;counts[mode]={calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};}
   }
   let changed=0,maxDifference=0,totalDifference=0;for(let i=0;i<pixels.before.length;i++){const d=Math.abs(pixels.before[i]-pixels.after[i]);if(d)changed++;maxDifference=Math.max(maxDifference,d);totalDifference+=d;}
   before.group.visible=false;current.group.visible=true;g.renderer.render(g.scene,g.camera);
   return{name,rounds,counts,changedChannels:changed,totalChannels:pixels.before.length,maxDifference,totalDifference};
  },{name,eye,look,openLane,syncGpu});
  report.views.push(view);await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
  // Baking transforms can shift isolated antialiased edge samples by a pixel.
  assert.ok(view.changedChannels/view.totalChannels<.0001,'unexpected visible difference');
  assert.ok(view.counts.after.calls<view.counts.before.calls,'submission reduction');
  await file.truncate(0);await file.write(JSON.stringify(report,null,2),0,'utf8');
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e.stack||e);throw e;}
finally{await file.truncate(0);await file.write(JSON.stringify(report,null,2),0,'utf8');await file.close();await browser?.close();console.log(JSON.stringify({status:report.status,structure:report.structure,transitions:report.transitions?.length,views:report.views.map(v=>({name:v.name,counts:v.counts,changedChannels:v.changedChannels})),failure:report.failure}));}
