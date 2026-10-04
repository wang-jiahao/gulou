import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const channel=process.env.BROWSER_CHANNEL||'chrome',out='docs/validation/phase25',shots='docs/screenshots/phase25';
await mkdir(out,{recursive:true});await mkdir(shots,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={channel,errors:[],missing:[],routes:[],barriers:[]};let p;
const save=()=>writeFile(`${out}/${channel}.json`,JSON.stringify(report,null,2));
async function position(){return p.evaluate(()=>window.feiPosition());}
async function place(u,v,yaw,ride=false){
 const mounted=await p.evaluate(({u,v,yaw,ride})=>{
  const g=window.__GULOU__.game,{origin,angle:a}=window.feiFrame;
  if(ride&&!g.player.riding){const b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))return false;}
  g.player.teleport(origin[0]+u*Math.cos(a)-v*Math.sin(a),.09,origin[1]+u*Math.sin(a)+v*Math.cos(a));
  g.player.clearInput();g.cameraRig.yaw=yaw-a;g.player.rideYaw=yaw-a;g.player.rideViewYaw=yaw-a;g.player.rideSpeed=0;g.mode='playing';return true;
 },{u,v,yaw,ride});assert.ok(mounted,'bicycle fixture mounts successfully');await p.waitForTimeout(100);
}
async function reach(target,greater){
 const start=await position();
 const timeout=Math.ceil(6000+Math.abs(target-start.u)/1.65*1600);
 await p.keyboard.down('KeyW');
 try{await p.waitForFunction(({target,greater})=>{const q=window.feiPosition();return greater?q.u>target:q.u<target;},{target,greater},{timeout});}
 finally{await p.keyboard.up('KeyW');}
 // Space is a walking jump, so only use it to stop a mounted bicycle.
 if(await p.evaluate(()=>!!window.__GULOU__.game.player.riding)){
  await p.keyboard.down('Space');await p.waitForTimeout(300);await p.keyboard.up('Space');
 }else await p.waitForTimeout(100);
 return position();
}
async function block(name,u,v,ride,maxU,minU){
 await place(u,v,-Math.PI/2,ride);await p.keyboard.down('KeyW');await p.waitForTimeout(5000);await p.keyboard.up('KeyW');
 const q=await position();assert.ok(q.u>minU&&q.u<maxU,`${name} stops ${ride?'cycling':'walking'} at its actual surface: ${q.u}`);report.barriers.push({name,ride,...q});await save();
}
try{
 p=await browser.newPage({viewport:{width:1280,height:900}});
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await p.goto('http://localhost:4173/?debug=1');await p.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{},{timeout:60000});await p.click('#enter');await p.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 report.geometry=await p.evaluate(()=>{
  const g=window.__GULOU__.game,r=g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.find(b=>b.id==='plan-4');window.feiFrame=r.localFrame;
  window.feiPosition=()=>{const p=g.player.position,{origin,angle:a}=r.localFrame,x=p.x-origin[0],z=p.z-origin[1];return{u:x*Math.cos(a)+z*Math.sin(a),v:-x*Math.sin(a)+z*Math.cos(a),y:p.y};};
  g.setTime(13);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');
  const ray=(u,v,y,dirY,max)=>{const{origin,angle:a}=r.localFrame,x=origin[0]+u*Math.cos(a)-v*Math.sin(a),z=origin[1]+u*Math.sin(a)+v*Math.cos(a),hit=g.player.physics.castRay({origin:{x,y,z},dir:{x:0,y:dirY,z:0}},max,true,undefined,undefined,g.player.collider,g.player.body);return hit?y+dirY*hit.timeOfImpact:null;};
  return {top:[['tower-west',10,10],['tower-east',35,33],['north-slot',22,3],['south-slot',22,34],['low-wing',55,15],['east-link',63,44],['south-wing',35,61],['court',35,45],['canopy',12,44]].map(([name,u,v])=>({name,y:ray(u,v,90,-1,91)})),recessCeiling:ray(2,27,1,1,12)};
 });
 const expected={'tower-west':68.4,'tower-east':68.4,'north-slot':0,'south-slot':0,'low-wing':19,'east-link':19,'south-wing':19,court:0,canopy:4.63};
 for(const s of report.geometry.top)assert.ok(s.y!==null&&Math.abs(s.y-expected[s.name])<.12,`${s.name}: actual physics surface ${s.y}`);
 assert.ok(Math.abs(report.geometry.recessCeiling-7.2)<.02,'column recess has an overhead slab');await save();
 for(const ride of[false,true]){
  for(const [name,v,end] of[['column-recess',27,4],['under-court-canopy',45,32]]){
   await place(-8,v,-Math.PI/2,ride);const entered=await reach(end,true);assert.ok(entered.y<.18,`${name}: remains on ground`);
   // Turn and leave without teleporting, so both directions exercise the same gap.
   await p.evaluate(()=>{const g=window.__GULOU__.game,yaw=Math.PI/2-window.feiFrame.angle;g.cameraRig.yaw=yaw;g.player.rideYaw=yaw;g.player.rideViewYaw=yaw;g.player.rideSpeed=0;});
   const exited=await reach(-7,false);assert.ok(exited.y<.18);report.routes.push({name,ride,entered,exited});await save();
  }
  await block('recess back wall',2,27,ride,6.2,ride?4.8:5.7);
  await block('recess column',-6,24,ride,-1.4,ride?-2.6:-1.95);
  await p.evaluate(({ride})=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name==='费彝民楼群');g.player.teleport(d.x+Math.sin(d.yaw)*8,.09,d.z+Math.cos(d.yaw)*8);g.cameraRig.yaw=d.yaw;g.player.rideYaw=d.yaw;g.player.rideViewYaw=d.yaw;g.player.rideSpeed=0;g.mode='playing';}, {ride});
  await p.keyboard.down('KeyW');await p.waitForTimeout(6200);await p.keyboard.up('KeyW');
  const door=await p.evaluate(()=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name==='费彝民楼群'),p=g.player.position;return{clearance:(p.x-d.x)*Math.sin(d.yaw)+(p.z-d.z)*Math.cos(d.yaw),y:p.y};});
  assert.ok(door.clearance>.22&&door.clearance<(ride?1.6:1.25),'closed door remains reachable and stops entry');assert.ok(door.y<.18);report.barriers.push({name:'closed entrance',ride,...door});await save();
 }
 for(const[name,u,y,v,yaw,pitch]of[['south',22,32,145,0,0],['west',-100,35,37,-Math.PI/2,0],['recess',-15,1,32,-Math.PI/2,-.08],['court',-8,2,45,-Math.PI/2,-.08],['lettering',-10,13,58,-Math.PI/2,-.08],['overhead',28,177,37,0,1.56]]){
  await p.evaluate(({u,y,v,yaw,pitch})=>{const g=window.__GULOU__.game,{origin,angle:a}=window.feiFrame;g.player.parkBicycle();g.player.teleport(origin[0]+u*Math.cos(a)-v*Math.sin(a),y,origin[1]+u*Math.sin(a)+v*Math.cos(a));g.cameraRig.firstPerson=true;g.cameraRig.yaw=yaw-a;g.cameraRig.pitch=pitch;g.mode='photo';document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;},{u,y,v,yaw,pitch});await p.waitForTimeout(500);await p.screenshot({path:`${shots}/${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';await save();console.log({channel,status:report.status,surfaces:report.geometry.top.length,routes:report.routes.length,barriers:report.barriers.length});
}catch(error){report.error=String(error);if(p&&!p.isClosed()){report.failureState=await p.evaluate(()=>window.__GULOU__?.stats());await p.screenshot({path:`${shots}/${channel}-failure.png`});}await save();throw error;}
finally{await browser.close();}
