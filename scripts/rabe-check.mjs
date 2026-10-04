import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {southBoundaryRuns} from '../src/world/south-boundary-layout.ts';
const out='docs/validation/phase50',stage=process.env.RABE_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
if(stage.startsWith('before')){try{await readFile(`${out}/${stage}-${channel}.json`);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],routes:[]};
const layout=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
report.footprints=createHash('sha256').update(JSON.stringify(layout.features.map(f=>[f.id,f.points,f.holes]))).digest('hex');
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(''),fixed=[];
  for(const m of g.world.fixedMeshes){const v=m.vertices;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(let i=0;i<v.length;i+=3){minX=Math.min(minX,v[i]);maxX=Math.max(maxX,v[i]);minZ=Math.min(minZ,v[i+2]);maxZ=Math.max(maxZ,v[i+2]);}fixed.push({hash:await hash(v)+await hash(m.indices),bounds:[minX,maxX,minZ,maxZ]});}
  const instances=[];g.world.root.traverse(o=>{if(o.isInstancedMesh)instances.push({name:o.name,count:o.count,matrix:Array.from(o.instanceMatrix.array)});});
  return JSON.parse(JSON.stringify({instances,fixed,solids:g.world.solids,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings}));
 });
 report.building=report.geometry.buildings.find(b=>b.id==='plan-128');
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(report.footprints,before.footprints,'original campus outlines retained');
  assert.equal(hash(report.geometry.buildings.filter(b=>b.id!=='plan-128')),hash(before.geometry.buildings.filter(b=>b.id!=='plan-128')),'unrelated buildings retained');
  assert.equal(hash(report.geometry.doors.filter(d=>d.name!=='拉贝纪念馆')),hash(before.geometry.doors.filter(d=>d.name!=='拉贝纪念馆')),'unrelated doors retained');
  assert.equal(hash(report.geometry.solids),hash(before.geometry.solids),'tree and other box collisions retained');
  const fixedTrees=g=>g.instances.filter(o=>o.name!=='complete crown coverage across LOD transitions');
  assert.equal(hash(fixedTrees(report.geometry)),hash(fixedTrees(before.geometry)),'static instance matrices retained');
  const localMesh=m=>m.bounds[0]>114&&m.bounds[1]<137&&m.bounds[2]>679&&m.bounds[3]<701;
  const remaining=[...report.geometry.fixed],oldLocal=before.geometry.fixed.filter(localMesh);
  for(const m of before.geometry.fixed.filter(m=>!localMesh(m))){const i=remaining.findIndex(n=>n.hash===m.hash);assert.ok(i>=0,'unrelated fixed collider retained');remaining.splice(i,1);}
  assert.ok(remaining.every(localMesh),'all replacement colliders confined to Rabe house');
  report.meshChanges={retained:before.geometry.fixed.length-oldLocal.length,removed:oldLocal.length,added:remaining.length};
  assert.equal(report.building.name,'拉贝纪念馆');assert.equal(report.building.storeys,2);assert.equal(report.building.attic,true);
  const[x,z,nx,nz]=report.building.frontage,point=(u,v)=>[x+u*nz+v*nx,z-u*nx+v*nz];
  const local=q=>({u:(q[0]-x)*nz-(q[2]-z)*nx,v:(q[0]-x)*nx+(q[2]-z)*nz,y:q[1]});
  const ring=southBoundaryRuns.flatMap(r=>r.points);
  const inside=([px,pz])=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const[a,b]=ring[i],[c,d]=ring[j];if((b>pz)!==(d>pz)&&px<(c-a)*(pz-b)/(d-b)+a)yes=!yes;}return yes;};
  const boundaryDistance=([px,pz])=>Math.min(...southBoundaryRuns.flatMap(r=>r.points.slice(1).map(([cx,cz],i)=>{const[ax,az]=r.points[i],dx=cx-ax,dz=cz-az,t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz)));return Math.hypot(px-ax-t*dx,pz-az-t*dz);}))); 
  assert.ok(nz>.99,'VR/map registration places the front on the south');
  report.courtyard={arrival:point(0,4),clearance:boundaryDistance(point(0,4))};
  assert.ok(inside(report.courtyard.arrival)&&report.courtyard.clearance>.8,'arrival stays inside the campus with standing clearance');
  for(const b of report.building.boxes){for(const du of[-b.w/2,b.w/2])for(const dv of[-b.d/2,b.d/2]){
   const p=point(b.u-report.building.porchU+du,b.v-2.16+dv);
   assert.ok(inside(p)&&boundaryDistance(p)>.2,'building detail stays inside campus: '+b.kind);
  }}
  const step=frames=>page.evaluate(frames=>{const g=window.__GULOU__.game;for(let i=0;i<frames;i++)g.player.update(1/60,g.cameraRig.yaw,true);return g.player.position.toArray();},frames);
  async function setup(start,end,height=.12){const p=point(...start),q=point(...end);await page.evaluate(({p,q,height})=>{const g=window.__GULOU__.game;g.player.clearInput();g.player.teleport(p[0],height,p[1]);g.player.physics.step();g.cameraRig.yaw=Math.atan2(p[0]-q[0],p[1]-q[1]);g.mode='playing';},{p,q,height});await step(10);}
  async function move(frames){await page.keyboard.down('KeyW');const p=local(await step(frames));await page.keyboard.up('KeyW');return p;}
  const clearance=await page.evaluate(()=>{const p=window.__GULOU__.game.player;return p.collider.radius()+p.motor.offset();});
  const door=report.building.boxes.find(b=>b.kind==='door'),doorStop=door.v+door.d/2-2.16+clearance;
  for(const u of[-.65,0,.65]){await setup([u,4],[u,0]);const p=await move(280);report.routes.push({name:'stairs-to-door',u,...p});assert.ok(Math.abs(p.v-doorStop)<.07&&Math.abs(p.y-.9)<.1,'stairs reach landing and closed door: '+JSON.stringify(p));}
  for(const[name,a,b,height]of[
   ['landing',[-1.15,.34],[1.15,.34],.94],
   ['front-lane',[-3,4],[5.5,4],.12],
   ['west-approach',[-6,4],[-6,-6],.12],
   ['stairs-descent',[0,.34],[0,4],.94]
  ])for(const[start,end]of[[a,b],[b,a]]){
   await setup(start,end,name==='stairs-descent'&&start===b?.12:height);const target=point(...end),distance=Math.hypot(end[0]-start[0],end[1]-start[1]);
   await page.keyboard.down('KeyW');const result=await page.evaluate(({target,distance})=>{const g=window.__GULOU__.game,maxFrames=Math.ceil(distance/1.65*60)+150;let frames=0;for(;frames<maxFrames;frames++){g.player.update(1/60,g.cameraRig.yaw,true);if(Math.hypot(g.player.position.x-target[0],g.player.position.z-target[1])<.12)break;}return {position:g.player.position.toArray(),frames,maxFrames};},{target,distance});await page.keyboard.up('KeyW');
   const p=local(result.position);report.routes.push({name,start,end,...p,frames:result.frames,maxFrames:result.maxFrames});assert.ok(Math.hypot(p.u-end[0],p.v-end[1])<.16,'open route: '+name+' '+JSON.stringify(p));
  }
  await setup([0,4],[0,10]);
  const stopped=await move(240);
  report.routes.push({name:'courtyard-boundary-block',...stopped});
  assert.ok(stopped.v>4.5&&stopped.v<6&&inside(point(stopped.u,stopped.v)),'campus fence blocks leaving the courtyard');
  const samples=[['landing',0,.34,1.2,.88,.92],['balcony',0,-.70,6,4.45,4.48],['front-rail',0,.25,6,5.57,5.60],['roof-center',2.85,-8,20,9.5,10.6],['front-lane',0,4,20,-.1,.3]];
  report.rays=await page.evaluate(samples=>{const g=window.__GULOU__.game;return samples.map(([name,x,z,top,min,max])=>{const hit=g.player.physics.castRay({origin:{x,y:top,z},dir:{x:0,y:-1,z:0}},30,true,undefined,undefined,g.player.collider,g.player.body);return {name,y:hit?top-hit.timeOfImpact:null,min,max};});},samples.map(([name,u,v,top,min,max])=>[name,...point(u,v),top,min,max]));
  for(const r of report.rays)assert.ok(r.y!==null&&r.y>=r.min&&r.y<=r.max,'visible surface collision: '+JSON.stringify(r));
  await page.keyboard.press('KeyM');await page.waitForFunction(()=>document.querySelector('#campus-map').open&&!document.pointerLockElement);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#campus-map').open);await page.click('#map-open',{timeout:5000});await page.fill('#place-search','拉贝纪念馆');
  report.searchResults=await page.locator('#travel-place option').allTextContents();assert.deepEqual(report.searchResults,['选择地点','拉贝纪念馆']);await page.selectOption('#travel-place',{label:'拉贝纪念馆'});await page.click('#travel-place-go');
  report.arrival=local(await page.evaluate(()=>window.__GULOU__.game.player.position.toArray()));assert.ok(Math.hypot(report.arrival.u,report.arrival.v-4)<.3&&report.arrival.y<.3,'map arrival stands outside steps on clear ground');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const [name,eye,look,fov]of [
  ['front',[124,10,715],[123,4.8,691],64],
  ['entrance',[120.9,2.8,700.8],[120.5,3.1,695],78],
  ['southeast',[141,11,710],[123,4.6,690],65],
  ['roof',[151,25,710],[123,5,689],62],
  ['north',[106,11,676],[123,4,689],65]]){
  await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05+g.atmosphere.night*.12;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage.startsWith('before')?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,meshes:report.meshChanges,routes:report.routes.length,failure:report.failure});
