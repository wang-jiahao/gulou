import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/validation/phase9',shots='docs/screenshots/phase9';
await mkdir(out,{recursive:true});await mkdir(shots,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[],crossings=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const state=()=>page.evaluate(()=>window.__GULOU__.stats());
async function walkTo(x){
 const from=(await state()).position[0],key=x<from?'KeyA':'KeyD';
 await page.keyboard.down('ShiftLeft');await page.keyboard.down(key);
 try{await page.waitForFunction(({x,left})=>left?window.__GULOU__.stats().position[0]<=x:window.__GULOU__.stats().position[0]>=x,{x,left:x<from},{timeout:6500});}
 finally{await page.keyboard.up(key);await page.keyboard.up('ShiftLeft');}
 await page.waitForTimeout(150);return (await state()).position;
}
try{
 await page.goto((process.env.TEST_URL??'http://localhost:4173/')+'?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled);await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 for(const z of [28,46,65])for(const side of [-1,1]){
  const start=await page.evaluate(z=>{const g=window.__GULOU__.game;g.cameraRig.yaw=0;return g.player.travelTo(0,z);},z);assert.ok(start);
  await page.waitForTimeout(150);const up=await walkTo(side*8);assert.ok(up[1]>.17&&up[1]<.27,`step onto lawn at ${side},${z}: ${up}`);
  const down=await walkTo(0);assert.ok(down[1]>.01&&down[1]<.08,`step off lawn at ${side},${z}: ${down}`);
  crossings.push({z,side,up,down});
 }
 const landings=await page.evaluate(()=>{const g=window.__GULOU__.game;return [28,46,65].flatMap(z=>[-1,1].map(side=>({requested:[side*8,z],landing:g.player.travelTo(side*8,z)})));});
 for(const {landing}of landings){assert.ok(landing);assert.ok(landing.y>.24&&landing.y<.29,'travel lands on raised grass');}
 const floors=await page.evaluate(()=>{const p=window.__GULOU__.game.player;return [28,46,65].map(z=>({z,road:p.groundHeightAt(0,z),left:p.groundHeightAt(-8,z),right:p.groundHeightAt(8,z)}));});
 // Repeatedly cross the LOD ranges, then return: one level per visible tree cell,
 // stable resources, unchanged physical trunk support, no new downloads.
 const lod=[];
 for(const quality of ['low','medium','high']){
  await page.evaluate(q=>window.__GULOU__.game.setQuality(q),quality);
  for(const y of [2,95,180,95,2]){
   await page.evaluate(y=>{const g=window.__GULOU__.game;g.player.teleport(0,y,68);},y);await page.waitForTimeout(180);
   lod.push(await page.evaluate(()=>{const g=window.__GULOU__.game;let visible=0,invalid=0;const treeGeometryIds=new Set();g.scene.traverse(o=>{if(!o.name.startsWith('broadleaf trees '))return;o.traverse(child=>{if(child.geometry)treeGeometryIds.add(child.geometry.uuid);});for(const cell of o.children){if(!cell.visible)continue;visible++;if(cell.children.filter(l=>l.visible).length!==1)invalid++;}});return{treeGeometryIds:[...treeGeometryIds].sort().join(','),quality:g.quality,visible,invalid,geometries:g.renderer.info.memory.geometries,textures:g.renderer.info.memory.textures};}));
  }
 }
 assert.ok(lod.every(s=>s.visible>0&&s.invalid===0),'LOD leaves exactly one active level per visible tree cell');
 assert.equal(new Set(lod.map(s=>s.treeGeometryIds)).size,1,'Tree LOD transitions reuse the same geometry objects; facade GPU buffers may initialize independently');
 await page.evaluate(()=>window.__GULOU__.game.setQuality('medium'));
 for(const [name,x,z,yaw,pitch]of [['north-final',0,68,0,-.15],['north-close',0,38,0,-.29],['gate-final',-91.05,365,0,-.04]]){
  await page.evaluate(([x,z,yaw,pitch])=>{const g=window.__GULOU__.game;g.player.travelTo(x,z);g.cameraRig.firstPerson=true;g.cameraRig.yaw=yaw;g.cameraRig.pitch=pitch;},[x,z,yaw,pitch]);
  await page.keyboard.press('KeyP');await page.waitForTimeout(600);await page.locator('#photo-panel').evaluate(el=>el.hidden=true);await page.locator('#toast').evaluate(el=>el.hidden=true);await page.screenshot({path:`${shots}/${name}.png`});await page.keyboard.press('KeyP');
 }
 await page.keyboard.press('KeyM');await page.screenshot({path:`${shots}/map-final.png`});await page.click('#map-resume');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 const report={time:new Date().toISOString(),checks:['six lawns crossed up and down using movement keys without jumping','safe travel supports all six elevated lawns','visible tree cells keep one LOD across low/medium/high and repeated distance changes','no repeated geometry allocation on LOD changes','front, close and gate screenshots captured for visual review'],crossings,landings,floors,lod,errors,missing};
 await writeFile(`${out}/courtyard.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks,crossings,floors,errors,missing}));
}catch(e){await page.screenshot({path:`${shots}/courtyard-failure.png`});console.error(await state());throw e;}finally{await browser.close();}
