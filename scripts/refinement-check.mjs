import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.VALIDATION_DIR??'docs/validation/phase17';await mkdir(out,{recursive:true});await mkdir('docs/screenshots/phase17',{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),errors=[],missing=[],report={};let p;
async function start(page){page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:60000});await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});}
async function move(ms,...keys){for(const key of keys)await p.keyboard.down(key);await p.waitForTimeout(ms);for(const key of keys)await p.keyboard.up(key);return p.evaluate(()=>window.__GULOU__.stats().position);}
async function pose(){return p.evaluate(()=>{const g=window.__GULOU__.game,bones=g.player.avatar.root.getObjectsByProperty('type','Bone'),data={};for(const key of['Hips','LeftHand','RightHand','LeftFoot','RightFoot']){const bone=bones.find(b=>b.name.endsWith(key));data[key]=g.player.avatar.root.worldToLocal(bone.getWorldPosition(bone.position.clone())).toArray();}return{kind:g.character,riding:g.player.riding?.id,phase:g.player.pedalPhase,bones:data};});}
try{
 p=await browser.newPage({viewport:{width:1440,height:900}});await start(p);
 report.heights=await p.evaluate(()=>[87,85.65,85.1,84.55,84,83.45,82.9,82.35,81,60,17].map(z=>[z,window.__GULOU__.game.player.groundHeightAt(0,z)]));
 assert.ok(report.heights[0][1]<.1);assert.ok(report.heights.at(-2)[1]>1.25&&report.heights.at(-2)[1]<1.35);
 for(let i=1;i<8;i++)assert.ok(report.heights[i][1]>report.heights[i-1][1]+.10,'each stair rises');
 await p.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(0,90);g.cameraRig.yaw=0;});report.upstairs=await move(4300,'KeyW','ShiftLeft');assert.ok(report.upstairs[2]<75&&report.upstairs[1]>1.25,'walk onto whole terrace');
 await p.evaluate(()=>window.__GULOU__.game.cameraRig.yaw=Math.PI);report.downstairs=await move(4300,'KeyW','ShiftLeft');assert.ok(report.downstairs[2]>88&&report.downstairs[1]<.15,'walk down without jump');
 report.destinations=await p.locator('#travel-place option').evaluateAll(o=>o.map(x=>x.textContent));assert.ok(report.destinations.length>120);
 report.locations=[];
 for(const name of['大纛坪','图书馆','逸夫馆','费彝民楼群','蒙民伟楼','南园综合楼与学生餐厅']){
  await p.keyboard.press('KeyM');await p.fill('#place-search',name);const value=await p.locator('#travel-place option').evaluateAll((o,name)=>o.find(x=>x.textContent===name)?.value,name);assert.ok(value);await p.selectOption('#travel-place',value);await p.click('#travel-place-go');await p.waitForTimeout(350);const state=await p.evaluate(()=>({position:window.__GULOU__.stats().position,location:document.querySelector('#location-name').textContent}));report.locations.push({name,...state});assert.ok(state.position[1]<.3,'named entrance arrives on ground');assert.ok(state.location.includes(name)||name==='图书馆'&&state.location.includes('图书馆'));
 }
 await p.keyboard.press('KeyM');await p.fill('#place-search','');await p.screenshot({path:'docs/screenshots/phase17/map-after.png'});await p.click('#map-resume');
 const bikes=await p.evaluate(()=>window.__GULOU__.game.world.bicycles.map(b=>({id:b.id,x:b.group.position.x,z:b.group.position.z,angle:b.angle})));assert.equal(bikes.length,20);report.mounts=[];
 for(let i=0;i<bikes.length;i++){
  const result=await p.evaluate(i=>{const g=window.__GULOU__.game,b=g.world.bicycles[i];g.player.travelTo(b.group.position.x-Math.sin(b.angle)*2,b.group.position.z-Math.cos(b.angle)*2);const mounted=g.player.mount(b);const exited=mounted?g.player.dismount():false;return{id:b.id,mounted,exited,position:g.player.position.toArray()};},i);report.mounts.push(result);
 }
 assert.ok(report.mounts.every(r=>r.mounted&&r.exited),'all 20 bicycles can mount and safely dismount');
 await p.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[0];g.player.travelTo(b.group.position.x-Math.sin(b.angle)*2,b.group.position.z-Math.cos(b.angle)*2);g.cameraRig.firstPerson=false;g.cameraRig.yaw=b.angle;g.mode='playing';});await p.keyboard.press('KeyE');assert.ok(await p.evaluate(()=>window.__GULOU__.stats().bicycle));
 report.poses=[];
 for(const kind of['male','female']){
  await p.evaluate(k=>window.__GULOU__.game.setCharacter(k),kind);await p.waitForTimeout(350);const s=await pose();report.poses.push(s);assert.ok(Math.abs(s.bones.Hips[1]-.99)<.02);for(const side of ['Left','Right']){const h=s.bones[side+'Hand'];assert.ok(Math.hypot(Math.abs(h[0])-.24,h[1]-1.24,h[2]+.06)<.025,'hands contact handlebars');}
  await p.evaluate(()=>{const g=window.__GULOU__.game;g.cameraRig.yaw=g.player.rideYaw+1.6;g.cameraRig.pitch=.1;g.cameraRig.distance=3;g.mode='photo';document.querySelector('#hud').hidden=true;});await p.waitForTimeout(250);await p.screenshot({path:`docs/screenshots/phase17/bicycle-${kind}.png`});await p.evaluate(()=>{const g=window.__GULOU__.game;g.mode='playing';g.cameraRig.yaw=g.player.rideYaw;document.querySelector('#hud').hidden=false;});
 }
 const from=await p.evaluate(()=>window.__GULOU__.stats().position);report.cycleEnd=await move(2400,'KeyW');report.distance=Math.hypot(report.cycleEnd[0]-from[0],report.cycleEnd[2]-from[2]);assert.ok(report.distance>4,'ride out of shelter');
 await move(500,'Space');assert.ok(await p.evaluate(()=>window.__GULOU__.game.player.rideSpeed<.1));
 await p.keyboard.press('KeyF');assert.equal(await p.evaluate(()=>window.__GULOU__.stats().flight),'walking');
 await p.keyboard.press('Escape');if(!await p.locator('#settings').isVisible())await p.click('#settings-open');const paused=await p.evaluate(()=>window.__GULOU__.stats().position);await p.waitForTimeout(300);const stopped=await p.evaluate(()=>window.__GULOU__.stats().position);assert.ok(Math.hypot(stopped[0]-paused[0],stopped[2]-paused[2])<.001);await p.click('#settings-resume');
 await p.keyboard.press('KeyE');assert.equal(await p.evaluate(()=>window.__GULOU__.stats().bicycle),null);report.dismounted=await p.evaluate(()=>window.__GULOU__.stats().position);assert.ok(report.dismounted[1]<.3);
 // Ride into the current closed library entry. Its vestibule now projects
 // 1.5 m from the old wall, so measure clearance against the actual door plane.
 report.wall=await p.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[0],d=g.world.doors.find(d=>d.name==='图书馆');g.player.travelTo(b.group.position.x+Math.cos(b.angle)*1.2,b.group.position.z-Math.sin(b.angle)*1.2);g.player.mount(b);g.player.teleport(d.x+Math.sin(d.yaw)*9,.06,d.z+Math.cos(d.yaw)*9);g.cameraRig.yaw=d.yaw;return{bike:g.player.riding?.id,door:d};});assert.ok(report.wall.bike);
 report.wallStop=await move(4000,'KeyW','ShiftLeft');const d=report.wall.door;report.wallClearance=(report.wallStop[0]-d.x)*Math.sin(d.yaw)+(report.wallStop[2]-d.z)*Math.cos(d.yaw);assert.ok(report.wallClearance>.80&&report.wallClearance<1.2,'cycle collider stops its nose before the closed door');

 const travel=await p.evaluate(()=>{const g=window.__GULOU__.game;const p=g.player.travelTo(0,60);return{p,bike:g.player.riding};});assert.ok(travel.p&&travel.bike===null);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);report.stats=await p.evaluate(()=>window.__GULOU__.stats());await p.close();
 const context=await browser.newContext({...devices['Pixel 7']});p=await context.newPage();await start(p);await p.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.travelTo(b.group.position.x-Math.sin(b.angle)*2,b.group.position.z-Math.cos(b.angle)*2);});await p.waitForFunction(()=>!document.querySelector('#interact').hidden);await p.locator('#interact').tap();assert.ok(await p.evaluate(()=>window.__GULOU__.stats().bicycle));await p.locator('#interact').tap();assert.equal(await p.evaluate(()=>window.__GULOU__.stats().bicycle),null);
 report.mobile='Pixel 7 browser touch simulation; tap mount/dismount';report.errors=errors;report.missing=missing;await writeFile(`${out}/refinement.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({stairs:'passed',destinations:report.destinations.length-1,bicycles:report.mounts.length,rideDistance:report.distance,wallClearance:report.wallClearance,mobile:report.mobile,errors,missing}));
}catch(e){report.error=String(e);await writeFile(`${out}/refinement-partial.json`,JSON.stringify(report,null,2));if(p&&!p.isClosed())await p.screenshot({path:`${out}/failure.png`});throw e;}finally{await browser.close();}
