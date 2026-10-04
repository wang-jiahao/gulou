import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='docs/validation/phase40',stage=process.env.BICYCLE_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
if(stage==='before'){try{await readFile(`${out}/before-chrome.json`);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],rides:[]};let page;
async function start(p){
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await p.goto('http://localhost:4173/?debug=1');await p.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});await p.click('#enter');
 await p.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
}
try{
 page=await browser.newPage({viewport:{width:1440,height:1000}});await start(page);
 report.baseline=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(''),fixed=[];
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)]);
  const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push(JSON.stringify([c.translation(),c.rotation(),c.shape.halfExtents]));});cuboids.sort();
  return {fixed,cuboids,doors:g.world.doors,bicycles:g.world.bicycles.map(b=>({id:b.id,home:b.home.toArray(),angle:b.angle,solid:b.solid}))};
 });
 report.resources=await page.evaluate(()=>{
  const bikes=window.__GULOU__.game.world.bicycles,geometries=new Set(),materials=new Set(),textures=new Set();let meshes=0,triangles=0;
  for(const b of bikes)b.group.traverse(o=>{if(o.isMesh){meshes++;geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map)textures.add(m.map);}triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  const bytes=Array.from(geometries).reduce((n,g)=>n+Object.values(g.attributes).reduce((a,v)=>a+v.array.byteLength,0)+(g.index?.array.byteLength??0),0);
  return{bicycles:bikes.length,meshes,triangles,geometries:geometries.size,geometryBytes:bytes,materials:materials.size,textures:textures.size};
 });
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  assert.deepEqual(report.baseline,before.baseline,'all parking placements, colliders, buildings and doors retained');
  assert.ok(report.resources.geometryBytes<before.resources.geometryBytes,'unique bicycle geometry buffers reduced');
  report.animation=await page.evaluate(()=>{
   const [a,b]=window.__GULOU__.game.world.bicycles,other=[];b.group.traverse(o=>other.push([o.uuid,o.rotation.toArray()]));
   const angles=a.wheels.map(w=>w.rotation.x);a.update(.62,.9,.24);
   const front=a.group.getObjectByName('front basket'),rear=a.group.getObjectByName('rear mudguard'),crank=a.group.getObjectByName('crank');
   const after=[];b.group.traverse(o=>after.push([o.uuid,o.rotation.toArray()]));
   const result={wheelDeltas:a.wheels.map((w,i)=>w.rotation.x-angles[i]),turn:a.steering.rotation.y,crank:crank.rotation.x,platforms:crank.children.filter(o=>o.name==='pedal platform').map(o=>o.rotation.x),otherUnchanged:JSON.stringify(other)===JSON.stringify(after),basketSteers:front.parent===a.steering,rearStaysFixed:rear.parent===a.group};
   a.update(-.62,0,0);return result;
  });
  assert.deepEqual(report.animation,{wheelDeltas:[-2,-2],turn:.24,crank:.9,platforms:[-.9,-.9],otherUnchanged:true,basketSteers:true,rearStaysFixed:true});
 }
 // Exercise real E-key interaction, physics and animation at each existing open parking bay.
 const ids=report.baseline.bicycles.filter(b=>!/plan-/.test(b.id)).map(b=>b.id);
 for(const id of ids){
  const fixture=await page.evaluate(id=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===id);g.mode='playing';g.player.clearInput();g.player.teleport(b.home.x-Math.sin(b.angle)*1.8,b.home.y+.04,b.home.z-Math.cos(b.angle)*1.8);g.player.physics.step();g.cameraRig.yaw=b.angle;return{id,position:b.home.toArray(),a:b.angle};},id);
  await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__GULOU__.game.player.riding?.id),id,'closest parked bike selected');
  await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>!!window.__GULOU__.game.player.riding),false,'safe immediate dismount');
  await page.evaluate(f=>{const g=window.__GULOU__.game;g.player.teleport(f.position[0]-Math.sin(f.a)*1.8,f.position[1]+.04,f.position[2]-Math.cos(f.a)*1.8);g.player.physics.step();},fixture);
  await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__GULOU__.game.player.riding?.id),id);
  await page.keyboard.down('KeyW');const ride=await page.evaluate(()=>{const g=window.__GULOU__.game,p=g.player,b=p.riding,angle=b.wheels[0].rotation.x;for(let i=0;i<150;i++)p.update(1/60,g.cameraRig.yaw,true);return{position:p.position.toArray(),wheelDelta:b.wheels[0].rotation.x-angle,pedalPhase:p.pedalPhase};});await page.keyboard.up('KeyW');
  const progress=-(ride.position[0]-fixture.position[0])*Math.sin(fixture.a)-(ride.position[2]-fixture.position[2])*Math.cos(fixture.a);
  assert.ok(progress>4.2,'bike exits parking row');assert.ok(Math.abs(ride.wheelDelta)>5&&ride.pedalPhase>1,'wheel and pedals animate while riding');
  await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>!!window.__GULOU__.game.player.riding),false,'safe dismount after riding');
  report.rides.push({id,progress,...ride});
  await page.evaluate(f=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===f.id),c=g.player.solidColliders.get(b.solid);b.group.position.set(...f.position);b.group.rotation.y=f.a;b.angle=f.a;c.setTranslation({x:f.position[0],y:f.position[1]+.52,z:f.position[2]});c.setRotation({x:0,y:Math.sin(f.a/2),z:0,w:Math.cos(f.a/2)});g.player.physics.step();b.update(0,0,0);},fixture);
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const [name,eye,look,fov]of[['side',[2.7,1.15,.05],[0,.65,0],45],['front',[-1.75,1.5,-2.45],[0,.72,-.1],45],['rear',[-1.9,1.45,2.3],[0,.64,.15],45],['parking',[5.6,2.6,-5.2],[0,.55,0],62]]){
  await page.evaluate(({name,eye,look,fov})=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id==='new-teaching-north-bike-2'),a=b.angle,p=v=>[b.home.x+v[0]*Math.cos(a)+v[2]*Math.sin(a),b.home.y+v[1],b.home.z-v[0]*Math.sin(a)+v[2]*Math.cos(a)];g.player.avatar.root.visible=false;for(const o of g.world.bicycles)o.group.visible=name==='parking'||o===b;g.camera.position.set(...p(eye));g.camera.lookAt(...p(look));g.camera.fov=fov;g.camera.updateProjectionMatrix();g.renderer.render(g.scene,g.camera);},{name,eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 if(stage==='after'){
  report.rider=await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id==='new-teaching-north-bike-2'),a=b.angle;g.player.clearInput();g.player.teleport(b.home.x-Math.sin(a)*1.8,b.home.y+.04,b.home.z-Math.cos(a)*1.8);g.player.physics.step();const mounted=g.player.mount(b);for(let i=0;i<30;i++)g.player.update(1/60,a,true);g.player.avatar.root.visible=true;for(const o of g.world.bicycles)o.group.visible=o===b;const p=v=>[b.group.position.x+v[0]*Math.cos(a)+v[2]*Math.sin(a),b.group.position.y+v[1],b.group.position.z-v[0]*Math.sin(a)+v[2]*Math.cos(a)];g.camera.position.set(...p([2.7,1.6,-2.6]));g.camera.lookAt(...p([0,1.02,0]));g.camera.fov=45;g.camera.updateProjectionMatrix();g.renderer.render(g.scene,g.camera);return{mounted};});
  assert.equal(report.rider.mounted,true);await page.screenshot({path:`${out}/${stage}-${channel}-rider.png`});
 }
 if(stage==='after'&&channel==='chrome'){
  const context=await browser.newContext({...devices['Pixel 7']});const mobile=await context.newPage();await start(mobile);
  const id=ids[7];await mobile.evaluate(id=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===id);g.player.teleport(b.home.x-Math.sin(b.angle)*1.8,b.home.y+.04,b.home.z-Math.cos(b.angle)*1.8);g.player.physics.step();g.cameraRig.yaw=b.angle;for(let i=0;i<15;i++)g.onTick();},id);
  assert.match(await mobile.locator('#interact').innerText(),/骑自行车/);
  await mobile.locator('#interact').tap();assert.equal(await mobile.evaluate(()=>window.__GULOU__.game.player.riding?.id),id);
  await mobile.evaluate(()=>{for(let i=0;i<15;i++)window.__GULOU__.game.onTick();});assert.match(await mobile.locator('#interact').innerText(),/下自行车/);
  await mobile.locator('#interact').tap();assert.equal(await mobile.evaluate(()=>!!window.__GULOU__.game.player.riding),false);report.mobile='Pixel 7 touch mount/dismount passed';
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:`${out}/${stage}-${channel}-failure.png`});}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,resources:report.resources,rides:report.rides.length,mobile:report.mobile,failure:report.failure});
