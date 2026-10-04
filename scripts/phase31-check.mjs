import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='docs/validation/phase31',stage=process.env.FORECOURT_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
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
  await page.evaluate(()=>{const b=window.__GULOU__.game.world.bicycles[1];window.forecourtBikeFixture={position:b.group.position.toArray(),angle:b.angle};});
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry;
  const remaining=[...report.geometry.fixed];for(const mesh of before.fixed){const i=remaining.indexOf(mesh);assert.ok(i>=0,'all prior collision meshes remain');remaining.splice(i,1);}assert.equal(remaining.length,6,'two lions and four hedge volumes add collision');
  for(const key of ['doors','parts','labels'])assert.deepEqual(report.geometry[key],before[key],key);
  for(const name of ['校史博物馆','图书馆']){
   const door=await page.evaluate(name=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name===name);g.player.travelTo(d.x+Math.sin(d.yaw)*4,d.z+Math.cos(d.yaw)*4);g.cameraRig.yaw=d.yaw;return d;},name);
   await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(2200);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
   const p=await page.evaluate(()=>window.__GULOU__.stats().position),clearance=(p[0]-door.x)*Math.sin(door.yaw)+(p[2]-door.z)*Math.cos(door.yaw);
   report.approaches.push({name,p,clearance});assert.ok(clearance>.22&&clearance<1.1,'stairs remain accessible and doors closed');assert.ok(Math.abs(p[1]-door.y)<.2);
  }
  const frame=await page.evaluate(()=>{const d=window.__GULOU__.game.world.doors.find(d=>d.name==='校史博物馆');return{x:d.x-Math.sin(d.yaw)*1.5,z:d.z-Math.cos(d.yaw)*1.5,yaw:d.yaw};});
  const point=(u,v)=>[frame.x+u*Math.cos(frame.yaw)+v*Math.sin(frame.yaw),frame.z-u*Math.sin(frame.yaw)+v*Math.cos(frame.yaw)];
  async function place(start,end,ride){
   const a=point(...start),c=point(...end),yaw=Math.atan2(a[0]-c[0],a[1]-c[1]);
   await page.evaluate(({a,yaw,ride})=>{const g=window.__GULOU__.game;if(ride&&!g.player.riding){const b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('mount fixture failed');}if(!ride&&g.player.riding)g.player.parkBicycle();g.player.teleport(a[0],.09,a[1]);g.cameraRig.yaw=yaw;if(ride){g.player.rideYaw=yaw;g.player.rideViewYaw=yaw;g.player.rideSpeed=0;}},{a,yaw,ride});
   return{a,c,yaw};
  }
  report.paths=[];report.blockers=[];
  // Sample every physics step, including substeps between rendered frames.
  await page.evaluate(()=>{const p=window.__GULOU__.game.player,step=p.physics.step.bind(p.physics);window.forecourtTrace=null;p.physics.step=(...args)=>{step(...args);if(window.forecourtTrace){const t=p.body.translation();window.forecourtTrace.push({x:t.x,y:t.y-.86,z:t.z,yaw:p.rideYaw});}};});
  function separation(sample,target,half,ride){
   const dx=sample.x-frame.x,dz=sample.z-frame.z,u=dx*Math.cos(frame.yaw)-dz*Math.sin(frame.yaw)-target[0],v=dx*Math.sin(frame.yaw)+dz*Math.cos(frame.yaw)-target[1];
   if(!ride)return Math.hypot(Math.max(0,Math.abs(u)-half[0]),Math.max(0,Math.abs(v)-half[1]))-.27;
   const a=sample.yaw-frame.yaw,c=Math.cos(a),s=Math.sin(a);
   // SAT separation of the actual .68 x 1.90m riding footprint and proxy.
   return Math.max(Math.abs(u)-half[0]-.34*Math.abs(c)-.95*Math.abs(s),Math.abs(v)-half[1]-.34*Math.abs(s)-.95*Math.abs(c),Math.abs(u*c-v*s)-.34-half[0]*Math.abs(c)-half[1]*Math.abs(s),Math.abs(u*s+v*c)-.95-half[0]*Math.abs(s)-half[1]*Math.abs(c));
  }
  for(const ride of[false,true]){
   for(const [name,start,end]of [['central-in',[0,18],[0,4]],['central-out',[0,4],[0,18]],['lateral-right',[-11,3.8],[11,3.8]],['lateral-left',[11,3.8],[-11,3.8]]]){
    const {a,c}=await place(start,end,ride),length=Math.hypot(c[0]-a[0],c[1]-a[1]);await page.keyboard.down('KeyW');
    try{await page.waitForFunction(({a,c,length})=>{const p=window.__GULOU__.stats().position;return((p[0]-a[0])*(c[0]-a[0])+(p[2]-a[1])*(c[1]-a[1]))/length>=length-.4;},{a,c,length},{timeout:16000});}finally{await page.keyboard.up('KeyW');}
    const p=await page.evaluate(()=>window.__GULOU__.stats().position);report.paths.push({name,ride,p});assert.ok(Math.abs(p[1])<.3,'central and lateral routes stay level');
   }
   for(const side of[-1,1])for(const [name,start,end,limit,half]of [
    ['lion',[side*5,1.96],[side*2.65,1.96],1.85,[.41,.425]],
    ['round-hedge',[side*3.4,8.5],[side*6.6,8.5],1.7,[1.6,1.35]],
    ['low-hedge',[side*7.4,16.5],[side*7.4,12.2],3.25,[2.4,1.2]],
    ['lion-front',[side*2.65,5.5],[side*2.65,1.96],null,[.41,.425]]]){
    const {a,c}=await place(start,end,ride),length=Math.hypot(c[0]-a[0],c[1]-a[1]);await page.evaluate(()=>{window.forecourtTrace=[];});
    await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(2300);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
    const trace=await page.evaluate(()=>{const result=window.forecourtTrace;window.forecourtTrace=null;return result;}),p=await page.evaluate(()=>window.__GULOU__.stats().position),travel=((p[0]-a[0])*(c[0]-a[0])+(p[2]-a[1])*(c[1]-a[1]))/length,minSeparation=Math.min(...trace.map(t=>separation(t,end,half,ride)));
    report.blockers.push({name,side,ride,p,travel,steps:trace.length,minSeparation});
    assert.ok(trace.length>60&&minSeparation>-.005,`${name} never penetrated at a physics step`);
    // The old axis-aligned steps can slide an angled bicycle around a narrow
    // lion. Test front safety above; the lateral approach isolates its blocker.
    if(limit!==null)assert.ok(travel>.25&&travel<limit,`${name} blocks ${ride?'cycling':'walking'} without trapping approach`);
   }
  }
  await page.evaluate(()=>{const g=window.__GULOU__.game,f=window.forecourtBikeFixture;if(g.player.riding){g.player.teleport(...f.position);g.player.rideYaw=f.angle;g.player.parkBicycle();}});
 }
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');g.cameraRig.firstPerson=true;g.mode='photo';document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;});
 for(const [name,distance,side,height,pitch]of [['front',18,0,2.4,-.08],['oblique',13,-10,3.5,.03],['entrance',4.5,0,1.4,.02],['lion',2.8,2.65,.15,.40],['garden',18,0,16,.90]]){
  await page.evaluate(({name,distance,side,height,pitch})=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name==='校史博物馆'),nx=Math.sin(d.yaw),nz=Math.cos(d.yaw);g.player.teleport(d.x+nx*distance+nz*side,height,d.z+nz*distance-nx*side);g.cameraRig.yaw=d.yaw+(name==='oblique'?Math.atan2(side,distance):0);g.cameraRig.pitch=pitch;},{name,distance,side,height,pitch});
  await page.waitForTimeout(600);await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);if(page)await page.screenshot({path:`${out}/${stage}-${channel}-failure.png`});process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2));await browser.close();}
console.log({stage,channel,status:report.status,physics:report.geometry?.fixed.length,paths:report.paths?.length,blockers:report.blockers?.length,failure:report.failure});
