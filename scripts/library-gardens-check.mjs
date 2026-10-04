import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='docs/validation/phase47',stage=process.env.GARDEN_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
if(stage==='before'){try{await readFile(`${out}/before-chrome.json`);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto(process.env.CHECK_URL||'http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(''),fixed=[],cuboids=[],trees=[];
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)]);
  g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push([c.translation(),c.rotation(),c.shape.halfExtents]);});
  const group=g.world.root.getObjectByName('library west gardens'),newSolids=group?.userData.solids??[];
  const oldCuboids=cuboids.filter(([p,,h])=>!newSolids.some(s=>Math.abs(p.x-s.x)<.001&&Math.abs(p.y-s.y)<.001&&Math.abs(p.z-s.z)<.001&&Math.abs(h.x-s.w/2)<.001&&Math.abs(h.y-s.h/2)<.001&&Math.abs(h.z-s.d/2)<.001));
  // Crown billboards rotate toward the camera during loading. Their matrices
  // are intentionally view-dependent; compare immutable tree geometry only.
  g.world.root.traverse(n=>{if(!n.name.startsWith('broadleaf trees'))return;let p=n;while(p){if(p===group)return;p=p.parent;}n.traverse(m=>{if(m.isInstancedMesh&&m.name!=='complete crown coverage across LOD transitions')trees.push(Array.from(m.instanceMatrix.array));});});
  const encode=s=>new TextEncoder().encode(JSON.stringify(s));
  return{fixed:await hash(encode(fixed)),colliders:await hash(encode(oldCuboids.map(s=>JSON.stringify(s)).sort())),colliderCount:cuboids.length,retained:oldCuboids.length,staticTreeTransforms:await hash(encode(trees)),newSolids:newSolids.length};
 });
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  assert.equal(report.geometry.fixed,before.geometry.fixed,'terrain collision retained');
  assert.equal(report.geometry.colliders,before.geometry.colliders,'all unrelated colliders retained');
  const staticBefore=JSON.parse(await readFile(`${out}/static-before-chrome.json`,'utf8'));
  assert.equal(report.geometry.staticTreeTransforms,staticBefore.geometry.staticTreeTransforms,'unrelated static tree transforms retained');
  assert.equal(report.geometry.colliderCount-report.geometry.newSolids,before.geometry.colliderCount);
  report.layout=await page.evaluate(()=>{
   const group=window.__GULOU__.game.world.root.getObjectByName('library west gardens');if(!group)throw Error('missing garden');
   const props=group.getObjectByName('library garden surfaces and low rails');return{...group.userData,meshes:props.children.length,triangles:props.children.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0)};
  });
  assert.equal(report.layout.outlines.length,2);assert.ok(report.layout.meshes<=4,'merged garden furniture');
  report.surfaces=await page.evaluate(()=>{
   const g=window.__GULOU__.game,garden=g.world.root.getObjectByName('library west gardens'),ground=g.world.root.getObjectByName('registered campus roads lawns and playing fields'),props=garden.getObjectByName('library garden surfaces and low rails'),ray=g.cameraRig.ray,origin=g.player.position.clone(),down=origin.clone().set(0,-1,0);
   garden.updateMatrixWorld(true);ground.updateMatrixWorld(true);let samples=0;const failures=[];
   const inside=(x,z,points)=>{let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
   for(let x=-139.1;x<-99;x+=1.21)for(let z=246.23;z<336;z+=1.17){
    if(!garden.userData.outlines.some(p=>inside(x,z,p.points)))continue;
    ray.set(origin.set(x,.2,z),down);ray.near=0;ray.far=.21;
    const old=ray.intersectObject(ground,true).filter(h=>h.object.material.name!=='campus-foundation'),hits=ray.intersectObject(props,true);samples++;
    if(old.some(h=>h.point.y<.06)||!hits.length)failures.push({x,z,old:old.map(h=>[h.object.material.name,h.point.y]),hits:hits.length});
   }
   return{samples,failures:failures.slice(0,8),failureCount:failures.length};
  });
  assert.equal(report.surfaces.failureCount,0,'lawn coverage and no old surface overlap '+JSON.stringify(report.surfaces));
  report.travel=[];report.barriers=[];
  async function route(name,points,ride=false,barrier=null){
   const r=await page.evaluate(({name,points,ride})=>{
    const g=window.__GULOU__.game,p=g.player,bike=g.world.bicycles[1];p.clearInput();
    const home=bike.group.userData.checkHome??={position:bike.group.position.toArray(),angle:bike.angle};
    if(p.riding){p.teleport(...home.position);p.rideYaw=home.angle;p.rideViewYaw=home.angle;p.rideSpeed=0;p.update(1/60,home.angle,true);if(!p.dismount())throw Error('safe dismount between routes');}
    if(ride){const b=g.world.bicycles[1];p.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!p.mount(b))throw Error('mount');}
    p.teleport(points[0][0],.09,points[0][1]);let maxError=0,steps=0;const segments=[];
    for(let i=1;i<points.length;i++){
     const [x,z]=points[i],yaw=Math.atan2(-(x-p.position.x),-(z-p.position.z));g.cameraRig.yaw=yaw;
     if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}
     p.physics.step();for(let j=0;j<5;j++)p.update(1/60,yaw,true);p.keys.add('KeyW');
     const maxSteps=Math.ceil(Math.hypot(p.position.x-x,p.position.z-z)/1.5*60)+180;
     for(let j=0;j<maxSteps;j++){p.update(1/60,yaw,true);steps++;if(Math.hypot(p.position.x-x,p.position.z-z)<.25)break;}
     p.clearInput();const error=Math.hypot(p.position.x-x,p.position.z-z);segments.push({target:[x,z],end:p.position.toArray(),error});maxError=Math.max(maxError,error);if(error>1)break;
    }
    return{name,ride,maxError,steps,segments,end:p.position.toArray()};
   },{name,points,ride});
   if(barrier){
    const clearance=(r.end[0]-barrier.x)*barrier.nx+(r.end[2]-barrier.z)*barrier.nz;
    report.barriers.push({...r,clearance});
    assert.ok(clearance>.15&&clearance<1.5,`${name} stops at rail: ${clearance}`);
   }else report.travel.push(r);
  }
  for(const ride of[false,true])for(const reverse of[false,true])for(const [name,points]of[
   ['physics-library',[[-138.5,286.95],[-120,286.85],[-100,286.65],[-78,286.55],[-70,286.55]]],
   ['west-side',[[-138.3,264],[-139.1,286.9],[-140.4,329.5]]],
   ['south-cross',[[-135,333.85],[-120,337.1],[-101,336.3],[-89,336.3]]],
   ['west-avenue-walk',[[-98.9,261],[-99.65,284],[-101.0,329]]],
   ['east-avenue-walk',[[-77.15,261],[-77.85,284],[-79.15,329]]],
  ])await route(`${name}-${reverse?'reverse':'forward'}`,reverse?[...points].reverse():points,ride);
  for(const ride of[false,true])for(const [i,rail]of report.layout.rails.entries())for(const side of[-1,1]){
   const nx=Math.cos(rail.angle)*side,nz=-Math.sin(rail.angle)*side;
   // The existing avenue tree at (-104,311) obstructs the south rail's
   // midpoint approach. Test four metres along the same continuous rail.
   const offset=i===1?-4:0,x=rail.x+Math.sin(rail.angle)*offset,z=rail.z+Math.cos(rail.angle)*offset;
   await route(`rail-${i}-${side}`,[[x+nx*3,z+nz*3],[x-nx*3,z-nz*3]],ride,{x,z,nx,nz});
  }
 }
 // Return the exercised bicycle before visual comparison.
 await page.evaluate(()=>{const g=window.__GULOU__.game,p=g.player,b=g.world.bicycles[1],home=b.group.userData.checkHome;p.clearInput();if(home&&p.riding){p.teleport(...home.position);p.rideYaw=home.angle;p.rideViewYaw=home.angle;p.rideSpeed=0;p.update(1/60,home.angle,true);if(!p.dismount())throw Error('restore bicycle for screenshots');}});
 const shots=[
  ['physics',[-84,2.9,286.6],[-150,2.7,287],70],
  ['south-lawn',[-99,2.8,286.7],[-126,3.0,315],70],
  ['north-lawn',[-99.6,2.8,286.5],[-126,3.0,268],70],
  ['library',[-137.8,2.9,286.8],[-56,4.4,286.5],70],
  ['aerial',[-117,87,322],[-119,0,285],68],
 ];
 for(const[name,eye,look,fov]of stage==='static-before'?[]:shots){
  await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05+g.atmosphere.night*.12;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.ok(!report.travel?.some(r=>r.maxError>=.4),'routes '+JSON.stringify(report.travel?.filter(r=>r.maxError>=.4)));
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'||stage==='static-before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,travel:report.travel?.length,failure:report.failure?.slice(0,400)});
