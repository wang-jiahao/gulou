import{chromium}from'playwright';import assert from'node:assert/strict';import{writeFile,mkdir}from'node:fs/promises';
const out='docs/validation/phase11';await mkdir(out,{recursive:true});await mkdir('docs/screenshots/phase11',{recursive:true});
const baseline=process.env.BASELINE_URL,current=process.env.TEST_URL??'http://localhost:4173/';
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[],geometry=[];
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
try{
 for(const url of[...(baseline?[baseline]:[]),current]){
  await p.goto(url+'?debug=1');await p.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:90000});await p.click('#enter');await p.waitForFunction(()=>window.__GULOU__.stats().sectors===3&&window.__GULOU__.stats().environment.heightReady);
  geometry.push(await p.evaluate(()=>{const root=window.__GULOU__.game.scene.getObjectByName('plan-based campus buildings with VR facade profiles'),byMaterial={};let batches=0;for(const mesh of root.children){if(!mesh.isMesh)continue;batches++;const mat=mesh.material,key=mat.name+':'+mat.color.getHexString(),a=byMaterial[key]??{vertices:0,sum:[0,0,0],area:0};const pos=mesh.geometry.attributes.position;a.vertices+=pos.count;for(let i=0;i<pos.count;i++){a.sum[0]+=pos.getX(i);a.sum[1]+=pos.getY(i);a.sum[2]+=pos.getZ(i);}for(let i=0;i<pos.count;i+=3){const u=[pos.getX(i+1)-pos.getX(i),pos.getY(i+1)-pos.getY(i),pos.getZ(i+1)-pos.getZ(i)],v=[pos.getX(i+2)-pos.getX(i),pos.getY(i+2)-pos.getY(i),pos.getZ(i+2)-pos.getZ(i)];a.area+=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;}byMaterial[key]=a;}return{batches,byMaterial,buildings:root.userData.buildings};}));
 }
 assert.equal(geometry.at(-1).buildings.length,125);
 if(baseline){
 assert.deepEqual(geometry[0].buildings,geometry[1].buildings);assert.ok(geometry[1].batches>geometry[0].batches);
 assert.deepEqual(Object.keys(geometry[0].byMaterial).sort(),Object.keys(geometry[1].byMaterial).sort());
 for(const [key,a]of Object.entries(geometry[0].byMaterial)){const c=geometry[1].byMaterial[key];assert.equal(a.vertices,c.vertices,key);assert.ok(Math.abs(a.area-c.area)<Math.max(.02,a.area*.00001),`${key} area changed`);for(let i=0;i<3;i++)assert.ok(Math.abs(a.sum[i]-c.sum[i])<.12,`${key} vertex sum changed`);}
 }
 const placements=await p.evaluate(()=>window.__GULOU__.game.scene.getObjectByName('Nanyuan cycle shelters and parked bicycles').userData.placements);assert.ok(placements.length>=3,'shelters fit clear plan space');
 const visits=[];
 for(const place of placements){
  const state=await p.evaluate(q=>{const g=window.__GULOU__.game,nx=Math.sin(q.angle),nz=Math.cos(q.angle),x=q.x+nx*3.5-Math.cos(q.angle)*2.5,z=q.z+nz*3.5+Math.sin(q.angle)*2.5;g.player.travelTo(x,z);g.cameraRig.firstPerson=true;g.cameraRig.yaw=q.angle;g.cameraRig.pitch=-.04;g.setTime(14);g.atmosphere.state.autoTime=false;return {start:g.player.position.toArray(),roof:g.player.groundHeightAt(q.x,q.z),free:g.player.groundHeightAt(x,z)};},place);
  assert.ok(state.free<.1,`${place.id} clear front apron`);assert.ok(state.roof>2.3&&state.roof<2.7,'solid canopy roof');
  await p.keyboard.down('KeyW');await p.keyboard.down('ShiftLeft');await p.waitForTimeout(1000);await p.keyboard.up('KeyW');await p.keyboard.up('ShiftLeft');
  const pos=await p.evaluate(()=>window.__GULOU__.stats().position);const along=(pos[0]-place.x)*Math.sin(place.angle)+(pos[2]-place.z)*Math.cos(place.angle);
  assert.ok(along>.8&&along<1.6,'walk reaches the bicycle and stops at its front');
  assert.ok(Math.hypot(pos[0]-state.start[0],pos[2]-state.start[2])>1.8,'approach actually moves');
  // Walk between the first two bikes, then verify the roof blocks takeoff.
  await p.evaluate(q=>{const g=window.__GULOU__.game;g.player.travelTo(q.x+Math.sin(q.angle)*3.5-Math.cos(q.angle)*1.89,q.z+Math.cos(q.angle)*3.5+Math.sin(q.angle)*1.89);g.cameraRig.yaw=q.angle;},place);
  await p.keyboard.down('KeyW');await p.keyboard.down('ShiftLeft');await p.waitForTimeout(800);await p.keyboard.up('KeyW');await p.keyboard.up('ShiftLeft');await p.waitForTimeout(100);
  const under=await p.evaluate(()=>{const g=window.__GULOU__.game;return{position:g.player.position.toArray(),takeoff:g.player.startFlight()};});
  const underAlong=(under.position[0]-place.x)*Math.sin(place.angle)+(under.position[2]-place.z)*Math.cos(place.angle);
  assert.ok(underAlong<1.1&&underAlong>-.8,'space between bicycles can be entered');assert.ok(under.position[1]<.1,'walk under canopy stays at ground level');assert.equal(under.takeoff,false,'canopy prevents takeoff through roof');
  visits.push({id:place.id,...state,stopped:pos,under});
 }
 const first=placements[0];await p.evaluate(q=>{const g=window.__GULOU__.game;g.player.travelTo(q.x+Math.sin(q.angle)*7,q.z+Math.cos(q.angle)*7);g.cameraRig.firstPerson=true;g.cameraRig.yaw=q.angle;g.cameraRig.pitch=.02;},first);await p.waitForTimeout(300);await p.keyboard.press('KeyP');await p.locator('#photo-panel').evaluate(e=>e.hidden=true);await p.locator('#toast').evaluate(e=>e.hidden=true);await p.screenshot({path:'docs/images/dormitory-cycle-shelter.png'});await p.keyboard.press('KeyP');
 await p.evaluate(()=>window.__GULOU__.game.setTime(22));await p.waitForTimeout(300);
 const lighting=await p.evaluate(()=>{const g=window.__GULOU__.game,lamps=[];g.scene.getObjectByName('Nanyuan cycle shelters and parked bicycles').traverse(o=>{if(o.isMesh&&o.material.name==='lamp-glass')lamps.push(o.material.emissiveIntensity);});return{night:g.atmosphere.night,lamps};});
 assert.ok(lighting.night>.95&&lighting.lamps.length>0&&lighting.lamps.every(x=>x>3),'shelter lighting follows night cycle');
 await p.keyboard.press('KeyP');await p.locator('#photo-panel').evaluate(e=>e.hidden=true);await p.locator('#toast').evaluate(e=>e.hidden=true);await p.screenshot({path:'docs/screenshots/phase11/shelter-night.png'});await p.keyboard.press('KeyP');await p.evaluate(()=>window.__GULOU__.game.setTime(14));
 for(const [tag,z]of[['wait',349.5],['pass',346.5]]){
  await p.evaluate(z=>{const g=window.__GULOU__.game;g.player.travelTo(-83.45,z);g.cameraRig.firstPerson=true;g.cameraRig.yaw=0;g.cameraRig.pitch=.13;g.photoFov=42;},z);await p.waitForTimeout(900);
  const readers=await p.evaluate(()=>window.__GULOU__.game.world.access.snapshot().readers);assert.ok(readers.some(r=>r.entrance==='hankou'&&Math.abs(r.x+83.45)<.2&&r.display===tag),`reader ${tag}`);
  await p.keyboard.press('KeyP');await p.locator('#photo-panel').evaluate(e=>e.hidden=true);await p.locator('#toast').evaluate(e=>e.hidden=true);await p.screenshot({path:`docs/screenshots/phase11/reader-${tag}.png`});await p.keyboard.press('KeyP');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(`${out}/geometry-amenities.json`,JSON.stringify({time:new Date().toISOString(),baseline,current,geometry,placements,visits,lighting,errors,missing},null,2));console.log(JSON.stringify({batches:geometry.map(g=>g.batches),geometry:baseline?'all original vertices/area/materials preserved':'baseline not requested',shelters:placements.length,readerStates:['wait','pass'],lighting,errors,missing}));
}catch(e){await p.screenshot({path:`${out}/failure.png`});console.error(await p.evaluate(()=>window.__GULOU__?.stats()));throw e;}finally{await b.close();}
