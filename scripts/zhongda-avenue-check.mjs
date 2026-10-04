import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const out='docs/validation/phase45',stage=process.env.AVENUE_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
if(stage==='before'){try{await readFile(`${out}/before-chrome.json`);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(''),fixed=[],cuboids=[];
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)]);
  g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push([c.translation(),c.rotation(),c.shape.halfExtents]);});
  const encode=s=>new TextEncoder().encode(JSON.stringify(s));
  const moves=g.world.root.getObjectByName('zhongda avenue walks and planted strips')?.userData.treeMoves??[],normalized=structuredClone(cuboids);
  for(const {before,after} of moves){
   const matching=normalized.filter(([p,,h])=>Math.abs(p.x-after[0])<.001&&Math.abs(p.z-after[1])<.001&&Math.abs(h.x-.4)<1e-6&&Math.abs(h.z-.4)<1e-6);
   if(matching.length!==1)throw Error('expected one relocated tree collider');matching[0][0].x=before[0];matching[0][0].z=before[1];
   // Rapier stores translations as float32, including the original positions.
   matching[0][0].x=Math.fround(matching[0][0].x);matching[0][0].z=Math.fround(matching[0][0].z);
  }
  return{fixed:await hash(encode(fixed)),colliders:await hash(encode(cuboids)),normalized:await hash(encode(normalized)),colliderCount:cuboids.length,moves};
 });
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  assert.equal(report.geometry.fixed,before.geometry.fixed,'terrain collision retained');
  assert.equal(report.geometry.colliderCount,before.geometry.colliderCount,'no extra colliders');
  assert.equal(report.geometry.normalized,before.geometry.colliders,'all other colliders unchanged');
  report.layout=await page.evaluate(()=>{
   const g=window.__GULOU__.game,group=g.world.root.getObjectByName('zhongda avenue walks and planted strips');if(!group)throw Error('missing avenue');
   return{...group.userData,meshes:group.children.length,triangles:group.children.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0)};
  });
  assert.equal(report.layout.beds.length,10);assert.ok(report.layout.meshes<=4,'merged by material');
  const edge=(side,z)=>{
   const ring=report.layout.outlines[side===-1?0:1].points,n=ring.length/2;
   for(let i=1;i<n;i++){const a=ring[i-1],b=ring[i];if(z<=b[1])return a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]);}
   throw Error('outside avenue');
  };
  report.surfaces=await page.evaluate(()=>{
   const g=window.__GULOU__.game,avenue=g.world.root.getObjectByName('zhongda avenue walks and planted strips'),ground=g.world.root.getObjectByName('registered campus roads lawns and playing fields'),ray=g.cameraRig.ray,origin=g.player.position.clone(),down=origin.clone().set(0,-1,0);
   avenue.updateMatrixWorld(true);ground.updateMatrixWorld(true);let samples=0;const failures=[];
   for(const [index,side] of [-1,1].entries()){
    const ring=avenue.userData.outlines[index].points,n=ring.length/2;
    for(let z=150.37;z<337.9;z+=1.13){
     let xEdge;for(let i=1;i<n;i++)if(z<=ring[i][1]){const a=ring[i-1],b=ring[i];xEdge=a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]);break;}
     for(const offset of[.65,2.6,4.6,5.4,6.7,7.3]){
      const x=xEdge+side*offset;ray.set(origin.set(x,.2,z),down);ray.near=0;ray.far=.21;
      const old=ray.intersectObject(ground,true).filter(h=>h.object.material.name!=='campus-foundation'),hits=ray.intersectObject(avenue,true);
      samples++;if(old.length||!hits.length)failures.push({x,z,old:old.map(h=>h.object.material.name),hits:hits.length});
     }
    }
   }
   return{samples,failures:failures.slice(0,12),failureCount:failures.length};
  });
  assert.equal(report.surfaces.failureCount,0,'new surfaces without old ground overlap '+JSON.stringify(report.surfaces));
  report.travel=[];
  async function route(name,points,ride=false){
   const r=await page.evaluate(({name,points,ride})=>{
    const g=window.__GULOU__.game,p=g.player;p.clearInput();
    if(p.riding)p.dismount();
    if(ride){const b=g.world.bicycles[1];p.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!p.mount(b))throw Error('mount');}
    p.teleport(points[0][0],.09,points[0][1]);let maxError=0,steps=0;
    for(let i=1;i<points.length;i++){
     const [x,z]=points[i],yaw=Math.atan2(-(x-p.position.x),-(z-p.position.z));g.cameraRig.yaw=yaw;
     if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}
     p.physics.step();for(let j=0;j<5;j++)p.update(1/60,yaw,true);p.keys.add('KeyW');
     for(let j=0;j<900;j++){p.update(1/60,yaw,true);steps++;if(Math.hypot(p.position.x-x,p.position.z-z)<.25)break;}
     p.clearInput();const error=Math.hypot(p.position.x-x,p.position.z-z);maxError=Math.max(maxError,error);if(error>1)break;
    }
    return{name,ride,maxError,steps,end:p.position.toArray()};
   },{name,points,ride});report.travel.push(r);assert.ok(r.maxError<.4,'route '+JSON.stringify(r));
  }
  for(const side of[-1,1]){
   const points=Array.from({length:24},(_,i)=>{const z=151+i*8;return[edge(side,z)+side*6.4,z];});
   await route(`walk-${side}-south`,points);await route(`walk-${side}-north`,[...points].reverse());
  }
  for(const z of[197,257.7,286.6,336])for(const direction of[-1,1]){
   const points=[[edge(-1,z)-6.4,z],[edge(1,z)+6.4,z]];
   await route(`cross-${z}-${direction}`,direction===1?points:points.reverse());
  }
  for(const z of[221.4,239.8])for(const direction of[-1,1]){
   const points=[[(edge(-1,z)+edge(1,z))/2,z],[edge(1,z)+8.4,z]];
   await route(`east-junction-${z}-${direction}`,direction===1?points:points.reverse());
  }
  const road=Array.from({length:24},(_,i)=>{const z=151+i*8;return[(edge(-1,z)+edge(1,z))/2,z];});
  await route('ride-south',road,true);await route('ride-north',[...road].reverse(),true);
 }
 const shots=[
  ['south',[-90,3.3,331],[-85,2.2,215],64],
  ['north',[-84.5,3.3,156],[-89,2.2,304],64],
  ['library',[-86,3.0,260],[-55,2.0,259],66],
  ['west',[-96.8,2.3,262],[-99,1.8,327],64],
  ['east',[-77.5,2.3,263],[-80,1.8,328],64],
  ['aerial',[-89,126,290],[-87,0,248],64],
 ];
 for(const[name,eye,look,fov]of shots){
  await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05+g.atmosphere.night*.12;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,travel:report.travel?.length,failure:report.failure?.slice(0,400)});
