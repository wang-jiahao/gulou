import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const stage=process.env.PARCEL_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
const out='docs/validation/phase54',file=`${out}/${stage}-${channel}.json`;
await mkdir(out,{recursive:true});
if(stage.startsWith('before')){try{await readFile(file);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel}),report={stage,channel,errors:[],missing:[],routes:[]};
const hash=a=>createHash('sha256').update(JSON.stringify(a)).digest('hex');
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto(`${process.env.BASE_URL||'http://localhost:4173'}/?debug=1`);
 await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,null,{timeout:90000});
 await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const fixed=[];for(const m of g.world.fixedMeshes)fixed.push(await hash(m.vertices)+await hash(m.indices));
  // Crown LOD matrices change with the camera during loading. Compare fixed
  // instance placement, and inspect visible foliage in the final screenshots.
  const instances=[];g.world.root.traverse(o=>{if(o.isInstancedMesh&&o.name!=='complete crown coverage across LOD transitions')instances.push({name:o.name,count:o.count,matrix:Array.from(o.instanceMatrix.array)});});
  const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push({position:c.translation(),rotation:c.rotation(),halfExtents:c.shape.halfExtents});});
  return {fixed,instances:await hash(new TextEncoder().encode(JSON.stringify(instances))),cuboids,solids:g.world.solids,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings};
 });
 const building=report.geometry.buildings.find(b=>b.id==='plan-100');report.building=building;
 const x=-92.7935,z=489.687,nx=0.9999990497918106,nz=-0.001378577389957078;
 const point=(u,v)=>[x+u*nz+v*nx,z-u*nx+v*nz];
 const local=q=>({u:(q[0]-x)*nz-(q[2]-z)*nx,v:(q[0]-x)*nx+(q[2]-z)*nz,y:q[1]});
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry;
  assert.equal(hash(before.buildings.filter(b=>b.id!=='plan-100')),hash(report.geometry.buildings.filter(b=>b.id!=='plan-100')),'other buildings unchanged');
  assert.equal(hash(before.doors.filter(d=>d.name!=='南芳园风味美食苑')),hash(report.geometry.doors.filter(d=>d.name!=='南园快递取件点')),'other doors unchanged');
  assert.equal(hash(before.cuboids),hash(report.geometry.cuboids),'fixed cuboids unchanged');
  assert.equal(before.instances,report.geometry.instances,'fixed instance placement unchanged');
  assert.equal(hash(before.solids),hash(report.geometry.solids));
  const remaining=[...report.geometry.fixed],removed=[];
  for(const h of before.fixed){const i=remaining.indexOf(h);if(i<0)removed.push(h);else remaining.splice(i,1);}
  report.meshChanges={removed:removed.length,added:remaining.length,retained:before.fixed.length-removed.length};
  assert.equal(removed.length,1,'old generic north door replaced');assert.equal(remaining.length,1,'east door collision added');
  assert.equal(building.name,'南园快递取件点');assert.ok(building.frontage[2]>.999);
  assert.equal(building.height,7.2);assert.deepEqual(building.sections,before.buildings.find(b=>b.id==='plan-100').sections);
  assert.match(building.parcelEntrance.design,/approximate/);
  const step=frames=>page.evaluate(frames=>{const g=window.__GULOU__.game;for(let i=0;i<frames;i++)g.player.update(1/60,g.cameraRig.yaw,true);return g.player.position.toArray();},frames);
  async function setup(a,b){const p=point(...a),q=point(...b);await page.evaluate(({p,q})=>{const g=window.__GULOU__.game;g.player.clearInput();g.player.teleport(p[0],.12,p[1]);g.player.physics.step();g.cameraRig.yaw=Math.atan2(p[0]-q[0],p[1]-q[1]);g.mode='playing';},{p,q});await step(12);}
  for(const u of[-.6,0,.6]){await setup([u,4],[u,0]);await page.keyboard.down('KeyW');const p=local(await step(240));await page.keyboard.up('KeyW');report.routes.push({name:'closed-door',u,...p});assert.ok(p.v>.4&&p.v<.85&&p.y<.15,JSON.stringify(p));}
  for(const[name,a,b]of [['front-lane',[-6,4],[6,4]],['north-side',[5.5,1],[5.5,6]],['south-side',[-5.5,1],[-5.5,6]]])for(const[start,end]of [[a,b],[b,a]]){
   await setup(start,end);const target=point(...end),distance=Math.hypot(end[0]-start[0],end[1]-start[1]);await page.keyboard.down('KeyW');
   const position=await page.evaluate(({target,distance})=>{const g=window.__GULOU__.game;for(let i=0;i<Math.ceil(distance/1.65*60)+150;i++){g.player.update(1/60,g.cameraRig.yaw,true);if(Math.hypot(g.player.position.x-target[0],g.player.position.z-target[1])<.12)break;}return g.player.position.toArray();},{target,distance});await page.keyboard.up('KeyW');
   const p=local(position);report.routes.push({name,start,end,...p});assert.ok(Math.hypot(p.u-end[0],p.v-end[1])<.16,name+JSON.stringify(p));
  }
  report.rays=await page.evaluate(({x,z,nx,nz})=>{const g=window.__GULOU__.game;return [-.6,0,.6].map(u=>{const hit=g.player.physics.castRay({origin:{x:x+u*nz+nx*3,y:1.3,z:z-u*nx+nz*3},dir:{x:-nx,y:0,z:-nz}},5,true,undefined,undefined,g.player.collider,g.player.body);return {u,v:hit?3-hit.timeOfImpact:null};});},{x,z,nx,nz});
  for(const r of report.rays)assert.ok(r.v!==null&&Math.abs(r.v-.28)<.02,'door surface: '+JSON.stringify(r));
  await page.keyboard.press('KeyM');await page.waitForFunction(()=>document.querySelector('#campus-map').open&&!document.pointerLockElement);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#campus-map').open);await page.click('#map-open',{timeout:5000});
  for(const term of ['快递','取件']){await page.fill('#place-search',term);const results=await page.locator('#travel-place option').allTextContents();assert.deepEqual(results.filter(name=>name!=='选择地点'),['南园快递取件点']);}
  await page.selectOption('#travel-place',{label:'南园快递取件点'});await page.click('#travel-place-go');
  report.arrival=local(await page.evaluate(()=>window.__GULOU__.game.player.position.toArray()));
  assert.ok(Math.hypot(report.arrival.u,report.arrival.v-4)<.2&&report.arrival.y<.3,'map arrival is outside east door');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const[name,u,v,y,lookY,fov]of[['front',0,17,4,3.1,58],['entry',0,6.8,2.3,1.8,64],['oblique',-7,12,5,2.8,65]]){
  const eye=point(u,v),look=point(0,.6);
  await page.evaluate(({eye,look,y,lookY,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(eye[0],y,eye[1]);g.camera.lookAt(look[0],lookY,look[1]);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);},{eye,look,y,lookY,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(file,JSON.stringify(report,null,2),stage.startsWith('before')?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,meshes:report.meshChanges,routes:report.routes.length,failure:report.failure});
