import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const out='docs/validation/phase44',stage=process.env.GATE_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
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
  const g=window.__GULOU__.game,root=g.world.root.getObjectByName('campus gates and street signs');if(!root)throw Error('Missing gate and street-sign group');root.updateMatrixWorld(true);
  const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const encode=s=>new TextEncoder().encode(JSON.stringify(s)),cuboids=[],fixed=[],stone=[],letters=[];
  g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push([c.translation(),c.rotation(),c.shape.halfExtents]);});
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)]);
  for(const m of root.children){
   const isLetter=[0xe5b452,0xa31425].includes(m.material?.color?.getHex());
   if(!isLetter){stone.push([m.matrixWorld.toArray(),m.geometry?await hash(m.geometry.attributes.position.array):null]);continue;}
   const a=m.geometry.attributes.position,v=g.player.position.clone(),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
   for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);v.toArray().forEach((n,k)=>{min[k]=Math.min(min[k],n);max[k]=Math.max(max[k],n);});}
   const position=m.getWorldPosition(v).toArray(),kind=m.material.color.getHex()===0xe5b452?(position[2]>344?'title-front':'title-back'):(position[0]<-91?'left':'right');
   letters.push({kind,name:m.name,min,max,width:max[0]-min[0],height:max[1]-min[1]});
  }
  return{colliders:await hash(encode(cuboids)),colliderCount:cuboids.length,fixed:await hash(encode(fixed)),stone:await hash(encode(stone)),letters};
 });
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  for(const key of['colliders','colliderCount','fixed','stone'])assert.deepEqual(report.geometry[key],before.geometry[key],key+' unchanged');
  assert.equal(report.geometry.letters.length,16);
  for(const kind of['title-front','title-back','left','right']){
   const letters=report.geometry.letters.filter(x=>x.kind===kind);assert.equal(letters.length,4);
   const vertical=kind==='left'||kind==='right',axis=vertical?1:0;letters.sort((a,b)=>a.min[axis]-b.min[axis]);
   for(let i=1;i<letters.length;i++)assert.ok(letters[i].min[axis]>letters[i-1].max[axis]+.04,'letters do not touch');
   for(const l of letters){
    if(vertical){const x=-91.0546+(kind==='left'?-5.1:5.1);assert.ok(l.min[0]>x-1.06&&l.max[0]<x+1.06&&l.min[1]>1.42&&l.max[1]<4.94,'motto clears plinth, fascia and pier edges');}
    else assert.ok(l.min[0]>-97.3&&l.max[0]<-84.8&&l.min[1]>4.96&&l.max[1]<6.16,'title stays on fascia');
   }
  }
  report.travel=[];
  for(const ride of[false,true]){
   if(ride)await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('mount failed');});
   for(const u of[0,-7.6,7.6])for(const side of[-1,1]){
    const r=await page.evaluate(({u,side,ride})=>{
     const g=window.__GULOU__.game,p=g.player,x=-91.0546+u,z=344.25,yaw=side===1?0:Math.PI;
     p.clearInput();p.teleport(x,.09,z+side*7);g.cameraRig.yaw=yaw;
     if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}
     p.physics.step();for(let i=0;i<10;i++)p.update(1/60,yaw,true);p.keys.add('KeyW');if(ride)p.keys.add('ShiftLeft');
     for(let i=0;i<(ride?180:520);i++){p.update(1/60,yaw,true);if((p.position.z-z)*side<-5.7)break;}p.clearInput();
     return{u,side,ride,remaining:(p.position.z-z)*side,lateral:p.position.x-x};
    },{u,side,ride});report.travel.push(r);assert.ok(r.remaining<-5.5&&Math.abs(r.lateral)<.3,'main and both pedestrian portals: '+JSON.stringify(r));
   }
  }
 }
 const shots=[
  ['front',[-91.05,4.2,370],[-91.05,4,343.85],52],
  ['title',[-91.05,5.4,354],[-91.05,5.58,345.2],45],
  ['left',[-98.4,3.2,352],[-96.15,3.2,345.05],40],
  ['right',[-83.7,3.2,352],[-85.95,3.2,345.05],40],
  ['back',[-91.05,4.4,323],[-91.05,4.2,343.85],54],
 ];
 for(const[name,eye,look,fov]of shots){
  await page.evaluate(({eye,look,fov})=>{const g=window.__GULOU__.game;g.player.avatar.root.visible=false;g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=fov;g.camera.updateProjectionMatrix();g.atmosphere.update(0,false,g.camera.position);if(g.foliageLight)g.foliageLight.value=g.atmosphere.daylight;g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.csm.lightDirection.copy(g.atmosphere.sunDirection).negate();g.csm.lights.forEach(l=>{l.intensity=g.atmosphere.sunIntensity;l.color.copy(g.atmosphere.lightColor);});g.renderer.toneMappingExposure=1.05+g.atmosphere.night*.12;g.camera.updateMatrixWorld();g.csm.updateFrustums();g.csm.update();g.renderer.render(g.scene,g.camera);},{eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,travel:report.travel?.length,failure:report.failure?.slice(0,400)});
