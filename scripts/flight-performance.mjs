import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const tag=process.env.PERF_TAG??'after',url=process.env.TEST_URL??'http://localhost:4173/';
await mkdir('docs/validation/phase9',{recursive:true});await mkdir('docs/screenshots/phase9',{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(url+'?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled);await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3&&window.__GULOU__.stats().environment.heightReady);
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');if(g.music.enabled)g.music.toggle();});
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>window.__GULOU__.stats().flight==='gliding',{},{timeout:10000});
 const profiling=process.env.PERF_PROFILE==='1';
 if(profiling)await page.evaluate(()=>{
  const g=window.__GULOU__.game;window.flightProfile={};
  const wrap=(object,key,label)=>{const original=object[key];const stat=window.flightProfile[label]={ms:0,calls:0};object[key]=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{stat.ms+=performance.now()-start;stat.calls++;}};};
  for(const [object,key,label]of [[g.player,'update','player'],[g.cameraRig,'update','camera'],[g.atmosphere,'update','atmosphere'],[g.world,'updateVegetation','vegetation'],[g.renderer,'render','render'],[g.scene,'updateMatrixWorld','sceneMatrices'],[g,'onTick','ui'],[g.csm,'update','csm'],[g.csm,'updateFrustums','csmFrustums']])wrap(object,key,label);
 });
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.player.teleport(-110,140,650);g.cameraRig.yaw=0;g.cameraRig.pitch=1.12;window.flightFrames=[];window.flightLongFrames=[];window.flightLongTasks=[];const started=performance.now();let last=started;window.recordFlight=true;
  if(PerformanceObserver.supportedEntryTypes.includes('longtask')){window.flightTaskObserver=new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.startTime>=started)window.flightLongTasks.push({elapsed:e.startTime-started,duration:e.duration});});window.flightTaskObserver.observe({type:'longtask'});}
  const sample=t=>{if(!window.recordFlight)return;const duration=t-last;window.flightFrames.push(duration);if(duration>50)window.flightLongFrames.push({elapsed:t-started,duration,position:g.player.position.toArray(),triangles:g.renderer.info.render.triangles,calls:g.renderer.info.render.calls});last=t;requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 const samples=[];await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');
 for(let i=0;i<120;i++){await page.waitForTimeout(250);samples.push(await page.evaluate(()=>window.__GULOU__.stats()));if(i===39)await page.evaluate(()=>window.__GULOU__.game.cameraRig.yaw=.15);if(i===79)await page.evaluate(()=>window.__GULOU__.game.cameraRig.yaw=-.12);}
 await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
 // Screenshot capture can stall the compositor; it is evidence, not part of
 // the flight workload. Stop the same measurement window for both versions.
 const trace=await page.evaluate(()=>{window.recordFlight=false;window.flightTaskObserver?.disconnect();return{frames:window.flightFrames.slice(1),longFrames:window.flightLongFrames,longTasks:window.flightLongTasks};}),frames=trace.frames;const sorted=[...frames].sort((a,b)=>a-b),pct=p=>sorted[Math.floor((sorted.length-1)*p)];
 await page.screenshot({path:`docs/screenshots/phase9/flight-${tag}.png`});
 const gpu=samples.map(s=>s.gpuMs).filter(Number.isFinite).sort((a,b)=>a-b),tri=samples.map(s=>s.triangles).sort((a,b)=>a-b),cpu=samples.map(s=>s.cpuMs).sort((a,b)=>a-b);
 assert.deepEqual(errors,[]);assert.ok(samples.at(-1).position[2]<100,'flight must traverse northwards across campus');
 const report={tag,time:new Date().toISOString(),browser:await browser.version(),hardware:'Apple M4; 1440×900 CSS pixels, DPR 2; medium quality 1920×1200 internal canvas',frames:frames.length,frameMs:{median:pct(.5),p95:pct(.95),p99:pct(.99),max:sorted.at(-1)},fpsMedian:1000/pct(.5),over33ms:frames.filter(t=>t>33.4).length,over50ms:frames.filter(t=>t>50).length,gpuMsMedian:gpu[Math.floor(gpu.length/2)],trianglesMedian:tri[Math.floor(tri.length/2)],trianglesMax:tri.at(-1),start:samples[0].position,end:samples.at(-1).position,errors,samples};
 Object.assign(report,{cpuMsMedian:cpu[Math.floor(cpu.length/2)],profile:profiling?await page.evaluate(()=>window.flightProfile):undefined,measurement:'120 consecutive 250 ms flight samples; recording stops before screenshot capture',longFrames:trace.longFrames,longTasks:trace.longTasks});await writeFile(`docs/validation/phase9/flight-${tag}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,samples:undefined}));
}finally{await browser.close();}
