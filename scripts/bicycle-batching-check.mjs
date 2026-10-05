import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const out='docs/validation/phase76',stage=process.env.BICYCLE_STAGE||'after',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
const reportPath=`${out}/${stage}-${channel}.json`;
if(stage==='before'){
  try{await readFile(reportPath);throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
}
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={stage,channel,errors:[],missing:[],views:[],rides:[]};
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
  await page.goto('http://localhost:4173/?debug=1');
  await page.waitForFunction(()=>window.__GULOU__?.stats().sectors===3&&!document.querySelector('#enter').disabled,null,{timeout:90000});
  await page.click('#enter');
  await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');g.player.avatar.root.visible=false;});
  report.baseline=await page.evaluate(async()=>{
    const g=window.__GULOU__.game,hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');
    const fixed=[];for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)]);
    const cuboids=[];g.player.physics.forEachCollider(c=>{if(!c.parent()&&c.shape.halfExtents)cuboids.push(JSON.stringify([c.translation(),c.rotation(),c.shape.halfExtents]));});cuboids.sort();
    const geometries=new Set(),materials=new Set(),bicycles=g.world.bicycles.map(b=>{
      b.group.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
      return{id:b.id,home:b.home.toArray(),angle:b.angle,solid:b.solid};
    });
    const geometryHashes=[];for(const geo of geometries)geometryHashes.push([await hash(geo.attributes.position.array),await hash(geo.index.array)]);
    return{fixed,cuboids,doors:g.world.doors,bicycles,geometryHashes,materials:materials.size};
  });
  if(stage==='after'){
    assert.deepEqual(report.baseline,JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8')).baseline,'geometry, materials, placements and all fixed collision retained');
    // Match every rendered instance to an original part in world space. This
    // catches stale poses, doubles, lost parts and incorrect shadow flags.
    await page.evaluate(()=>{window.__checkBicycleInstances=()=>{
      const g=window.__GULOU__.game,expected=new Map();g.scene.updateMatrixWorld(true);
      const key=o=>[o.geometry.uuid,o.material.uuid,o.castShadow,o.receiveShadow,o.layers.mask,o.renderOrder].join(':');
      let parts=0,instances=0,maxError=0;
      for(const b of g.world.bicycles){
        if(b===g.player.riding){if(!b.group.visible)throw Error('riding vehicle hidden');continue;}
        if(b.group.visible)throw Error('parked vehicle drawn twice');
        b.group.traverse(o=>{if(o.isMesh){const k=key(o),a=expected.get(k)||[];a.push(o.matrixWorld.toArray());expected.set(k,a);parts++;}});
      }
      g.world.root.getObjectByName('spatially batched parked bicycles').traverse(o=>{
        if(!o.isInstancedMesh)return;
        const a=expected.get(key(o));if(!a)throw Error('unexpected geometry/material/shadows');
        for(let i=0;i<o.count;i++){
          const m=o.matrixWorld.clone();o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);const values=m.toArray();
          const index=a.findIndex(v=>v.every((n,j)=>Math.abs(n-values[j])<.0001));
          if(index<0)throw Error('extra or misplaced bicycle part');
          const[v]=a.splice(index,1);maxError=Math.max(maxError,...v.map((n,j)=>Math.abs(n-values[j])));instances++;
        }
      });
      if(parts!==instances||[...expected.values()].some(a=>a.length))throw Error('missing parked bicycle parts');
      return{parts,instances,maxError};
    };});
    report.initialInstances=await page.evaluate(()=>window.__checkBicycleInstances());
  }
  await page.addStyleTag({content:'body > :not(canvas){visibility:hidden!important} canvas{visibility:visible!important}'});
  for(const [name,eye,look]of[
    ['hall-oblique',[-37,4,607],[-20,4.2,588]],
    ['library',[-60,4,185],[-53,1,194]],
    ['teaching',[-94,3.5,111],[-91,1,117]],
    ['bicycle-close',null,null],
  ]){
    const view=await page.evaluate(async({name,eye,look})=>{
      const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id==='new-teaching-north-bike-2');
      if(!eye){const a=b.angle,p=v=>[b.home.x+v[0]*Math.cos(a)+v[2]*Math.sin(a),b.home.y+v[1],b.home.z-v[0]*Math.sin(a)+v[2]*Math.cos(a)];eye=p([-1.75,1.5,-2.45]);look=p([0,.72,-.1]);}
      g.player.teleport(eye[0],.1,eye[2]);g.camera.position.set(...eye);g.camera.lookAt(...look);g.camera.fov=name==='bicycle-close'?45:62;g.camera.updateProjectionMatrix();
      g.world.updateVegetation(g.camera.position,g.quality,true,g.camera.position);g.camera.updateMatrixWorld();g.csm.update();
      for(let i=0;i<8;i++){g.renderer.render(g.scene,g.camera);await new Promise(requestAnimationFrame);}
      const samples=[];
      for(let i=0;i<40;i++){await new Promise(requestAnimationFrame);const t=performance.now();g.renderer.render(g.scene,g.camera);samples.push(performance.now()-t);}
      samples.sort((a,b)=>a-b);
      let bikeMainCalls=0,bikeShadowCalls=0;
      const meshes=[];g.scene.traverse(o=>{if(o.isMesh&&(o.material.name==='shared bicycle vertex colours'||o.material.name==='bicycle Nanjing University lettering'))meshes.push(o);});
      for(const o of meshes){o.onBeforeRender=()=>bikeMainCalls++;o.onBeforeShadow=()=>bikeShadowCalls++;}
      g.renderer.render(g.scene,g.camera);
      for(const o of meshes){o.onBeforeRender=()=>{};o.onBeforeShadow=()=>{};}
      return{name,eye,look,calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles,bikeMainCalls,bikeShadowCalls,renderSubmissionMs:{median:samples[20],p90:samples[36]}};
    },{name,eye,look});
    report.views.push(view);await page.screenshot({path:`${out}/${stage}-${channel}-${name}.png`});
  }
  if(stage==='after'){
    const before=JSON.parse(await readFile(`${out}/before-chrome.json`,'utf8'));
    assert.ok(report.views[0].bikeMainCalls<before.views[0].bikeMainCalls*.6,'busy viewpoint substantially reduces bicycle submissions');
    // Public E-key selection and real physics, including all original open bays.
    const ids=report.baseline.bicycles.filter(b=>!/plan-/.test(b.id)).map(b=>b.id);
    for(const id of ids){
      const f=await page.evaluate(id=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===id);g.mode='playing';g.player.clearInput();g.player.teleport(b.home.x-Math.sin(b.angle)*1.8,b.home.y+.04,b.home.z-Math.cos(b.angle)*1.8);g.player.physics.step();g.cameraRig.yaw=b.angle;return{id,p:b.home.toArray(),a:b.angle};},id);
      await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__GULOU__.game.player.riding?.id),id);
      await page.evaluate(()=>window.__checkBicycleInstances());
      await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>!!window.__GULOU__.game.player.riding),false);
      await page.evaluate(f=>{const g=window.__GULOU__.game;g.player.teleport(f.p[0]-Math.sin(f.a)*1.8,f.p[1]+.04,f.p[2]-Math.cos(f.a)*1.8);},f);
      await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__GULOU__.game.player.riding?.id),id);
      await page.keyboard.down('KeyW');
      // The dining lane crosses a stair flight after this clear exit. At 150
      // frames bike-1 straddles its 1.65m ledge: all side capsules intersect the
      // lip and the rear has no support within the permitted drop. End on the
      // lower approach, preserving both clearance and dismount safety checks.
      const frames=id.startsWith('dining-')?90:150;
      const ride=await page.evaluate(frames=>{const g=window.__GULOU__.game,p=g.player,b=p.riding,angle=b.wheels[0].rotation.x;for(let i=0;i<frames;i++)p.update(1/60,g.cameraRig.yaw,true);return{position:p.position.toArray(),wheelDelta:b.wheels[0].rotation.x-angle,pedalPhase:p.pedalPhase,visible:b.group.visible};},frames);
      await page.keyboard.up('KeyW');
      const progress=-(ride.position[0]-f.p[0])*Math.sin(f.a)-(ride.position[2]-f.p[2])*Math.cos(f.a);
      assert.ok(progress>4.2,'bike exits parking row');assert.ok(Math.abs(ride.wheelDelta)>5&&ride.pedalPhase>1&&ride.visible,'independent rider animation remains visible');
      if(id.startsWith('dining-'))assert.ok(ride.position[1]<.5,'dining ride ends before high stair ledge');
      report.activeRide={id,progress,...ride};
      await page.keyboard.press('KeyE');
      const dismount=await page.evaluate(()=>{const g=window.__GULOU__.game,p=g.player;return{riding:p.riding?.id,mode:g.mode,flying:p.flying,position:p.position.toArray(),grounded:p.grounded,velocityY:p.velocityY,rideYaw:p.rideYaw,keys:[...p.keys]};});
      report.activeRide.dismount=dismount;
      assert.equal(!!dismount.riding,false,`${id} E dismount`);
      report.rides.push(report.activeRide);delete report.activeRide;
      await page.evaluate(()=>window.__checkBicycleInstances());
      await page.evaluate(f=>{const g=window.__GULOU__.game,b=g.world.bicycles.find(b=>b.id===f.id),c=g.player.solidColliders.get(b.solid);b.group.position.set(...f.p);b.group.rotation.y=f.a;b.angle=f.a;c.setTranslation({x:f.p[0],y:f.p[1]+.52,z:f.p[2]});c.setRotation({x:0,y:Math.sin(f.a/2),z:0,w:Math.cos(f.a/2)});b.update(0,0,0);b.setParked?.(true);g.player.physics.step();},f);
    }
    // Re-park a turned, pedalled vehicle in a different cell, then return it.
    // Repetition checks pose and membership after rebuilding; it does not
    // measure GPU buffer lifetime or establish an absence of memory leaks.
    report.reparking=await page.evaluate(()=>{
      const g=window.__GULOU__.game,b=g.world.bicycles[0],p=b.group.position.clone(),a=b.group.rotation.y;
      const other=g.world.bicycles[1],pose=[];other.group.traverse(o=>pose.push(o.rotation.toArray()));
      const wheels=b.wheels.map(w=>w.rotation.x),checks=[];
      for(let i=0;i<30;i++){
        b.setParked(false);b.group.position.set(p.x+48+i*17,p.y,p.z+32);b.group.rotation.y=a+.37;
        b.update(i===0?.62:0,.9,.24);b.setParked(true);checks.push(window.__checkBicycleInstances());
        g.renderer.render(g.scene,g.camera);
      }
      const after=[];other.group.traverse(o=>after.push(o.rotation.toArray()));
      const crank=b.group.getObjectByName('crank');
      const animation={wheelDeltas:b.wheels.map((w,i)=>w.rotation.x-wheels[i]),turn:b.steering.rotation.y,crank:crank.rotation.x,platforms:crank.children.filter(o=>o.name==='pedal platform').map(o=>o.rotation.x),otherUnchanged:JSON.stringify(pose)===JSON.stringify(after)};
      b.group.position.copy(p);b.group.rotation.y=a;b.update(-.62,0,0);b.setParked(true);
      return{iterations:checks.length,animation,final:window.__checkBicycleInstances()};
    });
    assert.ok(report.reparking.animation.wheelDeltas.every(n=>Math.abs(n+2)<1e-8));
    assert.deepEqual({...report.reparking.animation,wheelDeltas:undefined},{wheelDeltas:undefined,turn:.24,crank:.9,platforms:[-.9,-.9],otherUnchanged:true});
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}
finally{await writeFile(reportPath,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({stage,channel,passed:report.passed,views:report.views,rides:report.rides.length,failure:report.failure?.slice(0,300)}));
