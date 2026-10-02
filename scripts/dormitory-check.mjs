import{chromium}from'playwright';import assert from'node:assert/strict';import{writeFile}from'node:fs/promises';
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1440,height:900}}),errors=[],visits=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://localhost:4173/?debug=1');await p.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:90000});await p.click('#enter');await p.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 const dorms=await p.evaluate(()=>window.__GULOU__.game.scene.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.filter(r=>r.dormitory));
 for(const d of dorms){await p.keyboard.press('KeyM');const value=await p.locator('#travel-place option').evaluateAll((options,name)=>options.find(o=>o.textContent===name)?.value,d.name);assert.ok(value,`map entry ${d.name}`);await p.selectOption('#travel-place',value);await p.click('#travel-place-go');await p.waitForTimeout(150);const s=await p.evaluate(()=>window.__GULOU__.stats());assert.equal(s.flight,'walking');assert.ok(s.position[1]<.7,`${d.name} travel must land outside entrance on ground: ${s.position}`);visits.push({name:d.name,position:s.position});
  if(['plan-94','plan-123','plan-110'].includes(d.id)){
   await p.evaluate(d=>{const g=window.__GULOU__.game;g.cameraRig.firstPerson=true;g.cameraRig.pitch=-.22;g.setTime(14);g.atmosphere.state.autoTime=false;const[x,z,nx,nz]=d.frontage;const tryPosition=g.player.travelTo(x+nx*12,z+nz*12);if(tryPosition&&tryPosition.y>.7)g.player.travelTo(x+nx*4,z+nz*4);g.cameraRig.yaw=Math.atan2(g.player.position.x-x,g.player.position.z-z);},d);
   await p.waitForTimeout(200);await p.keyboard.press('KeyP');await p.locator('#photo-panel').evaluate(e=>e.hidden=true);await p.locator('#toast').evaluate(e=>e.hidden=true);await p.screenshot({path:`docs/screenshots/phase10/dorm-${d.id}.png`});await p.keyboard.press('KeyP');
  }
 }
 assert.ok(visits.some(v=>v.name==='南园2舍'));assert.deepEqual(errors,[]);await writeFile('docs/validation/phase10/dormitories.json',JSON.stringify({count:visits.length,visits,errors},null,2));console.log(JSON.stringify({count:visits.length,errors}));
}catch(e){await p.screenshot({path:'docs/validation/phase10/dorm-failure.png'});throw e;}finally{await b.close();}
