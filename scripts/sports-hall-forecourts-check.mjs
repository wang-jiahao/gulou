import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='docs/validation/phase39',stage=process.env.FORECOURT_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
if(stage==='before'){try{await readFile(`${out}/before-chrome.json`);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],approaches:[],paths:[]};
const features=JSON.parse(await readFile('public/data/campus-layout.json','utf8')).features;
const hash=a=>createHash('sha256').update(a).digest('hex').match(/../g).join(':');
const ids=['plan-6','plan-13'];
report.footprints=features.map(f=>({id:f.id,hash:hash(JSON.stringify([f.points,f.holes]))}));
const fronts=ids.map((id,j)=>{const f=features.find(f=>f.id===id),i=j?5:2,[x,z]=f.points[i],[xx,zz]=f.points[(i+1)%f.points.length],len=Math.hypot(xx-x,zz-z);return{id,x:(x+xx)/2,z:(z+zz)/2,nx:-(zz-z)/len,nz:(xx-x)/len};});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});await page.click('#enter');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join(':'),fixed=[];
  for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)].join(':'));
  const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push(JSON.stringify([c.translation(),c.rotation(),c.shape.halfExtents]));});cuboids.sort();const trees=[];g.world.root.traverse(o=>{if(o.userData.trees)trees.push(o.userData.trees);});
  return JSON.parse(JSON.stringify({fixed,cuboids,trees,forecourt:g.world.root.getObjectByName('sports hall forecourts')?.userData,doors:g.world.doors,buildings:g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings}));
 });
 if(stage==='after'){
  const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
  assert.deepEqual(report.footprints,before.footprints,'all campus polygons preserved');
  for(const key of ['fixed','doors','buildings'])assert.deepEqual(report.geometry[key],before.geometry[key],key+' preserved');
  const remaining=[...report.geometry.cuboids];for(const old of before.geometry.cuboids){const i=remaining.indexOf(old);assert.ok(i>=0,'old static cuboid preserved');remaining.splice(i,1);}
  assert.deepEqual(report.geometry.trees.slice(0,before.geometry.trees.length),before.geometry.trees,'all existing tree placements retained');
  report.collisionChanges={retained:before.geometry.cuboids.length,added:remaining.length};
  assert.equal(remaining.length,report.geometry.forecourt.solids.length,'only forecourt colliders added');
  const step=frames=>page.evaluate(frames=>{const g=window.__GULOU__.game;for(let i=0;i<frames;i++)g.player.update(1/60,g.cameraRig.yaw,true);return g.player.position.toArray();},frames);
  for(const e of fronts){
   const building=report.geometry.buildings.find(b=>b.id===e.id),point=(u,v)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz],local=q=>({u:(q[0]-e.x)*e.nz-(q[2]-e.z)*e.nx,v:(q[0]-e.x)*e.nx+(q[2]-e.z)*e.nz,y:q[1]});
   assert.ok(building.source.includes('gl-3-03'));assert.equal(building.storeys,e.id==='plan-13'?3:1);
   async function setup(start,end,height=.12){const p=point(...start),q=point(...end);await page.evaluate(({p,q,height})=>{const g=window.__GULOU__.game;g.player.clearInput();g.player.teleport(p[0],height,p[1]);g.player.physics.step();g.cameraRig.yaw=Math.atan2(p[0]-q[0],p[1]-q[1]);g.mode='playing';},{p,q,height});await step(10);}
   async function move(frames){await page.keyboard.down('KeyW');const p=local(await step(frames));await page.keyboard.up('KeyW');return p;}
   const clearance=await page.evaluate(()=>{const p=window.__GULOU__.game.player;return p.collider.radius()+p.motor.offset();});
   for(const d of building.boxes.filter(b=>b.kind==='door')){await setup([d.u,6],[d.u,0]);const p=await move(270);report.approaches.push({id:e.id,u:d.u,...p});assert.ok(Math.abs(p.v-(d.v+d.d/2+clearance))<.07&&Math.abs(p.y-.45)<.12,'approach climbs stairs and stops at closed door: '+JSON.stringify(p));}
   for(const [name,a,b,height]of [['landing',[-3.7,1.5],[3.7,1.5],.48],['forecourt',[-8,5],[8,5],.12]])for(const[start,end]of[[a,b],[b,a]]){
    await setup(start,end,height);const p=await move(Math.ceil(Math.hypot(end[0]-start[0],end[1]-start[1])/1.65*60));report.paths.push({id:e.id,name,start,end,...p});assert.ok(Math.hypot(p.u-end[0],p.v-end[1])<.18,'transverse path open: '+JSON.stringify(p));
   }
  }
  // Exercise actual newly added colliders with both player footprints, tracing
  // every physics step and checking contact with the intended target handle.
  report.blockers=[];report.cyclingPaths=[];
  const bikeFixture=await page.evaluate(()=>{const b=window.__GULOU__.game.world.bicycles[1];return{position:b.group.position.toArray(),angle:b.angle};});
  await page.evaluate(()=>{const p=window.__GULOU__.game.player,step=p.physics.step.bind(p.physics);window.forecourtTrace=null;p.physics.step=(...a)=>{step(...a);if(window.forecourtTrace){const t=p.body.translation(),contacts=[];for(let i=0;i<p.motor.numComputedCollisions();i++)contacts.push(p.motor.computedCollision(i).collider.handle);window.forecourtTrace.push({x:t.x,y:t.y-.86,z:t.z,yaw:p.rideYaw,contacts});}};});
  for(const ride of[false,true]){
   if(ride)await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.teleport(b.group.position.x-Math.sin(b.angle)*1.8,.09,b.group.position.z-Math.cos(b.angle)*1.8);if(!g.player.mount(b))throw Error('fixture mount failed');});
   async function travel(e,start,end,frames,height=.09){
    return page.evaluate(({e,start,end,frames,ride,height})=>{
     const g=window.__GULOU__.game,p=g.player,point=a=>[e.x+a[0]*e.nz+a[1]*e.nx,e.z-a[0]*e.nx+a[1]*e.nz],a=point(start),b=point(end),yaw=Math.atan2(a[0]-b[0],a[1]-b[1]);
     window.forecourtTrace=null;p.clearInput();p.teleport(a[0],height,a[1]);g.cameraRig.yaw=yaw;if(ride){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;p.collider.setRotationWrtParent({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)});}p.physics.step();for(let k=0;k<10;k++)p.update(1/60,yaw,true);
     window.forecourtTrace=[];p.keys.add('KeyW');if(ride)p.keys.add('ShiftLeft');for(let k=0;k<frames;k++)p.update(1/60,yaw,true);p.clearInput();const trace=window.forecourtTrace;window.forecourtTrace=null;return{trace,position:p.position.toArray()};
    },{e,start,end,frames,ride,height});
   }
   for(const fixture of report.geometry.forecourt.fixtures){
    const e=fronts.find(e=>e.id===fixture.id),s=fixture.solid;
    // Approach round trees from the side: the swim garden rail is in front.
    const lateral=fixture.kind==='round tree',side=fixture.u<0?-1:1;
    const start=fixture.kind==='notice board'&&fixture.id==='plan-13'?[fixture.u-side*3,fixture.v]:lateral?[fixture.u+side*2.5,fixture.v]:[fixture.u,fixture.v+3];
    const end=[fixture.u,fixture.v],handle=await page.evaluate(s=>{let handle;window.__GULOU__.game.player.physics.forEachCollider(c=>{const t=c.translation();if(!c.parent()&&Math.hypot(t.x-s.x,t.y-s.y,t.z-s.z)<.002)handle=c.handle;});return handle;},s);
    assert.notEqual(handle,undefined,'fixture has physical collider');
    const {trace,position}=await travel(e,start,end,ride?100:180,fixture.kind==='notice board'?.51:.09),angle=s.angle||0,ca=Math.cos(angle),sa=Math.sin(angle);
    const separation=t=>{
     const dx=t.x-s.x,dz=t.z-s.z,u=dx*ca-dz*sa,v=dx*sa+dz*ca,w=s.w/2,d=s.d/2;
     if(!ride)return Math.hypot(Math.max(0,Math.abs(u)-w),Math.max(0,Math.abs(v)-d))-.27;
     const a=t.yaw-angle,c=Math.cos(a),sn=Math.sin(a);
     return Math.max(Math.abs(u)-w-.34*Math.abs(c)-.95*Math.abs(sn),Math.abs(v)-d-.34*Math.abs(sn)-.95*Math.abs(c),Math.abs(u*c-v*sn)-.34-w*Math.abs(c)-d*Math.abs(sn),Math.abs(u*sn+v*c)-.95-w*Math.abs(sn)-d*Math.abs(c));
    };
    const minSeparation=Math.min(...trace.map(separation)),contactSteps=trace.filter(t=>t.contacts.includes(handle)).length;
    report.blockers.push({id:fixture.id,kind:fixture.kind,u:fixture.u,ride,position,steps:trace.length,minSeparation,contactSteps});
    assert.ok(minSeparation>-.005,`no penetration: ${JSON.stringify(report.blockers.at(-1))}`);
    assert.ok(contactSteps>0,`intended fixture contacted: ${JSON.stringify(report.blockers.at(-1))}`);
   }
   for(const e of fronts)for(const[name,start,end]of[['central-in',[0,10],[0,4.8]],['central-out',[0,4.8],[0,10]],['lateral-right',[-8,5.8],[8,5.8]],['lateral-left',[8,5.8],[-8,5.8]]]){
    const distance=Math.hypot(end[0]-start[0],end[1]-start[1]),frames=Math.ceil((ride?distance/9+.45:distance/1.65)*60),{position}=await travel(e,start,end,frames),u=(position[0]-e.x)*e.nz-(position[2]-e.z)*e.nx,v=(position[0]-e.x)*e.nx+(position[2]-e.z)*e.nz,progress=((u-start[0])*(end[0]-start[0])+(v-start[1])*(end[1]-start[1]))/distance;
    report.cyclingPaths.push({id:e.id,name,ride,position,progress,distance});assert.ok(progress>distance-.2&&progress<distance+.9&&Math.abs(position[1])<.2,'open level forecourt route: '+JSON.stringify(report.cyclingPaths.at(-1)));
   }
  }
  await page.evaluate(f=>{const p=window.__GULOU__.game.player;if(p.riding){p.teleport(...f.position);p.rideYaw=f.angle;p.parkBicycle();}},bikeFixture);
  const locations=[[-100,-80],[-77,-80],[-104,-106],[-119,-125]];
  report.roofRays=await page.evaluate(locations=>{const g=window.__GULOU__.game;return locations.map(([x,z])=>{const hit=g.player.physics.castRay({origin:{x,y:40,z},dir:{x:0,y:-1,z:0}},45,true,undefined,undefined,g.player.collider,g.player.body);return{x,z,y:hit?40-hit.timeOfImpact:null};});},locations);
  assert.ok(report.roofRays[0].y>12&&report.roofRays[0].y<14,'lower swimming roof');assert.ok(report.roofRays[1].y>15&&report.roofRays[1].y<18,'higher swimming roof');assert.ok(report.roofRays[2].y<1,'swimming L recess remains open');assert.ok(report.roofRays[3].y>7&&report.roofRays[3].y<8,'gym roof');
 }
 await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
 for(const e of fronts)for(const[name,eye,look,fov]of[['front',[0,6,e.id==='plan-13'?19:26],[0,e.id==='plan-13'?6:3.7,0],64],['entrance',[-6,2.8,13],[0,3.1,0],60],['roof',[-24,32,34],[0,6,-14],68],...(e.id==='plan-13'?[['inscription',[27,6.2,14],[20.2,5.9,0],48]]:[])]){
  await page.evaluate(({e,eye,look,fov})=>{const g=window.__GULOU__.game,p=a=>[e.x+a[0]*e.nz+a[2]*e.nx,a[1],e.z-a[0]*e.nx+a[2]*e.nz];g.player.avatar.root.visible=false;g.camera.position.set(...p(eye));g.camera.lookAt(...p(look));g.camera.fov=fov;g.camera.updateProjectionMatrix();g.renderer.render(g.scene,g.camera);},{e,eye,look,fov});
  await page.screenshot({path:`${out}/${stage}-${channel}-${e.id}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(`${out}/${stage}-${channel}.json`,JSON.stringify(report,null,2),stage==='before'?{flag:'wx'}:{});await browser.close();}
console.log({stage,channel,status:report.status,collisions:report.collisionChanges,failure:report.failure});
