import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='docs/validation/phase29',stage=process.env.ENTRY_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],doors:[]};let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{},{timeout:60000});
 await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 report.geometry=await page.evaluate(async()=>{const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');const fixed=[];for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)].join(':'));return{fixed,doors:g.world.doors,building:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.find(b=>b.id==='plan-66')};});
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry;
  const remaining=[...report.geometry.fixed];for(const mesh of before.fixed){const i=remaining.indexOf(mesh);assert.ok(i>=0,'all prior collision meshes are preserved');remaining.splice(i,1);}assert.equal(remaining.length,2,'only two glazed entrance sidelights add collision');
  assert.deepEqual(report.geometry.doors,before.doors);assert.deepEqual(report.geometry.building.parts,before.building.parts);
  const letteringShape=labels=>labels.map(({x,z,...shape})=>shape);assert.deepEqual(letteringShape(report.geometry.building.labels),letteringShape(before.building.labels),'sign depths clear their facade trim; lettering shape, scale and height stay fixed');
  for(const [name,side]of [['图书馆',0],['图书馆',5.1],['图书馆',-5.1],['校史博物馆',0]]){
   const door=await page.evaluate(({name,side})=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name===name),nx=Math.sin(d.yaw),nz=Math.cos(d.yaw);g.player.travelTo(d.x+nx*4+nz*side,d.z+nz*4-nx*side);g.cameraRig.yaw=d.yaw;return d;},{name,side});
   await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(2200);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
   const p=await page.evaluate(()=>window.__GULOU__.stats().position),clearance=(p[0]-door.x)*Math.sin(door.yaw)+(p[2]-door.z)*Math.cos(door.yaw);report.doors.push({name,side,p,clearance});assert.ok(clearance>.22&&clearance<1.1,`${name}/${side}: can approach but cannot cross closed facade`);assert.ok(Math.abs(p[1]-door.y)<.2);
  }
  report.cycling=[];
  for(const side of[-5.1,5.1]){
   const door=await page.evaluate(side=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];if(!g.player.riding){g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('fixture must mount');}const d=g.world.doors.find(d=>d.name==='图书馆'),nx=Math.sin(d.yaw),nz=Math.cos(d.yaw);g.player.teleport(d.x+nx*4+nz*side,d.y+.08,d.z+nz*4-nx*side);g.cameraRig.yaw=d.yaw;g.player.rideYaw=d.yaw;g.player.rideViewYaw=d.yaw;g.player.rideSpeed=0;return d;},side);
   await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(3000);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
   const p=await page.evaluate(()=>window.__GULOU__.stats().position),clearance=(p[0]-door.x)*Math.sin(door.yaw)+(p[2]-door.z)*Math.cos(door.yaw);report.cycling.push({side,p,clearance});assert.ok(clearance>.22&&clearance<1.6,'new outer glazing blocks accelerated cycling');
  }
  await page.evaluate(()=>window.__GULOU__.game.player.parkBicycle());
  await page.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(-27,299);g.cameraRig.yaw=0;});await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__GULOU__.stats().position[2]<288,{},{timeout:12000});await page.keyboard.up('KeyW');report.underBridge=await page.evaluate(()=>window.__GULOU__.stats().position);
 }
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');g.cameraRig.firstPerson=true;g.mode='photo';document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;});
 for(const [name,doorName,distance,side,height,pitch]of [['library','图书馆',16,0,2,.03],['museum','校史博物馆',10,0,2,.05],['museum-eaves','校史博物馆',10,0,8.6,-.14],['library-canopy','图书馆',7,0,1.4,-.05],['overhead','图书馆',65,-15,85,.85]]){
  await page.evaluate(({doorName,distance,side,height,pitch})=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name===doorName),nx=Math.sin(d.yaw),nz=Math.cos(d.yaw);g.player.teleport(d.x+nx*distance+nz*side,height,d.z+nz*distance-nx*side);g.cameraRig.yaw=d.yaw+Math.atan2(side,distance);g.cameraRig.pitch=pitch;},{doorName,distance,side,height,pitch});
  await page.waitForTimeout(600);await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);if(page)await page.screenshot({path:`${out}/${stage}-${channel}-failure.png`});process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2));await browser.close();}
console.log({stage,channel,status:report.status,physics:report.geometry?.fixed.length,doors:report.doors,failure:report.failure});
