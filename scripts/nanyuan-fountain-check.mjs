import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const stage=process.env.FOUNTAIN_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
const out='docs/validation/phase67',file=`${out}/${stage}-${channel}.json`;
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
 report.geometry=await page.evaluate(()=>{const g=window.__GULOU__.game;return{solids:g.world.solids,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings};});
 report.geometry=JSON.parse(JSON.stringify(report.geometry));
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).geometry;
  for(const key of ['doors','buildings'])assert.deepEqual(report.geometry[key],before[key],key+' preserved');
  const remaining=[...report.geometry.solids];
  for(const solid of before.solids){const i=remaining.findIndex(s=>JSON.stringify(s)===JSON.stringify(solid));assert.ok(i>=0,'existing collision preserved');remaining.splice(i,1);}
  report.addedSolids=remaining.length;
  report.fountain=await page.evaluate(()=>{const g=window.__GULOU__.game,f=g.world.root.getObjectByName('Nanyuan dry fountain plaza');return f?{...f.userData,meshes:f.children.length}:null;});
  assert.ok(report.fountain,'dry fountain exists');assert.ok(report.fountain.meshes<=8,'bounded static mesh count');
 }
 const routes=[
  ['环岛西路',[-104.8,446],[-104.8,467]],['环岛东路',[-65.8,446],[-65.8,467]],
  ['环岛北路',[-96,438],[-74,438]],['环岛南路',[-96,476],[-74,476]],
  ['东西步行开口',[-103,456.74],[-67,456.74]],
  ['南侧步行开口',[-85.23,460],[-85.23,477]],['北侧步行开口',[-85.23,435],[-85.23,446]],
  ['北门连接道',[-85.23,425],[-85.23,437]],['南教学楼前路',[-89,481],[-70,497]]
 ];
 const fixture=await page.evaluate(()=>{const b=window.__GULOU__.game.world.bicycles[1];return{position:b.group.position.toArray(),angle:b.angle};});
 for(const ride of [false,true]){
  if(ride)await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('fixture mount failed');});
  for(const [name,start,end]of routes)for(const side of [-1,1]){
   const r=await page.evaluate(({name,start,end,side,ride})=>{
    const g=window.__GULOU__.game,p=g.player,a=side===1?start:end,b=side===1?end:start,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),yaw=Math.atan2(-dx,-dz);
    p.clearInput();p.teleport(a[0],.09,a[1]);g.cameraRig.yaw=yaw;
    if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}
    p.physics.step();for(let i=0;i<10;i++)p.update(1/60,yaw,true);
    p.keys.add('KeyW');if(ride)p.keys.add('ShiftLeft');let progress=0;
    for(let i=0;i<Math.ceil((len+2)/(ride?9:1.65)*60)+120;i++){p.update(1/60,yaw,true);progress=((p.position.x-a[0])*dx+(p.position.z-a[1])*dz)/len;if(progress>=len-.2)break;}
    p.clearInput();return{name,side,ride,progress,len,lateral:((p.position.x-a[0])*dz-(p.position.z-a[1])*dx)/len};
   },{name,start,end,side,ride});report.routes.push(r);assert.ok(r.progress>=r.len-.2&&Math.abs(r.lateral)<.6,JSON.stringify(r));
  }
 }
 await page.evaluate(f=>{const p=window.__GULOU__.game.player;if(p.riding){p.teleport(...f.position);p.rideYaw=f.angle;p.parkBicycle();}p.reset();},fixture);
 if(stage==='after'){
  report.rays=await page.evaluate(()=>{
   const g=window.__GULOU__.game,p=g.player,tests=[];
   for(const a of [0,Math.PI/2,Math.PI,3*Math.PI/2,Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4]){
    const x=-85.233,z=456.743,sx=Math.sin(a),sz=Math.cos(a),from={x:x+sx*17.5,y:.55,z:z+sz*17.5},dir={x:-sx,y:0,z:-sz},len=4;
    const hit=p.physics.castRay({origin:from,dir},len,true,undefined,undefined,p.collider,p.body);
    const ray=g.cameraRig.ray;ray.set(g.camera.position.clone().set(from.x,from.y,from.z),g.camera.position.clone().set(dir.x,dir.y,dir.z));ray.near=0;ray.far=len;
    tests.push({angle:a,blocked:a%(Math.PI/2)>.01,physics:hit?.timeOfImpact??null,camera:ray.intersectObjects(g.world.cameraSolids,false)[0]?.distance??null});
   }return tests;
  });
  for(const r of report.rays){assert.equal(r.physics!==null,r.blocked,'hedge / opening physics');assert.equal(r.camera!==null,r.blocked,'hedge / opening camera');}
  const arrival=await page.locator('#travel-place option').evaluateAll(options=>options.find(o=>o.textContent==='南园喷泉')?.value);assert.ok(arrival);
  await page.keyboard.press('m');await page.fill('#place-search','南园喷泉');
  await page.selectOption('#travel-place',arrival);await page.click('#travel-place-go');
  report.arrival=await page.evaluate(()=>window.__GULOU__.game.player.position.toArray());assert.ok(report.arrival[1]<.2,'arrival on ground');
  assert.ok(Math.hypot(report.arrival[0]+65.8,report.arrival[2]-456.743)<.3,'arrival at east opening');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const[name,eye,look,fov]of [
  ['overview',[-85,45,484],[-85,0,456],61],['north',[-85,1.9,431],[-85,1,456],72],
  ['paving',[-77,7,469],[-85,.1,455],66],['east',[-64,1.8,457],[-85,1,456],73]
 ]){
  report.render=await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);return{calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(file,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,routes:report.routes.length,addedSolids:report.addedSolids,failure:report.failure?.slice(0,300)});
