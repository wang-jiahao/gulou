import {chromium,devices} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'}),errors=[],missing=[],checks=[];
await mkdir('docs/validation/phase4',{recursive:true});await mkdir('docs/images',{recursive:true});
const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:412,height:915}}),page=await context.newPage(),cdp=await context.newCDPSession(page);
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const state=()=>page.evaluate(()=>window.__GULOU__.stats());
const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y,radiusX:8,radiusY:8,force:1}))});
try{
 await page.goto((process.env.TEST_URL??'http://localhost:4173/')+'?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:60000});await page.tap('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);await page.waitForTimeout(800);
 assert.equal((await state()).quality,'medium');assert.ok(await page.locator('#touch-controls').isVisible());assert.equal(await page.evaluate(()=>document.pointerLockElement),null);checks.push('touch layout, medium preset, no pointer lock');
 const box=await page.locator('#touch-stick').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2,before=(await state()).position;
 await touch('touchStart',[[1,x,y]]);await touch('touchMove',[[1,x,y-35]]);await page.waitForTimeout(1500);
 assert.ok(before[2]-(await state()).position[2]>1,'joystick moves');const yaw=await page.evaluate(()=>window.__GULOU__.game.cameraRig.yaw);
 await touch('touchStart',[[1,x,y-35],[2,300,420]]);await touch('touchMove',[[1,x,y-35],[2,352,441]]);await page.waitForTimeout(300);assert.ok(Math.abs(await page.evaluate(()=>window.__GULOU__.game.cameraRig.yaw)-yaw)>.05,'second finger looks');
 await touch('touchEnd',[]);await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>window.__GULOU__.game.player.moveInput.toArray()),[0,0]);checks.push('multitouch move+look, input released');
 await page.tap('#map-open');await page.selectOption('#travel-place','6');await page.tap('#travel-place-go');await page.waitForTimeout(400);let s=await state();assert.ok(Math.hypot(s.position[0]+91,s.position[2]-365)<1);assert.equal(s.flight,'walking');assert.ok(s.position[1]<1);checks.push('landmark teleport to Hankou gate');
 await page.tap('#map-open');const rect=await page.locator('#map-canvas').boundingBox(),scale=680/412,offsetX=(1000-270*scale)/2+170*scale,offsetZ=30+40*scale;
 await page.touchscreen.tap(rect.x+(offsetX-53*scale)/1000*rect.width,rect.y+(offsetZ+99*scale)/740*rect.height);
 assert.ok(await page.locator('#map-teleport').isEnabled());await page.tap('#map-teleport');await page.waitForTimeout(500);s=await state();assert.ok(Math.hypot(s.position[0]+53,s.position[2]-99)<10,`map roof teleport: ${s.position}`);assert.ok(s.position[1]>3);checks.push('arbitrary map destination resolves a standing roof position');
 await page.tap('#settings-open');await page.selectOption('#character-style','female');await page.waitForFunction(()=>window.__GULOU__.stats().character==='female');assert.ok(await page.locator('#character-style').isEnabled());await page.tap('#settings-resume');
 await page.tap('#map-open');await page.selectOption('#travel-place','0');await page.tap('#travel-place-go');await page.waitForTimeout(700);await page.screenshot({path:'docs/images/mobile.png'});
 await page.tap('#touch-fly');await page.waitForFunction(()=>window.__GULOU__.stats().flight==='gliding',{}, {timeout:8000});const height=(await state()).position[1];const up=await page.locator('[data-hold-key="Space"]').boundingBox();await touch('touchStart',[[3,up.x+up.width/2,up.y+up.height/2]]);await page.waitForTimeout(1200);await touch('touchEnd',[]);assert.ok((await state()).position[1]>height+3);
 await page.tap('#map-open');await page.selectOption('#travel-place','9');await page.tap('#travel-place-go');assert.equal((await state()).flight,'walking');assert.ok((await state()).position[1]<1);checks.push('female rig, touch launch+climb, teleport cancels flight safely');
 await page.setViewportSize({width:915,height:412});await page.waitForTimeout(600);await page.screenshot({path:'docs/images/mobile-landscape.png'});assert.ok(await page.locator('#touch-stick').isVisible());assert.ok(await page.locator('#settings-open').isVisible());checks.push('landscape controls remain usable');
 await page.tap('#settings-open');await page.selectOption('#character-style','male');await page.waitForFunction(()=>window.__GULOU__.stats().character==='male');await page.tap('#settings-resume');checks.push('switch back to male');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={device:'Pixel 7 emulation, Chrome on Apple M4; not a physical-phone performance result',checks,errors,missing,last:await state()};await writeFile('docs/validation/phase4/mobile.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(e){console.error('State',await state().catch(()=>null),errors,missing);await page.screenshot({path:'docs/validation/phase4/failure.png'});throw e;}finally{await browser.close();}
