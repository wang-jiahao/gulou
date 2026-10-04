import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {publicStreets,streetPoint} from '../src/world/street-layout.ts';

const channel=process.env.BROWSER_CHANNEL||'chrome',out='docs/validation/phase26',shots='docs/screenshots/phase26';
await mkdir(out,{recursive:true});await mkdir(shots,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={channel,errors:[],missing:[],routes:[],barriers:[]};let p;
const save=()=>writeFile(`${out}/${channel}.json`,JSON.stringify(report,null,2));
const position=()=>p.evaluate(()=>{const q=window.__GULOU__.game.player.position;return{x:q.x,y:q.y,z:q.z};});
async function orient(dx,dz){
 await p.evaluate(({dx,dz})=>{const g=window.__GULOU__.game,yaw=Math.atan2(-dx,-dz);g.player.clearInput();g.cameraRig.yaw=yaw;g.player.rideYaw=yaw;g.player.rideViewYaw=yaw;g.player.rideSpeed=0;},{dx,dz});
}
async function place(x,z,dx,dz,ride){
 const mounted=await p.evaluate(({x,z,ride})=>{
  const g=window.__GULOU__.game;
  if(!ride&&g.player.riding)g.player.parkBicycle();
  if(ride&&!g.player.riding){const b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))return false;}
  g.player.teleport(x,.09,z);g.mode='playing';return true;
 },{x,z,ride});assert.ok(mounted);await orient(dx,dz);await p.waitForTimeout(100);
}
async function reach(x,z,dx,dz){
 const start=await position(),distance=Math.hypot(x-start.x,z-start.z),norm=Math.hypot(dx,dz);dx/=norm;dz/=norm;
 await p.keyboard.down('KeyW');
 try{await p.waitForFunction(({x,z,dx,dz})=>{const q=window.__GULOU__.game.player.position;return(q.x-x)*dx+(q.z-z)*dz>=0;},{x,z,dx,dz},{timeout:Math.ceil(8000+distance*1100)});}
 finally{await p.keyboard.up('KeyW');}
 if(await p.evaluate(()=>!!window.__GULOU__.game.player.riding)){await p.keyboard.down('Space');await p.waitForTimeout(250);await p.keyboard.up('Space');}
 const end=await position();assert.ok(Math.abs((end.x-x)*dz-(end.z-z)*dx)<.65,'route remains in its passage');assert.ok(end.y<.25,'route stays at ground level');return end;
}
async function route(name,a,b,ride,intermediate=[]){
 const points=[a,...intermediate,b],dx=points[1][0]-a[0],dz=points[1][1]-a[1];await place(...a,dx,dz,ride);
 const ends=[];
 // Reorient from the actual previous endpoint without teleporting across bends.
 for(const target of [...points.slice(1),...points.slice(0,-1).reverse()]){
  const q=await position(),dx=target[0]-q.x,dz=target[1]-q.z;await orient(dx,dz);ends.push(await reach(...target,dx,dz));
 }
 report.routes.push({name,ride,forward:ends[points.length-2],reverse:ends.at(-1),segments:ends.length});await save();console.log('route',name,ride?'ride':'walk');
}
function streetPath(road,a,b,v){
 const us=[a,...(road.profile??[]).map(p=>p[0]-road.x).filter(u=>u>a&&u<b),b];
 return us.map(u=>{const p=streetPoint(road,u,v);return[p.x,p.z];});
}
async function roadRoute(name,road,a,b,v,ride){const points=streetPath(road,a,b,v);await route(name,points[0],points.at(-1),ride,points.slice(1,-1));}
async function screenshots(){
 for(const[name,x,y,z,yaw,pitch]of[
  ['hankou-overhead',-92,82,415,0,.94],['hankou-front',-91,3,365,0,0],
  ['north-west',-124,2,354,0,0],['north-east',-53,2,355,0,0],
  ['south-west',-150,2,376,Math.PI,0],['south-east',-35,2,374,Math.PI,0]]){
  await p.evaluate(({x,y,z,yaw,pitch})=>{const g=window.__GULOU__.game;g.player.parkBicycle();g.player.teleport(x,y,z);g.cameraRig.firstPerson=true;g.cameraRig.yaw=yaw;g.cameraRig.pitch=pitch;g.mode='photo';document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;},{x,y,z,yaw,pitch});await p.waitForTimeout(400);await p.screenshot({path:`${shots}/${channel}-${name}.png`});
 }
}
try{
 p=await browser.newPage({viewport:{width:1280,height:900}});
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await p.goto('http://localhost:4173/?debug=1');await p.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{},{timeout:60000});await p.click('#enter');await p.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 await p.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(13);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 await screenshots();
 const barriers=[['north-west',-126.85,347.05,.38],['north-east',-55.75,348.35,.38],['south-west',-148,382.775,.14],['south-east',-32.8,380.77,.14]];
 // Keep railing probes between posts; independently verify the thicker stone posts.
 const rayTargets=[...barriers,['south-west-post',-150,382.825,.49],['south-east-post',-34.5,380.8125,.49]];
 report.rays=await p.evaluate(barriers=>{
  const g=window.__GULOU__.game;
  return barriers.flatMap(([name,x,z,width])=>[-1,1].map(side=>{const hit=g.player.physics.castRay({origin:{x,y:1.4,z:z+side*4},dir:{x:0,y:0,z:-side}},8,true,undefined,undefined,g.player.collider,g.player.body);return{name,side,width,distance:hit?.timeOfImpact??null};}));
 },rayTargets);
 for(const r of report.rays)assert.ok(r.distance!==null&&Math.abs(r.distance-(4-r.width/2))<.025,`${r.name}: ray hits the wall/railing from side ${r.side}`);await save();
 for(const ride of[false,true]){
  for(const[name,x,z]of[['hankou-centre',-91.0546,344.25],['hankou-west-reader',-98.6546,344.25],['hankou-east-reader',-83.4546,344.25],['south-centre',-88.39,383.62],['south-west-reader',-93.09,383.62],['south-east-reader',-83.69,383.62]])await route(name,[x,z-5],[x,z+5],ride);
  const [hankou,guangzhou]=publicStreets;
  for(const side of[-1,1]){
   const edge=side*(hankou.width/2+.1+hankou.sidewalk/2);
   await roadRoute(`hankou-west-sidewalk-${side}`,hankou,-76,-43,edge,ride);
   await roadRoute(`hankou-east-sidewalk-${side}`,hankou,40,67,edge,ride);
   // The entrance's stone bollards occupy the inner sidewalk strip. Follow
   // the clear strip one metre from the curb, leaving room for the bicycle.
   await roadRoute(`guangzhou-sidewalk-${side}`,guangzhou,-18,18,side*(guangzhou.width/2+1),ride);
  }
  await roadRoute('hankou-public-road',hankou,-20,20,0,ride);
  await roadRoute('guangzhou-public-road',guangzhou,-20,20,0,ride);
  for(const[name,x,z,width]of barriers)for(const side of[-1,1]){
   await place(x,z+side*3,0,-side,ride);await p.keyboard.down('KeyW');await p.waitForTimeout(4000);await p.keyboard.up('KeyW');
   const end=await position(),clearance=(end.z-z)*side;assert.ok(clearance>width/2+.20&&clearance<(ride?2:1.2),`${name}: blocks ${ride?'riding':'walking'} from side ${side}; clearance ${clearance}`);assert.ok(end.y<.25);report.barriers.push({name,ride,side,end,clearance});await save();
  }
 }
 await screenshots();assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';await save();console.log({channel,status:report.status,rays:report.rays.length,routes:report.routes.length,barriers:report.barriers.length});
}catch(error){report.error=String(error);if(p&&!p.isClosed()){report.failureState=await p.evaluate(()=>window.__GULOU__?.stats());await p.screenshot({path:`${shots}/${channel}-failure.png`});}await save();throw error;}
finally{await browser.close();}
