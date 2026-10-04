import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
const out='docs/validation/phase38',stage=process.env.HALLS_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
if(stage==='before'){try{await readFile(`${out}/before-chrome.json`);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],approaches:[],paths:[]};
const features=JSON.parse(await readFile('public/data/campus-layout.json','utf8')).features;
const hash=a=>createHash('sha256').update(a).digest('hex').match(/../g).join(':');
const ids=['plan-6','plan-13'];
report.footprints=features.map(f=>({id:f.id,hash:hash(JSON.stringify([f.points,f.holes]))}));
const fronts=ids.map((id,j)=>{const f=features.find(f=>f.id===id),i=j?5:2,[x,z]=f.points[i],[xx,zz]=f.points[(i+1)%f.points.length],len=Math.hypot(xx-x,zz-z);return{id,x:(x+xx)/2,z:(z+zz)/2,nx:-(zz-z)/len,nz:(xx-x)/len};});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(':'),fixed=[];
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)].join(':'));
  return JSON.parse(JSON.stringify({fixed,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings}));
 });
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  assert.deepEqual(report.footprints,before.footprints,'all campus polygons preserved');
  assert.deepEqual(report.geometry.buildings.filter(b=>!ids.includes(b.id)),before.geometry.buildings.filter(b=>!ids.includes(b.id)),'unrelated building records retained');
  const omit=new Set([...before.geometry.buildings,...report.geometry.buildings].filter(b=>ids.includes(b.id)).map(b=>b.name));
  assert.deepEqual(report.geometry.doors.filter(d=>!omit.has(d.name)),before.geometry.doors.filter(d=>!omit.has(d.name)),'unrelated doors retained');
  function meshHash(mesh){mesh.updateWorldMatrix(true,false);const p=mesh.geometry.getAttribute('position'),v=new Float32Array(p.count*3),q=new T.Vector3(),s=mesh.geometry.index,i=new Uint32Array(s?s.count:p.count);for(let j=0;j<p.count;j++){q.fromBufferAttribute(p,j).applyMatrix4(mesh.matrixWorld);v.set(q.toArray(),j*3);}for(let j=0;j<i.length;j++)i[j]=s?s.getX(j):j;return hash(v)+':'+hash(i);}
  const removed=[];
  for(const id of ids){
   const f=features.find(f=>f.id===id),old=before.geometry.buildings.find(b=>b.id===id),shape=new T.Shape(f.points.map(([x,z])=>new T.Vector2(x,-z)));
   removed.push(meshHash(new T.Mesh(new T.ExtrudeGeometry(shape,{depth:old.height,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2))));
   const d=before.geometry.doors.find(d=>d.name===old.name),dm=new T.Mesh(new T.BoxGeometry(d.width,2.7,.06));dm.position.set(d.x,d.y+1.4,d.z);dm.rotation.y=d.yaw;removed.push(meshHash(dm));
  }
  const unchanged=[...before.geometry.fixed];for(const h of removed){const i=unchanged.indexOf(h);assert.ok(i>=0,'old hall proxy found');unchanged.splice(i,1);}
  const added=[...report.geometry.fixed];for(const h of unchanged){const i=added.indexOf(h);assert.ok(i>=0,'all unrelated collision meshes retained');added.splice(i,1);}
  report.meshChanges={retained:unchanged.length,removed:removed.length,added:added.length};
  const step=frames=>page.evaluate(frames=>{const g=window.__GULOU__.game;for(let i=0;i<frames;i++)g.player.update(1/60,g.cameraRig.yaw,true);return g.player.position.toArray();},frames);
  for(const e of fronts){
   const building=report.geometry.buildings.find(b=>b.id===e.id),point=(u,v)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz],local=q=>({u:(q[0]-e.x)*e.nz-(q[2]-e.z)*e.nx,v:(q[0]-e.x)*e.nx+(q[2]-e.z)*e.nz,y:q[1]});
   assert.ok(building.source.includes('gl-3-03'));assert.equal(building.storeys,e.id==='plan-13'?3:1);
   async function setup(start,end,height=.12){const p=point(...start),q=point(...end);await page.evaluate(({p,q,height})=>{const g=window.__GULOU__.game;g.player.clearInput();g.player.teleport(p[0],height,p[1]);g.player.physics.step();g.cameraRig.yaw=Math.atan2(p[0]-q[0],p[1]-q[1]);g.mode='playing';},{p,q,height});await step(10);}
   async function move(frames){await page.keyboard.down('KeyW');const p=local(await step(frames));await page.keyboard.up('KeyW');return p;}
   const clearance=await page.evaluate(()=>{const p=window.__GULOU__.game.player;return p.collider.radius()+p.motor.offset();});
   for(const d of building.boxes.filter(b=>b.kind==='door')){await setup([d.u,6],[d.u,0]);const p=await move(270);report.approaches.push({id:e.id,u:d.u,...p});assert.ok(Math.abs(p.v-(d.v+d.d/2+clearance))<.07&&Math.abs(p.y-.45)<.12,'approach climbs stairs and stops at closed door: '+JSON.stringify(p));}
   for(const [name,a,b,height]of [['landing',[-3.7,1.5],[3.7,1.5],.48],['forecourt',[-8,5],[8,5],.12]])for(const[start,end]of[[a,b],[b,a]]){
    await setup(start,end,height);const p=await move(Math.ceil(Math.hypot(end[0]-start[0],end[1]-start[1])/1.65*60));report.paths.push({id:e.id,name,start,end,...p});assert.ok(Math.hypot(p.u-end[0],p.v-end[1])<.18,'transverse path open: '+JSON.stringify(p));
   }
  }
  const locations=[[-100,-80],[-77,-80],[-104,-106],[-119,-125]];
  report.roofRays=await page.evaluate(locations=>{const g=window.__GULOU__.game;return locations.map(([x,z])=>{const hit=g.player.physics.castRay({origin:{x,y:40,z},dir:{x:0,y:-1,z:0}},45,true,undefined,undefined,g.player.collider,g.player.body);return{x,z,y:hit?40-hit.timeOfImpact:null};});},locations);
  assert.ok(report.roofRays[0].y>12&&report.roofRays[0].y<14,'lower swimming roof');assert.ok(report.roofRays[1].y>15&&report.roofRays[1].y<18,'higher swimming roof');assert.ok(report.roofRays[2].y<1,'swimming L recess remains open');assert.ok(report.roofRays[3].y>7&&report.roofRays[3].y<8,'gym roof');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const e of fronts)for(const[name,eye,look,fov]of[['front',[0,6,34],[0,e.id==='plan-13'?6:3.7,0],64],['entrance',[-6,2.8,13],[0,3.1,0],60],['roof',[-24,32,34],[0,6,-14],68],...(e.id==='plan-13'?[['inscription',[27,6.2,14],[20.2,5.9,0],48]]:[])]){
  await page.evaluate(({e,eye,look,fov})=>{const g=window.__GULOU__.game,p=a=>[e.x+a[0]*e.nz+a[2]*e.nx,a[1],e.z-a[0]*e.nx+a[2]*e.nz];g.player.avatar.root.visible=false;g.camera.position.set(...p(eye));g.camera.lookAt(...p(look));g.camera.fov=fov;g.camera.updateProjectionMatrix();g.renderer.render(g.scene,g.camera);},{e,eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${e.id}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,meshes:report.meshChanges,failure:report.failure});
