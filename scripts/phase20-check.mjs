import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const channel=process.env.BROWSER_CHANNEL||'chrome';
const out='docs/validation/phase20',shots='docs/screenshots/phase20';
await mkdir(out,{recursive:true});await mkdir(shots,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const report={channel,errors:[],missing:[],stairs:[],doors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
const state=()=>page.evaluate(()=>window.__GULOU__.stats());
async function hold(key,ms){await page.keyboard.down(key);await page.keyboard.down('ShiftLeft');await page.waitForTimeout(ms);await page.keyboard.up(key);await page.keyboard.up('ShiftLeft');return state();}
try{
 await page.goto('http://localhost:4173/?debug=1');
 await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled);
 await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.player.travelTo(35,89);g.cameraRig.yaw=0;});
 report.stairs.push((await hold('KeyW',4000)).position);
 assert.ok(report.stairs[0][1]>2.85&&report.stairs[0][2]<78,'east stair reaches raised terrace');
 report.stairs.push((await hold('KeyS',4300)).position);
 assert.ok(report.stairs[1][1]<.2&&report.stairs[1][2]>85.4,'east stair descends to lower teaching approach');
 // A closed entry must be reachable on foot, including all entrance risers.
 for(const name of ['新教学楼','南教学楼']){
  const d=await page.evaluate(name=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name===name);g.player.travelTo(d.x+Math.sin(d.yaw)*4.2,d.z+Math.cos(d.yaw)*4.2);g.cameraRig.yaw=d.yaw;return d;},name);
  const s=await hold('KeyW',1900),clearance=(s.position[0]-d.x)*Math.sin(d.yaw)+(s.position[2]-d.z)*Math.cos(d.yaw);
  report.doors.push({name,clearance,position:s.position,entryY:d.y});
  assert.ok(clearance>.22&&clearance<1.25,`${name}: reach closed entrance`);
  assert.ok(Math.abs(s.position[1]-d.y)<.25,`${name}: stand on entry platform`);
  assert.ok(Math.sin(d.yaw)<-.9,`${name}: entrance on western end`);
 }
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(0,89);g.cameraRig.yaw=0;});
 report.northGarden=(await hold('KeyW',2400)).position;
 assert.ok(report.northGarden[1]>1.24&&report.northGarden[1]<1.55,'north garden remains on its separate terrace');
 report.eastFoundation=await page.evaluate(()=>{const g=window.__GULOU__.game;return [42,50,59].map(x=>({x,hit:g.player.physics.castRay({origin:{x,y:5,z:48},dir:{x:0,y:-1,z:0}},7,true,undefined,undefined,g.player.collider,g.player.body)?.timeOfImpact}));});
 assert.ok(report.eastFoundation.every(p=>p.hit!==undefined),'raised east building has physical support');
 for(const [name,x,y,z,pitch,yaw]of [['east-stairs',36,.05,96,-.15,0],['east-overlook',35,3,70,.15,Math.PI],['new-teaching-front',28,.06,99,-.20,-Math.PI/2],['south-teaching-west',-48,.05,353,-.12,-Math.PI/2]]){
  await page.evaluate(([x,y,z,pitch,yaw])=>{const g=window.__GULOU__.game;g.player.teleport(x,y,z);g.cameraRig.firstPerson=true;g.cameraRig.pitch=pitch;g.cameraRig.yaw=yaw;g.mode='photo';document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;},[x,y,z,pitch,yaw]);
  await page.waitForTimeout(500);await page.screenshot({path:`${shots}/${name}-${channel}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);
 await writeFile(`${out}/${channel}.json`,JSON.stringify(report,null,2));console.log({channel,stairs:report.stairs,doors:report.doors,errors:report.errors});
}catch(error){report.error=String(error);await writeFile(`${out}/${channel}-partial.json`,JSON.stringify(report,null,2));await page.screenshot({path:`${out}/${channel}-failure.png`});throw error;}
finally{await browser.close();}
