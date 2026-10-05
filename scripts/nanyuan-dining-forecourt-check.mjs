import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const stage=process.env.DINING_FORECOURT_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
const street=process.env.DINING_STREET==='1';
const out=street?'docs/validation/phase71':'docs/validation/phase70',file=`${out}/${stage}-${channel}.json`;
await mkdir(out,{recursive:true});
if(stage==='before'){try{await readFile(file);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel}),report={stage,channel,errors:[],missing:[],routes:[]};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');
 await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,null,{timeout:90000});
 await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.invalidShadowMaterials=await page.evaluate(()=>{const invalid=[];window.__GULOU__.game.scene.traverse(o=>{for(const key of ['customDepthMaterial','customDistanceMaterial'])if(o[key]&&typeof o[key].customProgramCacheKey!=='function')invalid.push({name:o.name,key});});return invalid;});
 assert.deepEqual(report.invalidShadowMaterials,[],'custom shadow materials retain their Material methods');
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const fixed=[];for(const m of g.world.fixedMeshes)fixed.push(await hash(m.vertices)+await hash(m.indices));
  // Crown LOD matrices change with the camera during loading. Compare fixed
  // instance placement, and inspect visible foliage in the final screenshots.
  const insideNewTrees=o=>{for(let p=o;p;p=p.parent)if((p.name==='Jinyin Street roadside trees'||p.name==='nanyuan dining east forecourt'))return true;return false;};
  const instances=[];g.world.root.traverse(o=>{if(o.isInstancedMesh&&!insideNewTrees(o)&&o.name!=='complete crown coverage across LOD transitions'&&!o.material.name.startsWith('campus-boundary-'))instances.push({name:o.name,count:o.count,matrix:Array.from(o.instanceMatrix.array)});});
  const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push({position:c.translation(),rotation:c.rotation(),halfExtents:c.shape.halfExtents});});
  return {street:g.world.root.getObjectByName('nanyuan dining east street')?.userData??null,forecourt:g.world.root.getObjectByName('nanyuan dining east forecourt')?.userData??null,boundaries:g.world.root.getObjectByName('campus perimeter boundaries').userData,access:g.world.root.getObjectByName('campus access gates').children.map(o=>({name:o.name,position:o.position.toArray(),rotation:o.rotation.toArray()})),fixed,instances:await hash(new TextEncoder().encode(JSON.stringify(instances))),cuboids,solids:g.world.solids,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings};
 });
 report.geometry=JSON.parse(JSON.stringify(report.geometry));
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry;
  for(const key of ['instances','solids','access','boundaries','buildings','doors'])assert.deepEqual(report.geometry[key],before[key],key+' preserved');
  const prior=new Map();for(const c of before.cuboids){const k=JSON.stringify(c);prior.set(k,(prior.get(k)||0)+1);}
  const additions=[];for(const c of report.geometry.cuboids){const k=JSON.stringify(c),n=prior.get(k)||0;if(n)prior.set(k,n-1);else additions.push(c);}
  assert.ok([...prior.values()].every(n=>n===0),'all existing static cuboids preserved');
  report.collisionChange={removed:before.fixed.filter(h=>!report.geometry.fixed.includes(h)).length,added:report.geometry.fixed.filter(h=>!before.fixed.includes(h)).length,cuboids:additions.length};
  assert.equal(report.collisionChange.removed,0,'existing fixed meshes preserved');
  assert.ok(report.geometry.forecourt,'documented forecourt');
  if(street){
   assert.deepEqual(report.geometry.forecourt,before.forecourt,'forecourt preserved');
   assert.ok(report.geometry.street,'documented street');
   assert.equal(additions.length,0,'street adds no cuboids');
   assert.equal(report.collisionChange.added,report.geometry.street.fixedMeshCount,'only street support meshes added');
  }else{
   assert.equal(additions.length,report.geometry.forecourt.solidCount,'only forecourt tree and bicycle colliders added');
   assert.equal(report.collisionChange.added,report.geometry.forecourt.fixedMeshCount,'only planter meshes added');
  }
 }
 report.dining=report.geometry.buildings.find(b=>b.id==='plan-113').dining;
 const point=(u,v)=>[-86.219+u*(-.99828)+v*(-.05864),560.105-u*(-.05864)+v*(-.99828)];
 const eastPoint=(s,t,y=.09)=>[-53.77+s*(-.014927282696553662)+t*.999888581908653,581.1945-s*.999888581908653+t*(-.014927282696553662),y];
 const routes=[
  ['北侧通行',point(-27,7),point(27,7)],
  ['西侧道路',point(37,5),point(37,-43)],
  ['东侧沿街道路',eastPoint(-24,17),eastPoint(29,17)]
 ];
 routes.push(['北入口台阶', [...point(-5,5),.09], [...point(-5,-3),1.14]]);
 {
  const {frame,floor,levels}=report.dining.eastGallery;
  const east=(s,t,y)=>[frame.x+s*frame.nz+t*frame.nx,frame.z-s*frame.nx+t*frame.nz,y+.09];
  // Leave space for the full bicycle to exit the steps before reading height.
  routes.push(['东侧宽阶',east(-5.8,14,0),east(-5.8,-2,floor)]);
  for(const level of [floor,...levels])routes.push([`东外廊${level}`,east(-15,-2.5,level),east(15,-2.5,level)]);
 }
 routes.push(['树池后步行带',eastPoint(-21,5.35),eastPoint(28,5.35)],['树池前沿通路',eastPoint(-21,13.5),eastPoint(28,13.5)],['中间树池南绕行',eastPoint(2.8,4.9),eastPoint(2.8,15)],['北树池南绕行',eastPoint(18,4.9),eastPoint(18,15)]);
 if(street)routes.push(['跨越低路缘南',eastPoint(-3,10.5),eastPoint(-3,20)],['跨越低路缘北',eastPoint(18,10.5),eastPoint(18,20)],['道路南北衔接',eastPoint(-30,18),eastPoint(34,18)]);
 const fixture=await page.evaluate(()=>{const b=window.__GULOU__.game.world.bicycles[1];return{position:b.group.position.toArray(),angle:b.angle};});
 for(const ride of [false,true]){
  if(ride)await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('fixture mount failed');});
  for(const [name,start,end]of routes)for(const side of [-1,1]){
   const r=await page.evaluate(({name,start,end,side,ride})=>{
    const g=window.__GULOU__.game,p=g.player,a=side===1?start:end,b=side===1?end:start,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),yaw=Math.atan2(-dx,-dz);
    p.clearInput();p.teleport(a[0],a[2]??.09,a[1]);g.cameraRig.yaw=yaw;
    if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}
    p.physics.step();for(let i=0;i<10;i++)p.update(1/60,yaw,true);
    p.keys.add('KeyW');if(ride)p.keys.add('ShiftLeft');let progress=0;
    for(let i=0;i<Math.ceil((len+2)/(ride?9:1.65)*60)+120;i++){p.update(1/60,yaw,true);progress=((p.position.x-a[0])*dx+(p.position.z-a[1])*dz)/len;if(progress>=len-.2)break;}
    p.clearInput();return{name,side,ride,progress,len,y:p.position.y,lateral:((p.position.x-a[0])*dz-(p.position.z-a[1])*dx)/len};
   },{name,start,end,side,ride});report.routes.push(r);assert.ok(r.progress>=r.len-.2&&Math.abs(r.lateral)<.6,JSON.stringify(r));
  }
 }
 await page.evaluate(f=>{const p=window.__GULOU__.game.player;if(p.riding){p.teleport(...f.position);p.rideYaw=f.angle;p.parkBicycle();}p.reset();},fixture);
 if(stage==='after'){
  report.rays=await page.evaluate(()=>{
   const g=window.__GULOU__.game,p=g.player,d=g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.find(b=>b.id==='plan-113').dining;
   const {x,z,nx,nz}=d.frame,point=(u,y,v)=>({x:x+u*nz+v*nx,y,z:z-u*nx+v*nz});
   const tests=[['open-portico',[-5,2,4],[-5,2,-3],false],['column',[-7,2,4],[-7,2,-3],true],['closed-rear',[-5,2,-2],[-5,2,-6],true],['upper-glass',[-5,7,2],[-5,7,-2],true],['light-court',[0,24,-20],[0,8,-20],false],['roof',[12,24,-20],[12,8,-20],true]];
   const ef=d.eastGallery.frame,east=(s,y,t)=>({x:ef.x+s*ef.nz+t*ef.nx,y,z:ef.z-s*ef.nx+t*ef.nz});
   const eastTests=[['east-open',[-5.8,3,4],[-5.8,3,-3],false],['east-column',[0,3,4],[0,3,-3],true],['east-rear',[-5.8,3,-3],[-5.8,3,-6],true],['east-upper-open',[4,7.5,2],[4,7.5,-3],false],['east-upper-rear',[4,7.5,-3],[4,7.5,-6],true],['east-parapet',[4,5.3,2],[4,5.3,-2],true],['east-deck',[4,8,-2.5],[4,4,-2.5],true]];
   return [...tests.map(t=>[...t,point]),...eastTests.map(t=>[...t,east])].map(([name,a,b,blocked,transform])=>{const from=transform(...a),to=transform(...b),len=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),dir={x:(to.x-from.x)/len,y:(to.y-from.y)/len,z:(to.z-from.z)/len};const hit=p.physics.castRay({origin:from,dir},len,true,undefined,undefined,p.collider,p.body);const ray=g.cameraRig.ray;ray.set(g.camera.position.clone().set(from.x,from.y,from.z),g.camera.position.clone().set(dir.x,dir.y,dir.z));ray.near=0;ray.far=len;return{name,blocked,physics:hit?.timeOfImpact??null,camera:ray.intersectObjects(g.world.cameraSolids,false)[0]?.distance??null};});
  });
  for(const r of report.rays){assert.equal(r.physics!==null,r.blocked,r.name+' physics');assert.equal(r.camera!==null,r.blocked,r.name+' camera');}
  for(const r of report.routes.filter(r=>r.name==='北入口台阶'))assert.ok(Math.abs(r.y-(r.side===1?1.14:.09))<.2,'entry climbs/descends');
  for(const r of report.routes.filter(r=>r.name==='东侧宽阶'))assert.ok(Math.abs(r.y-(r.side===1?1.74:.09))<.2,'east stairs climb/descend');
  for(const r of report.routes.filter(r=>r.name.startsWith('东外廊')))assert.ok(Math.abs(r.y-(Number(r.name.slice(3))+.09))<.2,'gallery stays on floor');
  report.forecourtRays=await page.evaluate(()=>{
   const g=window.__GULOU__.game,p=g.player;
   const point=(s,y,t)=>({x:-53.77+s*(-.014927282696553662)+t*.999888581908653,y,z:581.1945-s*.999888581908653+t*(-.014927282696553662)});
   const tests=[['south-bed-wall',[-16,.3,5.4],[-16,.3,8],true],['south-bed-coping',[-16,.64,5.4],[-16,.64,8],true],['above-coping',[-17.4,1.2,5.4],[-17.4,1.2,13],false],['whitewashed-tree',[-16,2,7.9],[-16,2,11],true],['bed-floor',[-15,2,9.4],[-15,.1,9.4],true],['rounded-corner',[-18.05,.3,6.1],[-18.05,.3,8.3],false],['pedestrian-strip',[-21,1,5.35],[28,1,5.35],false],['street-clear',[-21,1,13.5],[28,1,13.5],false],['middle-bed',[8,.3,5.4],[8,.3,8.5],true],['north-bed',[24,.3,5.4],[24,.3,8.5],true]];
   return tests.map(([name,a,b,blocked])=>{const from=point(...a),to=point(...b),len=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),dir={x:(to.x-from.x)/len,y:(to.y-from.y)/len,z:(to.z-from.z)/len};const hit=p.physics.castRay({origin:from,dir},len,true,undefined,undefined,p.collider,p.body);const ray=g.cameraRig.ray;ray.set(g.camera.position.clone().set(from.x,from.y,from.z),g.camera.position.clone().set(dir.x,dir.y,dir.z));ray.near=0;ray.far=len;return{name,blocked,physics:hit?.timeOfImpact??null,camera:ray.intersectObjects(g.world.cameraSolids,false)[0]?.distance??null};});
  });
  for(const r of report.forecourtRays){assert.equal(r.physics!==null,r.blocked,r.name+' physics');assert.equal(r.camera!==null,r.blocked,r.name+' camera');if(r.blocked)assert.ok(Math.abs(r.physics-r.camera)<.08,r.name+' collider matches visible surface');}
  if(street){
   report.streetGround=await page.evaluate(()=>{
    const g=window.__GULOU__.game,p=g.player,street=g.world.root.getObjectByName('nanyuan dining east street'),samples=[];
    for(const s of [-20.9,-6,0,18,27.9])for(const t of [12.401,12.95,13.499,13.501,13.699,13.701,14.049,14.051,20.249]){
     const x=-53.77+s*(-.014927282696553662)+t*.999888581908653,z=581.1945-s*.999888581908653+t*(-.014927282696553662),from={x,y:1,z},dir={x:0,y:-1,z:0};
     const hit=p.physics.castRay({origin:from,dir},2,true,undefined,undefined,p.collider,p.body),ray=g.cameraRig.ray;
     ray.set(g.camera.position.clone().set(x,1,z),g.camera.position.clone().set(0,-1,0));ray.near=0;ray.far=2;
     samples.push({s,t,expected:t<13.5?.035+(t-12.4)*.05/1.1:t<13.7?.085:.035,physics:hit?1-hit.timeOfImpact:null,visible:ray.intersectObjects(street.children,true)[0]?.point.y??null});
    }
    return samples;
   });
   for(const r of report.streetGround){assert.notEqual(r.physics,null,'street ground support');assert.notEqual(r.visible,null,'continuous visible street');assert.ok(Math.abs(r.physics-r.expected)<.006,JSON.stringify(r));assert.ok(Math.abs(r.physics-r.visible)<.015,'street collision follows rendered surface');}
  }
  report.planterBlock=await page.evaluate(()=>{
   const g=window.__GULOU__.game,p=g.player,s=-16,t=5.3,x=-53.77+s*(-.014927282696553662)+t*.999888581908653,z=581.1945-s*.999888581908653+t*(-.014927282696553662),yaw=Math.atan2(-.999888581908653,.014927282696553662);
   p.reset();p.teleport(x,.09,z);p.physics.step();p.keys.add('KeyW');for(let i=0;i<240;i++)p.update(1/60,yaw,true);p.clearInput();return {travel:Math.hypot(p.position.x-x,p.position.z-z),y:p.position.y};
  });
  assert.ok(report.planterBlock.travel>.6&&report.planterBlock.travel<2,'raised bed stops walking instead of being stepped through');
  report.parkedBicycles=await page.evaluate(()=>{
   const g=window.__GULOU__.game,p=g.player,bikes=g.world.bicycles.filter(b=>b.id.startsWith('dining-east-bike-'));
   return bikes.map(b=>{const saved={home:b.home.clone(),angle:b.angle};p.reset();p.teleport(b.home.x-Math.sin(b.angle)*1.8,.09,b.home.z-Math.cos(b.angle)*1.8);const mounted=p.mount(b);let travel=0;if(mounted){const start=p.position.clone();p.keys.add('KeyW');for(let i=0;i<60;i++)p.update(1/60,-b.angle,true);p.clearInput();travel=p.position.distanceTo(start);p.teleport(saved.home.x,.09,saved.home.z);p.rideYaw=saved.angle;p.parkBicycle();b.group.position.copy(saved.home);}return{id:b.id,mounted,travel};});
  });
  assert.equal(report.parkedBicycles.length,6);for(const b of report.parkedBicycles){assert.ok(b.mounted,b.id+' mount');assert.ok(b.travel>1,b.id+' can leave parking');}
  const name=report.geometry.buildings.find(b=>b.id==='plan-113').name;
  const arrival=await page.locator('#travel-place option').evaluateAll((options,name)=>options.find(o=>o.textContent===name)?.value,name);assert.ok(arrival);
  await page.keyboard.press('m');await page.fill('#place-search',name);await page.selectOption('#travel-place',arrival);await page.click('#travel-place-go');
  report.arrival=await page.evaluate(()=>window.__GULOU__.game.player.position.toArray());assert.ok(report.arrival[1]<.2,'arrival on ground');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 const shots=street?[
  ['street',[-35,6,607],[-42,1,570],76],
  ['curb',[-36,1.5,589],[-41,.15,583],72],
  ['north-link',[-36,8,543],[-39,.5,566],78]
 ]:[
  // The old eye [-84,9,534] was inside plan-105 (Nanyuan Teaching Building).
  ['overview',[-21,26,615],[-49,4,580],76],
  ['walkway',[-48,2.4,600],[-46,2.1,557],82],
  ['east',[-29,10,579],[-68,9,582],82],
  ['east-steps',[-40,3.3,592],[-62,5,580],78],
  ['planter',[-38,2.3,594],[-44,1.2,596],75]
 ];
 for(const[name,eye,look,fov]of shots){
  report.render=await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);return{calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(file,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,routes:report.routes.length,collisionChange:report.collisionChange,rays:report.rays?.length,failure:report.failure?.slice(0,300)});
