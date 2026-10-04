import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const stage=process.env.HOSPITAL_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
const out='docs/validation/phase53',file=`${out}/${stage}-${channel}.json`;
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
 const building=report.geometry.buildings.find(b=>b.id==='plan-80');report.building=building;
 const[x,z,nx,nz]=building.frontage,point=(u,v)=>[x+u*nz+v*nx,z-u*nx+v*nz];
 const local=q=>({u:(q[0]-x)*nz-(q[2]-z)*nx,v:(q[0]-x)*nx+(q[2]-z)*nz,y:q[1]});
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-static-chrome.json`,'utf8')).geometry;
  const original=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry;
  assert.deepEqual(before.fixed,original.fixed,'supplemental baseline uses the original v0.50 world');
  assert.equal(hash(before.buildings.filter(b=>b.id!=='plan-80')),hash(report.geometry.buildings.filter(b=>b.id!=='plan-80')),'other buildings unchanged');
  assert.equal(hash(before.doors.filter(d=>d.name!=='校医院')),hash(report.geometry.doors.filter(d=>d.name!=='校医院')),'other doors unchanged');
  assert.equal(hash(before.cuboids),hash(report.geometry.cuboids),'all existing fixed cuboids unchanged');
  assert.equal(before.instances,report.geometry.instances,'tree and other instance placement unchanged');
  assert.equal(hash(before.solids),hash(report.geometry.solids));
  const remaining=[...report.geometry.fixed],removed=[];
  for(const h of before.fixed){const i=remaining.indexOf(h);if(i<0)removed.push(h);else remaining.splice(i,1);}
  report.meshChanges={removed:removed.length,added:remaining.length,retained:before.fixed.length-removed.length};
  assert.equal(removed.length,1,'only the old closed hospital door collider replaced');
  assert.equal(remaining.length,building.entrance.boxes.length,'new visible solids have colliders');
  assert.equal(building.entrance.label,'南京大学医院');assert.equal(building.entrance.registration,'approximate — previous procedural frontage retained');
  assert.deepEqual(building.frontage,JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).building.frontage);
  const step=frames=>page.evaluate(frames=>{const g=window.__GULOU__.game;for(let i=0;i<frames;i++)g.player.update(1/60,g.cameraRig.yaw,true);return g.player.position.toArray();},frames);
  async function setup(a,b,height=.12){const p=point(...a),q=point(...b);await page.evaluate(({p,q,height})=>{const g=window.__GULOU__.game;g.player.clearInput();g.player.teleport(p[0],height,p[1]);g.player.physics.step();g.cameraRig.yaw=Math.atan2(p[0]-q[0],p[1]-q[1]);g.mode='playing';},{p,q,height});await step(12);}
  for(const u of[-.65,0,.65]){await setup([u,5],[u,0]);await page.keyboard.down('KeyW');const p=local(await step(280));await page.keyboard.up('KeyW');report.routes.push({name:'stairs-to-closed-door',u,...p});assert.ok(p.v>1.65&&p.v<2.05&&Math.abs(p.y-.48)<.09,JSON.stringify(p));}
  const paths=[['front-lane',[-7,4],[7,4],.12],['west-side',[-6,1],[-6,7],.12],['east-side',[6,1],[6,7],.12],['stairs-descent',[0,2.05],[0,5],.50]];
  for(const[name,a,b,height]of paths)for(const[start,end]of[[a,b],[b,a]]){
   // The inward stair route stops on the landing, before the closed door.
   await setup(start,end,start===a?height:.12);const target=point(...end),distance=Math.hypot(end[0]-start[0],end[1]-start[1]);
   await page.keyboard.down('KeyW');const position=await page.evaluate(({target,distance})=>{const g=window.__GULOU__.game;for(let i=0;i<Math.ceil(distance/1.65*60)+150;i++){g.player.update(1/60,g.cameraRig.yaw,true);if(Math.hypot(g.player.position.x-target[0],g.player.position.z-target[1])<.12)break;}return g.player.position.toArray();},{target,distance});await page.keyboard.up('KeyW');
   const p=local(position);report.routes.push({name,start,end,...p});assert.ok(Math.hypot(p.u-end[0],p.v-end[1])<.16,name+JSON.stringify(p));
  }
  const samples=[['landing',0,2,.48],['upper-step',0,2.42,.32],['lower-step',0,2.78,.16],['front-lane',0,4,0],['canopy',0,.9,4.48]];
  report.rays=await page.evaluate(samples=>{const g=window.__GULOU__.game;return samples.map(([name,x,z,want])=>{const top=name==='canopy'?8:2,hit=g.player.physics.castRay({origin:{x,y:top,z},dir:{x:0,y:-1,z:0}},10,true,undefined,undefined,g.player.collider,g.player.body);return {name,y:hit?top-hit.timeOfImpact:null,want};});},samples.map(([name,u,v,y])=>[name,...point(u,v),y]));
  for(const r of report.rays)assert.ok(r.y!==null&&Math.abs(r.y-r.want)<.08,'visible surface: '+JSON.stringify(r));
  await page.keyboard.press('KeyM');
  await page.waitForFunction(()=>document.querySelector('#campus-map').open&&!document.pointerLockElement);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#campus-map').open);
  await page.click('#map-open',{timeout:5000});await page.fill('#place-search','校医院');
  report.searchResults=await page.locator('#travel-place option').allTextContents();
  assert.ok(report.searchResults.includes('校医院'),'hospital is searchable');
  await page.selectOption('#travel-place',{label:'校医院'});await page.click('#travel-place-go');
  report.arrival=local(await page.evaluate(()=>window.__GULOU__.game.player.position.toArray()));
  assert.ok(Math.hypot(report.arrival.u,report.arrival.v-4)<.3&&report.arrival.y<.3,'map arrival stands beyond the steps');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const[name,u,v,y,lookY,fov]of[['front',0,18,5,3.25,58],['entry',-1.6,7.5,2.5,2.6,78],['oblique',13,18,9,3.2,62],['upper',-3,14,12,2.8,60]]){
  const eye=point(u,v),look=point(0,.6);
  await page.evaluate(({eye,look,y,lookY,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(eye[0],y,eye[1]);g.camera.lookAt(look[0],lookY,look[1]);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);},{eye,look,y,lookY,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(file,JSON.stringify(report,null,2),stage.startsWith('before')?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,meshes:report.meshChanges,routes:report.routes.length,failure:report.failure});
