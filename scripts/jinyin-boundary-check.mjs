import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const stage=process.env.JINYIN_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
const out='docs/validation/phase55',file=`${out}/${stage}-${channel}.json`;
await mkdir(out,{recursive:true});
if(stage.startsWith('before')){try{await readFile(file);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel}),report={stage,channel,errors:[],missing:[],routes:[]};
const hash=a=>createHash('sha256').update(JSON.stringify(a)).digest('hex');
// Preserve multiplicity; insertion order changes when a new perimeter precedes
// the pre-existing scene objects, and duplicate colliders must still be counted.
const additions=(before,after,label)=>{
 const remaining=new Map();for(const value of after){const key=hash(value),entry=remaining.get(key)||{value,count:0};entry.count++;remaining.set(key,entry);}
 for(const value of before){const entry=remaining.get(hash(value));assert.ok(entry?.count>0,label+' retained');entry.count--;}
 return [...remaining.values()].flatMap(({value,count})=>Array(count).fill(value));
};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto(`${process.env.BASE_URL||'http://localhost:4173'}/?debug=1`);
 await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,null,{timeout:90000});
 await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const fixed=[];for(const m of g.world.fixedMeshes)fixed.push(await hash(m.vertices)+await hash(m.indices));
  // Crown LOD matrices change with the camera during loading. Compare fixed
  // instance placement, and inspect visible foliage in the final screenshots.
  const instances=[];g.world.root.traverse(o=>{if(o.isInstancedMesh&&o.name!=='complete crown coverage across LOD transitions'&&!o.material.name.startsWith('campus-boundary-'))instances.push({name:o.name,count:o.count,matrix:Array.from(o.instanceMatrix.array)});});
  const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push({position:c.translation(),rotation:c.rotation(),halfExtents:c.shape.halfExtents});});
  return {boundaries:g.world.root.getObjectByName('campus perimeter boundaries').userData,access:g.world.root.getObjectByName('campus access gates').children.map(o=>({name:o.name,position:o.position.toArray(),rotation:o.rotation.toArray()})),fixed,instances:await hash(new TextEncoder().encode(JSON.stringify(instances))),cuboids,solids:g.world.solids,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings};
 });

 // Match the persisted baseline's JSON representation: Playwright preserves
 // undefined object fields, while JSON files omit them.
 report.geometry=JSON.parse(JSON.stringify(report.geometry));
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  for(const key of ['fixed','instances','doors','buildings','access'])assert.deepEqual(report.geometry[key],before.geometry[key],key+' preserved');
  const old=before.geometry.boundaries,current=report.geometry.boundaries;
  assert.deepEqual(current.southRuns,old.southRuns,'south preserved');
  assert.deepEqual(current.northRuns.slice(0,4),old.northRuns,'previous north runs preserved');
  assert.equal(current.northComplete,false,'western closure remains unverified');
  const added=additions(before.geometry.cuboids,report.geometry.cuboids,'old collider');
  const panels=current.panels.slice(old.panels.length);assert.equal(added.length,panels.length,'only new panels added');
  assert.deepEqual(additions(before.geometry.solids,report.geometry.solids,'old fixed boxes').map(hash).sort(),panels.map(hash).sort(),'only new fixed panels added');
  report.collisionChanges={retained:before.geometry.cuboids.length,added:added.length};
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
  assert.equal(report.perimeter.geometries,2,'shared box and emblem geometries');assert.ok(report.perimeter.bytes<2400000,'bounded perimeter geometry plus matrix storage');
 }
 const fixture=await page.evaluate(()=>{const b=window.__GULOU__.game.world.bicycles[1];return{position:b.group.position.toArray(),angle:b.angle};});
 report.blockers=[];report.publicRoutes=[];
 const samples=stage==='after'?report.geometry.boundaries.panels.slice(-3):[];
 const routes=[
  {name:'金银街北段',a:{x:-379.413,z:-117.376},b:{x:-383.808,z:-91.037}},
  {name:'金银街南段',a:{x:-383.808,z:-91.037},b:{x:-382.43,z:-65.765}},
  {name:'运输中心旁入口',a:{x:-380.343,z:-128.314},b:{x:-356.589,z:-129.646}},
  {name:'西北校门东西通路',a:{x:-382.046,z:-149.323},b:{x:-317.467,z:-142.129}}
 ];
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
     const maxFrames=Math.ceil((length+2)/(ride?9:1.65)*60)+120;let progress=0,frames=0;p.keys.add('KeyW');if(ride)p.keys.add('ShiftLeft');for(let i=0;i<maxFrames;i++){frames++;p.update(1/60,yaw,true);progress=((p.position.x-a.x)*dx+(p.position.z-a.z)*dz)/length;if(progress>=length-.2)break;}p.clearInput();const contacts=[];if(progress<length-.2)for(let i=0;i<p.motor.numComputedCollisions();i++){const c=p.motor.computedCollision(i).collider;contacts.push({type:c.shape.type,position:c.translation(),halfExtents:c.shape.halfExtents,radius:c.shape.radius,halfHeight:c.shape.halfHeight});}return{name:route.name,side,ride,progress,length,frames,maxFrames,finalSpeed:p.speed,lateral:((p.position.x-a.x)*dz-(p.position.z-a.z)*dx)/length,contacts};
    },{route,side,ride});report.publicRoutes.push(r);assert.ok(r.progress>=r.length-.2&&Math.abs(r.lateral)<.6,'public corridor remains traversable: '+JSON.stringify(r));
   }
  }
  await page.evaluate(f=>{const p=window.__GULOU__.game.player;if(p.riding){p.teleport(...f.position);p.rideYaw=f.angle;p.parkBicycle();}p.reset();},fixture);

 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 const shots=[['street',[-400,8,-129],[-369,1.6,-94],64],['south',[-384,5,-52],[-371,1.5,-98],65],['overhead',[-392,105,-90],[-374,0,-90],57]];
 for(const[name,eye,look,fov]of shots){
  await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05+g.atmosphere.night*.12;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage.startsWith('before')?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,collisionChanges:report.collisionChanges,failure:report.failure?.split('\n')[0].slice(0,350)});
