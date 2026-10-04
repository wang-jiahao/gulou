import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {publicStreets,streetPoint} from '../src/world/street-layout.ts';

const channel=process.env.BROWSER_CHANNEL||'chrome',out='docs/validation/phase26';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={channel,errors:[],missing:[],crossings:[]};let page;
try{
 page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{},{timeout:60000});await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 for(const ride of[false,true])for(const road of publicStreets)for(const direction of[-1,1]){
  const start=streetPoint(road,0,-road.width/2-1.3),end=streetPoint(road,0,road.width/2+3.2),carPoint=streetPoint(road,-12*direction,direction*road.width*.25),id=`${road.name}-${direction}`;
  await page.evaluate(({ride,start,end,carPoint,id,direction})=>{
   const g=window.__GULOU__.game;g.mode='paused';g.player.clearInput();
   if(!ride&&g.player.riding)g.player.parkBicycle();
   if(ride&&!g.player.riding){const b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('bicycle mount failed');}
   g.player.teleport(start.x,.09,start.z);const yaw=Math.atan2(start.x-end.x,start.z-end.z);g.cameraRig.yaw=yaw;g.player.rideYaw=yaw;g.player.rideViewYaw=yaw;g.player.rideSpeed=0;
   const c=g.traffic.cars.find(c=>c.id===id),pos={x:carPoint.x,y:.86,z:carPoint.z},a=carPoint.angle+(direction<0?Math.PI:0),q={x:0,y:Math.sin(a/2),z:0,w:Math.cos(a/2)};
   c.u=-12*direction;c.speed=4.5;c.body.setTranslation(pos,true);c.body.setNextKinematicTranslation(pos);c.body.setRotation(q,true);c.body.setNextKinematicRotation(q);g.mode='playing';
  },{ride,start,end,carPoint,id,direction});
  await page.waitForFunction(id=>{const c=window.__GULOU__.stats().traffic.find(c=>c.id===id);return c.waiting&&c.speed<.01;},id,{timeout:6000});
  const stopped=await page.evaluate(id=>window.__GULOU__.stats().traffic.find(c=>c.id===id),id);
  await page.keyboard.down('KeyW');
  try{await page.waitForFunction(({end,start})=>{const q=window.__GULOU__.game.player.position;return(q.x-end.x)*(end.x-start.x)+(q.z-end.z)*(end.z-start.z)>=0;},{end,start},{timeout:25000});}
  finally{await page.keyboard.up('KeyW');}
  if(ride){await page.keyboard.down('Space');await page.waitForTimeout(250);await page.keyboard.up('Space');}
  const position=await page.evaluate(()=>window.__GULOU__.stats().position);assert.ok(position[1]<.3,'crossing stays at road height');
  const dx=end.x-start.x,dz=end.z-start.z;assert.ok(Math.abs((position[0]-end.x)*dz-(position[2]-end.z)*dx)/Math.hypot(dx,dz)<.8,'crossing remains straight through the road');
  await page.waitForFunction(id=>{const c=window.__GULOU__.stats().traffic.find(c=>c.id===id);return!c.waiting&&c.speed>3;},id,{timeout:6000});
  report.crossings.push({id,ride,stopped,position,resumed:await page.evaluate(id=>window.__GULOU__.stats().traffic.find(c=>c.id===id),id)});
 }
 await page.evaluate(()=>window.__GULOU__.game.mode='paused');await page.waitForTimeout(100);
 const before=await page.evaluate(()=>window.__GULOU__.stats().traffic);await page.waitForTimeout(500);const after=await page.evaluate(()=>window.__GULOU__.stats().traffic);assert.deepEqual(after.map(c=>c.position),before.map(c=>c.position));
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.pause='passed';report.status='passed';console.log({channel,status:report.status,crossings:report.crossings.length,pause:report.pause});
}catch(error){report.error=String(error);if(page&&!page.isClosed())await page.screenshot({path:`${out}/${channel}-crossing-failure.png`});throw error;}
finally{await writeFile(`${out}/${channel}-crossings.json`,JSON.stringify(report,null,2));await browser.close();}
