import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {publicStreets,streetPoint,streetLocation} from '../src/world/street-layout.ts';
import {StreetTraffic} from '../src/game/street-traffic.ts';

// Exercise the production traffic class with real Rapier steps, without tying
// stopping-distance and wrap checks to browser frame timing.
await RAPIER.init();
const registrations=[];
const world=new RAPIER.World({x:0,y:0,z:0}),player={physics:world,position:new T.Vector3(0,100,0),flying:false,registerVehicle:(solid,collider)=>registrations.push({solid,collider})};
world.timestep=1/60;
const traffic=new StreetTraffic(new T.Scene(),player),report={bends:[],yielding:[],wrapping:[],collision:[]};
assert.equal(registrations.length,4,'all road cars can transfer their collider to the driver');
const tick=(active=true)=>{traffic.prepare(1/60,active);world.step();traffic.sync();};
const run=(seconds,active=true)=>{for(let i=0;i<seconds*60;i++)tick(active);};
function place(car,u,speed=4.5){
 car.u=u;car.speed=speed;const p=streetPoint(car.road,u,car.lane),yaw=p.angle-Math.PI/2+(car.direction<0?Math.PI:0),q={x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)},v={x:p.x,y:.86,z:p.z};
 car.body.setTranslation(v,true);car.body.setNextKinematicTranslation(v);car.body.setRotation(q,true);car.body.setNextKinematicRotation(q);world.step();traffic.sync();
}
function checkSync(car){
 const p=car.body.translation(),q=car.body.rotation();
 assert.ok(car.group.position.distanceTo(new T.Vector3(p.x,p.y-.8,p.z))<1e-6);
 assert.ok(car.group.quaternion.angleTo(new T.Quaternion(q.x,q.y,q.z,q.w).normalize())<.001);
 const expected=streetPoint(car.road,car.u,car.lane);assert.ok(Math.hypot(p.x-expected.x,p.z-expected.z)<.0001);
}
for(const road of publicStreets)for(const direction of[-1,1]){
 const car=traffic.cars.find(c=>c.road===road&&c.direction===direction);
 for(const node of road.profile?.slice(1,-1)??[]){
  const knot=node[0]-road.x;place(car,knot-direction*.15);let maxStep=0;
  for(let i=0;i<8;i++){const before=car.group.position.clone();tick();maxStep=Math.max(maxStep,before.distanceTo(car.group.position));checkSync(car);}
  assert.ok((car.u-knot)*direction>0);assert.ok(maxStep<.08,'bend does not teleport the lane offset');
  report.bends.push({road:road.name,direction,knot,maxStep});
 }
 // Reserved crossing, a person directly in the lane, then move away and resume.
 for(const kind of['crossing','lane']){
  place(car,kind==='crossing'?-18*direction:35,4.5);
  const person=streetPoint(road,kind==='crossing'?0:35+direction*8,kind==='crossing'?-(road.width/2+1):car.lane);
  player.position.set(person.x,.06,person.z);run(3);
  assert.ok(car.waiting&&car.speed<.01,`${road.name} ${direction} yields to ${kind}`);
  const location=streetLocation(road,person.x,person.z),gap=(location.u-car.u)*direction;
  assert.ok(gap>2.9,'car stops before contacting the pedestrian');
  const stopped=car.u;player.position.set(0,100,0);run(1.5);assert.ok(car.speed>3.7&&(car.u-stopped)*direction>2);
  report.yielding.push({road:road.name,direction,kind,gap,resumedSpeed:car.speed});
 }
 // A solid front face must rotate with the model, tested against the actual collider.
 place(car,65);const forward=new T.Vector3(0,0,-1).applyQuaternion(car.group.quaternion),dx=forward.x,dz=forward.z,cp=car.body.translation();
 const hit=world.castRay(new RAPIER.Ray({x:cp.x+dx*5,y:cp.y,z:cp.z+dz*5},{x:-dx,y:0,z:-dz}),6,true,undefined,undefined,undefined,undefined,c=>c.parent()?.handle===car.body.handle);
 assert.ok(hit&&Math.abs(hit.timeOfImpact-2.88)<.001,'front collision surface matches the rotated car');report.collision.push({id:car.id,distance:hit.timeOfImpact});
 // Wrapping is a teleport: the next physics step must not sweep 700m.
 place(car,349.99*direction);player.position.set(0,100,0);tick();checkSync(car);assert.ok(car.u*direction< -349);assert.ok(Math.hypot(car.body.linvel().x,car.body.linvel().z)<.01);
 const wrapped=car.u;tick();assert.ok(Math.abs(car.u-wrapped)<.08);assert.ok(Math.hypot(car.body.linvel().x,car.body.linvel().z)<4.6);
 // If the destination is occupied, keep the car at the old end until clear.
 place(car,349.99*direction);const destination=streetPoint(road,-350*direction,car.lane);player.position.set(destination.x,.06,destination.z);tick();assert.equal(car.u,349.99*direction);assert.equal(car.speed,0);
 player.position.set(0,100,0);run(.3);assert.ok(car.u*direction< -349);report.wrapping.push({id:car.id,safe:true,occupiedDestinationWaits:true});
}
const before=traffic.cars.map(c=>({u:c.u,p:c.group.position.toArray(),q:c.group.quaternion.toArray()}));run(1,false);
assert.deepEqual(traffic.cars.map(c=>({u:c.u,p:c.group.position.toArray(),q:c.group.quaternion.toArray()})),before);
report.pause='passed';report.status='passed';await mkdir('docs/validation/phase26',{recursive:true});await writeFile('docs/validation/phase26/traffic.json',JSON.stringify(report,null,2));
console.log({status:report.status,bends:report.bends.length,yielding:report.yielding.length,wraps:report.wrapping.length,collision:report.collision.length,pause:report.pause});world.free();
