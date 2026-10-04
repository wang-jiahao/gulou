import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
const out='docs/validation/phase32',stage=process.env.TEACHING_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[]};let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{},{timeout:60000});
 await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(':'),fixed=[];
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)].join(':'));
  const buildings=g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings;
  return JSON.parse(JSON.stringify({fixed,doors:g.world.doors,buildings}));
 });
 const building=report.geometry.buildings.find(b=>b.id==='teaching-priority');report.teaching=building;
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry,old=before.buildings.find(b=>b.id==='teaching-priority');
  assert.deepEqual(report.geometry.buildings.filter(b=>b.id!==old.id),before.buildings.filter(b=>b.id!==old.id),'unrelated buildings unchanged');
  assert.deepEqual(report.geometry.doors.filter(d=>d.name!==old.name),before.doors.filter(d=>d.name!==old.name),'unrelated doors unchanged');
  assert.equal(building.height,old.height);assert.equal(building.footprintArea,old.footprintArea);assert.deepEqual(building.frontage,old.frontage);
  const hash=a=>createHash('sha256').update(a).digest('hex').match(/../g).join(':');
  function meshHash(mesh){mesh.updateWorldMatrix(true,false);const p=mesh.geometry.getAttribute('position'),v=new Float32Array(p.count*3),q=new T.Vector3(),s=mesh.geometry.index,i=new Uint32Array(s?s.count:p.count);for(let j=0;j<p.count;j++){q.fromBufferAttribute(p,j).applyMatrix4(mesh.matrixWorld);v.set(q.toArray(),j*3);}for(let j=0;j<i.length;j++)i[j]=s?s.getX(j):j;return hash(v)+':'+hash(i);}
  const [x,z,nx,nz]=old.frontage,yaw=Math.atan2(nx,nz),point=(u,v)=>[x+u*nz+v*nx,z-u*nx+v*nz];
  const section=old.sections[1],shape=new T.Shape(section.points.map(([x,z])=>new T.Vector2(x,-z)));
  const removed=[meshHash(new T.Mesh(new T.ExtrudeGeometry(shape,{depth:section.height,bevelEnabled:false}).rotateX(-Math.PI/2)))];
  function oldBox(w,h,d,v,y){const m=new T.Mesh(new T.BoxGeometry(w,h,d)),p=point(0,v);m.position.set(p[0],y,p[1]);m.rotation.y=yaw;return meshHash(m);}
  removed.push(oldBox(8.4,2.7,.06,1.5,2.6));for(let i=0;i<8;i++){const h=(i+1)*.15;removed.push(oldBox(9.4,h,.34,1.72+(7-i)*.31,h/2));}
  const unchanged=[...before.fixed];for(const h of removed){const i=unchanged.indexOf(h);assert.ok(i>=0,'expected old teaching mesh exists');unchanged.splice(i,1);}
  const added=[...report.geometry.fixed];for(const h of unchanged){const i=added.indexOf(h);assert.ok(i>=0,'every unrelated collision and both wings retained');added.splice(i,1);}assert.equal(added.length,22);report.meshChanges={retained:unchanged.length,removed:removed.length,added:added.length};
  await page.evaluate(()=>{const p=window.__GULOU__.game.player,b=window.__GULOU__.game.world.bicycles[1];window.teachingBike={position:b.group.position.toArray(),angle:b.angle};const step=p.physics.step.bind(p.physics);window.teachingTrace=null;p.physics.step=(...args)=>{step(...args);if(window.teachingTrace){const q=p.body.translation();window.teachingTrace.push({x:q.x,y:q.y-.86,z:q.z,yaw:p.rideYaw});}};});
  async function place(start,end,ride=false,height=.09){const a=point(...start),c=point(...end),heading=Math.atan2(a[0]-c[0],a[1]-c[1]);await page.evaluate(({a,heading,ride,height})=>{const g=window.__GULOU__.game,p=g.player;if(ride&&!p.riding){const b=g.world.bicycles[1];p.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!p.mount(b))throw Error('mount fixture failed');}if(!ride&&p.riding)p.parkBicycle();p.teleport(a[0],height,a[1]);g.cameraRig.yaw=heading;if(ride){p.rideYaw=heading;p.rideViewYaw=heading;p.rideSpeed=0;}},{a,heading,ride,height});return{a,c,length:Math.hypot(c[0]-a[0],c[1]-a[1])};}
  const local=p=>[(p[0]-x)*nz-(p[2]-z)*nx,(p[0]-x)*nx+(p[2]-z)*nz];
  report.approaches=[];report.paths=[];report.blockers=[];
  for(const u of[-4.3,0,4.3]){
   await place([u,9],[u,.5]);await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(3000);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
   const p=await page.evaluate(()=>window.__GULOU__.stats().position),uv=local(p);report.approaches.push({u,p,uv});assert.ok(Math.abs(p[1]-1.2)<.15&&uv[1]>.76&&uv[1]<1.3,'all three bays climb stairs and stop at closed doors');
  }
  for(const ride of[false,true])for(const [name,start,end,height]of [
   ['road-right',[-13,11],[13,11],.09],['road-left', [13,11],[-13,11],.09],
   ...(!ride?[['portico-right',[-5.5,1.6],[5.5,1.6],1.21],['portico-left',[5.5,1.6],[-5.5,1.6],1.21]]:[]),
  ]){
   const {a,c,length}=await place(start,end,ride,height);await page.keyboard.down('KeyW');try{await page.waitForFunction(({a,c,length})=>{const p=window.__GULOU__.stats().position;return((p[0]-a[0])*(c[0]-a[0])+(p[2]-a[1])*(c[1]-a[1]))/length>length-.35;},{a,c,length},{timeout:16000});}finally{await page.keyboard.up('KeyW');}
   const p=await page.evaluate(()=>window.__GULOU__.stats().position);report.paths.push({name,ride,p});assert.ok(Math.abs(p[1]-height)<.20,'route stays at expected elevation');
  }
  function separation(t,center,half,ride){const uv=local([t.x,t.y,t.z]),u=uv[0]-center[0],v=uv[1]-center[1];if(!ride)return Math.hypot(Math.max(0,Math.abs(u)-half[0]),Math.max(0,Math.abs(v)-half[1]))-.27;const a=t.yaw-yaw,c=Math.cos(a),s=Math.sin(a);return Math.max(Math.abs(u)-half[0]-.34*Math.abs(c)-.95*Math.abs(s),Math.abs(v)-half[1]-.34*Math.abs(s)-.95*Math.abs(c),Math.abs(u*c-v*s)-.34-half[0]*Math.abs(c)-half[1]*Math.abs(s),Math.abs(u*s+v*c)-.95-half[0]*Math.abs(s)-half[1]*Math.abs(c));}
  for(const ride of[false,true])for(const side of[-1,1])for(const kind of['column','cheek']){
   const column=kind==='column',center=column?[side*2.15,3.02]:[side*7.4,5.6],half=column?[.475,.485]:[.325,1.735];
   const start=column?[0,3.02]:[side*10,5.6];await place(start,center,ride,column?1.21:.09);await page.evaluate(()=>{window.teachingTrace=[];});
   await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(2000);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
   const trace=await page.evaluate(()=>{const t=window.teachingTrace;window.teachingTrace=null;return t;});
   const minSeparation=Math.min(...trace.filter(t=>column||t.y<1.70-(local([t.x,t.y,t.z])[1]-3.91)/3.47).map(t=>separation(t,column?center:[side*7.4,(3.91+7.38)/2],half,ride)));
   report.blockers.push({kind,side,ride,steps:trace.length,minSeparation});assert.ok(trace.length>50&&minSeparation>-.008,'column or cheek never penetrated at a physics step');
  }
  await page.evaluate(()=>{const g=window.__GULOU__.game,f=window.teachingBike;if(g.player.riding){g.player.teleport(...f.position);g.player.rideYaw=f.angle;g.player.parkBicycle();}});
 }
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');g.cameraRig.firstPerson=true;g.mode='photo';});
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const [name,eye,look,fov]of [
  ['front',[0,6.5,30],[0,10,0],54],['oblique',[-13,3.5,15],[0,10,1],67],
  ['entrance',[0,3.1,13],[0,3.8,0],64],['crown',[0,17,20],[0,17.3,0],51],
  ['context',[-31,19,34],[0,9,0],58],
 ]){
  await page.evaluate(({eye,look,fov,front})=>{
   const g=window.__GULOU__.game,[x,z,nx,nz]=front,point=a=>[x+a[0]*nz+a[2]*nx,a[1],z-a[0]*nx+a[2]*nz],p=point(eye),q=point(look);
   g.player.teleport(p[0],p[1],p[2]);g.photoFov=fov;
   g.cameraRig.update=()=>{g.camera.position.set(...p);g.camera.lookAt(...q);g.camera.fov=fov;g.camera.updateProjectionMatrix();};
  },{eye,look,fov,front:building.frontage});
  await page.waitForTimeout(800);await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);if(page)await page.screenshot({path:`${out}/${stage}-${channel}-failure.png`});process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,physics:report.geometry?.fixed.length,front:report.teaching?.frontage,failure:report.failure});
