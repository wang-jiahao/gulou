import{chromium,devices}from'playwright';
import assert from'node:assert/strict';
import{mkdir,writeFile}from'node:fs/promises';
const channel=process.env.BROWSER_CHANNEL||'chrome',out='docs/validation/phase22',shots='docs/screenshots/phase22';
await mkdir(out,{recursive:true});await mkdir(shots,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel}),report={channel,errors:[],missing:[],passages:[],barriers:[],courts:[]};let p;
const save=()=>writeFile(`${out}/${channel}.json`,JSON.stringify(report,null,2));
async function start(page){page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:60000});await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});}
async function screen(name,x,y,z,yaw,pitch){await p.evaluate(({x,y,z,yaw,pitch})=>{const g=window.__GULOU__.game;g.player.parkBicycle();g.player.teleport(x,y,z);g.cameraRig.firstPerson=true;g.cameraRig.pitch=pitch;g.cameraRig.yaw=yaw;g.mode='photo';document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;},{x,y,z,yaw,pitch});await p.waitForTimeout(600);await p.screenshot({path:`${shots}/${channel}-${name}.png`});}
try{
 p=await browser.newPage({viewport:{width:1440,height:900}});await start(p);
 const gates=await p.evaluate(()=>window.__GULOU__.game.world.sports.gates);
 for(const riding of[false,true]){
  if(riding){await p.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.travelTo(b.group.position.x-Math.sin(b.angle)*2,b.group.position.z-Math.cos(b.angle)*2);g.cameraRig.yaw=b.angle;});await p.waitForTimeout(200);await p.keyboard.press('KeyE');assert.ok(await p.evaluate(()=>!!window.__GULOU__.game.player.riding),'mount bicycle with E');}
  for(const gate of gates)for(const side of[-1,1]){
   const nx=-gate.tz,nz=gate.tx,fixture={x:gate.x+nx*side*4,z:gate.z+nz*side*4,yaw:Math.atan2(nx*side,nz*side)};
   await p.evaluate(({fixture,riding})=>{const g=window.__GULOU__.game;g.mode='playing';g.player.teleport(fixture.x,.12,fixture.z);g.cameraRig.yaw=fixture.yaw;if(riding){g.player.rideYaw=fixture.yaw;g.player.rideViewYaw=fixture.yaw;g.player.rideSpeed=0;}},{fixture,riding});
   await p.keyboard.down('KeyW');
   await p.waitForFunction(({gate,nx,nz,side})=>{const q=window.__GULOU__.stats().position;return((q[0]-gate.x)*nx+(q[2]-gate.z)*nz)*side< -3;},{gate,nx,nz,side},{timeout:18000});
   await p.keyboard.up('KeyW');const position=await p.evaluate(()=>window.__GULOU__.stats().position);report.passages.push({name:gate.name,riding,side,position});await save();
  }
 }
 await p.evaluate(()=>window.__GULOU__.game.player.parkBicycle());
 for(const gate of gates){
  // A neighbouring section of the visible fence must stop actual motion.
  const fixture=await p.evaluate(gate=>{const g=window.__GULOU__.game,solids=g.world.sports.solids.filter(s=>s.h>4&&s.d<.12&&s.w>5),s=solids.sort((a,b)=>Math.hypot(a.x-gate.x,a.z-gate.z)-Math.hypot(b.x-gate.x,b.z-gate.z))[0],nx=Math.sin(s.angle),nz=Math.cos(s.angle);g.player.teleport(s.x+nx*2,.12,s.z+nz*2);g.cameraRig.yaw=s.angle;return{s,nx,nz};},gate);
  await p.keyboard.down('KeyW');await p.waitForTimeout(1800);await p.keyboard.up('KeyW');const position=await p.evaluate(()=>window.__GULOU__.stats().position),distance=(position[0]-fixture.s.x)*fixture.nx+(position[2]-fixture.s.z)*fixture.nz;assert.ok(distance>.25&&distance<.7,`${gate.name} neighbouring fence blocks`);report.barriers.push({name:gate.name,distance});
 }
 // Walk through every court away from hoops and tennis nets; automatic planting
 // must not place trees in the new playable surface.
 const courts=await p.evaluate(()=>window.__GULOU__.game.world.sports.courts);
 for(const court of courts){
  const f=await p.evaluate(court=>{const g=window.__GULOU__.game,ps=court.points,x=ps.reduce((s,p)=>s+p[0],0)/4,z=ps.reduce((s,p)=>s+p[1],0)/4;g.player.travelTo(x-2.5,z-3);g.cameraRig.yaw=-Math.PI/2;return{x,z};},court);
  await p.keyboard.down('KeyW');await p.waitForFunction(f=>window.__GULOU__.stats().position[0]>f.x+2,{...f},{timeout:12000});await p.keyboard.up('KeyW');report.courts.push(court.name);
 }
 const stand=await p.evaluate(()=>window.__GULOU__.game.world.sports.stand);
 await p.evaluate(s=>{const g=window.__GULOU__.game;g.player.travelTo(s.x+s.width/2+1,s.z);g.cameraRig.yaw=Math.PI/2;},stand);
 await p.keyboard.down('KeyW');await p.waitForFunction(s=>window.__GULOU__.stats().position[0]<s.x+.6,stand,{timeout:15000});await p.keyboard.up('KeyW');report.podium=await p.evaluate(()=>window.__GULOU__.stats().position);assert.ok(report.podium[1]>.9&&report.podium[1]<1.25,'podium stairs lead beneath canopy');
 report.roof=await p.evaluate(s=>{const g=window.__GULOU__.game,hit=g.player.physics.castRay({origin:{x:s.x,y:12,z:s.z+3},dir:{x:0,y:-1,z:0}},12,true,undefined,undefined,g.player.collider,g.player.body);return hit?12-hit.timeOfImpact:null;},stand);assert.ok(report.roof>4.9&&report.roof<5.1);
 await screen('west-podium',-216,1.3,-4,Math.PI/2,0);
 await screen('sports-aerial',-190,115,115,0,.78);
 await screen('basketball',-251,1.5,-42,0,-.05);
 await screen('east-tennis',-134,1.5,76,0,-.08);
 await p.close();
 if(channel==='chrome'){
  const context=await browser.newContext({...devices['Pixel 7']});p=await context.newPage();await start(p);await p.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(-193,-2);});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.waitForTimeout(600);await p.screenshot({path:`${shots}/mobile-field.png`});report.mobile='Pixel 7 touch emulation loaded at sports ground';
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';await save();console.log({channel,passages:report.passages.length,barriers:report.barriers.length,courts:report.courts.length,podium:report.podium,roof:report.roof,errors:report.errors});
}catch(error){report.error=String(error);if(p&&!p.isClosed())report.failureState=await p.evaluate(()=>window.__GULOU__?.stats());await save();if(p&&!p.isClosed())await p.screenshot({path:`${shots}/${channel}-failure.png`});throw error;}
finally{await browser.close();}
