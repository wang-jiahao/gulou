import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='docs/validation/phase46',stage=process.env.PEARL_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
if(stage==='before'){try{await readFile(`${out}/before-chrome.json`);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],routes:[]};
const layout=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
report.footprints=createHash('sha256').update(JSON.stringify(layout.features.map(f=>[f.id,f.points,f.holes]))).digest('hex');
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(''),fixed=[];
  for(const m of g.world.fixedMeshes){const v=m.vertices;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(let i=0;i<v.length;i+=3){minX=Math.min(minX,v[i]);maxX=Math.max(maxX,v[i]);minZ=Math.min(minZ,v[i+2]);maxZ=Math.max(maxZ,v[i+2]);}fixed.push({hash:await hash(v)+await hash(m.indices),bounds:[minX,maxX,minZ,maxZ]});}
  return JSON.parse(JSON.stringify({fixed,solids:g.world.solids,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings}));
 });
 report.building=report.geometry.buildings.find(b=>b.id==='plan-50');
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  assert.equal(report.footprints,before.footprints,'campus footprints retained');
  assert.deepEqual(report.geometry.buildings.filter(b=>b.id!=='plan-50'),before.geometry.buildings.filter(b=>b.id!=='plan-50'),'unrelated buildings retained');
  assert.deepEqual(report.geometry.doors.filter(d=>d.name!==report.building.name),before.geometry.doors.filter(d=>d.name!==before.building.name),'unrelated doors retained');
  assert.deepEqual(report.geometry.solids,before.geometry.solids,'tree and unrelated box collisions retained');
  const inMemorial=m=>m.bounds[0]>-290&&m.bounds[1]<-267&&m.bounds[2]>165&&m.bounds[3]<189;
  const oldLocal=before.geometry.fixed.filter(inMemorial),remaining=[...report.geometry.fixed];
  for(const m of before.geometry.fixed.filter(m=>!inMemorial(m))){const i=remaining.findIndex(n=>n.hash===m.hash);assert.ok(i>=0,'unrelated fixed mesh retained');remaining.splice(i,1);}
  assert.ok(remaining.every(inMemorial),'all new colliders confined to memorial');report.meshChanges={retained:before.geometry.fixed.length-oldLocal.length,removed:oldLocal.length,added:remaining.length};
  assert.equal(report.building.name,'赛珍珠纪念馆');assert.equal(report.building.columns.length,2);assert.equal(report.building.sign,'赛珍珠纪念馆');
  const [x,z,nx,nz]=report.building.frontage;
  const point=(u,v)=>[x+u*nz+v*nx,z-u*nx+v*nz];
  const local=q=>({u:(q[0]-x)*nz-(q[2]-z)*nx,v:(q[0]-x)*nx+(q[2]-z)*nz,y:q[1]});
  const step=frames=>page.evaluate(frames=>{const g=window.__GULOU__.game;for(let i=0;i<frames;i++)g.player.update(1/60,g.cameraRig.yaw,true);return g.player.position.toArray();},frames);
  async function setup(start,end,height=.12){const p=point(...start),q=point(...end);await page.evaluate(({p,q,height})=>{const g=window.__GULOU__.game;g.player.clearInput();g.player.teleport(p[0],height,p[1]);g.player.physics.step();g.cameraRig.yaw=Math.atan2(p[0]-q[0],p[1]-q[1]);g.mode='playing';},{p,q,height});await step(10);}
  async function move(frames){await page.keyboard.down('KeyW');const p=local(await step(frames));await page.keyboard.up('KeyW');return p;}
  const clearance=await page.evaluate(()=>{const p=window.__GULOU__.game.player;return p.collider.radius()+p.motor.offset();});
  const door=report.building.boxes.find(b=>b.kind==='door'),doorStop=door.v+door.d/2+clearance;
  for(const u of[-.55,0,.55]){
   await setup([u,5.4],[u,0]);const p=await move(230);report.routes.push({name:'stairs-to-door',u,...p});
   assert.ok(Math.abs(p.v-doorStop)<.06&&Math.abs(p.y-1.07)<.10,'stairs reach landing and closed door: '+JSON.stringify(p));
  }
  for(const u of[-1.33,1.33]){
   await setup([u,5.4],[u,0]);const p=await move(230);report.routes.push({name:'column-block',u,...p});
   // The capsule touches the .58m plinth before the narrower round shaft.
   assert.ok(p.v>1.55+.23&&p.v<1.55+.29+clearance+.07,'column/base blocks walking: '+JSON.stringify(p));
  }
  for(const [name,a,b,height]of [
   ['portico',[-1.08,.82],[1.08,.82],1.11],
   ['front-lane',[-10,5.2],[10,5.2],.12],
   ['south-passage',[-10.4,5.2],[-10.4,-13.9],.12],
   ['north-passage',[9.9,5.2],[9.9,-13.9],.12],
   ['west-passage',[-10.4,-14],[9.9,-14],.12],
   ['stairs-down',[0,.82],[0,5.4],1.11]
  ])for(const [start,end]of[[a,b],[b,a]]){
   // Only the descent starts above grade. The reverse must climb from ground.
   await setup(start,end,name==='stairs-down'&&start===b?.12:height);
   const target=point(...end),distance=Math.hypot(end[0]-start[0],end[1]-start[1]);
   // Autostep spends some frames lifting the capsule; stop at the destination
   // instead of assuming every ascending frame moves the full walking stride.
   // Use a stop radius within the .16m assertion tolerance: contact resolution
   // can shift a straight walk sideways by a few cm, so .05m never terminates.
   await page.keyboard.down('KeyW');
   const result=await page.evaluate(({target,distance})=>{const g=window.__GULOU__.game,maxFrames=Math.ceil(distance/1.65*60)+120;let frames=0;for(;frames<maxFrames;frames++){g.player.update(1/60,g.cameraRig.yaw,true);if(Math.hypot(g.player.position.x-target[0],g.player.position.z-target[1])<.12)break;}return {position:g.player.position.toArray(),frames,maxFrames};},{target,distance});
   await page.keyboard.up('KeyW');const p=local(result.position);report.routes.push({name,start,end,...p,frames:result.frames,maxFrames:result.maxFrames});
   assert.ok(Math.hypot(p.u-end[0],p.v-end[1])<.16,'open route: '+name+' '+JSON.stringify(p));
  }
  const samples=[['balcony',0,1.1,4.4,4.5],['roof-north',3,-4,8,12],['roof-south',-3,-4,8,12],['roof-back',0,-10,8,12],['dormer',0,-1,9.5,11.5],['front-lane',0,5.2,-.1,.3]];
  report.rays=await page.evaluate(samples=>{const g=window.__GULOU__.game;return samples.map(([name,x,z,min,max])=>{const hit=g.player.physics.castRay({origin:{x,y:25,z},dir:{x:0,y:-1,z:0}},30,true,undefined,undefined,g.player.collider,g.player.body);return {name,y:hit?25-hit.timeOfImpact:null,min,max};});},samples.map(([name,u,v,min,max])=>[name,...point(u,v),min,max]));
  for(const r of report.rays)assert.ok(r.y!==null&&r.y>r.min&&r.y<r.max,'solid roof and open approach: '+JSON.stringify(r));
  report.signClearance=3.74-.57/2-(door.y+door.h/2);
  assert.ok(report.signClearance>0,'sign above door geometry');
  // Entry captures the pointer for camera look, so a mouse click is routed to
  // the canvas. Open with the player's M shortcut, then verify the HUD button
  // with the pointer released by the modal (no force-click or synthetic event).
  report.mapInput={pointerLocked:await page.evaluate(()=>!!document.pointerLockElement)};
  await page.keyboard.press('KeyM');
  await page.waitForFunction(()=>document.querySelector('#campus-map').open&&!document.pointerLockElement);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#campus-map').open);
  await page.click('#map-open',{timeout:5000});await page.fill('#place-search','赛珍珠');
  report.searchResults=await page.locator('#travel-place option').allTextContents();
  assert.deepEqual(report.searchResults,['选择地点','赛珍珠纪念馆']);
  await page.selectOption('#travel-place',{label:'赛珍珠纪念馆'});await page.click('#travel-place-go');
  report.arrival=local(await page.evaluate(()=>window.__GULOU__.game.player.position.toArray()));
  assert.ok(Math.hypot(report.arrival.u,report.arrival.v-4)<.5&&report.arrival.y<.3,'named arrival stays on the open approach');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const [name,eye,look,fov]of [
  ['front',[-263,5.8,177],[-278,5.8,176.5],64],
  ['entrance',[-268,2.3,176.5],[-272.4,2.9,176.5],64],
  ['south',[-266,6,192],[-278,5,178],60],
  ['roof',[-261,19,190],[-278,7,176],62],
  ['west',[-300,7,172],[-279,5,176],62]]){
  await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.renderer.render(g.scene,g.camera);},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,meshes:report.meshChanges,routes:report.routes.length,failure:report.failure});
