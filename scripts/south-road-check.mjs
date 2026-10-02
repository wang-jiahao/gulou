import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';

const out='docs/validation/phase12';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],missing=[],steps=[],visited=[],samples=[];let distance=0;
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const state=()=>page.evaluate(()=>window.__GULOU__.stats());
async function walk(x,z,name){
 const deadline=Date.now()+90000;let previous=(await state()).position;
 await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');
 try{while(Date.now()<deadline){
  const s=await state();samples.push(s);distance+=Math.hypot(s.position[0]-previous[0],s.position[2]-previous[2]);previous=s.position;
  assert.equal(s.flight,'walking');assert.ok(s.position[1]>-.18&&s.position[1]<.6,'stay on the south-campus walking surface');
  if(Math.hypot(x-s.position[0],z-s.position[2])<.7){visited.push({name,position:s.position});return;}
  await page.evaluate(([x,z])=>{const g=window.__GULOU__.game,p=g.player.position;g.cameraRig.yaw=Math.atan2(-(x-p.x),-(z-p.z));},[x,z]);await page.waitForTimeout(150);
 }throw new Error(`South route blocked at ${previous}, towards ${name}`);
 }finally{await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');}
}
try{
 await page.goto((process.env.TEST_URL??'http://localhost:4173/')+'?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled);await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3&&window.__GULOU__.stats().environment.heightReady);
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');if(g.music.enabled)g.music.toggle();});
 const edges=await page.evaluate(()=>window.__GULOU__.game.scene.getObjectByName('Nanyuan road kerbs and edge markings').userData.edges);
 assert.ok(edges.length>30,'connected road margins were generated');
 // Traverse three separated kerbs in both directions with the normal controller.
 for(const [x,z]of[[-43,476],[-62,495],[-82,421]]){
  const e=[...edges].sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
  const start=await page.evaluate(e=>{const g=window.__GULOU__.game;g.cameraRig.yaw=Math.atan2(e.nx,e.nz);return{position:g.player.travelTo(e.x+e.nx*1.1,e.z+e.nz*1.1),top:g.player.groundHeightAt(e.x-e.nx*.095,e.z-e.nz*.095)};},e);
  assert.ok(start.position&&!start.position.adjusted&&start.position.y<.2);assert.ok(start.top>.12&&start.top<.16,'kerb has matching solid support');
  const crossings=[];
  for(let direction=0;direction<2;direction++){
   if(direction)await page.evaluate(()=>window.__GULOU__.game.cameraRig.yaw+=Math.PI);
   await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(650);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
   const p=(await state()).position,along=(p[0]-e.x)*e.nx+(p[2]-e.z)*e.nz;
   assert.ok(direction?along>.3:along<-.4,`walk ${direction?'off':'over'} kerb: ${along}`);assert.ok(p[1]<.4);crossings.push(p);
  }
  steps.push({edge:e,start,crossings});
 }
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(-89,392);g.cameraRig.firstPerson=false;});
 for(const [x,z,name]of[[-78,432,'南园北段'],[-70,452,'喷泉'],[-42,478,'二舍西侧路口'],[-41,526,'宿舍主路'],[-37,548,'宿舍南段'],[-37,600,'南园南段'],[-37,634,'南侧横路'],[25,634,'东侧路口'],[25,665,'八舍东侧'],[25,691,'东南路口'],[-35,691,'广州路门前'],[-35,715,'广州路校门']])await walk(x,z,name);
 // The altered base remains a finish: all named residence arrivals stay outside.
 const residences=await page.evaluate(()=>window.__GULOU__.game.scene.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.filter(r=>r.dormitory));
 const arrivals=[];
 for(const r of residences){const p=await page.evaluate(r=>{const[x,z,nx,nz]=r.frontage;return window.__GULOU__.game.player.travelTo(x+nx*4,z+nz*4);},r);assert.ok(p&&p.y<.7,`${r.name} entrance remains on ground`);arrivals.push({name:r.name,position:p});}
 const architecture=await page.evaluate(()=>{const g=window.__GULOU__.game,root=g.scene.getObjectByName('plan-based campus buildings with VR facade profiles');let guardVertices=0,greyVertices=0;root.traverse(o=>{if(!o.isMesh)return;if(o.material.name==='window-guard')guardVertices+=o.geometry.attributes.position.count;if(o.material.color?.getHex()===0x777f7d)greyVertices+=o.geometry.attributes.position.count;});return{guardVertices,greyVertices};});
 assert.ok(architecture.guardVertices>0&&architecture.greyVertices>0);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const fps=samples.map(s=>s.fps).sort((a,b)=>a-b);
 const report={time:new Date().toISOString(),browser:await browser.version(),hardware:'Apple M4; 1440×900; medium; headless Chrome, not a physical mobile test',edgePieces:edges.length,edgeLength:edges.reduce((n,e)=>n+e.length,0),steps,visited,distanceMetres:distance,fpsMedian:fps[Math.floor(fps.length*.5)],fpsP10:fps[Math.floor(fps.length*.1)],arrivals,architecture,errors,missing};
 await writeFile(`${out}/south-road.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,steps:steps.length,visited:visited.length,arrivals:arrivals.length}));
}catch(e){await page.screenshot({path:`${out}/failure.png`});console.error(await state());throw e;}finally{await browser.close();}
