import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,open,readFile,writeFile} from 'node:fs/promises';
const out='docs/validation/phase81',stage=process.env.CANOPY_STAGE||'before',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});const reportPath=`${out}/${stage}-${channel}.json`;await(await open(reportPath,'wx')).close();
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],views:[]};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__?.stats().sectors===3&&!document.querySelector('#enter').disabled,null,{timeout:90000});await page.click('#enter');
 report.setup=await page.evaluate(()=>{
  const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');g.player.avatar.root.visible=false;g.windTime.value=0;
  const covers=[];g.world.root.traverse(o=>{if(o.name==='complete crown coverage across LOD transitions')covers.push(o);});window.canopyMeshes=covers;
  return{covers:covers.length,trees:covers.reduce((n,o)=>n+o.count,0),size:g.stats().renderSize,quality:g.quality};
 });
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const[name,eye,look]of[['core',[0,2.8,82],[0,8,0]],['chemistry',[-280,4,-136],[-278,8,-167]],['south',[-37,4,607],[-20,4.2,588]],['flight',[-100,90,190],[-85,8,135]]]){
  const view=await page.evaluate(async({name,eye,look})=>{
   const g=window.__GULOU__.game,meshes=window.canopyMeshes,cam=g.camera.position,gl=g.renderer.getContext();cam.set(...eye);g.camera.lookAt(...look);g.camera.fov=62;g.camera.updateProjectionMatrix();g.camera.updateMatrixWorld();g.csm.update();g.atmosphere.update(0,false,cam);
   const update=()=>g.world.updateVegetation(cam,g.quality,true,cam),seed=cam.clone(),perturbed=cam.clone();perturbed.x+=.125;
   const prime=mode=>{if(mode==='recompute')g.world.updateVegetation(cam,g.quality,true,perturbed);else update();};
   const rounds=[],counts={},pixelData={};
   for(let round=0;round<6;round++)for(const mode of(round%2?['reuse','recompute']:['recompute','reuse'])){
    for(let i=0;i<4;i++){prime(mode);update();g.renderer.render(g.scene,g.camera);await new Promise(requestAnimationFrame);}
    const updateMs=[],totalMs=[],uploads=[];
    for(let i=0;i<20;i++){
     await new Promise(requestAnimationFrame);prime(mode);const versions=meshes.map(o=>o.instanceMatrix.version);
     let t=performance.now();update();updateMs.push(performance.now()-t);g.renderer.render(g.scene,g.camera);totalMs.push(performance.now()-t);
     uploads.push(meshes.reduce((n,o,j)=>n+(o.instanceMatrix.version-versions[j]),0));
    }
    rounds.push({round,mode,updateMs,totalMs,uploads});
    if(round===0){const p=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);pixelData[mode]=p;counts[mode]={calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};}
   }
   let changed=0;for(let i=0;i<pixelData.reuse.length;i++)if(pixelData.reuse[i]!==pixelData.recompute[i])changed++;
   const hash=async array=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',array))).map(n=>n.toString(16).padStart(2,'0')).join('');
   const transitions=[];
   for(const [dx,dy,dz,quality]of[[0,0,0,'medium'],[.000001,0,0,'medium'],[0,1,0,'medium'],[0,0,1,'medium'],[0,0,0,'low'],[0,0,0,'high'],[0,70,0,'high'],[0,0,0,'medium']]){
    cam.copy(seed).add({x:dx,y:dy,z:dz});g.world.updateVegetation(cam,quality,true,cam);
    const buffers=[];for(const o of meshes)if(o.visible&&o.parent.visible)buffers.push([o.count,await hash(o.instanceMatrix.array),await hash(o.geometry.attributes.instanceView.array)]);
    transitions.push({offset:[dx,dy,dz],quality,buffers});
   }
   cam.copy(seed);update();g.renderer.render(g.scene,g.camera);return{name,rounds,counts,changedPixels:changed,transitions};
  },{name,eye,look});
  assert.equal(view.changedPixels,0,'reuse and recompute pixels');assert.deepEqual(view.counts.reuse,view.counts.recompute,'drawing unchanged');report.views.push(view);await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});await writeFile(reportPath,JSON.stringify(report,null,2));
 }
 if(stage!=='before'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  assert.deepEqual(report.setup,before.setup);assert.deepEqual(report.views.map(v=>v.transitions),before.views.map(v=>v.transitions),'camera and LOD transitions match original matrices and atlas frames');
  for(const v of report.views){assert.deepEqual(v.counts,before.views.find(b=>b.name===v.name).counts);assert(v.rounds.filter(r=>r.mode==='reuse').every(r=>r.uploads.every(n=>n===0)),'stationary camera causes no repeated uploads');assert(v.rounds.filter(r=>r.mode==='recompute').every(r=>r.uploads.every(n=>n>0)),'changed camera updates buffers');}
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.passed=true;
}finally{await writeFile(reportPath,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({passed:report.passed,setup:report.setup,views:report.views.map(v=>({name:v.name,changedPixels:v.changedPixels}))}));
