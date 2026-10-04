import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const mode=process.env.ROOF_STAGE??'after',channel=process.env.BROWSER_CHANNEL??'chrome';
const out='docs/validation/phase27';await mkdir(out,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={mode,channel,errors:[],missing:[]};
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');
 await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{},{timeout:60000});
 await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 report.geometry=await page.evaluate(async()=>{
  const g=window.__GULOU__.game;
  const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const fixed=[];for(const m of g.world.fixedMeshes)fixed.push([await hash(m.vertices),await hash(m.indices)]);
  const camera=[];for(const m of g.world.cameraSolids)if(m.geometry)camera.push([await hash(m.geometry.attributes.position.array),m.geometry.index?await hash(m.geometry.index.array):null,m.matrixWorld.elements.map(v=>v===0?0:v)]);
  const surfaces=[];for(const x of [-345,-310,-230,-180,-90,-45,-5,45,70,100])for(const z of [25,50,105,175,265,300,328,395]){
   const h=g.player.physics.castRay({origin:{x,y:180,z},dir:{x:0,y:-1,z:0}},190,true,undefined,undefined,g.player.collider,g.player.body);surfaces.push({x,z,top:h?180-h.timeOfImpact:null});
  }
  return {fixed,camera,surfaces,near:g.camera.near,shadows:g.renderer.shadowMap.enabled};
 });
 if(mode==='after'){
  const baseline=await readFile(`${out}/before-chrome.json`,'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  report.comparedWithBaseline=Boolean(baseline);
  if(baseline){
  assert.deepEqual(report.geometry.fixed,baseline.geometry.fixed,'closed physics meshes unchanged');
  assert.deepEqual(report.geometry.camera,baseline.geometry.camera,'camera obstruction meshes unchanged');
  assert.deepEqual(report.geometry.surfaces,baseline.geometry.surfaces,'80 real physics roof/courtyard/ground samples unchanged');
  assert.equal(report.geometry.near,baseline.geometry.near);
  }
  assert.equal(report.geometry.near,.07);assert.equal(report.geometry.shadows,true);
 }
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(13);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');g.cameraRig.firstPerson=true;g.mode='photo';document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;});
 for(const view of ['high','oblique','close','teaching']){
  await page.evaluate(view=>{const g=window.__GULOU__.game,r=g.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.find(b=>b.id==='plan-4'),{origin,angle:a}=r.localFrame;
   const [u,v,y,pitch]=view==='high'?[28,37,177,1.56]:view==='oblique'?[65,82,88,.72]:[35,55,30,.65];
   if(view==='teaching'){g.player.teleport(16,60,146);g.cameraRig.yaw=-.25;g.cameraRig.pitch=.9;}else{g.player.teleport(origin[0]+u*Math.cos(a)-v*Math.sin(a),y,origin[1]+u*Math.sin(a)+v*Math.cos(a));g.cameraRig.yaw=-a;g.cameraRig.pitch=pitch;}
  },view);
  await page.waitForTimeout(650);await page.screenshot({path:`${out}/${mode}-${channel}-${view}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);process.exitCode=1;}
finally{await writeFile(`${out}/${mode}-${channel}.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({mode,channel,status:report.status,fixed:report.geometry?.fixed.length,camera:report.geometry?.camera.length,rays:report.geometry?.surfaces.length,failure:report.failure?.slice(0,1000)}));
