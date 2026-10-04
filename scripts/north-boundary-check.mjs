import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {publicStreets,streetPoint} from '../src/world/street-layout.ts';
const out='docs/validation/phase43',stage=process.env.BOUNDARY_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
if(stage==='before'){try{await readFile(`${out}/before-chrome.json`);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(':'),fixed=[];
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)].join(':'));
  const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push(JSON.stringify([c.translation(),c.rotation(),c.shape.halfExtents]));});cuboids.sort();
  const boundaries=g.world.root.getObjectByName('campus perimeter boundaries')||g.world.root.getObjectByName('汉口门局部墙栏 · reference stretches');
  const access=g.world.root.getObjectByName('campus access gates').children.map(o=>({name:o.name,position:o.position.toArray(),rotation:o.rotation.toArray()}));
  return JSON.parse(JSON.stringify({fixed,cuboids,boundaries:boundaries.userData,access,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings}));
 });
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  for(const key of ['fixed','doors','buildings'])assert.deepEqual(report.geometry[key],before.geometry[key],key+' preserved');
  assert.deepEqual(report.geometry.access,before.geometry.access,'all gates preserved');
  assert.deepEqual(report.geometry.boundaries.southRuns,before.geometry.boundaries.southRuns,'south perimeter preserved');
  const expectedRemoved=[];
  for(const run of before.geometry.boundaries.boundaries)for(let i=1;i<run.points.length;i++){
   const [ax,az]=run.points[i-1],[bx,bz]=run.points[i],angle=Math.atan2(az-bz,bx-ax);
   expectedRemoved.push([{x:(ax+bx)/2,y:1.25,z:(az+bz)/2},{x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)},{x:Math.hypot(bx-ax,bz-az)/2,y:1.25,z:.19}]);
  }
  const same=(actual,wanted)=>actual.every((o,i)=>Object.keys(o).every(k=>Math.abs(o[k]-wanted[i][k])<.0001));
  const removed=before.geometry.cuboids.filter(c=>expectedRemoved.some(e=>same(JSON.parse(c),e)));
  assert.equal(removed.length,4,'exactly four old north wall colliders');
  const retained=before.geometry.cuboids.filter(c=>!removed.includes(c));
  for(const c of retained)assert.ok(report.geometry.cuboids.includes(c),'unrelated collider retained');
  const added=report.geometry.cuboids.filter(c=>!retained.includes(c));
  assert.equal(added.length,report.geometry.boundaries.panels.length-before.geometry.boundaries.panels.length,'only north panels added');
  report.collisionChanges={retained:retained.length,removed:removed.length,added:added.length};
  report.perimeter=await page.evaluate(()=>{
   const g=window.__GULOU__.game,p=g.player,root=g.world.root.getObjectByName('campus perimeter boundaries'),data=root.userData;
   const targets=[];p.physics.forEachCollider(c=>{if(!c.parent()&&data.panels.some(s=>Math.abs(c.translation().x-s.x)<.0001&&Math.abs(c.translation().z-s.z)<.0001&&Math.abs(c.translation().y-s.y)<.0001))targets.push(c.handle);});
   const failures=[];let rayCount=0,cameraCount=0,jointRays=0;
   for(const s of data.panels)for(const u of[-s.w/2+.2,-s.w*.25,0,s.w*.25,s.w/2-.2])for(const side of[-1,1]){
    const nx=Math.sin(s.angle),nz=Math.cos(s.angle),x=s.x+u*Math.cos(s.angle),z=s.z-u*Math.sin(s.angle);
    const origin={x:x+nx*side*2,y:1.6,z:z+nz*side*2},dir={x:-nx*side,y:0,z:-nz*side};
    const hit=p.physics.castRay({origin,dir},4,true,undefined,undefined,p.collider,p.body,c=>targets.includes(c.handle));
    if(!hit||hit.timeOfImpact>2.01)failures.push({kind:'physics',x,z,side});rayCount++;
    const ray=g.cameraRig.ray;ray.set(p.position.clone().set(origin.x,origin.y,origin.z),p.position.clone().set(dir.x,0,dir.z));ray.near=0;ray.far=4;
    const camera=ray.intersectObjects(g.world.cameraSolids,false);if(!camera.length||camera[0].distance>2.01)failures.push({kind:'camera',x,z,side});cameraCount++;
   }
   // Shoot across every vertex, including the six jambs. Adjacent panels overlap.
   for(const run of [...data.southRuns,...data.northRuns])for(let i=0;i<run.points.length;i++){
    const [x,z]=run.points[i],a=run.points[Math.max(0,i-1)],b=run.points[Math.min(run.points.length-1,i+1)],length=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/length,nz=(b[0]-a[0])/length;
    for(const side of[-1,1]){
     const origin={x:x+nx*side*2,y:1.6,z:z+nz*side*2},dir={x:-nx*side,y:0,z:-nz*side};
     const hit=p.physics.castRay({origin,dir},4,true,undefined,undefined,p.collider,p.body,c=>targets.includes(c.handle));
     if(!hit||hit.timeOfImpact>2.01)failures.push({kind:'joint',x,z,side});jointRays++;
    }
   }
   const geos=new Set(),materials=new Set();let bytes=0,instances=0,draws=0;
   root.traverse(o=>{if(!o.isInstancedMesh)return;instances+=o.count;draws++;bytes+=o.instanceMatrix.array.byteLength;materials.add(o.material);if(!geos.has(o.geometry)){geos.add(o.geometry);for(const a of Object.values(o.geometry.attributes))bytes+=a.array.byteLength;if(o.geometry.index)bytes+=o.geometry.index.array.byteLength;}});
   return{failures,rayCount,cameraCount,jointRays,targets:targets.length,geometries:geos.size,materials:materials.size,bytes,instances,draws,emblems:data.emblems};
  });
  assert.deepEqual(report.perimeter.failures,[],'continuous physics and camera panels');
  assert.equal(report.perimeter.geometries,2,'shared box and emblem geometries');assert.ok(report.perimeter.bytes<2200000,'bounded perimeter geometry plus matrix storage');
  report.travel=[];
  const fixture=await page.evaluate(()=>{const b=window.__GULOU__.game.world.bicycles[1];return{position:b.group.position.toArray(),angle:b.angle};});
  const gates=[{id:'hankou',x:-91.0546,z:344.25,angle:0,lanes:[0,-7.6,7.6]},{id:'beijing-west',x:-346.9,z:-234.17,angle:Math.PI,lanes:[0,-4.8,4.8]},{id:'beijing-east',x:-170.29,z:-208.14,angle:Math.PI,lanes:[0,-4.8,4.8]},{id:'tianjin',x:76.29,z:-50.86,angle:-Math.PI/2,lanes:[0,-4.8,4.8]}];
  for(const ride of[false,true]){
   if(ride)await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('mount failed');});
   for(const e of gates)for(const u of e.lanes)for(const side of[-1,1]){
    const r=await page.evaluate(({e,u,side,ride})=>{
     const g=window.__GULOU__.game,p=g.player,nx=Math.sin(e.angle),nz=Math.cos(e.angle),x=e.x+u*Math.cos(e.angle),z=e.z-u*Math.sin(e.angle),yaw=Math.atan2(side*nx,side*nz);
     p.clearInput();p.teleport(x+side*nx*7,.09,z+side*nz*7);g.cameraRig.yaw=yaw;
     if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}p.physics.step();for(let i=0;i<10;i++)p.update(1/60,yaw,true);
     p.keys.add('KeyW');if(ride)p.keys.add('ShiftLeft');const crossings=[];for(let i=0;i<(ride?180:520);i++){p.update(1/60,yaw,true);const normal=(p.position.x-x)*nx*side+(p.position.z-z)*nz*side;if(Math.abs(normal)<1)crossings.push({normal,lateral:(p.position.x-x)*nz-(p.position.z-z)*nx});if(normal<-5.7)break;}p.clearInput();
     return{id:e.id,u,side,ride,crossings,position:p.position.toArray(),remaining:(p.position.x-x)*nx*side+(p.position.z-z)*nz*side,lateral:(p.position.x-x)*nz-(p.position.z-z)*nx};
    },{e,u,side,ride});report.travel.push(r);const lateralClearance=u===0?1.9:.54-(ride?.34:.27);assert.ok(r.remaining<-5.5&&r.crossings.length>0&&r.crossings.every(c=>Math.abs(c.lateral)<lateralClearance),'gate route crosses fully: '+JSON.stringify(r));
   }
  }
  // Restore the fixture before testing individual panels and public-road routes.
  await page.evaluate(f=>{const p=window.__GULOU__.game.player;if(p.riding){p.teleport(...f.position);p.rideYaw=f.angle;p.parkBicycle();}p.reset();},fixture);
  report.blockers=[];report.publicRoutes=[];
  const panels=report.geometry.boundaries.panels;
  const samples=[[-300,-230],[-100,-180],[70,-100],[90,120],[-45,348]].map(([x,z])=>panels.reduce((best,p)=>Math.hypot(p.x-x,p.z-z)<Math.hypot(best.x-x,best.z-z)?p:best));
  const routes=publicStreets.flatMap(road=>[-1,1].flatMap(side=>[-100,0,80].map(u=>({name:road.name+(side<0?'北侧':'南侧'),u,a:streetPoint(road,u-7,side*(road.width/2+road.sidewalk/2)),b:streetPoint(road,u+7,side*(road.width/2+road.sidewalk/2))}))));
  for(const z of[460,570,650]){const x=z<=537.709?116.036+(z-366.426)*(128.784-116.036)/(537.709-366.426):128.784+(z-537.709)*(142.696-128.784)/(706.619-537.709);routes.push({name:'小粉桥（近似中心线）',a:{x:x-.57,z:z-7},b:{x:x+.57,z:z+7}});}
  for(const ride of[false,true]){
   if(ride)await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('fixture mount failed');});
   for(const s of samples)for(const side of[-1,1]){
    const r=await page.evaluate(({s,side,ride})=>{
     const g=window.__GULOU__.game,p=g.player,nx=Math.sin(s.angle),nz=Math.cos(s.angle),yaw=Math.atan2(nx*side,nz*side);let handle;
     p.physics.forEachCollider(c=>{if(!c.parent()&&Math.hypot(c.translation().x-s.x,c.translation().y-s.y,c.translation().z-s.z)<.001)handle=c.handle;});
     p.clearInput();p.teleport(s.x+side*nx*2.1,.09,s.z+side*nz*2.1);g.cameraRig.yaw=yaw;
     if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}p.physics.step();for(let i=0;i<10;i++)p.update(1/60,yaw,true);
     let contactSteps=0,minSeparation=Infinity;p.keys.add('KeyW');if(ride)p.keys.add('ShiftLeft');
     for(let i=0;i<180;i++){p.update(1/60,yaw,true);const normal=((p.position.x-s.x)*nx+(p.position.z-s.z)*nz)*side;minSeparation=Math.min(minSeparation,normal-s.d/2-(ride?.95:.27));for(let k=0;k<p.motor.numComputedCollisions();k++)if(p.motor.computedCollision(k).collider.handle===handle)contactSteps++;}p.clearInput();
     return{x:s.x,z:s.z,side,ride,minSeparation,contactSteps};
    },{s,side,ride});report.blockers.push(r);assert.ok(r.contactSteps>0&&r.minSeparation>-.01,'target perimeter blocks movement: '+JSON.stringify(r));
   }
   for(const route of routes)for(const side of[-1,1]){
    const r=await page.evaluate(({route,side,ride})=>{
     const g=window.__GULOU__.game,p=g.player,a=side===1?route.a:route.b,b=side===1?route.b:route.a,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),yaw=Math.atan2(-dx,-dz);
     p.clearInput();p.teleport(a.x,.09,a.z);g.cameraRig.yaw=yaw;if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}p.physics.step();for(let i=0;i<10;i++)p.update(1/60,yaw,true);
     let progress=0;p.keys.add('KeyW');if(ride)p.keys.add('ShiftLeft');for(let i=0;i<520;i++){p.update(1/60,yaw,true);progress=((p.position.x-a.x)*dx+(p.position.z-a.z)*dz)/length;if(progress>=length-.2)break;}p.clearInput();return{name:route.name,u:route.u,side,ride,progress,length,lateral:((p.position.x-a.x)*dz-(p.position.z-a.z)*dx)/length};
    },{route,side,ride});report.publicRoutes.push(r);assert.ok(r.progress>=r.length-.2&&Math.abs(r.lateral)<.6,'public corridor remains traversable: '+JSON.stringify(r));
   }
  }
  await page.evaluate(f=>{const p=window.__GULOU__.game.player;if(p.riding){p.teleport(...f.position);p.rideYaw=f.angle;p.parkBicycle();}p.reset();},fixture);

 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 const shots=[['beijing-west',[-338,9,-251],[-343,1,-232],65],['beijing-east',[-167,9,-228],[-174,1,-207],65],['tianjin',[96,9,-48],[76,1,-51],65],['hankou',[-91,12,372],[-91,2,344],65],['northeast',[30,130,-190],[-5,0,-70],64],['north-overhead',[-120,650,60],[-120,0,60],59]];
 if(stage==='after'){
 const emblem=await page.evaluate(()=>{const root=window.__GULOU__.game.world.root.getObjectByName('campus perimeter boundaries');let best;root.traverse(o=>{if(!o.isInstancedMesh||o.material.name!=='campus-boundary-emblem')return;const a=o.instanceMatrix.array;for(let i=0;i<o.count;i++){const at=i*16,x=a[at+12],y=a[at+13],z=a[at+14];if(z<0&&(!best||Math.abs(x+285)<best.score))best={score:Math.abs(x+285),look:[x,y,z],normal:[a[at+8],0,a[at+10]]};}});return best;});
 for(const side of[-1,1])shots.push(['emblem-'+(side===1?'front':'back'),emblem.look.map((n,i)=>n+side*emblem.normal[i]*2.3),emblem.look,45]);
 }
 for(const[name,eye,look,fov]of shots){
  await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05+g.atmosphere.night*.12;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,collisionChanges:report.collisionChanges,failure:report.failure?.split('\n')[0].slice(0,350)});
