import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const stage=process.env.DINING_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
const out='docs/validation/phase68',file=`${out}/${stage}-${channel}.json`;
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
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const fixed=[];for(const m of g.world.fixedMeshes)fixed.push(await hash(m.vertices)+await hash(m.indices));
  // Crown LOD matrices change with the camera during loading. Compare fixed
  // instance placement, and inspect visible foliage in the final screenshots.
  const insideNewTrees=o=>{for(let p=o;p;p=p.parent)if(p.name==='Jinyin Street roadside trees')return true;return false;};
  const instances=[];g.world.root.traverse(o=>{if(o.isInstancedMesh&&!insideNewTrees(o)&&o.name!=='complete crown coverage across LOD transitions'&&!o.material.name.startsWith('campus-boundary-'))instances.push({name:o.name,count:o.count,matrix:Array.from(o.instanceMatrix.array)});});
  const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push({position:c.translation(),rotation:c.rotation(),halfExtents:c.shape.halfExtents});});
  return {boundaries:g.world.root.getObjectByName('campus perimeter boundaries').userData,access:g.world.root.getObjectByName('campus access gates').children.map(o=>({name:o.name,position:o.position.toArray(),rotation:o.rotation.toArray()})),fixed,instances:await hash(new TextEncoder().encode(JSON.stringify(instances))),cuboids,solids:g.world.solids,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings};
 });
 report.geometry=JSON.parse(JSON.stringify(report.geometry));
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry;
  for(const key of ['instances','solids','access','cuboids','boundaries'])assert.deepEqual(report.geometry[key],before[key],key+' preserved');
  const unaffected=(geometry,key)=>geometry[key].filter(o=>key==='buildings'?o.id!=='plan-113':o.name!==geometry.buildings.find(b=>b.id==='plan-113').name).map(o=>{if(o.id!=='plan-114')return o;const{source,...shape}=o;return shape;});
  for(const key of ['buildings','doors'])assert.deepEqual(unaffected(report.geometry,key),unaffected(before,key),'other '+key+' preserved');
  report.collisionChange={removed:before.fixed.filter(h=>!report.geometry.fixed.includes(h)).length,added:report.geometry.fixed.filter(h=>!before.fixed.includes(h)).length};
  assert.equal(report.collisionChange.removed,2,'replace only dining shell and old entrance');
  report.dining=report.geometry.buildings.find(b=>b.id==='plan-113').dining;
  assert.ok(report.dining,'documented dining geometry');
 }
 const point=(u,v)=>[-86.219+u*(-.99828)+v*(-.05864),560.105-u*(-.05864)+v*(-.99828)];
 const routes=[
  ['北侧通行',point(-27,7),point(27,7)],
  ['西侧道路',point(37,5),point(37,-43)],
  ['东侧道路',point(-37,5),point(-37,-43)]
 ];
 if(stage==='after')routes.push(['北入口台阶', [...point(-5,5),.09], [...point(-5,-3),1.14]]);
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
   return tests.map(([name,a,b,blocked])=>{const from=point(...a),to=point(...b),len=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),dir={x:(to.x-from.x)/len,y:(to.y-from.y)/len,z:(to.z-from.z)/len};const hit=p.physics.castRay({origin:from,dir},len,true,undefined,undefined,p.collider,p.body);const ray=g.cameraRig.ray;ray.set(g.camera.position.clone().set(from.x,from.y,from.z),g.camera.position.clone().set(dir.x,dir.y,dir.z));ray.near=0;ray.far=len;return{name,blocked,physics:hit?.timeOfImpact??null,camera:ray.intersectObjects(g.world.cameraSolids,false)[0]?.distance??null};});
  });
  for(const r of report.rays){assert.equal(r.physics!==null,r.blocked,r.name+' physics');assert.equal(r.camera!==null,r.blocked,r.name+' camera');}
  for(const r of report.routes.filter(r=>r.name==='北入口台阶'))assert.ok(Math.abs(r.y-(r.side===1?1.14:.09))<.2,'entry climbs/descends');
  const name=report.geometry.buildings.find(b=>b.id==='plan-113').name;
  const arrival=await page.locator('#travel-place option').evaluateAll((options,name)=>options.find(o=>o.textContent===name)?.value,name);assert.ok(arrival);
  await page.keyboard.press('m');await page.fill('#place-search',name);await page.selectOption('#travel-place',arrival);await page.click('#travel-place-go');
  report.arrival=await page.evaluate(()=>window.__GULOU__.game.player.position.toArray());assert.ok(report.arrival[1]<.2,'arrival on ground');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const[name,eye,look,fov]of [
  // The old eye [-84,9,534] was inside plan-105 (Nanyuan Teaching Building).
  ['north',[-43,12,538],[-87,9,568],86],
  ['overview',[-92,52,515],[-86,7,580],69],
  ['entrance',[-85,2,549],[-87,3,564],75],
  ['east',[-35,8,578],[-70,8,582],75]
 ]){
  report.render=await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);return{calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(file,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,routes:report.routes.length,collisionChange:report.collisionChange,rays:report.rays?.length,failure:report.failure?.slice(0,300)});
