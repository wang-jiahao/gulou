import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const channel = process.env.BROWSER === 'edge' ? 'msedge' : 'chrome';
const browser = await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel}), page = await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],missing=[],checks=[],samples=[],visited=[];let distance=0;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)missing.push(`${r.status()} ${r.url()}`);});
const out='docs/validation/phase3',shots='docs/screenshots/phase3';await mkdir(out,{recursive:true});await mkdir(shots,{recursive:true});
const state=()=>page.evaluate(()=>window.__GULOU__.stats());
const control=async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);};
const reset=()=>page.evaluate(()=>{const g=window.__GULOU__.game;g.player.reset();g.cameraRig.reset();g.cameraRig.firstPerson=false;});
const capture=async(name,x,y,z,yaw,pitch)=>{
 await page.evaluate(([x,y,z,yaw,pitch])=>{const g=window.__GULOU__.game;g.player.noclip=true;g.player.teleport(x,y,z);g.cameraRig.firstPerson=true;g.cameraRig.yaw=yaw;g.cameraRig.pitch=pitch;},[x,y,z,yaw,pitch]);
 await page.waitForTimeout(1200);await page.screenshot({path:`${shots}/${name}.png`});await page.evaluate(()=>window.__GULOU__.game.player.noclip=false);
};
async function navigate(x,z,name){
 const deadline=Date.now()+Math.max(25000,Math.hypot(x-(await state()).position[0],z-(await state()).position[2])/3*1000+10000);let previous=(await state()).position;
 await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');
 try{while(Date.now()<deadline){const s=await state();samples.push(s);distance+=Math.hypot(s.position[0]-previous[0],s.position[2]-previous[2]);previous=s.position;
  assert.ok(s.position[1]>-.18,`ground at ${s.position}`);assert.equal(s.flight,'walking');
  if(Math.hypot(x-s.position[0],z-s.position[2])<.7){if(name){visited.push(name);console.log('Reached',name,s.position);}return;}
  await page.evaluate(([x,z])=>{const g=window.__GULOU__.game,p=g.player.position;g.cameraRig.yaw=Math.atan2(-(x-p.x),-(z-p.z));},[x,z]);await page.waitForTimeout(150);
 }throw new Error(`Route blocked to ${name??''} ${x},${z}; last ${previous}`);}finally{await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');}
}
try{
 await page.goto((process.env.TEST_URL??'http://localhost:4173/')+'?debug=1');await page.waitForFunction(()=>!document.querySelector('#enter').disabled,{}, {timeout:90000});await page.click('#enter');await page.waitForFunction(()=>window.__GULOU__.stats().sectors===3&&window.__GULOU__.stats().environment.heightReady,{}, {timeout:60000});await page.waitForTimeout(3000);
 assert.ok((await state()).map.buildings>=129);assert.equal((await state()).map.roads,36);checks.push('campus footprints, skyline additions and 36 road regions loaded');
 if ((await state()).music.tracks > 0) {
 await page.waitForFunction(()=>window.__GULOU__.stats().music.currentTime>1);const previousTitle=(await state()).music.title;
 await page.keyboard.press('Escape');if(!await page.locator('#settings').isVisible())await page.click('#settings-open');await page.click('#music-next');
 await page.waitForFunction(previous=>window.__GULOU__.stats().music.title!==previous&&window.__GULOU__.stats().music.currentTime>.1,previousTitle);
 await page.click('#music-toggle');assert.equal((await state()).music.paused,true);
 await page.locator('#music-volume').evaluate(input=>{input.value='17';input.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await state()).music.volume,.17);
 await page.click('#music-toggle');await page.waitForFunction(()=>!window.__GULOU__.stats().music.paused);await page.click('#settings-resume');checks.push('shuffle playback, next without repeat, pause, independent volume');
 } else checks.push('public music manifest has no bundled soundtrack');
 await page.keyboard.press('KeyM');assert.ok(await page.locator('#campus-map').isVisible());await page.click('[data-map-region="all"]');await page.waitForTimeout(400);await page.screenshot({path:`${shots}/map.png`});await page.click('[data-map-region="south"]');await page.click('#map-resume');checks.push('map views and resume');
 await page.keyboard.press('KeyT');await page.click('[data-hour="22"]');let e=(await state()).environment;assert.equal(e.hour,22);assert.equal(e.autoTime,false);
 await page.click('[data-weather="rain"]');await page.waitForTimeout(8000);e=(await state()).environment;assert.ok(e.rain>.9&&e.night>.95&&e.wetness>.5);await page.click('#world-resume');await page.screenshot({path:`${shots}/rain-night.png`});
 await page.keyboard.press('KeyT');await page.click('[data-hour="14"]');await page.check('#auto-time');const pausedHour=(await state()).environment.hour;await page.waitForTimeout(800);assert.equal((await state()).environment.hour,pausedHour);
 await page.click('[data-weather="random"]');await page.evaluate(()=>window.__GULOU__.game.atmosphere.state.nextWeatherIn=.05);const count=(await state()).environment.weatherTransitions;await page.click('#world-resume');await page.waitForTimeout(1100);assert.ok((await state()).environment.hour>pausedHour);assert.ok((await state()).environment.weatherTransitions>count);
 await page.keyboard.press('KeyT');await page.click('[data-weather="clear"]');await page.click('[data-hour="14"]');await page.click('#world-resume');checks.push('manual day/night, automatic time, pause in menu, rain/wetness, random weather transition');
 await reset();await page.keyboard.press('KeyF');await page.waitForFunction(()=>window.__GULOU__.stats().flight==='gliding',{}, {timeout:8000});const flight=(await state()).position;assert.ok(flight[1]>20);await control('Space',1400);assert.ok((await state()).position[1]>flight[1]+4);
 await page.keyboard.down('ShiftLeft');await control('KeyW',1600);await page.keyboard.up('ShiftLeft');const boosted=(await state()).position;assert.ok(Math.hypot(boosted[0]-flight[0],boosted[2]-flight[2])>20);
 await page.keyboard.press('KeyT');const pausePos=(await state()).position;await page.waitForTimeout(600);assert.ok((await state()).position.every((v,i)=>Math.abs(v-pausePos[i])<.02));await page.click('#world-resume');
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>window.__GULOU__.stats().flight==='walking',{}, {timeout:15000});assert.ok((await state()).position[1]>=-.1);checks.push('launch, glide, climb, boost, pause in air, land');
 await reset();await page.keyboard.press('KeyF');await page.waitForFunction(()=>window.__GULOU__.stats().flight==='gliding');
 await page.evaluate(()=>window.__GULOU__.game.player.teleport(0,179,82));await control('Space',1400);assert.ok((await state()).position[1]<=180.01);checks.push('180 m flight ceiling');
 await page.evaluate(()=>{const g=window.__GULOU__.game;g.player.teleport(0,8,26);g.cameraRig.yaw=0;});await control('KeyW',1700);assert.ok((await state()).position[2]>12.3,`flight wall collision ${(await state()).position}`);checks.push('flight collides with North Building');await reset();
 console.log('Feature checks passed; walking route begins.');
 const route=[[0,22,'北大楼'],[0,82],[-23,82],[-27,99,'大礼堂'],[-23,99],[-18,114],[-18,145],[-85,147,'教学楼／两江路'],[-85,182],[-86,255,'中大路'],[-90,330],[-91,352,'汉口路校门'],[-90,375],[-89,392,'南园北门'],[-78,432],[-70,452,'南园喷泉'],[-42,478],[-41,526,'南园宿舍区'],[-37,548],[-37,600],[-37,634],[25,634],[25,665,'南园八舍东侧'],[25,691],[-35,691],[-35,715,'广州路校门']];
 if(process.env.SKIP_ROUTE!=='1'){for(const [x,z,name]of route)await navigate(x,z,name);checks.push('continuous on-foot route through north campus, Hankou gate, south campus');}
 await capture('teaching',-85,.1,170,0,-.15);await capture('hankou',-91,.1,367,0,-.05);await capture('aerial',0,150,290,.35,.7);await capture('south',-45,90,730,.3,.48);
 await reset();await page.waitForTimeout(3000);await page.screenshot({path:`${shots}/overview.png`});
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>window.__GULOU__.stats().flight==='gliding');await page.keyboard.down('Space');await page.waitForTimeout(5000);await page.keyboard.up('Space');await page.evaluate(()=>{const g=window.__GULOU__.game;g.cameraRig.yaw=.5;g.cameraRig.pitch=.42;});await page.waitForTimeout(500);await page.screenshot({path:`${shots}/gliding.png`});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 const fps=samples.map(s=>s.fps).sort((a,b)=>a-b);const result={browser:channel,version:await browser.version(),hardware:'Apple M4, 1440×900, medium, headless',checks,visited,distanceMetres:+distance.toFixed(1),fpsMedian:fps[Math.floor(fps.length*.5)],fpsP10:fps[Math.floor(fps.length*.1)],errors,missing,last:await state(),time:new Date().toISOString()};await writeFile(`${out}/${channel}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){await page.screenshot({path:`${shots}/failure.png`});console.error('STATE',await state().catch(()=>null),'ERRORS',errors);throw error;}finally{await browser.close();}
