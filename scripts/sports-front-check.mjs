import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const channel=process.env.BROWSER_CHANNEL??'chrome',tag=process.env.REPORT_TAG??'after';
const out='docs/validation/phase35',shots='docs/screenshots/phase35';
await mkdir(out,{recursive:true});await mkdir(shots,{recursive:true});
const browser=await chromium.launch(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{channel});
const report={channel,tag,front:[],gates:[],barriers:[],errors:[],missing:[]};
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>report.errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)report.missing.push(r.url());});
const save=()=>writeFile(`${out}/${tag}-${channel}.json`,JSON.stringify(report,null,2));
const step=frames=>page.evaluate(frames=>{const g=window.__GULOU__.game;for(let i=0;i<frames;i++)g.player.update(1/60,g.cameraRig.yaw,true);return g.player.position.toArray();},frames);
const setup=async(x,z,yaw,riding=false,y=.12)=>{
  await page.evaluate(({x,z,yaw,riding,y})=>{
    const g=window.__GULOU__.game,p=g.player;
    if(!riding)p.parkBicycle();
    p.clearInput();p.teleport(x,y,z);p.physics.step();g.cameraRig.yaw=yaw;g.mode='playing';
    if(riding){p.rideYaw=yaw;p.rideViewYaw=yaw;p.rideSpeed=0;}
  },{x,z,yaw,riding,y});await step(10);
};
const move=async(frames)=>{await page.keyboard.down('KeyW');const q=await step(frames);await page.keyboard.up('KeyW');return q;};
try{
  await page.goto('http://localhost:4173/?debug=1');
  await page.waitForFunction(()=>window.__GULOU__&&!document.querySelector('#enter').disabled&&window.__GULOU__.stats().sectors===3,{},{timeout:90000});
  await page.click('#enter');
  await page.evaluate(()=>{const g=window.__GULOU__.game;g.renderer.setAnimationLoop(null);g.player.reset();g.setTime(14);g.atmosphere.state.autoTime=false;g.atmosphere.state.setWeather('clear');});
  const stand=await page.evaluate(()=>window.__GULOU__.game.world.sports.stand);
  const point=(u,v)=>[stand.x+u*Math.cos(stand.angle)+v*Math.sin(stand.angle),stand.z-u*Math.sin(stand.angle)+v*Math.cos(stand.angle)];
  const local=q=>({u:(q[0]-stand.x)*Math.cos(stand.angle)-(q[2]-stand.z)*Math.sin(stand.angle),v:(q[0]-stand.x)*Math.sin(stand.angle)+(q[2]-stand.z)*Math.cos(stand.angle),y:q[1]});
  async function screen(name,x,y,z,yaw,pitch){
    await page.evaluate(({x,y,z,yaw,pitch})=>{const g=window.__GULOU__.game;g.player.parkBicycle();g.player.teleport(x,y,z);g.player.physics.step();g.cameraRig.firstPerson=true;g.cameraRig.yaw=yaw;g.cameraRig.pitch=pitch;g.mode='photo';g.player.avatar.root.visible=false;g.cameraRig.update(g.player.position,1,g.world.cameraSolids,false,true);g.renderer.render(g.scene,g.camera);document.querySelector('#hud').hidden=true;document.querySelector('#toast').hidden=true;},{x,y,z,yaw,pitch});
    await page.screenshot({path:`${shots}/${tag}-${channel}-${name}.png`});
  }
  await screen('front',-221,1.0,-3.5,Math.PI/2,0);
  // Begin on the running track, beyond the old erroneous fence. Stop before
  // canopy columns, so access to the steps is measured independently of them.
  for(const v of[-6,-3,0,3,6]){
    await setup(...point(12,v),Math.PI/2+stand.angle);
    const result=local(await move(340));report.front.push({mode:'walk-in',offset:v,...result});
    assert.ok(result.u<3.2&&result.u>2,`track to steps at ${v}: ${JSON.stringify(result)}`);
    assert.ok(result.y>.65&&result.y<1.15,'ascends shallow podium steps');
    await setup(...point(2.8,v),stand.angle-Math.PI/2,false,1.1);
    const back=local(await move(340));report.front.push({mode:'walk-out',offset:v,...back});assert.ok(back.u>11.5,'steps to track');
  }
  // A bicycle may cross the opening; the 18 cm steps still stop its 16 cm
  // autostep. Do not make stair riding a requirement of removing the fence.
  assert.ok(await page.evaluate(()=>{const g=window.__GULOU__.game,b=g.world.bicycles[1];g.player.travelTo(b.group.position.x-Math.sin(b.angle)*2,b.group.position.z-Math.cos(b.angle)*2);return g.player.mount(b);}), 'mount bicycle beside its parking spot');
  for(const v of[-6,-3,0,3,6]){
    await setup(...point(12,v),Math.PI/2+stand.angle,true);
    const result=local(await move(100));report.front.push({mode:'ride-in',offset:v,...result});
    // The rider collider extends 95 cm forward: its centre stops that far
    // short of the first riser, after passing the old fence at u ≈ 7.4 m.
    assert.ok(Math.abs(result.u-(stand.width/2+.95))<.12,`ride through opening to first step: ${JSON.stringify(result)}`);
  }
  const gates=await page.evaluate(()=>window.__GULOU__.game.world.sports.gates);
  for(const riding of[true,false])for(const gate of gates)for(const side of[-1,1]){
    const nx=-gate.tz,nz=gate.tx;
    await setup(gate.x+nx*side*4,gate.z+nz*side*4,Math.atan2(nx*side,nz*side),riding);
    const q=await move(riding?160:320),distance=((q[0]-gate.x)*nx+(q[2]-gate.z)*nz)*side;
    report.gates.push({name:gate.name,riding,side,distance});assert.ok(distance< -3,'all four gates remain passable');
  }
  // Both ends retain solid mesh. The west gate occupies local v≈12.79;
  // test the south continuation beyond its intentional 4.2 m opening.
  for(const v of[-12,18]){
    await setup(...point(12,v),Math.PI/2+stand.angle);
    const result=local(await move(340));report.barriers.push({offset:v,...result});assert.ok(result.u>6.5&&result.u<9,'adjacent fence blocks');
  }
  report.roof=await page.evaluate(s=>{const g=window.__GULOU__.game,hit=g.player.physics.castRay({origin:{x:s.x,y:12,z:s.z+3},dir:{x:0,y:-1,z:0}},12,true,undefined,undefined,g.player.collider,g.player.body);return hit?12-hit.timeOfImpact:null;},stand);
  assert.ok(report.roof>4.9&&report.roof<5.1,'canopy remains solid');
  await screen('front',-221,1.0,-3.5,Math.PI/2,0);
  await screen('side',-228,3.2,11,Math.PI*.67,.10);
  await screen('aerial',-204,45,33,Math.PI*.25,.68);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.status='passed';
  console.log(JSON.stringify({channel,status:report.status,front:report.front.length,gates:report.gates.length,barriers:report.barriers.length,roof:report.roof}));
}catch(error){report.status='failed';report.error=String(error);throw error;}
finally{await save();await browser.close();}
