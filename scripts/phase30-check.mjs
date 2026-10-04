import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='docs/validation/phase30',stage=process.env.FACADE_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],approaches:[]};let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{},{timeout:60000});
 await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(''),fixed=[];
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)].join(':'));
  const building=g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.find(b=>b.id==='plan-66');
  return{fixed,doors:g.world.doors,parts:building.parts,labels:building.labels};
 });
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry;
  assert.deepEqual(report.geometry,before,'decorative facade must preserve all collision vertices, indices, entrances, masses and lettering');
  for(const name of ['校史博物馆','图书馆']){
   const door=await page.evaluate(name=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name===name);g.player.travelTo(d.x+Math.sin(d.yaw)*4,d.z+Math.cos(d.yaw)*4);g.cameraRig.yaw=d.yaw;return d;},name);
   await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(2200);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
   const p=await page.evaluate(()=>window.__GULOU__.stats().position),clearance=(p[0]-door.x)*Math.sin(door.yaw)+(p[2]-door.z)*Math.cos(door.yaw);
   report.approaches.push({name,p,clearance});assert.ok(clearance>.22&&clearance<1.1,'stairs remain accessible and doors closed');assert.ok(Math.abs(p[1]-door.y)<.2);
  }
 }
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');g.cameraRig.firstPerson=true;g.mode='photo';document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;});
 for(const [name,distance,side,height,pitch]of [['front',18,0,2.4,-.08],['oblique',16,12,3.5,-.04],['lower',7,5.22,1.7,.03],['upper',5.5,0,5.2,.02]]){
  await page.evaluate(({distance,side,height,pitch})=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name==='校史博物馆'),nx=Math.sin(d.yaw),nz=Math.cos(d.yaw);g.player.teleport(d.x+nx*distance+nz*side,height,d.z+nz*distance-nx*side);g.cameraRig.yaw=d.yaw+(side===12?Math.atan2(side,distance):0);g.cameraRig.pitch=pitch;},{distance,side,height,pitch});
  await page.waitForTimeout(600);await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);if(page)await page.screenshot({path:`${out}/${stage}-${channel}-failure.png`});process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2));await browser.close();}
console.log({stage,channel,status:report.status,physics:report.geometry?.fixed.length,approaches:report.approaches,failure:report.failure});
