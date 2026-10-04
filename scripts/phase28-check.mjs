import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='docs/validation/phase28',channel=process.env.BROWSER_CHANNEL||'chrome';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={channel,errors:[],missing:[]};let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
 await page.goto('http://localhost:4173/?debug=1');await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:60000});
 await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3);
 report.building=await page.evaluate(()=>window.__GULOU__.game.world.root.getObjectByName('plan-based campus buildings with VR facade profiles').userData.buildings.find(b=>b.id==='plan-73'));
 const sign=report.building.lettering;assert.equal(sign.text,'南教学楼');assert.match(sign.method,/perspective-rectified/);assert.ok(report.building.frontage[2]<-.5);
 report.fixed=await page.evaluate(async()=>{const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(n=>n.toString(16).padStart(2,'0')).join('');const out=[];for(const m of window.__GULOU__.game.world.fixedMeshes)out.push([await hash(m.vertices),await hash(m.indices)]);return out;});
 const baseline=await readFile('docs/validation/phase27/after-chrome.json','utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 report.comparedWithBaseline=Boolean(baseline);if(baseline)assert.deepEqual(report.fixed,baseline.geometry.fixed,'all existing physics surfaces remain unchanged');
 report.visibleStrokes=await page.evaluate(sign=>{const g=window.__GULOU__.game;let count=0,minY=Infinity,maxY=-Infinity;g.world.root.traverse(m=>{if(!m.isMesh||m.material.name!=='reconstructed-gold-sign-strokes')return;const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i);if(Math.hypot(x-sign.x,z-sign.z)<sign.width&&y>sign.y-.01&&y<sign.y+sign.height+.01){count++;minY=Math.min(y,minY);maxY=Math.max(y,maxY);}}});return{count,minY,maxY};},sign);
 assert.ok(report.visibleStrokes.count>100);assert.ok(Math.abs(report.visibleStrokes.minY-sign.y)<.02);assert.ok(Math.abs(report.visibleStrokes.maxY-sign.y-sign.height)<.02);
 const door=await page.evaluate(()=>{const g=window.__GULOU__.game,d=g.world.doors.find(d=>d.name==='南教学楼');g.player.travelTo(d.x+Math.sin(d.yaw)*4,d.z+Math.cos(d.yaw)*4);g.cameraRig.yaw=d.yaw;return d;});
 await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(2200);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
 const p=await page.evaluate(()=>window.__GULOU__.stats().position),clearance=(p[0]-door.x)*Math.sin(door.yaw)+(p[2]-door.z)*Math.cos(door.yaw);
 report.door={position:p,clearance};assert.ok(clearance>.22&&clearance<1.1,'entry remains reachable and closed');assert.ok(Math.abs(p[1]-door.y)<.2);
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');g.cameraRig.firstPerson=true;g.mode='photo';document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;});
 for(const [name,distance,side,height,pitch]of[['front',10,0,2.4,-.05],['oblique',12,6,2.8,.02],['context',22,-7,9,.3]]){
  await page.evaluate(({door,distance,side,height,pitch})=>{const g=window.__GULOU__.game,nx=Math.sin(door.yaw),nz=Math.cos(door.yaw);g.player.teleport(door.x+nx*distance+nz*side,height,door.z+nz*distance-nx*side);g.cameraRig.yaw=door.yaw+Math.atan2(side,distance);g.cameraRig.pitch=pitch;},{door,distance,side,height,pitch});
  await page.waitForTimeout(600);await page.screenshot({path:`${out}/${channel}-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);await writeFile(`${out}/${channel}.json`,JSON.stringify(report,null,2));console.log({channel,strokes:report.visibleStrokes,door:report.door,physics:report.fixed.length,errors:report.errors});
}catch(error){report.failure=String(error);await writeFile(`${out}/${channel}-failure.json`,JSON.stringify(report,null,2));if(page)await page.screenshot({path:`${out}/${channel}-failure.png`});throw error;}
finally{await browser.close();}
