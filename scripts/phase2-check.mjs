import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],missing=[],samples=[],visited=[];let distance=0;
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
await mkdir('docs/validation/phase2',{recursive:true});await mkdir('docs/screenshots/phase2',{recursive:true});
const state=()=>page.evaluate(()=>window.__GULOU__.stats());
try{
 await page.goto((process.env.TEST_URL??'http://localhost:4173/')+'?debug=1');await page.waitForFunction(()=>!document.querySelector('#enter').disabled,{}, {timeout:60000});await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);await page.waitForTimeout(3500);
 // During stance, a planted foot should remain still while the capsule advances.
 const contacts=[];await page.keyboard.down('KeyW');await page.waitForTimeout(1000);
 for(let i=0;i<48;i++){await page.waitForTimeout(50);contacts.push(await page.evaluate(()=>{const a=window.__GULOU__.game.player.avatar,b=a.root.getObjectByName('mixamorigLeftFoot');return{phase:a.gaitPhase,foot:b.getWorldPosition(b.position.clone()).toArray(),root:a.root.position.toArray()};}));}
 await page.keyboard.up('KeyW');
 const slip=[];for(let i=1;i<contacts.length;i++){const a=contacts[i-1],b=contacts[i];if(a.phase>.08&&b.phase<.42&&b.phase>a.phase)slip.push(Math.hypot(b.foot[0]-a.foot[0],b.foot[2]-a.foot[2]));}console.log('Steady stance maximum drift:',Math.max(...slip));
 assert.ok(slip.length>3,'stance samples');assert.ok(Math.max(...slip)<.035,'planted foot should not slide with capsule');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.player.reset();g.cameraRig.reset();});
 const navigation=async(x,z)=>{
  const deadline=Date.now()+40000;let previous=(await state()).position;
  await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');
  try{while(Date.now()<deadline){const s=await state();samples.push(s);distance+=Math.hypot(s.position[0]-previous[0],s.position[2]-previous[2]);previous=s.position;
   assert.ok(s.position[1]>-.25,'stays above ground');if(Math.hypot(x-s.position[0],z-s.position[2])<.75)return;
   await page.evaluate(([x,z])=>{const g=window.__GULOU__.game,p=g.player.position;g.cameraRig.yaw=Math.atan2(-(x-p.x),-(z-p.z));},[x,z]);await page.waitForTimeout(160);
  }throw new Error(`Route blocked towards ${x},${z}; last ${previous}`);}finally{await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');}
 };
 const route=[[0,82],[34,82],[34,48],[37,48,'东大楼'],[34,48],[34,82],[-35,82],[-35,46],[-37,46,'西大楼'],[-35,82],[-23,82],[-23,99],[-29,99,'大礼堂'],[-23,99],[-23,124],[-79,124],[-79,82],[-23,82],[0,68]];
 for(const [x,z,name]of route){await navigation(x,z);if(name){await page.waitForTimeout(400);assert.equal(await page.locator('#location-name').textContent(),name);await page.keyboard.press('KeyE');await page.waitForTimeout(200);assert.equal(await page.locator('#info-title').textContent(),name);assert.ok(await page.locator('#info').isVisible());await page.locator('#info .close').click();await page.click('#resume');visited.push(name);console.log('Reached',name);}}
 // Auditorium porch and closed entrance must both have their own collision.
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.player.teleport(-27,.07,99);g.cameraRig.yaw=Math.PI/2;});await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');await page.waitForTimeout(2600);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');const porch=await state();assert.ok(porch.position[1]>.7&&porch.position[0]>-33.6,`auditorium porch and door: ${porch.position}`);
 const capture=async(file,x,z,yaw,pitch=-.08)=>{await page.evaluate(([x,z,yaw,pitch])=>{const g=window.__GULOU__.game;g.player.teleport(x,.07,z);g.cameraRig.firstPerson=true;g.cameraRig.yaw=yaw;g.cameraRig.pitch=pitch;},[x,z,yaw,pitch]);await page.waitForTimeout(800);await page.screenshot({path:`docs/screenshots/phase2/${file}.png`});};
 await capture('east',15,48,-Math.PI/2);await capture('west',-15,46,Math.PI/2);await capture('auditorium',-13,99,Math.PI/2);await capture('north-detail',-35,24,-.35,-.17);
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.player.reset();g.cameraRig.firstPerson=false;g.cameraRig.reset();});await page.waitForTimeout(1500);await page.screenshot({path:'docs/screenshots/phase2/overview.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const fps=samples.map(s=>s.fps).sort((a,b)=>a-b);
 const result={version:await browser.version(),hardware:'Apple M4, 1440×900, medium quality, headless Chrome',visited,distanceMetres:+distance.toFixed(1),waypoints:route.length,stanceMaxSlipMetres:+Math.max(...slip).toFixed(5),stanceSamples:slip.length,auditoriumPorch:porch.position,fpsMedian:fps[Math.floor(fps.length/2)],fpsP10:fps[Math.floor(fps.length*.1)],errors,missing,last:await state(),time:new Date().toISOString()};
 await writeFile('docs/validation/phase2/expansion.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
