import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const stage=process.env.TANG_ENTRANCE_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
const out='docs/validation/phase63',file=`${out}/${stage}-${channel}.json`;
await mkdir(out,{recursive:true});
if(stage.startsWith('before')){try{await readFile(file);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel}),report={stage,channel,errors:[],missing:[],routes:[]};
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
  const insideNewTrees=o=>{for(let p=o;p;p=p.parent)if(p.name==='Jinyin Street roadside trees')return true;return false;};
  const instances=[];g.world.root.traverse(o=>{if(o.isInstancedMesh&&!insideNewTrees(o)&&o.name!=='complete crown coverage across LOD transitions'&&!o.material.name.startsWith('campus-boundary-'))instances.push({name:o.name,count:o.count,matrix:Array.from(o.instanceMatrix.array)});});
  const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push({position:c.translation(),rotation:c.rotation(),halfExtents:c.shape.halfExtents});});
  return {boundaries:g.world.root.getObjectByName('campus perimeter boundaries').userData,access:g.world.root.getObjectByName('campus access gates').children.map(o=>({name:o.name,position:o.position.toArray(),rotation:o.rotation.toArray()})),fixed,instances:await hash(new TextEncoder().encode(JSON.stringify(instances))),cuboids,solids:g.world.solids,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings};
 });

 // Match the persisted baseline's JSON representation: Playwright preserves
 // undefined object fields, while JSON files omit them.
 report.geometry=JSON.parse(JSON.stringify(report.geometry));
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  for(const key of ['instances','solids','access','cuboids','boundaries'])assert.deepEqual(report.geometry[key],before.geometry[key],key+' preserved');
  assert.deepEqual(report.geometry.buildings.filter(b=>b.id!=='plan-22'),before.geometry.buildings.filter(b=>b.id!=='plan-22'),'other buildings preserved');
  assert.deepEqual(report.geometry.doors.filter(d=>d.name!=='唐仲英楼'),before.geometry.doors.filter(d=>d.name!=='唐仲英楼'),'other doors preserved');
  const oldOnly=before.geometry.fixed.filter(h=>!report.geometry.fixed.includes(h)),newOnly=report.geometry.fixed.filter(h=>!before.geometry.fixed.includes(h));
  assert.equal(oldOnly.length,2,'only original Tang shell and guessed door removed');
  report.physicsDelta={oldOnly,newOnly};
  report.entrance=await page.evaluate(()=>window.__GULOU__.game.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.tangEntrance);
  assert.equal(report.geometry.buildings.find(b=>b.id==='plan-22').height,19.5);
  assert.equal(report.entrance.throughPassage,false);
  report.rays=await page.evaluate(()=>{
   const g=window.__GULOU__.game,p=g.player,e=g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.tangEntrance,f=e.localFrame;
   const point=(u,y,v)=>({x:f.x+u*f.nz+v*f.nx,y,z:f.z-u*f.nx+v*f.nz});
   const cast=(name,from,to,blocked)=>{
    const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,len=Math.hypot(dx,dy,dz),dir={x:dx/len,y:dy/len,z:dz/len};
    const hit=p.physics.castRay({origin:from,dir},len,true,undefined,undefined,p.collider,p.body);
    const ray=g.cameraRig.ray;ray.set(g.camera.position.clone().set(from.x,from.y,from.z),g.camera.position.clone().set(dir.x,dir.y,dir.z));ray.near=0;ray.far=len;
    const camera=ray.intersectObjects(g.world.cameraSolids,false)[0];
    return{name,blocked,physics:hit?.timeOfImpact??null,camera:camera?.distance??null,len};
   };
   const tests=[];
   for(const u of[-12,-9.75,-7])for(const y of[1,2.3,5.6])tests.push(cast(`recess-${u}-${y}`,point(u,y,2),point(u,y,-4.5),false));
   for(const u of[-12,-9.75,-7])tests.push(cast('rear-glass-'+u,point(u,2,-4.5),point(u,2,-8),true));
   for(const u of[-14.6,-4.85,0,7])tests.push(cast('pier-or-side-glass-'+u,point(u,2,2),point(u,2,-3),true));
   tests.push(cast('side-return-east',point(-9.75,2,-3),point(-15,2,-3),true));
   tests.push(cast('side-return-west',point(-9.75,2,-3),point(-4.5,2,-3),true));
   tests.push(cast('soffit',point(-9.75,2,-3),point(-9.75,8,-3),true));
   tests.push(cast('roof',point(-9.75,24,-3),point(-9.75,16,-3),true));
   tests.push(cast('floor',point(-9.75,2,-3),point(-9.75,.03,-3),true));
   return tests;
  });
  for(const r of report.rays){assert.equal(r.physics!==null,r.blocked,'physics '+JSON.stringify(r));assert.equal(r.camera!==null,r.blocked,'camera '+JSON.stringify(r));}
  const roof=report.rays.find(r=>r.name==='roof');assert.ok(Math.abs(roof.physics-4.5)<.01);
  await page.keyboard.press('KeyM');await page.waitForFunction(()=>document.querySelector('#campus-map').open);
  await page.fill('#place-search','唐仲英');
  report.search=await page.locator('#travel-place option').allTextContents();
  assert.deepEqual(report.search.filter(name=>name!=='选择地点'),['唐仲英楼']);
  await page.getByRole('button',{name:'关闭校园地图'}).click();
  await page.waitForFunction(()=>!document.querySelector('#campus-map').open);
 }
 const fixture=await page.evaluate(()=>{const b=window.__GULOU__.game.world.bicycles[1];return{position:b.group.position.toArray(),angle:b.angle};});
 report.publicRoutes=[];
 const routes=[
  {name:'金银街唐楼段',a:{x:-382,z:-84},b:{x:-382,z:-44}},
  {name:'唐楼北庭院',a:{x:-412,z:-61},b:{x:-382,z:-57}},
  {name:'金银街北段',a:{x:-379.413,z:-117.376},b:{x:-383.808,z:-91.037}},
  {name:'运输中心旁入口',a:{x:-380.343,z:-128.314},b:{x:-356.589,z:-129.646}},
  {name:'西北校门东西通路',a:{x:-382.046,z:-149.323},b:{x:-317.467,z:-142.129}}
 ];
 if(stage==='after'){
  const f=report.entrance.localFrame,point=(u,v)=>({x:f.x+u*f.nz+v*f.nx,z:f.z-u*f.nx+v*f.nz});
  for(const u of[-12,-9.75,-7])routes.push({name:`唐楼凹入口 ${u}`,a:point(u,2.4),b:point(u,-4.2)});
 }
  for(const ride of[false,true]){
   if(ride)await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('fixture mount failed');});
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
 const shots=[['courtyard',[-389,3.2,-59],[-416,8,-62],75],['portal',[-393,2.1,-60],[-394,3,-48],68],['inside',[-393.2,2.1,-48.9],[-394,2,-56],80],['overhead',[-358,89,-52],[-421,0,-41],65]];
 for(const[name,eye,look,fov]of shots){
  await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05+g.atmosphere.night*.12;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage.startsWith('before')?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,routes:report.publicRoutes?.length,failure:report.failure?.split('\n')[0].slice(0,350)});
