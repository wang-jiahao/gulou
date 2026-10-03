import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const channel=process.env.BROWSER_CHANNEL||'chrome',out='docs/validation/phase21';await mkdir(out,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={channel,errors:[],missing:[],doors:[]};let page;
async function start(p){p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});await p.goto('http://localhost:4173/?debug=1');await p.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled);await p.click('#enter');await p.waitForFunction(()=>window.__GULOU__.stats().sectors===3);await p.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;});}
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});await start(page);
 report.mass=await page.evaluate(()=>window.__GULOU__.game.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.find(b=>b.id==='plan-66'));
 assert.equal(report.mass.parts.length,9);assert.equal(report.mass.labels[0].text,'图书馆');assert.equal(report.mass.labels[1].text,'南京大学校史博物馆');
 // Sample the actual Rapier world, not only the recorded model metadata.
 report.surfaces=await page.evaluate(()=>{const g=window.__GULOU__.game;return [['west',-46,260],['south',0,328],['historic',-1.5,269],['middle',-4,298],['courtyard',-27,303],['bridge',-27,291.5]].map(([name,x,z])=>{const hit=g.player.physics.castRay({origin:{x,y:30,z},dir:{x:0,y:-1,z:0}},31,true,undefined,undefined,g.player.collider,g.player.body);return{name,top:hit?30-hit.timeOfImpact:null};});});
 const top=name=>report.surfaces.find(s=>s.name===name).top;
 assert.ok(top('historic')>15&&top('historic')<17,'historical roof belongs to northern block');
 assert.ok(Math.abs(top('middle')-10.8)<.1,'middle block stays flat');assert.ok(top('courtyard')<.25,'western courtyard remains open');assert.ok(top('bridge')>5.7&&top('bridge')<6,'bridge roof stays below wings');
 for(const name of ['图书馆','校史博物馆','新教学楼']){
  const d=await page.evaluate(name=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name===name);g.player.travelTo(d.x+Math.sin(d.yaw)*4.2,d.z+Math.cos(d.yaw)*4.2);g.cameraRig.yaw=d.yaw;return d;},name);
  await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(2000);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
  const position=await page.evaluate(()=>window.__GULOU__.stats().position),clearance=(position[0]-d.x)*Math.sin(d.yaw)+(position[2]-d.z)*Math.cos(d.yaw);report.doors.push({name,position,clearance,entryY:d.y});
  assert.ok(clearance>.22&&clearance<1.25,`${name}: can reach but not enter closed door`);assert.ok(Math.abs(position[1]-d.y)<.2,`${name}: entry stairs support player`);
 }
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(-27,299);g.cameraRig.yaw=0;});await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__GULOU__.stats().position[2]<288,{}, {timeout:12000});await page.keyboard.up('KeyW');report.underBridge=await page.evaluate(()=>window.__GULOU__.stats().position);assert.ok(report.underBridge[2]<288,'walk underneath elevated connector');
 await page.evaluate(()=>window.__GULOU__.game.player.travelTo(-1.5,251));await page.waitForFunction(()=>document.querySelector('#location-name').textContent.includes('校史博物馆'));await page.keyboard.press('KeyI');assert.ok((await page.locator('#info').innerText()).includes('校史'));await page.close();
 if(channel==='chrome'){
  const context=await browser.newContext({...devices['Pixel 7']});page=await context.newPage();await start(page);await page.evaluate(()=>window.__GULOU__.game.player.travelTo(-1.5,251));await page.waitForFunction(()=>!document.querySelector('#place-about').hidden);await page.tap('#place-about');assert.ok((await page.locator('#info').innerText()).includes('校史'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.mobile='Pixel 7 touch emulation';
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);await writeFile(`${out}/${channel}.json`,JSON.stringify(report,null,2));console.log({channel,surfaces:report.surfaces,doors:report.doors,underBridge:report.underBridge,mobile:report.mobile,errors:report.errors});
}catch(error){report.error=String(error);await writeFile(`${out}/${channel}-partial.json`,JSON.stringify(report,null,2));if(page&&!page.isClosed())await page.screenshot({path:`${out}/${channel}-failure.png`});throw error;}
finally{await browser.close();}
