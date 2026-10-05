import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const stage='after',channel=process.env.BROWSER_CHANNEL||'chrome',out='docs/validation/phase75';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],shots:[]};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');
 await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,null,{timeout:90000});
 await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.collision=await page.evaluate(async()=>{const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');const fixed=[];for(const m of g.world.fixedMeshes)fixed.push(await hash(m.vertices)+await hash(m.indices));return{fixed,solids:g.world.solids,cuboids:g.world.staticCuboids,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings};});
 
 report.collision=JSON.parse(JSON.stringify(report.collision));
 const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).collision;
 for(const key of ['doors','buildings'])assert.deepEqual(report.collision[key],before[key],key+' preserved');
 const difference=(left,right)=>{const remaining=right.map(v=>JSON.stringify(v));return left.filter(v=>{const i=remaining.indexOf(JSON.stringify(v));if(i<0)return true;remaining.splice(i,1);return false;});};
 report.collisionChange={removed:difference(before.fixed,report.collision.fixed).length,added:difference(report.collision.fixed,before.fixed).length,removedSolids:difference(before.solids,report.collision.solids).length,addedSolids:difference(report.collision.solids,before.solids).length};
 // world.solids contains the initial sector only. The south-sector trees
 // reach physics through expand(); verify those with movement and rays below.
 assert.deepEqual(report.collisionChange,{removed:0,added:3,removedSolids:0,addedSolids:0});
 report.forecourt=await page.evaluate(()=>window.__GULOU__.game.world.root.getObjectByName('yaoliang hall street forecourt').userData);
 assert.equal(report.forecourt.solidCount,3);
 const hall=report.collision.buildings.find(b=>b.id==='plan-114').hall;
 assert.ok(hall);
 const {x,z,nx,nz}=hall.frame,point=(u,v,y=.09)=>[x+u*nz+v*nx,z-u*nx+v*nz,y];
 report.routes=[];
 const fixture=await page.evaluate(()=>{const b=window.__GULOU__.game.world.bicycles[1];return{position:b.group.position.toArray(),angle:b.angle};});
 for(const ride of [false,true]){
  if(ride)await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('fixture mount failed');});
  const routes=[['front-street',point(-13,8),point(13,8)],['inner-walk',point(-13,2.6),point(13,2.6)],['outer-walk',point(-13,5.7),point(13,5.7)]];
  // Leave a full bicycle clear of the separate hall stairs at the endpoint.
  for(const u of hall.entryU)routes.push([`curb-${u}`,point(u,8),point(u,3)]);
  for(const bed of report.forecourt.beds)routes.push([`tree-block-${bed.u}`,point(bed.u,7.8),point(bed.u,2.1),true]);
  if(!ride)for(const u of hall.entryU){routes.push([`stairs-${u}`,point(u,3),point(u,-3,hall.floor+.09)]);routes.push([`landing-${u}`,point(u-1,-2.5,hall.floor+.09),point(u+1,-2.5,hall.floor+.09)]);}
  for(const[name,start,end,blocked]of routes)for(const side of (blocked?[1]:[-1,1])){
   const r=await page.evaluate(({name,start,end,side,ride})=>{
    const g=window.__GULOU__.game,p=g.player,a=side===1?start:end,b=side===1?end:start,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),yaw=Math.atan2(-dx,-dz);
    p.clearInput();p.teleport(a[0],a[2],a[1]);g.cameraRig.yaw=yaw;
    if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}
    p.physics.step();for(let i=0;i<10;i++)p.update(1/60,yaw,true);
    p.keys.add('KeyW');if(ride)p.keys.add('ShiftLeft');let progress=0;
    for(let i=0;i<Math.ceil((len+2)/(ride?9:1.65)*60)+120;i++){p.update(1/60,yaw,true);progress=((p.position.x-a[0])*dx+(p.position.z-a[1])*dz)/len;if(progress>=len-.2)break;}
    p.clearInput();return{name,side,ride,progress,len,y:p.position.y,expectedY:b[2],lateral:((p.position.x-a[0])*dz-(p.position.z-a[1])*dx)/len};
   },{name,start,end,side,ride});report.routes.push(r);
   if(blocked)assert.ok(r.progress>.5&&r.progress<r.len-1&&Math.abs(r.lateral)<.65,'tree should stop passage '+JSON.stringify(r));
   else assert.ok(r.progress>=r.len-.2&&Math.abs(r.lateral)<.6,JSON.stringify(r));
   assert.ok(Math.abs(r.y-r.expectedY)<.2,'floor '+JSON.stringify(r));
  }
 }
 await page.evaluate(f=>{const p=window.__GULOU__.game.player;if(p.riding){p.teleport(...f.position);p.rideYaw=f.angle;p.parkBicycle();}p.reset();},fixture);
 report.rays=await page.evaluate(({hall,forecourt})=>{
  const g=window.__GULOU__.game,p=g.player,{x,z,nx,nz}=hall.frame,point=(u,y,v)=>({x:x+u*nz+v*nx,y,z:z-u*nx+v*nz});
  const tests=[['sign-wall',[0,1.5,3],[0,1.5,-1],true],['glass',[2,4,1],[2,4,-3],true],['roof',[0,12,-1],[0,7,-1],true]];
  for(const u of hall.columns)tests.push([`column-${u}`,[u,5,1],[u,5,-1],true]);
  for(const u of hall.entryU){tests.push([`open-entry-${u}`,[u,2.5,3],[u,2.5,-4],false],[`rear-${u}`,[u,2.5,-3],[u,2.5,-6],true],[`rail-${u}`,[u,1.5,-2.5],[u+2,1.5,-2.5],true]);}
  for(const bed of forecourt.beds)tests.push([`tree-${bed.u}`,[bed.u-1.2,1.3,bed.v],[bed.u+1.2,1.3,bed.v],true]);
  for(const [name,u,v] of [['brick',-3,3.5],['soil',2.1,4.1],['curb',-3,6.45]])tests.push([`ground-${name}`,[u,1,v],[u,-.1,v],true]);
  return tests.map(([name,a,b,blocked])=>{const from=point(...a),to=point(...b),len=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),dir={x:(to.x-from.x)/len,y:(to.y-from.y)/len,z:(to.z-from.z)/len};const hit=p.physics.castRay({origin:from,dir},len,true,undefined,undefined,p.collider,p.body);const ray=g.cameraRig.ray;ray.set(g.camera.position.clone().set(from.x,from.y,from.z),g.camera.position.clone().set(dir.x,dir.y,dir.z));ray.near=0;ray.far=len;return{name,blocked,physics:hit?.timeOfImpact??null,camera:ray.intersectObjects(g.world.cameraSolids,false)[0]?.distance??null};});
 },{hall,forecourt:report.forecourt});
 for(const r of report.rays){assert.equal(r.physics!==null,r.blocked,r.name+' physics');assert.equal(r.camera!==null,r.blocked,r.name+' camera');}
 for(const r of report.rays.filter(r=>r.name.startsWith('tree-')||r.name.startsWith('ground-')))assert.ok(Math.abs(r.physics-r.camera)<.025,r.name+' matching proxy');
 const name='学生活动中心',arrival=await page.locator('#travel-place option').evaluateAll((options,name)=>options.find(o=>o.textContent===name)?.value,name);assert.ok(arrival);
 await page.keyboard.press('m');await page.fill('#place-search',name);await page.selectOption('#travel-place',arrival);await page.click('#travel-place-go');
 report.arrival=await page.evaluate(()=>window.__GULOU__.game.player.position.toArray());assert.ok(report.arrival[1]<.2,'arrival on ground');

 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const[name,eye,look,fov]of[
  ['hall-front',[-44,5,589.5],[-22,4.4,589.5],67],
  ['hall-oblique',[-37,4,607],[-20,4.2,588],72],
  ['hall-roof',[-47,32,612],[-8,3,586],76],
  ['hall-ground',[-37,3,577],[-28,1,593],72]
 ]){
  const render=await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);return{calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});report.shots.push({name,...render});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log(JSON.stringify({stage,channel,status:report.status,routes:report.routes?.length,rays:report.rays?.length,collisionChange:report.collisionChange,shots:report.shots,failure:report.failure?.slice(0,320)}));
