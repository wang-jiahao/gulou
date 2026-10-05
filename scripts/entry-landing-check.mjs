import {chromium, devices} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';

const channel=process.env.BROWSER==='edge'?'msedge':'chrome';
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const output='docs/validation/phase33', shots='docs/screenshots/phase33';
await mkdir(output,{recursive:true});await mkdir(shots,{recursive:true});
const report={browser:channel,version:await browser.version(),checks:[],keyboard:[],touch:[],errors:[]};
const ready=async page=>{
  await page.goto((process.env.TEST_URL??'http://localhost:4173/')+'?debug=1');
  await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{},{timeout:90000});
  await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3&&window.__GULOU__.stats().environment.heightReady,{},{timeout:60000});
};
const state=page=>page.evaluate(()=>window.__GULOU__.stats());
const step=(page,frames,active=true)=>page.evaluate(([frames,active])=>{
  const g=window.__GULOU__.game,p=g.player;
  for(let i=0;i<frames;i++)p.update(1/60,g.cameraRig.yaw,active);
  return {position:p.position.toArray(),flight:p.flightState,velocity:p.flightVelocity.toArray(),grounded:p.grounded};
},[frames,active]);
const setup=(page,yaw=0,position=[0,80,82])=>page.evaluate(([yaw,position])=>{
  const g=window.__GULOU__.game;g.player.reset();g.player.teleport(...position);g.player.physics.step();g.cameraRig.yaw=yaw;g.mode='playing';
  if(!g.player.startFlight())throw new Error('Open-air flight setup is blocked');
  g.player.land();g.onTick();
},[yaw,position]);
const displacement=sample=>[sample.position[0],sample.position[2]-82];
const expectDirection=(delta,vector,label)=>{
  assert.ok(delta[0]*vector[0]+delta[1]*vector[1]>2.8,`${label}: meaningful intended movement ${delta}`);
  assert.ok(Math.abs(delta[0]*vector[1]-delta[1]*vector[0])<.04,`${label}: no sideways drift ${delta}`);
};
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{
    if(!sessionStorage.getItem('seeded')){
      localStorage.setItem('gulou-settings-v1',JSON.stringify({musicEnabled:false,world:{hour:23,autoTime:false,weatherMode:'rain',cycleMinutes:24}}));
      sessionStorage.setItem('seeded','1');
    }
  });
  await ready(page);
  let e=(await state(page)).environment;
  assert.equal(e.hour,15);assert.equal(e.rain,0);assert.equal(e.autoTime,true);assert.equal(e.weatherMode,'random');assert.equal(e.cycleMinutes,192);
  await page.click('#enter');
  e=(await state(page)).environment;assert.ok(e.hour>=15&&e.hour<15.1);assert.equal(e.rain,0);assert.equal(e.weatherMode,'random');
  await page.screenshot({path:`${shots}/entry-${channel}.png`});
  await page.keyboard.press('KeyT');await page.click('[data-hour="22"]');await page.click('[data-weather="rain"]');
  await page.check('#auto-time');await page.waitForTimeout(800);
  e=(await state(page)).environment;assert.equal(e.hour,22);assert.ok(e.rain>.1);assert.equal(e.weatherMode,'rain');
  await page.click('#world-resume');await page.waitForTimeout(400);
  e=(await state(page)).environment;assert.ok(e.hour>22&&e.hour<22.1);assert.equal(e.weatherMode,'rain');
  report.checks.push('Old night/rain preferences cannot override day/clear entry; cycle speed remains 24 min. Manual settings, menu pause and resume retain the ongoing visit.');
  await ready(page);assert.equal((await state(page)).environment.hour,15);assert.equal((await state(page)).environment.rain,0);
  await page.click('#enter');
  await page.evaluate(()=>window.__GULOU__.game.renderer.setAnimationLoop(null));
  const cases=[['KeyW',[0,-1]],['KeyS',[0,1]],['KeyA',[-1,0]],['KeyD',[1,0]]];
  for(const [key,vector]of cases){
    await setup(page);await page.keyboard.down(key);const sample=await step(page,90);await page.keyboard.up(key);
    expectDirection(displacement(sample),vector,key);assert.equal(sample.flight,'landing');assert.ok(sample.position[1]<74);
    report.keyboard.push({key,...sample});
  }
  await setup(page,Math.PI/2);await page.keyboard.down('KeyW');const turned=await step(page,90);await page.keyboard.up('KeyW');expectDirection(displacement(turned),[-1,0],'rotated W');
  await setup(page);await page.keyboard.down('KeyW');await page.keyboard.down('KeyD');const diagonal=await step(page,90);await page.keyboard.up('KeyW');await page.keyboard.up('KeyD');
  const diagonalDistance=Math.hypot(...displacement(diagonal)),straightDistance=Math.hypot(...displacement(report.keyboard[0]));
  assert.ok(Math.abs(diagonalDistance-straightDistance)<.025,'diagonal steering is not faster');
  const paused=await step(page,60,false);assert.ok(paused.position.every((v,i)=>Math.abs(v-diagonal.position[i])<.02),'pause freezes airborne position');
  await setup(page,0,[0,8,13.5]);await page.keyboard.down('KeyW');const wall=await step(page,65);await page.keyboard.up('KeyW');
  assert.ok(wall.position[2]>12.25,'landing cannot enter North Building');
  // This is the top of the seven-step garden terrace: 1.26 m + .035 m paving.
  await setup(page,0,[0,12,82]);const landed=await step(page,180);
  assert.equal(landed.flight,'walking');assert.equal(landed.grounded,true);
  assert.ok(Math.abs(landed.position[1]-1.295)<.04,`landing rests on raised terrace: ${landed.position}`);
  report.checks.push('Actual keyboard W/S/A/D, camera-relative turn, bounded diagonals, pause, wall collision and completion on ground passed with Rapier at 60 Hz.');
  report.keyboard.push({turned,diagonal,paused,wall,landed});
  await page.close();

  const mobile=await browser.newPage({...devices['Pixel 7']});mobile.on('pageerror',e=>report.errors.push(e.message));
  await ready(mobile);await mobile.tap('#enter');await mobile.waitForFunction(()=>!document.querySelector('#touch-controls').hidden);
  await mobile.evaluate(()=>window.__GULOU__.game.renderer.setAnimationLoop(null));
  const cdp=await mobile.context().newCDPSession(mobile);
  const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y])=>({id:1,x,y,radiusX:8,radiusY:8,force:1}))});
  for(const [label,vector]of [['up',[0,-1]],['down',[0,1]],['left',[-1,0]],['right',[1,0]]]){
    await setup(mobile);const box=await mobile.locator('#touch-stick').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
    await touch('touchStart',[[cx,cy]]);await touch('touchMove',[[cx+vector[0]*box.width*.4,cy+vector[1]*box.width*.4]]);
    const sample=await step(mobile,90);await touch('touchEnd',[]);expectDirection(displacement(sample),vector,`touch ${label}`);
    assert.deepEqual(await mobile.evaluate(()=>window.__GULOU__.game.player.moveInput.toArray()),[0,0],'touch release clears movement');
    report.touch.push({label,...sample});
  }
  await mobile.evaluate(()=>{const g=window.__GULOU__.game;g.cameraRig.update(g.player.position,1,g.world.cameraSolids,false,true);g.renderer.render(g.scene,g.camera);});
  await mobile.screenshot({path:`${shots}/touch-${channel}.png`});await mobile.close();
  report.checks.push('Pixel 7 emulation: actual CDP touch joystick events steer in four directions and release without stuck input.');
  assert.deepEqual(report.errors,[]);report.time=new Date().toISOString();
  await writeFile(`${output}/entry-landing-${channel}.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({browser:channel,checks:report.checks,errors:report.errors}));
}finally{await browser.close();}
