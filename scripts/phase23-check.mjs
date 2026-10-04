import{chromium,devices}from'playwright';
import assert from'node:assert/strict';
import{mkdir,writeFile}from'node:fs/promises';
const channel=process.env.BROWSER_CHANNEL||'chrome',out='docs/validation/phase23',shots='docs/screenshots/phase23';
await mkdir(out,{recursive:true});await mkdir(shots,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={channel,errors:[],missing:[],bicycles:[],doors:[]};let p;
const save=()=>writeFile(`${out}/${channel}.json`,JSON.stringify(report,null,2));
async function start(page){
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:60000});
 await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
}
async function screen(name,x,y,z,yaw,pitch){
 await p.evaluate(({x,y,z,yaw,pitch})=>{const g=window.__GULOU__.game;g.player.parkBicycle();g.player.teleport(x,y,z);g.cameraRig.firstPerson=true;g.cameraRig.pitch=pitch;g.cameraRig.yaw=yaw;g.mode='photo';document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;},{x,y,z,yaw,pitch});
 await p.waitForTimeout(600);await p.screenshot({path:`${shots}/${channel}-${name}.png`});
}
try{
 p=await browser.newPage({viewport:{width:1440,height:900}});await start(p);
 const ids=await p.evaluate(()=>window.__GULOU__.game.world.bicycles.filter(b=>!/plan-/.test(b.id)).map(b=>b.id));
 assert.equal(ids.length,25);
 for(const id of ids){
  const fixture=await p.evaluate(id=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===id),a=b.angle,x=b.home.x,z=b.home.z;g.player.teleport(x-Math.sin(a)*1.8,.09,z-Math.cos(a)*1.8);g.cameraRig.yaw=a;return{x,z,a};},id);
  await p.waitForTimeout(120);await p.keyboard.press('KeyE');
  assert.equal(await p.evaluate(()=>window.__GULOU__.game.player.riding?.id),id,`${id}: E selects closest bike in dense row`);
  await p.keyboard.press('KeyE');assert.equal(await p.evaluate(()=>!!window.__GULOU__.game.player.riding),false,`${id}: immediate safe dismount`);
  await p.evaluate(f=>{const g=window.__GULOU__.game;g.player.teleport(f.x-Math.sin(f.a)*1.8,.09,f.z-Math.cos(f.a)*1.8);g.cameraRig.yaw=f.a;},fixture);
  await p.keyboard.press('KeyE');assert.equal(await p.evaluate(()=>window.__GULOU__.game.player.riding?.id),id);
  await p.keyboard.down('KeyW');
  await p.waitForFunction(f=>{const q=window.__GULOU__.stats().position;return-(q[0]-f.x)*Math.sin(f.a)-(q[2]-f.z)*Math.cos(f.a)>4.2;},fixture,{timeout:9000});
  await p.keyboard.up('KeyW');await p.keyboard.down('Space');await p.waitForTimeout(180);await p.keyboard.up('Space');
  const exit=await p.evaluate(()=>window.__GULOU__.stats().position);await p.keyboard.press('KeyE');assert.equal(await p.evaluate(()=>!!window.__GULOU__.game.player.riding),false,`${id}: dismount after exiting row`);
  report.bicycles.push({id,exit});await save();
  // Restore the fixture so a previous test cannot obstruct a neighbouring bay.
  await p.evaluate(({id,a})=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===id);b.group.position.copy(b.home);b.group.rotation.y=a;b.angle=a;const c=g.player.solidColliders.get(b.solid);c.setTranslation({x:b.home.x,y:b.home.y+.52,z:b.home.z});c.setRotation({x:0,y:Math.sin(a/2),z:0,w:Math.cos(a/2)});g.player.physics.step();},{id,a:fixture.a});
 }
 for(const name of['新教学楼','图书馆','南教学楼']){
  const d=await p.evaluate(name=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name===name);g.player.travelTo(d.x+Math.sin(d.yaw)*13,d.z+Math.cos(d.yaw)*13);g.cameraRig.yaw=d.yaw;return d;},name);
  await p.keyboard.down('ShiftLeft');await p.keyboard.down('KeyW');await p.waitForTimeout(4200);await p.keyboard.up('KeyW');await p.keyboard.up('ShiftLeft');
  const position=await p.evaluate(()=>window.__GULOU__.stats().position),clearance=(position[0]-d.x)*Math.sin(d.yaw)+(position[2]-d.z)*Math.cos(d.yaw);
  assert.ok(clearance>.22&&clearance<1.25,`${name}: central approach reaches closed door`);assert.ok(Math.abs(position[1]-d.y)<.25,`${name}: entry platform is reachable`);
  report.doors.push({name,position,clearance});
 }
 await p.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(35,90);g.cameraRig.yaw=0;});
 await p.keyboard.down('KeyW');await p.keyboard.down('ShiftLeft');await p.waitForFunction(()=>{const p=window.__GULOU__.stats().position;return p[2]<77&&p[1]>2.85;},{},{timeout:10000});await p.keyboard.up('KeyW');await p.keyboard.up('ShiftLeft');report.eastStair='reached raised east terrace';
 await screen('new-teaching',25,.08,99.5,-Math.PI/2,-.08);
 await screen('library',-86,.08,286,-Math.PI/2,-.06);
 await screen('south-teaching',-50,.08,353.4,-2.25,-.02);
 await p.close();
 if(channel==='chrome'){
  const context=await browser.newContext({...devices['Pixel 7']});p=await context.newPage();await start(p);
  const id=ids[7];await p.evaluate(id=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===id);g.player.teleport(b.home.x-Math.sin(b.angle)*1.8,.09,b.home.z-Math.cos(b.angle)*1.8);g.cameraRig.yaw=b.angle;},id);
  await p.waitForTimeout(500);await p.locator('#interact').tap();assert.equal(await p.evaluate(()=>window.__GULOU__.game.player.riding?.id),id);
  await p.waitForTimeout(300);await p.locator('#interact').tap();assert.equal(await p.evaluate(()=>!!window.__GULOU__.game.player.riding),false);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`${shots}/mobile-parking.png`});report.mobile='Pixel 7 touch emulation: nearest-bike mount and safe dismount';
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';await save();console.log({channel,bicycles:report.bicycles.length,doors:report.doors.length,mobile:report.mobile,status:report.status});
}catch(error){report.error=String(error);if(p&&!p.isClosed()){report.failureState=await p.evaluate(()=>window.__GULOU__?.stats());await p.screenshot({path:`${shots}/${channel}-failure.png`});}await save();throw error;}
finally{await browser.close();}
