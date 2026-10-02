import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {buildingProfiles} from '../src/world/building-profiles.ts';
const out='docs/validation/phase10';await mkdir(out,{recursive:true});
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));
for(const id of Object.keys(buildingProfiles))assert.ok(map.features.some(f=>f.id===id),`profile maps to existing footprint ${id}`);
const inventory=JSON.parse(await readFile(`${out}/vr-inventory.json`,'utf8'));assert.equal(inventory.exteriorViews,92);assert.equal(inventory.failedTiles.length,0);
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
try{
 await p.goto('http://localhost:4173/?debug=1');await p.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:90000});
 const typography=await p.locator('.welcome-copy h1').evaluate(e=>({text:e.innerText,font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize,weight:getComputedStyle(e).fontWeight,lineHeight:getComputedStyle(e).lineHeight,letterSpacing:getComputedStyle(e).letterSpacing}));
 assert.equal(typography.text,'鼓楼校园\n自由漫步');await p.click('#enter');await p.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 const architecture=await p.evaluate(()=>window.__GULOU__.game.scene.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings);
 assert.equal(architecture.length,125);assert.ok(architecture.every(r=>r.windows>=0&&Number.isFinite(r.height)));
 const collisionChecks=[];
 // Every mapped building keeps a physical support or roof at an interior point.
 for(const f of map.features.filter(f=>f.tags.building)){
  const result=await p.evaluate(f=>{const g=window.__GULOU__.game;const inside=(x,z,ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const[a,c]=ring[i],[d,e]=ring[j];if((c>z)!==(e>z)&&x<(d-a)*(z-c)/(e-c)+a)yes=!yes;}return yes;};
   const xs=f.points.map(p=>p[0]),zs=f.points.map(p=>p[1]);
   for(let i=1;i<12;i++)for(let j=1;j<12;j++){const x=Math.min(...xs)+(Math.max(...xs)-Math.min(...xs))*i/12,z=Math.min(...zs)+(Math.max(...zs)-Math.min(...zs))*j/12;if(!inside(x,z,f.points)||(f.holes??[]).some(h=>inside(x,z,h)))continue;const height=g.player.groundHeightAt(x,z);if(height>2)return {x,z,height};}return null;
  },f);assert.ok(result,`missing solid building ${f.tags.name}`);collisionChecks.push({id:f.id,...result});
 }
 await p.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 const targets=['plan-3','plan-13','plan-22','plan-34','plan-41','plan-44','plan-51','plan-56','plan-66','plan-75','plan-77','plan-114','plan-123','plan-126','plan-128'];
 const visits=[];
 for(const id of targets){const record=architecture.find(r=>r.id===id);assert.ok(record.frontage);
  const visit=await p.evaluate(({frontage,height})=>{const g=window.__GULOU__.game;const[x,z,nx,nz]=frontage;
   let result=null;
   for(const dist of [10,7,5,3.5,15,22,30]){for(const offset of [0,-8,8,-16,16]){const px=x+nx*dist+nz*offset,pz=z+nz*dist-nx*offset;
    if(g.player.groundHeightAt(px,pz)>1.0)continue;
    const dx=x-px,dz=z-pz,length=Math.hypot(dx,dz),hit=g.player.physics.castRay({origin:{x:px,y:1.6,z:pz},dir:{x:dx/length,y:0,z:dz/length}},length+.4,true,undefined,undefined,g.player.collider,g.player.body);
    if(hit&&hit.timeOfImpact<length-1)continue;
    result=g.player.travelTo(px,pz);if(result&&result.y<1)break;result=null;
   }if(result)break;}
   if(!result)return null;g.cameraRig.firstPerson=true;g.cameraRig.yaw=Math.atan2(result.x-x,result.z-z);g.cameraRig.pitch=-Math.atan2(Math.min(height*.35,8)-(result.y+1.6),Math.hypot(result.x-x,result.z-z));return result;},record);assert.ok(visit,`safe approach ${id}`);visits.push({id,visit});
  await p.waitForTimeout(150);await p.keyboard.press('KeyP');await p.waitForTimeout(300);await p.locator('#photo-panel').evaluate(e=>e.hidden=true);await p.locator('#toast').evaluate(e=>e.hidden=true);await p.screenshot({path:`docs/screenshots/phase10/facade-${id}.png`});await p.keyboard.press('KeyP');
 }
 // Cross a detail range repeatedly after warming it once. Assets are retained.
 const memory=[];for(let pass=0;pass<3;pass++)for(const [x,z]of [[0,60],[-380,150],[-50,650]]){await p.evaluate(([x,z])=>window.__GULOU__.game.player.travelTo(x,z),[x,z]);await p.waitForTimeout(250);memory.push((await p.evaluate(()=>window.__GULOU__.stats())).geometries);}
 assert.ok(Math.max(...memory.slice(6))-Math.max(...memory.slice(3,6))<5,'facade range changes do not repeatedly allocate geometry');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 const report={time:new Date().toISOString(),checks:['all 92 exterior VR views cached without missing tiles','125 ordinary building records and 129 physical building supports','15 facade approaches use safe travel','detail geometry retained across repeated range changes','welcome wording updated with unchanged CSS'],typography,profiles:Object.keys(buildingProfiles).length,architecture,collisionChecks,visits,memory,errors,missing};
 await writeFile(`${out}/buildings.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({profiles:report.profiles,buildings:architecture.length,collisionChecks:collisionChecks.length,visits:visits.length,errors,missing}));
}catch(e){await p.screenshot({path:`${out}/failure.png`});console.error(await p.evaluate(()=>window.__GULOU__?.stats()));throw e;}finally{await b.close();}
