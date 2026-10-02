import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='docs/validation/phase14';await mkdir(out,{recursive:true});await mkdir('docs/screenshots/phase14',{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),errors=[],missing=[],checks=[];
let page;
const ready=async p=>{p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(r.url());});await p.goto((process.env.TEST_URL??'http://localhost:4173/')+'?debug=1');await p.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled);await p.click('#enter');await p.waitForFunction(()=>window.__GULOU__.stats().sectors===3&&window.__GULOU__.stats().environment.heightReady);};
const approach=async p=>{await p.evaluate(()=>{const g=window.__GULOU__.game,a=g.world.directory.arrival;g.player.travelTo(a.x,a.z);g.cameraRig.firstPerson=true;g.cameraRig.yaw=a.yaw;g.cameraRig.pitch=.02;});await p.waitForFunction(()=>!document.querySelector('#interact').hidden&&document.querySelector('#interact').textContent.includes('查看校园地图'));};
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});await ready(page);
 await page.keyboard.press('KeyM');await page.locator('#map-canvas').click({position:{x:260,y:230}});assert.equal(await page.locator('#map-teleport').isDisabled(),false);
 await page.click('[data-map-region="all"]');assert.equal(await page.locator('#map-teleport').isDisabled(),true);await page.locator('#map-canvas').click({position:{x:260,y:230}});assert.equal(await page.locator('#map-teleport').isDisabled(),false);await page.click('#map-resume');
 await approach(page);assert.equal(await page.locator('#interact kbd').isVisible(),true);await page.keyboard.down('KeyW');await page.keyboard.press('KeyE');await page.keyboard.up('KeyW');
 assert.ok(await page.locator('#campus-map').isVisible());assert.equal(await page.locator('[data-map-region="south"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#map-teleport').isDisabled(),true);
 const paused=await page.evaluate(()=>({position:window.__GULOU__.game.player.position.toArray(),keys:[...window.__GULOU__.game.player.keys]}));await page.waitForTimeout(300);
 const held=await page.evaluate(()=>window.__GULOU__.game.player.position.toArray());assert.ok(Math.hypot(...held.map((v,i)=>v-paused.position[i]))<.0001,'opening the map stops movement (allow float contact settling)');assert.deepEqual(paused.keys,[]);
 checks.push('E opens the south map, clears stale hidden selection and held movement');
 const value=await page.locator('#travel-place option').evaluateAll(options=>options.find(o=>o.textContent==='南园导览栏')?.value);assert.ok(value);await page.selectOption('#travel-place',value);await page.click('#travel-place-go');
 assert.ok(await page.evaluate(()=>window.__GULOU__.game.world.directory.nearby(window.__GULOU__.game.player.position)));assert.ok((await page.evaluate(()=>window.__GULOU__.stats().position))[1]<.2);
 checks.push('named map arrival lands in front on the ground');
 await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(1000);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
 const front=await page.evaluate(()=>window.__GULOU__.stats().position);assert.ok(front[2]>426.55&&front[2]<427.1,'solid board stops front approach');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(-111.6,427.5);g.cameraRig.yaw=0;});await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(950);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
 const side=await page.evaluate(()=>window.__GULOU__.stats().position);assert.ok(side[2]<425.5,'walk around the end of the board');
 const college=await page.evaluate(()=>{const g=window.__GULOU__.game,r=g.scene.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.find(r=>r.id==='plan-85');const[x,z,nx,nz]=r.frontage;g.cameraRig.yaw=Math.atan2(nx,nz);return g.player.travelTo(x+nx*4,z+nz*4);});assert.ok(college&&college.y<.2);
 await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(850);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');const door=await page.evaluate(()=>window.__GULOU__.stats().position);assert.ok(Math.hypot(door[0]-college.x,door[2]-college.z)>2,'college entrance approach remains clear');
 checks.push('board has physical collision; end passage and existing college entrance remain accessible');
 for(const[x,z,label]of[[-106,425.2,'back'],[-106,426.2,'roof']]){
  const p=await page.evaluate(([x,z])=>{const g=window.__GULOU__.game;const p=g.player.travelTo(x,z);return{p,near:g.world.directory.nearby(g.player.position)};},[x,z]);assert.ok(p.p);assert.equal(p.near,null,label);if(label==='roof')assert.ok(p.p.y>2.1&&p.p.y<2.6);
  await page.waitForTimeout(300);await page.keyboard.press('KeyE');assert.equal(await page.locator('#campus-map').isVisible(),false);
 }
 await approach(page);await page.keyboard.press('KeyP');await page.keyboard.press('KeyE');assert.equal(await page.locator('#campus-map').isVisible(),false);await page.keyboard.press('KeyP');
 checks.push('back, roof and photo mode cannot activate the directory');
 await page.evaluate(()=>window.__GULOU__.game.setTime(22));await approach(page);await page.keyboard.press('KeyE');assert.ok(await page.locator('#campus-map').isVisible());await page.click('#map-resume');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.player.travelTo(-111,433.3);g.cameraRig.firstPerson=true;g.cameraRig.yaw=Math.atan2(-5,7.1);g.cameraRig.pitch=-.035;});await page.waitForTimeout(400);await page.keyboard.press('KeyP');await page.locator('#photo-panel').evaluate(e=>e.hidden=true);await page.locator('#toast').evaluate(e=>e.hidden=true);await page.screenshot({path:'docs/images/nanyuan-directory.png'});await page.close();
 const context=await browser.newContext({...devices['Pixel 7']});page=await context.newPage();await ready(page);await approach(page);assert.equal(await page.locator('#interact kbd').isVisible(),false,'touch prompt does not ask for a keyboard key');await page.locator('#interact').tap();assert.ok(await page.locator('#campus-map').isVisible());assert.equal(await page.locator('[data-map-region="south"]').getAttribute('aria-pressed'),'true');
 const mapPaint=await page.locator('#map-canvas').evaluate(c=>{const ctx=c.getContext('2d'),pixels=ctx.getImageData(0,0,c.width,c.height).data,colors=new Set();for(let y=0;y<c.height;y+=40)for(let x=0;x<c.width;x+=40){const i=(y*c.width+x)*4;colors.add(pixels.slice(i,i+4).join(','));}return{firstAlpha:pixels[3],colors:colors.size};});assert.ok(mapPaint.firstAlpha===255&&mapPaint.colors>4,'map is painted when its dialog opens');
 await page.screenshot({path:'docs/screenshots/phase14/mobile-directory-map.png'});
 const mobileValue=await page.locator('#travel-place option').evaluateAll(options=>options.find(o=>o.textContent==='南园导览栏')?.value);await page.selectOption('#travel-place',mobileValue);await page.locator('#travel-place-go').tap();await page.waitForFunction(()=>window.__GULOU__.stats().mode==='playing');assert.ok((await page.evaluate(()=>window.__GULOU__.stats().position))[1]<.2);await page.waitForFunction(()=>!document.querySelector('#interact').hidden);await page.screenshot({path:'docs/screenshots/phase14/mobile-directory.png'});
 checks.push('night interaction and Pixel 7 browser touch simulation open the map and return safely');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={time:new Date().toISOString(),checks,front,side,college,door,errors,missing,mobile:'Chrome Pixel 7 touch simulation on Apple M4; not a real device test'};
 await writeFile(`${out}/directory.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){if(page&&!page.isClosed())await page.screenshot({path:`${out}/failure.png`});throw e;}finally{await browser.close();}
