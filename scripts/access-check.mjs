import{chromium}from'playwright';import assert from'node:assert/strict';import{writeFile,mkdir}from'node:fs/promises';
import{campusEntrances}from'../src/world/access-controls.ts';
await mkdir('docs/validation/phase10',{recursive:true});
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1440,height:900}}),errors=[],passages=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://localhost:4173/?debug=1');await p.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:90000});await p.click('#enter');await p.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 assert.match(await p.locator('#hint').innerText(),/Shift\s*加速/);
 for(const e of campusEntrances){
  for(const offset of e.pedestrians){
   const x=e.x+offset*Math.cos(e.angle),z=e.z-offset*Math.sin(e.angle),sx=x+Math.sin(e.angle)*3,sz=z+Math.cos(e.angle)*3;
   const ground=await p.evaluate(([x,z])=>window.__GULOU__.game.player.groundHeightAt(x,z),[sx,sz]);assert.ok(ground<.5,`gate ${e.id} lane ${offset} starts on ground, got ${ground}`);
   await p.evaluate(([x,z,yaw])=>{const g=window.__GULOU__.game;g.player.travelTo(x,z);g.cameraRig.yaw=yaw;g.cameraRig.pitch=0;},[sx,sz,e.angle]);
   await p.keyboard.down('ShiftLeft');await p.keyboard.down('KeyW');await p.waitForTimeout(850);const opened=await p.evaluate(()=>window.__GULOU__.game.world.access.snapshot());await p.waitForTimeout(850);await p.keyboard.up('KeyW');await p.keyboard.up('ShiftLeft');
   const state=await p.evaluate(()=>({position:window.__GULOU__.stats().position,access:window.__GULOU__.game.world.access.snapshot()}));
   const along=(state.position[0]-x)*Math.sin(e.angle)+(state.position[2]-z)*Math.cos(e.angle);
   assert.ok(along<-.9,`${e.id} pedestrian passage ${offset} blocked at ${state.position}`);assert.ok(state.position[1]<.5,'walk stays on ground');
   assert.ok(opened.readers.some(r=>r.entrance===e.id&&r.open>.9),'reader opens on approach');passages.push({gate:e.id,lane:offset,position:state.position});
  }
 }
 await p.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(-91,351);});await p.waitForTimeout(1200);
 const open=await p.evaluate(()=>window.__GULOU__.game.world.access.snapshot());assert.ok(open.booms.find(b=>b.entrance==='hankou').open>.9);
 await p.keyboard.press('KeyM');const paused=await p.evaluate(()=>window.__GULOU__.game.world.access.snapshot());await p.waitForTimeout(500);assert.deepEqual(await p.evaluate(()=>window.__GULOU__.game.world.access.snapshot()),paused);await p.click('#map-resume');
 await p.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(0,65);});await p.waitForTimeout(2300);const shut=await p.evaluate(()=>window.__GULOU__.game.world.access.snapshot());assert.ok(shut.booms.find(b=>b.entrance==='hankou').open<.05);
 await p.keyboard.press('KeyM');const options=await p.locator('#travel-place option').allTextContents();assert.ok(options.includes('南园2舍'));assert.ok(options.includes('南园8舍'));assert.ok(options.includes('北京西路门'));await p.click('#map-resume');
 await p.evaluate(()=>{const g=window.__GULOU__.game;g.player.travelTo(-83.45,347.5);g.cameraRig.firstPerson=true;g.cameraRig.yaw=.5;g.cameraRig.pitch=.05;});await p.waitForTimeout(900);await p.keyboard.press('KeyP');await p.locator('#photo-panel').evaluate(e=>e.hidden=true);await p.screenshot({path:'docs/images/entrance-controls.png'});
 assert.deepEqual(errors,[]);await writeFile('docs/validation/phase10/access.json',JSON.stringify({checks:['all mapped entrance pedestrian lanes walked through','readers open on approach','vehicle boom opens and closes','access animation pauses in map menu','named dormitories and entrances available in map','Shift hint says acceleration'],entrances:campusEntrances,passages,open,shut,errors},null,2));console.log(JSON.stringify({entrances:campusEntrances.length,passages:passages.length,errors}));
}catch(e){await p.screenshot({path:'docs/validation/phase10/access-failure.png'});console.error(await p.evaluate(()=>window.__GULOU__?.stats()));throw e;}finally{await b.close();}
