import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const stage=process.env.CHEMISTRY_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
const out='docs/validation/phase79',file=`${out}/${stage}-${channel}.json`;
await mkdir(out,{recursive:true});
if(stage.startsWith('before')){try{await readFile(file);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],routes:[],views:[]};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto(`${process.env.BASE_URL||'http://localhost:4173'}/?debug=1`);
 await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,null,{timeout:90000});
 await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=JSON.parse(JSON.stringify(await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const fixed=[];for(const m of g.world.fixedMeshes)fixed.push(await hash(m.vertices)+await hash(m.indices));
  const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push({position:c.translation(),rotation:c.rotation(),halfExtents:c.shape.halfExtents});});
  return {fixed,cuboids,solids:g.world.solids,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings};
 })));
 report.building=report.geometry.buildings.find(b=>b.id==='plan-3');
 report.forecourt=await page.evaluate(()=>window.__GULOU__.game.world.root.getObjectByName('chemistry sheltered bicycle forecourt')?.userData??null);
 report.map=await page.evaluate(()=>{const m=window.__GULOU__.game.world.map;return{features:m.features.filter(f=>f.id==='plan-3'),roads:m.roads.filter(r=>r.points.some(([x,z])=>x>-330&&x<-230&&z>-190&&z<-125))};});
 report.bicycles=await page.evaluate(()=>window.__GULOU__.game.world.bicycles.map(b=>({id:b.id,home:b.home.toArray(),angle:b.angle})));
 report.facade=await page.evaluate(()=>window.__GULOU__.game.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.chemistryFacade);
 // The official plan's central south edge faces the lane between chemistry and Yifu.
 const x=(-302.34-253.042)/2,z=(-168.858-164.566)/2,len=Math.hypot(49.298,4.292),nx=-4.292/len,nz=49.298/len;
 const point=(u,v)=>[x+u*nz+v*nx,z-u*nx+v*nz];
 const local=q=>({u:(q[0]-x)*nz-(q[2]-z)*nx,v:(q[0]-x)*nx+(q[2]-z)*nz,y:q[1]});
 report.referenceFrontage=[x,z,nx,nz];
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry;
  const unchanged=(current,old,label)=>{const rest=current.map(v=>JSON.stringify(v));for(const v of old){const i=rest.indexOf(JSON.stringify(v));assert.ok(i>=0,label);rest.splice(i,1);}return rest.length;};
  report.geometryChanges={fixed:unchanged(report.geometry.fixed,before.fixed,'existing fixed mesh retained'),cuboids:unchanged(report.geometry.cuboids,before.cuboids,'existing static cuboid retained'),solids:unchanged(report.geometry.solids,before.solids,'existing world solid retained')};
  assert.deepEqual(report.geometry.buildings,before.buildings,'all buildings unchanged');
  assert.deepEqual(report.geometry.doors,before.doors,'all doors unchanged');
  assert.deepEqual(report.bicycles.filter(b=>!b.id.startsWith('chemistry-')),JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).bicycles,'all existing bikes unchanged');
  assert.ok(report.forecourt,'forecourt loaded');
  const step=frames=>page.evaluate(frames=>{const g=window.__GULOU__.game;for(let i=0;i<frames;i++)g.player.update(1/60,g.cameraRig.yaw,true);return g.player.position.toArray();},frames);
  async function setup(a,b,height=.12){const p=point(...a),q=point(...b);await page.evaluate(({p,q,height})=>{const g=window.__GULOU__.game;g.player.clearInput();g.player.teleport(p[0],height,p[1]);g.player.physics.step();g.cameraRig.yaw=Math.atan2(p[0]-q[0],p[1]-q[1]);g.mode='playing';},{p,q,height});await step(15);}
  for(const u of[-7.1,0,7.1]){
   await setup([u,9],[u,0]);await page.keyboard.down('KeyW');const p=local(await step(440));await page.keyboard.up('KeyW');report.routes.push({name:'stairs-to-glass',u,...p});assert.ok(p.v>.5&&p.v<.85&&Math.abs(p.y-1.05)<.1,JSON.stringify(p));
   await setup([u,1],[u,9],1.08);await page.keyboard.down('KeyW');const q=local(await step(295));await page.keyboard.up('KeyW');report.routes.push({name:'stairs-descent',u,...q});assert.ok(q.v>8&&Math.abs(q.y)<.1,JSON.stringify(q));
  }
  for(const u of[-10.65,-3.55,3.55,10.65]){await setup([u,9],[u,0]);await page.keyboard.down('KeyW');const p=local(await step(380));await page.keyboard.up('KeyW');report.routes.push({name:'column-block',u,...p});assert.ok(p.v>3.25&&p.v<3.7&&Math.abs(p.y-1.05)<.1,JSON.stringify(p));}
  for(const[start,end]of[[[-14,9],[14,9]],[[14,9],[-14,9]]]){
   await setup(start,end);const target=point(...end);await page.keyboard.down('KeyW');const position=await page.evaluate(target=>{const g=window.__GULOU__.game;for(let i=0;i<1150;i++){g.player.update(1/60,g.cameraRig.yaw,true);if(Math.hypot(g.player.position.x-target[0],g.player.position.z-target[1])<.12)break;}return g.player.position.toArray();},target);await page.keyboard.up('KeyW');const p=local(position);report.routes.push({name:'front-lane',start,end,...p});assert.ok(Math.hypot(p.u-end[0],p.v-end[1])<.18,JSON.stringify(p));
  }
  const samples=[['landing',0,2,1.05],['front-lane',0,9,0],['canopy',0,2.5,6.18],['canopy-rib',3.55,2.5,6.46],...Array.from({length:6},(_,i)=>[`step-${i}`,0,4.3+(i+.5)*.38,.9-i*.15])];
  report.rays=await page.evaluate(samples=>{const g=window.__GULOU__.game;return samples.map(([name,x,z,want])=>{const top=name.startsWith('canopy')?9:2,hit=g.player.physics.castRay({origin:{x,y:top,z},dir:{x:0,y:-1,z:0}},10,true,undefined,undefined,g.player.collider,g.player.body);return{name,y:hit?top-hit.timeOfImpact:null,want};});},samples.map(([name,u,v,y])=>[name,...point(u,v),y]));
  for(const r of report.rays)assert.ok(r.y!==null&&Math.abs(r.y-r.want)<.08,'surface: '+JSON.stringify(r));
  async function travel(start,end){
   await setup(start,end);const target=point(...end);await page.keyboard.down('KeyW');
   const p=local(await page.evaluate(target=>{const g=window.__GULOU__.game;for(let i=0;i<3500;i++){g.player.update(1/60,g.cameraRig.yaw,true);if(Math.hypot(g.player.position.x-target[0],g.player.position.z-target[1])<.10)break;}return g.player.position.toArray();},target));await page.keyboard.up('KeyW');return p;
  }
  for(const s of report.forecourt.shelters){
   const u=s.u-s.w/2+.3+.5*(s.w-.6)/s.bays;
   for(const[start,end]of[[[u,6.8],[u,1.3]],[[u,1.3],[u,6.8]]]){
    const p=await travel(start,end);report.routes.push({name:`${s.id}-shelter-walk`,start,end,...p});assert.ok(Math.hypot(p.u-end[0],p.v-end[1])<.15,JSON.stringify(p));
   }
   for(const u of[s.u-s.w/2+.3,s.u+s.w/2-.3]){
    await setup([u,6.8],[u,2]);await page.keyboard.down('KeyW');const p=local(await step(200));await page.keyboard.up('KeyW');report.routes.push({name:`${s.id}-post-block`,u,...p});assert.ok(p.v>4.18&&p.v<4.5,JSON.stringify(p));
   }
  }
  for(const[start,end]of[[[-45,9],[29,9]],[[29,9],[-45,9]]]){
   const p=await travel(start,end);report.routes.push({name:'full-front-lane',start,end,...p});assert.ok(Math.hypot(p.u-end[0],p.v-end[1])<.15,JSON.stringify(p));
  }
  const solidSamples=[];
  for(const s of report.forecourt.shelters){const u=s.u-s.w/2+.3+.5*(s.w-.6)/s.bays;solidSamples.push({name:s.id+'-roof-above',u,v:3.2,y:4,dir:-1,want:2.88},{name:s.id+'-roof-below',u,v:3.2,y:2,dir:1,want:2.72});}
  for(const t of report.forecourt.planting)solidSamples.push({name:'tree-trunk',u:t.u,v:t.v,y:t.baseY+t.height*.44+1,dir:-1,want:t.baseY+t.height*.44});
  const bed=report.forecourt.bed;solidSamples.push({name:'bed-hedge',u:bed.u+1,v:bed.v,y:2,dir:-1,want:.96});
  report.forecourtRays=await page.evaluate(samples=>{const g=window.__GULOU__.game;return samples.map(s=>{const hit=g.player.physics.castRay({origin:{x:s.x,y:s.y,z:s.z},dir:{x:0,y:s.dir,z:0}},10,true,undefined,undefined,g.player.collider,g.player.body);return{...s,actual:hit?s.y+s.dir*hit.timeOfImpact:null};});},solidSamples.map(s=>{const[x,z]=point(s.u,s.v);return{...s,x,z};}));
  for(const r of report.forecourtRays)assert.ok(r.actual!==null&&Math.abs(r.actual-r.want)<.07,JSON.stringify(r));
  const ids=report.bicycles.filter(b=>b.id.startsWith('chemistry-')).map(b=>b.id);assert.equal(ids.length,22);report.rides=[];
  for(const id of ids){
   const f=await page.evaluate(id=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===id);g.mode='playing';g.player.clearInput();g.player.teleport(b.home.x-Math.sin(b.angle)*1.8,b.home.y+.04,b.home.z-Math.cos(b.angle)*1.8);g.player.physics.step();g.cameraRig.yaw=b.angle;return{id,p:b.home.toArray(),a:b.angle};},id);
   await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__GULOU__.game.player.riding?.id),id,`${id} mounts requested bike`);
   await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>!!window.__GULOU__.game.player.riding),false,`${id} dismounts under shelter`);
   await page.evaluate(f=>{const g=window.__GULOU__.game;g.player.teleport(f.p[0]-Math.sin(f.a)*1.8,f.p[1]+.04,f.p[2]-Math.cos(f.a)*1.8);},f);
   await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__GULOU__.game.player.riding?.id),id);
   await page.keyboard.down('KeyW');const position=local(await step(105));await page.keyboard.up('KeyW');report.activeRide={id,...position};assert.ok(position.v>7.5&&Math.abs(position.y)<.1,JSON.stringify(report.activeRide));
   await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>!!window.__GULOU__.game.player.riding),false,`${id} dismounts on lane`);
   report.rides.push(report.activeRide);delete report.activeRide;
   await page.evaluate(f=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===f.id),c=g.player.solidColliders.get(b.solid);b.group.position.set(...f.p);b.group.rotation.y=f.a;b.angle=f.a;c.setTranslation({x:f.p[0],y:f.p[1]+.52,z:f.p[2]});c.setRotation({x:0,y:Math.sin(f.a/2),z:0,w:Math.cos(f.a/2)});b.update(0,0,0);b.setParked?.(true);g.player.physics.step();},f);
  }
  report.laneRides=[];
  for(const[start,end]of[[[-45,9],[29,9]],[[29,9],[-45,9]]]){
   const p=point(...start),q=point(...end),angle=Math.atan2(p[0]-q[0],p[1]-q[1]);
   const saved=await page.evaluate(({id,p,angle})=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===id),saved={id,p:b.group.position.toArray(),angle:b.angle};b.setParked?.(false);b.group.position.set(p[0],.025,p[1]);b.group.rotation.y=angle;b.angle=angle;b.setParked?.(true);const c=g.player.solidColliders.get(b.solid);c.setTranslation({x:p[0],y:.545,z:p[1]});c.setRotation({x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)});g.player.teleport(p[0]-Math.sin(angle)*1.8,.08,p[1]-Math.cos(angle)*1.8);g.player.physics.step();g.cameraRig.yaw=angle;return saved;},{id:ids[0],p,angle});
   await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__GULOU__.game.player.riding?.id),ids[0]);await page.keyboard.down('KeyW');
   const position=local(await page.evaluate(q=>{const g=window.__GULOU__.game;for(let i=0;i<1600;i++){g.player.update(1/60,g.cameraRig.yaw,true);if(Math.hypot(g.player.position.x-q[0],g.player.position.z-q[1])<.15)break;}return g.player.position.toArray();},q));await page.keyboard.up('KeyW');report.laneRides.push({start,end,...position});assert.ok(Math.hypot(position.u-end[0],position.v-end[1])<.2,JSON.stringify(position));
   await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>!!window.__GULOU__.game.player.riding),false);
   await page.evaluate(s=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===s.id),c=g.player.solidColliders.get(b.solid);b.setParked?.(false);b.group.position.set(...s.p);b.group.rotation.y=s.angle;b.angle=s.angle;b.update(0,0,0);b.setParked?.(true);c.setTranslation({x:s.p[0],y:s.p[1]+.52,z:s.p[2]});c.setRotation({x:0,y:Math.sin(s.angle/2),z:0,w:Math.cos(s.angle/2)});g.player.physics.step();},saved);
  }
  await page.keyboard.press('KeyM');await page.waitForFunction(()=>document.querySelector('#campus-map').open&&!document.pointerLockElement);await page.keyboard.press('Escape');
  await page.click('#map-open');await page.fill('#place-search','化学楼');report.searchResults=await page.locator('#travel-place option').allTextContents();assert.ok(report.searchResults.includes('化学楼'));
  await page.selectOption('#travel-place',{label:'化学楼'});await page.click('#travel-place-go');report.mapArrival=local(await step(15));assert.ok(Math.abs(report.mapArrival.v-9)<.15&&Math.abs(report.mapArrival.y)<.1,JSON.stringify(report.mapArrival));
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const[name,u,v,y,lookY,fov,lookU]of[['front',0,24,7,3,96,0],['west',-27,15,3,2,85,-27],['east',23,15,3,2,85,23],['overview',-35,24,29,1,85,-12]]){
  const eye=point(u,v),look=point(lookU,3);
  const stats=await page.evaluate(({eye,look,y,lookY,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(eye[0],y,eye[1]);g.camera.lookAt(look[0],lookY,look[1]);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);return {...g.renderer.info.render};},{eye,look,y,lookY,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});report.views.push({name,...stats});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(file,JSON.stringify(report,null,2),stage.startsWith('before')?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,routes:report.routes.length,failure:report.failure});
