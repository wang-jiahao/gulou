import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,open} from 'node:fs/promises';
import {publicStreets,streetPoint} from '../src/world/street-layout.ts';

const stage=process.env.GATE_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
const out='docs/validation/phase82';
await mkdir(out,{recursive:true});
// Reserve every report before running; a failed attempt is evidence, too.
const file=await open(`${out}/${stage}-${channel}.json`,'wx');
const report={stage,channel,errors:[],missing:[],routes:[],views:[]};
let browser;
try{
 browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
 const page=await browser.newPage({viewport:{width:1200,height:800}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto(`${process.env.BASE_URL||'http://localhost:4173'}/?debug=1`);
 await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,null,{timeout:90000});
 await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=JSON.parse(JSON.stringify(await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const fixed=[];for(const m of g.world.fixedMeshes)fixed.push(await hash(m.vertices)+await hash(m.indices));
  const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push({position:c.translation(),rotation:c.rotation(),halfExtents:c.shape.halfExtents});});
  return{fixed,cuboids,solids:g.world.solids,doors:g.world.doors,gate:g.world.root.getObjectByName('广州路门 · stone piers and guard pavilion').userData,access:g.world.root.getObjectByName('campus access gates').children.map(o=>({name:o.name,position:o.position.toArray(),rotation:o.rotation.toArray()}))};
 })));
 if(!stage.startsWith('before')){
  const before=JSON.parse(await readFile(`${out}/before-observed-chrome.json`,'utf8')).geometry;
  for(const key of['fixed','doors','access'])assert.deepEqual(report.geometry[key],before[key],key+' preserved');
  const pier=(x,z)=>Math.abs(Math.abs(x+35.067)-8)<.001&&Math.abs(z-720)<.001;
  const bollard=(x,y,z)=>[8.2,11.6,15].some(u=>Math.abs(Math.abs(x+35.067)-u)<.001)&&Math.abs(y-.33)<.001&&Math.abs(z-726.6)<.001;
  for(const key of['solids','cuboids']){
   const isPier=s=>key==='solids'?pier(s.x,s.z):pier(s.position.x,s.position.z);
   const isBollard=s=>key==='solids'?bollard(s.x,s.y,s.z):bollard(s.position.x,s.position.y,s.position.z);
   assert.equal(before[key].filter(isPier).length,2,'exactly two old gate piers');
   assert.equal(before[key].filter(isBollard).length,6,'exactly six old bollards');
   const remaining=report.geometry[key].map(s=>JSON.stringify(s));
   for(const s of before[key].filter(s=>!isPier(s)&&!isBollard(s))){const i=remaining.indexOf(JSON.stringify(s));assert.ok(i>=0,'unrelated '+key+' retained');remaining.splice(i,1);}
   report[key+'Changed']=remaining.length;assert.equal(remaining.length,9,'two taller piers, six repositioned bollards and raised stone plaque');
  }
  assert.deepEqual(report.geometry.gate.signText,['南京大学','NANJING UNIVERSITY','广州路门','GUANG ZHOU LU GATE']);
 }
 const gx=-35.067,gz=715.04,road=publicStreets.find(s=>s.name==='广州路');
 const routes=[];
 for(const u of[0,-5.2,5.2])for(const side of[-1,1])routes.push({name:'gate',u,side,a:{x:gx+u,z:gz+side*8},b:{x:gx+u,z:gz-side*8}});
 for(const side of[-1,1])for(const direction of[-1,1])routes.push({name:'public-sidewalk',side,direction,a:streetPoint(road,-19*direction,side*(road.width/2+road.sidewalk/2)),b:streetPoint(road,19*direction,side*(road.width/2+road.sidewalk/2))});
 const fixture=await page.evaluate(()=>{const b=window.__GULOU__.game.world.bicycles[1];return{position:b.group.position.toArray(),angle:b.angle};});
 for(const ride of[false,true]){
  if(ride)await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('mount failed');});
  for(const route of routes){
   const result=await page.evaluate(({route,ride})=>{
    const g=window.__GULOU__.game,p=g.player,{a,b}=route,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),yaw=Math.atan2(-dx,-dz);
    p.clearInput();p.teleport(a.x,.09,a.z);g.cameraRig.yaw=yaw;
    if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}
    p.physics.step();for(let i=0;i<10;i++)p.update(1/60,yaw,true);
    let progress=0,maxLateral=0;p.keys.add('KeyW');if(ride)p.keys.add('ShiftLeft');
    for(let i=0;i<1600;i++){p.update(1/60,yaw,true);progress=((p.position.x-a.x)*dx+(p.position.z-a.z)*dz)/length;maxLateral=Math.max(maxLateral,Math.abs(((p.position.x-a.x)*dz-(p.position.z-a.z)*dx)/length));if(progress>=length-.15)break;}
    p.clearInput();return{...route,ride,progress,length,maxLateral,position:p.position.toArray()};
   },{route,ride});result.passed=result.progress>=result.length-.2&&result.maxLateral<(route.name==='gate'?.2:.6);report.routes.push(result);
   if(!result.passed)result.nearby=await page.evaluate(position=>{const p=window.__GULOU__.game.player,nearby=[];p.physics.forEachCollider(c=>{const t=c.translation();if(Math.hypot(t.x-position[0],t.z-position[2])<2)nearby.push({position:t,halfExtents:c.shape.halfExtents,body:!!c.parent()});});return nearby;},result.position);
   if(!stage.startsWith('before'))assert.ok(result.passed,JSON.stringify(result));
  }
 }
 await page.evaluate(f=>{const p=window.__GULOU__.game.player;if(p.riding){p.teleport(...f.position);p.rideYaw=f.angle;p.parkBicycle();}p.reset();},fixture);
 report.pierRays=await page.evaluate(()=>{const g=window.__GULOU__.game;return[-1,1].flatMap(side=>[1.6,3.0].map(y=>{const x=-35.067+side*8,hit=g.player.physics.castRay({origin:{x,y,z:724},dir:{x:0,y:0,z:-1}},5,true,undefined,undefined,g.player.collider,g.player.body);return{side,y,distance:hit?.timeOfImpact??null};}));});
 if(!stage.startsWith('before'))for(const r of report.pierRays)assert.ok(r.distance!==null&&Math.abs(r.distance-3.4)<.03,'pier collision '+JSON.stringify(r));
 report.bollardRays=await page.evaluate(()=>{const g=window.__GULOU__.game;return[-1,1].flatMap(side=>[8.2,11.6,15].map(u=>{const x=-35.067+side*u,hit=g.player.physics.castRay({origin:{x,y:.4,z:728},dir:{x:0,y:0,z:-1}},4,true,undefined,undefined,g.player.collider,g.player.body);return{side,u,distance:hit?.timeOfImpact??null};}));});
 if(!stage.startsWith('before'))for(const r of report.bollardRays)assert.ok(r.distance!==null&&Math.abs(r.distance-1.965)<.03,'bollard collision '+JSON.stringify(r));
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const[name,eye,look,fov]of[
  ['street',[-32,5,750],[-39,1.6,718],66],['lettering',[-46,2.1,730],[-46,1.25,720.7],50],
  ['pier',[-40,2.8,726],[-43,2.0,720],55],['inside',[-32,6,699],[-35,1.5,720],65]
 ]){
  const counts=await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);return{calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});report.views.push({name,...counts});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status=report.routes.some(r=>!r.passed)?'baseline-with-existing-obstruction':'passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await file.writeFile(JSON.stringify(report,null,2));await file.close();await browser?.close();}
console.log({stage,channel,status:report.status,routes:report.routes.length,blocked:report.routes.filter(r=>!r.passed).map(({name,ride,side,direction,position,nearby})=>({name,ride,side,direction,position,nearby})),views:report.views,failure:report.failure});
