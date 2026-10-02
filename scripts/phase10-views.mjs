import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const tag=process.env.VIEW_TAG??'after',url=process.env.TEST_URL??'http://localhost:4173/';
const browser=await chromium.launch({channel:'chrome'}),p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await mkdir('docs/screenshots/phase10',{recursive:true});
try{
 await p.goto(url+'?debug=1');await p.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled,{}, {timeout:90000});await p.screenshot({path:`docs/screenshots/phase10/welcome-${tag}.png`});
 await p.click('#enter');await p.waitForFunction(()=>window.__GULOU__.stats().sectors===3,{}, {timeout:90000});
 await p.evaluate(()=>{const g=window.__GULOU__.game;g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
 const views=[['north',0,68,1.65,0,-.15],['east',12,49,1.65,-Math.PI/2,-.12],['west',-14,48,1.65,Math.PI/2,-.12],['auditorium',-17,99,1.65,Math.PI/2,-.10],['teaching',-84,174,1.65,0,-.17],['museum',35,295,5,Math.PI/2,-.20],['astronomy',-385,157,1.65,0,-.20],['dorm8',-34,696,1.65,0,-.22],['south-hotel',-144,709,1.65,0,-.16],['rabe',93,690,1.65,-Math.PI/2,-.12],['chemistry',-280,-128,1.65,0,-.24],['north-aerial',-200,150,110,0,.65],['south-aerial',-50,726,100,0,.62]];
 for(const [name,x,z,y,yaw,pitch]of views){
  await p.evaluate(([x,z,y,yaw,pitch])=>{const g=window.__GULOU__.game;g.player.teleport(x,y,z);g.cameraRig.firstPerson=true;g.cameraRig.yaw=yaw;g.cameraRig.pitch=pitch;},[x,z,y,yaw,pitch]);
  await p.keyboard.press('KeyP');await p.waitForTimeout(550);await p.locator('#photo-panel').evaluate(e=>e.hidden=true);await p.locator('#toast').evaluate(e=>e.hidden=true);await p.screenshot({path:`docs/screenshots/phase10/${name}-${tag}.png`});await p.keyboard.press('KeyP');
 }
 const stats=await p.evaluate(()=>window.__GULOU__.stats());await writeFile(`docs/validation/phase10/views-${tag}.json`,JSON.stringify({errors,stats},null,2));console.log(JSON.stringify({errors,stats}));
}finally{await browser.close();}
