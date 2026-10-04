import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from 'three';
const out='docs/validation/phase36',stage=process.env.PHYSICS_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
// Do not open a browser or overwrite the only baseline on an accidental repeat.
if(stage==='before'){try{await readFile(`${out}/before-chrome.json`);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],approaches:[],paths:[],columns:[]};let page;
const layout=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
const features=layout.features;
const hash=a=>createHash('sha256').update(a).digest('hex').match(/../g).join(':');
report.footprints=features.map(f=>({id:f.id,hash:hash(JSON.stringify([f.points,f.holes]))}));
const f=features.find(f=>f.id==='plan-70'),a=f.points[14],c=f.points[15],len=Math.hypot(c[0]-a[0],c[1]-a[1]);
const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,nx=-(c[1]-a[1])/len,nz=(c[0]-a[0])/len,yaw=Math.atan2(nx,nz);
const point=(u,v)=>[x+u*nz+v*nx,z-u*nx+v*nz];
const local=q=>({u:(q[0]-x)*nz-(q[2]-z)*nx,v:(q[0]-x)*nx+(q[2]-z)*nz,y:q[1]});
try{
 page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(':'),fixed=[];
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)].join(':'));
  return JSON.parse(JSON.stringify({fixed,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings}));
 });
 const building=report.geometry.buildings.find(b=>b.id==='plan-70');report.physics=building;
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')),old=before.geometry.buildings.find(b=>b.id==='plan-70');
  assert.deepEqual(report.footprints,before.footprints,'all campus polygons preserved');
  const unrelated=b=>!['plan-69','plan-70'].includes(b.id);
  assert.deepEqual(report.geometry.buildings.filter(unrelated),before.geometry.buildings.filter(unrelated),'unrelated building records retained');
  const omit=new Set([...before.geometry.buildings,...report.geometry.buildings].filter(b=>!unrelated(b)).map(b=>b.name));
  assert.deepEqual(report.geometry.doors.filter(d=>!omit.has(d.name)),before.geometry.doors.filter(d=>!omit.has(d.name)),'unrelated door colliders/records retained');
  function meshHash(mesh){mesh.updateWorldMatrix(true,false);const p=mesh.geometry.getAttribute('position'),v=new Float32Array(p.count*3),q=new T.Vector3(),s=mesh.geometry.index,i=new Uint32Array(s?s.count:p.count);for(let j=0;j<p.count;j++){q.fromBufferAttribute(p,j).applyMatrix4(mesh.matrixWorld);v.set(q.toArray(),j*3);}for(let j=0;j<i.length;j++)i[j]=s?s.getX(j):j;return hash(v)+':'+hash(i);}
  const shape=new T.Shape(f.points.map(([x,z])=>new T.Vector2(x,-z)));for(const ring of f.holes??[])shape.holes.push(new T.Path(ring.map(([x,z])=>new T.Vector2(x,-z))));
  const removed=[meshHash(new T.Mesh(new T.ExtrudeGeometry(shape,{depth:old.height,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2)))];
  const oldDoor=before.geometry.doors.find(d=>d.name===old.name),dm=new T.Mesh(new T.BoxGeometry(oldDoor.width,2.7,.06));dm.position.set(oldDoor.x,oldDoor.y+1.4,oldDoor.z);dm.rotation.y=oldDoor.yaw;removed.push(meshHash(dm));
  const unchanged=[...before.geometry.fixed];for(const h of removed){const i=unchanged.indexOf(h);assert.ok(i>=0,'old physics proxy found');unchanged.splice(i,1);}
  const added=[...report.geometry.fixed];for(const h of unchanged){const i=added.indexOf(h);assert.ok(i>=0,'all unrelated collision meshes retained');added.splice(i,1);}
  assert.equal(added.length,13);report.meshChanges={retained:unchanged.length,removed:removed.length,added:added.length};
  assert.equal(building.name,'物理楼');assert.equal(building.columns.length,4);assert.equal(building.lettering.text,'物理楼');
  const step=frames=>page.evaluate(frames=>{const g=window.__GULOU__.game;for(let i=0;i<frames;i++)g.player.update(1/60,g.cameraRig.yaw,true);return g.player.position.toArray();},frames);
  async function setup(start,end,height=.12){const p=point(...start),q=point(...end);await page.evaluate(({p,q,height})=>{const g=window.__GULOU__.game;g.player.clearInput();g.player.teleport(p[0],height,p[1]);g.player.physics.step();g.cameraRig.yaw=Math.atan2(p[0]-q[0],p[1]-q[1]);g.mode='playing';},{p,q,height});await step(10);}
  async function move(frames){await page.keyboard.down('KeyW');const p=local(await step(frames));await page.keyboard.up('KeyW');return p;}
  const clearance=await page.evaluate(()=>{const p=window.__GULOU__.game.player;return p.collider.radius()+p.motor.offset();});
  const door=building.boxes.find(b=>b.kind==='door'),doorStop=door.v+door.d/2+clearance;
  for(const u of[-3.6,0,3.6]){await setup([u,7],[u,0]);const p=await move(280);report.approaches.push({u,...p});assert.ok(Math.abs(p.v-doorStop)<.055&&Math.abs(p.y-.48)<.12,'three bays climb shallow stairs and stop at closed doors: '+JSON.stringify(p));}
  for(const [name,a,b,height]of [['portico',[-4.7,2.15],[4.7,2.15],.5],['approach',[-7,6],[7,6],.12]])for(const [start,end]of[[a,b],[b,a]]){
   await setup(start,end,height);const frames=Math.ceil(Math.hypot(end[0]-start[0],end[1]-start[1])/1.65*60),p=await move(frames);
   report.paths.push({name,start,end,...p});assert.ok(Math.hypot(p.u-end[0],p.v-end[1])<.15,'transverse path open: '+JSON.stringify(p));
  }
  // Start on the pavement, outside the stairs, so the capsule never spawns inside a riser.
  const column=building.columns[0],columnStop=column.v+column.d/2+clearance;
  for(const u of[-5.4,-1.8,1.8,5.4]){await setup([u,7],[u,2],.12);const p=await move(200);report.columns.push({u,...p});assert.ok(Math.abs(p.v-columnStop)<.06,'columns retain collision: '+JSON.stringify(p));}
  report.rays=await page.evaluate(({point,canopy})=>{const g=window.__GULOU__.game;return [canopy,point].map(([x,z])=>{const hit=g.player.physics.castRay({origin:{x,y:25,z},dir:{x:0,y:-1,z:0}},30,true,undefined,undefined,g.player.collider,g.player.body);return hit?25-hit.timeOfImpact:null;});},{canopy:point(0,2.6),point:[-169,288]});
  assert.ok(report.rays[0]>4.35&&report.rays[0]<4.6,'canopy is solid');assert.ok(report.rays[1]<1,'U courtyard remains open');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const [name,eye,look,fov]of [['front',[0,5.2,30],[0,8.5,0],55],['entrance',[-7,2.6,13],[0,3.5,1],62],['upper',[0,11,20],[0,11.8,0],57],['context',[-30,29,40],[0,8,-13],66]]){
  await page.evaluate(({eye,look,fov,x,z,nx,nz})=>{const g=window.__GULOU__.game,p=a=>[x+a[0]*nz+a[2]*nx,a[1],z-a[0]*nx+a[2]*nz];g.player.avatar.root.visible=false;g.camera.position.set(...p(eye));g.camera.lookAt(...p(look));g.camera.fov=fov;g.camera.updateProjectionMatrix();g.renderer.render(g.scene,g.camera);},{eye,look,fov,x,z,nx,nz});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,meshes:report.meshChanges,failure:report.failure});
