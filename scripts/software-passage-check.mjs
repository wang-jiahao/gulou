import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='docs/validation/phase37',stage=process.env.PASSAGE_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
if(stage==='before'){try{await readFile(`${out}/before-chrome.json`);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],routes:[],barriers:[]};let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});await page.click('#enter');
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');
  const buildings=g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings,record=buildings.find(b=>b.id==='plan-4');
  window.feiFrame=record.localFrame;
  const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(''),fixed=[];
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)].join(':'));
  return JSON.parse(JSON.stringify({fixed,buildings,doors:g.world.doors,record}));
 });
 const {origin,angle}=report.geometry.record.localFrame,co=Math.cos(angle),si=Math.sin(angle);
 const point=(u,v)=>[origin[0]+u*co-v*si,origin[1]+u*si+v*co];
 const local=q=>({u:(q[0]-origin[0])*co+(q[2]-origin[1])*si,v:-(q[0]-origin[0])*si+(q[2]-origin[1])*co,y:q[1]});
 const step=frames=>page.evaluate(frames=>{const g=window.__GULOU__.game;for(let i=0;i<frames;i++)g.player.update(1/60,g.cameraRig.yaw,true);return g.player.position.toArray();},frames);
 async function setup(start,end,ride=false){const p=point(...start),q=point(...end);assert.ok(await page.evaluate(({p,q,ride})=>{
  const g=window.__GULOU__.game,player=g.player;if(!ride)player.parkBicycle();
  if(ride&&!player.riding){const b=g.world.bicycles[1];player.travelTo(b.group.position.x-Math.sin(b.angle)*2,b.group.position.z-Math.cos(b.angle)*2);if(!player.mount(b))return false;}
  player.clearInput();player.teleport(p[0],.09,p[1]);player.physics.step();const yaw=Math.atan2(p[0]-q[0],p[1]-q[1]);g.cameraRig.yaw=yaw;player.rideYaw=yaw;player.rideViewYaw=yaw;player.rideSpeed=0;g.mode='playing';return true;
 },{p,q,ride}));await step(10);}
 async function move(frames){await page.keyboard.down('KeyW');const p=local(await step(frames));await page.keyboard.up('KeyW');return p;}
 async function moveTo(end){
  await page.keyboard.down('KeyW');
  const result=await page.evaluate(({q})=>{const g=window.__GULOU__.game,p=g.player,start=p.position.clone(),dx=q[0]-start.x,dz=q[1]-start.z,distance=Math.hypot(dx,dz);let frames=0;
   // Stop at the destination, without assuming walking and bicycle acceleration
   // are identical. A blocked route exhausts the budget and fails its assertion.
   for(;frames<Math.ceil((distance/1.65+3)*60);frames++){p.update(1/60,g.cameraRig.yaw,true);if(((p.position.x-start.x)*dx+(p.position.z-start.z)*dz)/distance>=distance-.025)break;}
   return{p:p.position.toArray(),frames};
  },{q:point(...end)});
  await page.keyboard.up('KeyW');return{...local(result.p),frames:result.frames};
 }
 if(stage==='before'){
  await setup([52,77],[52,47]);report.blocked=await move(400);assert.ok(report.blocked.v>71,'original south wing really blocks passage');
 }else{
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  assert.deepEqual(report.geometry.buildings.filter(b=>b.id!=='plan-4'),before.geometry.buildings.filter(b=>b.id!=='plan-4'));
  assert.deepEqual(report.geometry.doors,before.geometry.doors,'all existing entrances retained');
  const remaining=[...report.geometry.fixed],removed=[];
  for(const h of before.geometry.fixed){const i=remaining.indexOf(h);if(i<0)removed.push(h);else remaining.splice(i,1);}
  assert.equal(removed.length,2,'south wing and adjoining court link repartitioned along the actual sloped edge');assert.equal(remaining.length,6,'court link, upper wing and four ground wall sections');report.meshChanges={retained:before.geometry.fixed.length-2,removed:2,added:remaining.length};
  for(const ride of[false,true]){
   // Cross in both directions and at both sides, without allowing an exterior detour.
   for(const u of[50,52,54])for(const [start,end]of[[[u,76],[u,48]],[[u,48],[u,76]]]){
    await setup(start,end,ride);const p=await moveTo(end);report.routes.push({name:'south passage',ride,start,end,...p});
    assert.ok(Math.abs(p.u-u)<.16&&Math.abs(p.v-end[1])<.16&&p.y<.18,'straight ground route traverses wing: '+JSON.stringify(p));
   }
   for(const [name,start,end]of[['glass canopy',[-5,45],[30,45]],['original column recess',[-5,27],[3.5,27]],['slogan alcove',[35.5,49],[35.5,55]]]){
    for(const [a,b]of[[start,end],[end,start]]){await setup(a,b,ride);const p=await moveTo(b);report.routes.push({name,ride,start:a,end:b,...p});assert.ok(Math.hypot(p.u-b[0],p.v-b[1])<.16&&p.y<.18,'old/new open route: '+JSON.stringify(p));}
   }
   for(const [name,start,end,axis,min,max]of[
    ['left passage wall',[52,62],[45,62],'u',49,50.3],['right passage wall',[52,62],[59,62],'u',53.7,55],
    ['slogan back wall',[35.5,49],[35.5,60],'v',55.1,56.4],['old recess back wall',[2,27],[10,27],'u',4.8,6.2],
    ['old recess column',[-5,24],[3,24],'u',-2.8,-1.4],['closed tower door',[39,45],[39,33],'v',38.4,39.7]
   ]){await setup(start,end,ride);const p=await move(400);report.barriers.push({name,ride,...p});assert.ok(p[axis]>min&&p[axis]<max,'walls/door/column remain solid: '+name+' '+JSON.stringify(p));}
  }
  report.rays=await page.evaluate(points=>{const g=window.__GULOU__.game;return points.map(([name,x,z,y,dy,max])=>{const h=g.player.physics.castRay({origin:{x,y,z},dir:{x:0,y:dy,z:0}},max,true,undefined,undefined,g.player.collider,g.player.body);return{name,y:h?y+dy*h.timeOfImpact:null};});},[
   ['passage ceiling',...point(52,62),1,1,25],['alcove ceiling',...point(35.5,54),1,1,25],['south roof',...point(52,67),25,-1,30],['court',...point(35.5,45),25,-1,30],['old recess ceiling',...point(2,27),1,1,10],['old canopy',...point(12,44),1,1,10]
  ]);
  // At this sample the ray hits the unchanged glass pane (4.55 - .16/2),
  // not a lower decorative frame; existing physics hashes above also verify it.
  for(const r of report.rays){const expected={'passage ceiling':3.8,'alcove ceiling':3.8,'south roof':19,court:0,'old recess ceiling':7.2,'old canopy':4.47}[r.name];assert.ok(Math.abs(r.y-expected)<.12,'solid/open overhead surface: '+JSON.stringify(r));}
  report.place=await page.locator('#travel-place option').allTextContents();assert.ok(report.place.includes('软件学院'),'school listed as separate searchable destination');assert.ok(report.place.some(p=>p.includes('费彝民')),'building keeps its own identity');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const [name,eye,look,fov]of[
  ['south',[46,7,100],[45,7.5,65],65],['passage',[52,2.1,77],[52,2.1,51],66],['court',[30,4,39],[36,3,55],72],['slogan',[35.5,1.9,49.5],[35.5,1.9,56.4],68],['school',[37,3,47],[37,2.8,37],60],['overhead',[87,70,106],[36,15,44],64]
 ]){await page.evaluate(({eye,look,fov,origin,co,si})=>{const g=window.__GULOU__.game,p=a=>[origin[0]+a[0]*co-a[2]*si,a[1],origin[1]+a[0]*si+a[2]*co];g.player.avatar.root.visible=false;g.camera.position.set(...p(eye));g.camera.lookAt(...p(look));g.camera.fov=fov;g.camera.updateProjectionMatrix();g.renderer.render(g.scene,g.camera);},{eye,look,fov,origin,co,si});await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,meshes:report.meshChanges,routes:report.routes.length,barriers:report.barriers.length,failure:report.failure});
