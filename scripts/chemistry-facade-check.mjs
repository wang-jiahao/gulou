import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const stage=process.env.CHEMISTRY_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
const out='docs/validation/phase78',file=`${out}/${stage}-${channel}.json`;
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
 report.facade=await page.evaluate(()=>window.__GULOU__.game.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.chemistryFacade);
 // The official plan's central south edge faces the lane between chemistry and Yifu.
 const x=(-302.34-253.042)/2,z=(-168.858-164.566)/2,len=Math.hypot(49.298,4.292),nx=-4.292/len,nz=49.298/len;
 const point=(u,v)=>[x+u*nz+v*nx,z-u*nx+v*nz];
 const local=q=>({u:(q[0]-x)*nz-(q[2]-z)*nx,v:(q[0]-x)*nx+(q[2]-z)*nz,y:q[1]});
 report.referenceFrontage=[x,z,nx,nz];
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry;
  assert.deepEqual(report.geometry.cuboids,before.cuboids,'existing static cuboids unchanged');
  assert.deepEqual(report.geometry.solids,before.solids,'building volumes unchanged');
  assert.deepEqual(report.geometry.buildings.filter(b=>b.id!=='plan-3'),before.buildings.filter(b=>b.id!=='plan-3'),'other buildings unchanged');
  assert.deepEqual(report.geometry.doors,before.doors,'all doors including chemistry lobby unchanged');
  const remaining=[...report.geometry.fixed],removed=[];
  for(const h of before.fixed){const i=remaining.indexOf(h);if(i<0)removed.push(h);else remaining.splice(i,1);}
  report.meshChanges={removed:removed.length,added:remaining.length,retained:before.fixed.length-removed.length};
  assert.equal(removed.length,1,'only chemistry building volume replaced');
  assert.equal(remaining.length,35,'one shell, fourteen roof screens and twenty equipment colliders');
  assert.equal(report.building.height,35.75);assert.equal(report.facade.rows,11);assert.equal(report.facade.faces.length,2);
  report.upperRays=await page.evaluate(({facade,roof,front})=>{
   const g=window.__GULOU__.game,ray=(name,origin,dir,length,want)=>{
    const hit=g.player.physics.castRay({origin,dir},length,true,undefined,undefined,g.player.collider,g.player.body);
    return{name,distance:hit?.timeOfImpact??null,want};
   },tests=[ray('roof-height',{x:roof[0],y:45,z:roof[1]},{x:0,y:-1,z:0},15,45-facade.height),ray('upper-wall',{x:front[0],y:30,z:front[1]},{x:-facade.faces[0].frontage[2],y:0,z:-facade.faces[0].frontage[3]},5,3)];
   for(const[o,i]of facade.obstacles.map((o,i)=>[o,i])){
    if(o.kind==='roof-screen'){
     const nx=Math.sin(o.yaw),nz=Math.cos(o.yaw);
     tests.push(ray(`screen-${i}`,{x:o.x+nx,y:o.y,z:o.z+nz},{x:-nx,y:0,z:-nz},1.5,1-o.d/2));
    }else{
     const shift=o.kind==='extractor-base'?1:0;
     tests.push(ray(`${o.kind}-${i}`,{x:o.x+Math.sin(o.yaw)*shift,y:45,z:o.z+Math.cos(o.yaw)*shift},{x:0,y:-1,z:0},15,45-o.y-o.h/2));
    }
   }
   return tests;
  },{facade:report.facade,roof:point(-18,-3),front:point(0,3)});
  for(const r of report.upperRays)assert.ok(r.distance!==null&&Math.abs(r.distance-r.want)<.08,JSON.stringify(r));
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
  await page.keyboard.press('KeyM');await page.waitForFunction(()=>document.querySelector('#campus-map').open&&!document.pointerLockElement);await page.keyboard.press('Escape');
  await page.click('#map-open');await page.fill('#place-search','化学楼');report.searchResults=await page.locator('#travel-place option').allTextContents();assert.ok(report.searchResults.includes('化学楼'));
  await page.selectOption('#travel-place',{label:'化学楼'});await page.click('#travel-place-go');report.mapArrival=local(await step(15));assert.ok(Math.abs(report.mapArrival.v-9)<.15&&Math.abs(report.mapArrival.y)<.1,JSON.stringify(report.mapArrival));
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const[name,u,v,y,lookY,fov]of[['front',0,31,6,3.4,56],['entry',-1.4,10,2.7,3.1,82],['oblique',21,24,10,3.5,62],['whole',0,24,18,20,82],['roof',-18,6,64,36,72]]){
  const eye=point(u,v),look=point(0,1);
  const stats=await page.evaluate(({eye,look,y,lookY,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(eye[0],y,eye[1]);g.camera.lookAt(look[0],lookY,look[1]);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);return {...g.renderer.info.render};},{eye,look,y,lookY,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});report.views.push({name,...stats});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(file,JSON.stringify(report,null,2),stage.startsWith('before')?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,routes:report.routes.length,failure:report.failure});
