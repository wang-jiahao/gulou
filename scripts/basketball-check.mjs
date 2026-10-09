import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const entry=resolve('node_modules/.cache/gulou-basketball-check.mjs');
await build({stdin:{contents:`export * from './game/basketball-physics.ts';export * from './world/basketball-layout.ts';`,resolveDir:resolve('src'),loader:'ts'},bundle:true,packages:'external',outfile:entry,platform:'node',format:'esm'});
const {BasketballPhysics,basketballHoops,downwardBasket,BALL_RADIUS}=await import(pathToFileURL(entry).href);
await RAPIER.init();
const world=new RAPIER.World({x:0,y:-9.81,z:0});
world.timestep=1/60;
world.createCollider(RAPIER.ColliderDesc.cuboid(1200,.1,1200).setTranslation(0,-.1,0));
const ball=new BasketballPhysics(world),report={shots:[],collision:[],lifecycle:[]};
let events=0;ball.onScore=()=>events++;
const step=(n=1)=>{for(let i=0;i<n;i++){world.step();ball.update();}};
function launch(hoop,distance,power){
 const direction=hoop.start.clone().sub(hoop.center).setY(0).normalize();
 const from=hoop.center.clone().addScaledVector(direction,distance).setY(1.81);
 ball.reset(from);assert.ok(ball.hold());ball.follow(from);assert.ok(!ball.collider.isEnabled());
 // Real input holds the ball across physics frames while charging a shot.
 step(60);assert.ok(ball.position.distanceTo(from)<1e-5,'charge keeps the held ball fixed');
 assert.ok(ball.shoot(hoop,power));assert.ok(ball.collider.isEnabled());
 return from;
}
for(const hoop of basketballHoops)for(const distance of [4.6,7.3]){
 const before=ball.score,shots=ball.shots,expected=distance>6.75?3:2;
 launch(hoop,distance,.72);step(360);
 assert.equal(ball.score-before,expected,`${hoop.id} ${distance}m sweetspot scores`);
 assert.equal(ball.shots,shots+1);
 const score=ball.score;step(180);assert.equal(ball.score,score,'one basket scores once');
 report.shots.push({hoop:hoop.id,distance,points:expected});
}
const hoop=basketballHoops[0];
for(const power of [.03,.98]){
 const before=ball.score;launch(hoop,4.6,power);step(360);
 assert.equal(ball.score,before,`mistimed ${power} misses`);
 report.shots.push({power,points:0});
}
const center=hoop.center;
assert.equal(downwardBasket(center.clone().add(new T.Vector3(0,-1,0)),center.clone().add(new T.Vector3(0,1,0)),hoop),false,'upward shot cannot score');
assert.equal(downwardBasket(center.clone().add(new T.Vector3(.3,1,0)),center.clone().add(new T.Vector3(.3,-1,0)),hoop),false,'outside rim cannot score');
assert.equal(downwardBasket(center.clone().add(new T.Vector3(0,1,0)),center.clone().add(new T.Vector3(0,-1,0)),hoop),true);
// Board impact must reverse horizontal velocity before passing through the glass.
const inward=hoop.start.clone().sub(center).setY(0).normalize();
ball.reset(hoop.board.clone().addScaledVector(inward,1));ball.body.setLinvel(inward.clone().multiplyScalar(-6),true);
let rebound=false;for(let i=0;i<20;i++){step();if(new T.Vector3().copy(ball.body.linvel()).dot(inward)>1)rebound=true;}
assert.ok(rebound,'backboard collision rebounds');report.collision.push('board rebound');
ball.reset(center.clone().add(new T.Vector3(.225,.5,0)));ball.body.setLinvel({x:0,y:-2,z:0},true);
let rimHit=false;for(let i=0;i<18;i++){step();if(ball.body.linvel().y>.2)rimHit=true;}
assert.ok(rimHit,'rim collision rebounds');report.collision.push('rim rebound');
launch(hoop,4.6,.72);step(20);const position=ball.position,velocity={...ball.body.linvel()};
ball.prepare(false);step(60);assert.ok(ball.position.distanceTo(position)<1e-5,'pause freezes flight');
ball.prepare(true);assert.ok(new T.Vector3().copy(ball.body.linvel()).distanceTo(new T.Vector3().copy(velocity))<1e-5,'resume preserves shot velocity');step(240);
report.lifecycle.push('pause/resume flight');
ball.hold();ball.follow(hoop.start.clone().setY(1.8));step(5);assert.ok(!ball.collider.isEnabled());
ball.prepare(false);const heldPosition=ball.position;step(60);assert.ok(ball.position.distanceTo(heldPosition)<1e-5);assert.equal(ball.shoot(hoop,.72),false);
ball.reset(hoop.start);step(60);assert.equal(ball.held,false);assert.equal(ball.active,false);assert.ok(ball.collider.isEnabled());assert.ok(ball.position.distanceTo(hoop.start)<1e-5);
ball.prepare(true);step(240);assert.ok(Math.abs(ball.position.y-BALL_RADIUS)<.01,'reset returns a resting grounded ball');
report.lifecycle.push('held collider disabled','paused reset remains frozen','grounded reset');
assert.equal(events,19,'one event per valid shot including resumed shot');
assert.equal(basketballHoops.length,9);
report.score=ball.score;report.attempts=ball.shots;report.events=events;
await mkdir('docs/validation/v0.96',{recursive:true});
await writeFile(`docs/validation/v0.96/basketball-physics-${Date.now()}.json`,JSON.stringify(report,null,2));
world.free();console.log(JSON.stringify({ok:true,shots:report.shots.length,collision:report.collision,lifecycle:report.lifecycle,events}));
