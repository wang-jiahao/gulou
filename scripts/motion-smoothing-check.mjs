import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/validation/motion-smoothing-v153';await mkdir(out,{recursive:true});const b=await chromium.launch({channel:'chrome',headless:true});
try{const page=await b.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{},{timeout:120000});await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.game.world.sectors===3,{},{timeout:120000});
const report=await page.evaluate(()=>{const g=window.__GULOU__.game,p=g.player;g.renderer.setAnimationLoop(null);g.mode='playing';const traces=[];
const rates={hz60:[1/60],hz90:[1/90],hz120:[1/120],hz144:[1/144],uneven:[.010,.023,.014,.021,.009,.018]};
for(const mode of ['run','flight','bicycle','car'])for(const [rate,dts]of Object.entries(rates)){
 p.reset();p.travelTo(mode==='car'?-255:-300,mode==='car'?370:320,'ground');g.cameraRig.reset();g.cameraRig.firstPerson=false;const yaw=mode==='car'?-Math.PI/2:0;g.cameraRig.yaw=yaw;
 if(mode==='flight'){if(!p.startFlight())throw Error('flight');for(let i=0;i<150;i++)p.update(1/60,0,true);}
 if(mode==='bicycle'){const bike=g.world.bicycles[1];p.teleport(bike.group.position.x+Math.cos(bike.angle)*1.8,bike.group.position.y+.05,bike.group.position.z-Math.sin(bike.angle)*1.8);if(!p.mount(bike))throw Error('bike');p.teleport(-300,.05,320);p.rideYaw=0;p.rideViewYaw=0;}
 if(mode==='car'){g.toggleDrive();if(!p.driving)throw Error('car');}
 p.clearInput();p.keys.add('KeyW');p.keys.add('ShiftLeft');
 const sample=(dt)=>{p.update(dt,yaw,true);g.cameraRig.update(p.renderPosition??p.position,dt,g.world.cameraSolids,false,p.flying,p.avatar.height,!!p.riding,p.driving);return {dt,physical:p.position.toArray(),visual:p.avatar.root.position.toArray(),camera:g.camera.position.toArray(),rotation:g.camera.quaternion.toArray(),speed:p.speed,vehicle:p.riding?.group.position.toArray()??null};};
 for(let i=0;i<180;i++)sample(1/60);
 const rows=[];for(let i=0;i<180;i++)rows.push(sample(dts[i%dts.length]));
 traces.push({mode,rate,rows});
}
p.reset();return traces;});
const summaries=report.map(t=>{const vs=t.rows.slice(1).map((r,i)=>Math.hypot(r.visual[0]-t.rows[i].visual[0],r.visual[2]-t.rows[i].visual[2])/r.dt),mean=vs.reduce((a,b)=>a+b)/vs.length;return {mode:t.mode,rate:t.rate,stalled:vs.filter(v=>v<.01).length,mean,relativeStd:Math.sqrt(vs.reduce((a,b)=>a+(b-mean)**2,0)/vs.length)/mean,min:Math.min(...vs),max:Math.max(...vs)};});
const lifecycle=await page.evaluate(()=>{
 const g=window.__GULOU__.game,p=g.player;
 p.reset();p.travelTo(-300,320,'ground');p.keys.add('KeyW');p.keys.add('ShiftLeft');
 for(let i=0;i<75;i++)p.update(1/120,0,true);
 const frozen=p.renderPosition.clone(),physical=p.position.clone(),phase=p.accumulated;
 for(let i=0;i<20;i++)p.update(1/90,0,false);
 const pause={visual:p.renderPosition.distanceTo(frozen),physical:p.position.distanceTo(physical),phaseError:Math.abs(p.accumulated-phase),speed:p.speed};
 p.update(1/120,0,true);const resumeDistance=p.renderPosition.distanceTo(frozen);
 p.teleport(-300,12,320);const teleport=p.renderPosition.distanceTo(p.position)+p.avatar.root.position.distanceTo(p.position);
 p.reset();const reset=p.renderPosition.distanceTo(p.position);
 p.travelTo(-300,315,'ground');p.clearInput();p.keys.add('KeyW');p.keys.add('ShiftLeft');
 const wall={x:-300,y:3,z:295,w:12,h:6,d:.8};p.addSolids([wall]);
 for(let i=0;i<360;i++)p.update(1/120,0,true);
 const stoppedZ=p.position.z;for(let i=0;i<30;i++)p.update(1/120,0,true);const blocked={physical:p.position.z,visual:p.renderPosition.z,speed:p.speed,forwardDrift:Math.abs(p.position.z-stoppedZ)};p.physics.removeCollider(p.solidColliders.get(wall),true);
 p.travelTo(-300,315,'ground');p.clearInput();for(let i=0;i<30;i++)p.update(1/120,0,true);const ground=p.position.y;p.requestJump();let apex=ground;
 for(let i=0;i<180;i++){p.update(1/120,0,true);apex=Math.max(apex,p.renderPosition.y);}
 const jump={height:apex-ground,landed:p.grounded};
 p.travelTo(-300,320,'ground');p.clearInput();p.keys.add('KeyW');p.keys.add('ShiftLeft');g.cameraRig.reset();g.cameraRig.firstPerson=true;g.mode='playing';
 const render=g.renderer.render;g.renderer.render=()=>{};const follow=[];
 for(let i=0;i<24;i++){g.tick(g.last+1000/120);follow.push({camera:Math.hypot(g.camera.position.x-p.renderPosition.x,g.camera.position.z-p.renderPosition.z),shadow:Math.hypot(g.shadow.position.x-p.renderPosition.x,g.shadow.position.z-p.renderPosition.z)});}
 g.renderer.render=render;return {pause,resumeDistance,teleport,reset,blocked,jump,follow};
});
await writeFile(out+'/report.json',JSON.stringify({errors,summaries,lifecycle},null,2));
assert.equal(errors.length,0);
for(const s of summaries){assert.equal(s.stalled,0,`${s.mode}/${s.rate} stalled frames`);assert.ok(s.relativeStd<.08,`${s.mode}/${s.rate} uneven motion`);}
assert.ok(Object.values(lifecycle.pause).every(v=>v===0),'pause pose and phase');
assert.ok(lifecycle.resumeDistance>0&&lifecycle.resumeDistance<.16,'continuous resume');
assert.equal(lifecycle.teleport,0);assert.equal(lifecycle.reset,0);
assert.ok(lifecycle.blocked.physical>295.65&&lifecycle.blocked.visual>295.65&&lifecycle.blocked.forwardDrift<.002,'wall collision');
assert.ok(lifecycle.jump.height>.6&&lifecycle.jump.landed,'jump and touchdown');
assert.ok(lifecycle.follow.every(x=>x.camera<1e-8&&x.shadow<1e-8),'camera and shadow follow rendered pose');
console.log(JSON.stringify({cases:summaries.length,stalledFrames:summaries.reduce((n,s)=>n+s.stalled,0),lifecycle}));
}finally{await b.close();}
