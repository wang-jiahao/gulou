import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createAvatar } from './avatar.ts';
import { bounds, spawn, maxFlightAltitude } from '../world/world.ts';
import type { Solid } from '../world/geometry.ts';
import type { CollisionMesh } from '../world/collision-mesh.ts';
import { createGlider } from './glider.ts';
import {terrainHeight} from '../world/courtyard-terrain.ts';
import type {CampusBicycle} from '../world/bicycle.ts';
import {carFit, type CampusCar} from '../world/car.ts';
import {movementSpeeds as speeds} from './movement.ts';

// About three storeys in this metre-scaled game, not a medical injury boundary.
export const FATAL_FALL_HEIGHT = 10;
export type FallRespawnEvent = {
  reason: 'fall'; count: number; fallHeight: number;
  impact: { x: number; y: number; z: number };
  spawn: { x: number; y: number; z: number };
};

export class Player {
  avatar: Awaited<ReturnType<typeof createAvatar>>;
  readonly physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  readonly body = this.physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, 1, spawn.z));
  readonly collider = this.physics.createCollider(RAPIER.ColliderDesc.capsule(.57, .27), this.body);
  readonly motor = this.physics.createCharacterController(.02);
  readonly position = spawn.clone();
  keys = new Set<string>();
  readonly moveInput = new T.Vector2();
  clearInput() { this.keys.clear(); this.moveInput.set(0, 0); this.jumpRequest=0; }
  grounded=false;
  private jumpRequest=0;
  requestJump(){if(!this.riding&&!this.flying&&!this.seated)this.jumpRequest=.12;}
  velocityY = 0;
  speed = 0;
  respawnCount = 0;
  lastRespawn: FallRespawnEvent | null = null;
  onRespawn: (event: FallRespawnEvent) => void = () => {};
  private fallPeak: number | null = null;
  riding:CampusBicycle|CampusCar|null=null;
  get driving(){return this.riding!=null && 'kind' in this.riding && this.riding.kind==='car';}
  registerVehicle(solid:Solid,collider:RAPIER.Collider){this.solidColliders.set(solid,collider);}
  rideYaw=0;
  rideSpeed=0;
  pedalPhase=0;
  rideCameraTurn=0;
  rideSteering=0;
  private rideViewYaw=0;
  private solidColliders=new Map<Solid,RAPIER.Collider>();
  yaw = 0;
  seated = false;
  // World-space seat surface; the avatar converts it relative to its grounded root.
  seatHeight = .5575;
  noclip = false;
  flightState: 'walking'|'launching'|'gliding'|'landing' = 'walking';
  readonly glider = createGlider();
  readonly flightVelocity = new T.Vector3();
  private launchTime = 0;
  private launchTarget = 26;
  private flightBank = 0;
  private previous = spawn.clone();
  private accumulated = 0;
  private direction = new T.Vector3();

  constructor(private scene: T.Scene, solids: Solid[], avatar: Awaited<ReturnType<typeof createAvatar>>, meshes: CollisionMesh[] = []) {
    this.avatar = avatar;
    this.motor.enableAutostep(.3, .2, false); this.motor.enableSnapToGround(.4); this.motor.setApplyImpulsesToDynamicBodies(true); this.motor.setCharacterMass(70);
    this.motor.setMaxSlopeClimbAngle(Math.PI / 4); this.motor.setMinSlopeSlideAngle(Math.PI / 3);
    this.addSolids(solids);this.addMeshes(meshes);this.avatar.root.add(this.glider);scene.add(this.avatar.root);this.reset();
    this.connectGroundSampler();
  }
  private connectGroundSampler() {
    this.avatar.setGroundSampler((x,z)=>{
      const top=this.position.y+1.1;
      const hit=this.physics.castRay(new RAPIER.Ray({x,y:top,z},{x:0,y:-1,z:0}),2.5,true,undefined,undefined,this.collider,this.body);
      return hit&&hit.timeOfImpact>.08?top-hit.timeOfImpact:this.position.y;
    });
  }
  replaceAvatar(next: Awaited<ReturnType<typeof createAvatar>>) {
    const previous = this.avatar;
    previous.root.remove(this.glider); this.scene.remove(previous.root);
    next.root.position.copy(this.position); next.root.rotation.copy(previous.root.rotation); next.root.add(this.glider);
    this.avatar = next; this.connectGroundSampler(); this.scene.add(next.root); return previous;
  }
  addSolids(solids: Solid[]) {
    for (const s of solids) {
      const desc = RAPIER.ColliderDesc.cuboid(s.w / 2, s.h / 2, s.d / 2).setTranslation(s.x, s.y, s.z);
      if (s.angle) desc.setRotation({ x: 0, y: Math.sin(s.angle / 2), z: 0, w: Math.cos(s.angle / 2) });
      this.solidColliders.set(s,this.physics.createCollider(desc));
    }
  }
  addMeshes(meshes:CollisionMesh[]){for(const mesh of meshes)this.physics.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));this.physics.step();}
  get flying(){return this.flightState!=='walking';}
  mount(bike:CampusBicycle|CampusCar){
    const car='kind' in bike && bike.kind==='car';
    if(this.riding||this.flying||this.seated||this.position.distanceTo(bike.group.position)>(car?3.2:2.3))return false;
    const parked=this.solidColliders.get(bike.solid);if(!parked)return false;
    parked.setEnabled(false);this.physics.step();
    const shape=car?new RAPIER.Cuboid(carFit.halfWidth,.84,carFit.halfLength):new RAPIER.Cuboid(.34,.84,.95),p=bike.group.position;
    const rotation={x:0,y:Math.sin(bike.angle/2),z:0,w:Math.cos(bike.angle/2)};
    if(this.physics.intersectionWithShape({x:p.x,y:p.y+.90,z:p.z},rotation,shape,undefined,undefined,this.collider,this.body,c=>c.handle!==parked.handle&&c.isEnabled())){parked.setEnabled(true);return false;}
    this.placeOnSupport(p.x,p.y+.045,p.z);this.collider.setShape(shape);this.collider.setRotationWrtParent(rotation);
    this.riding=bike;bike.setParked?.(false);this.rideYaw=bike.angle;this.rideViewYaw=bike.angle;this.rideSteering=0;this.rideSpeed=0;this.pedalPhase=0;this.clearInput();this.motor.enableAutostep(.16,.2,false);this.motor.enableSnapToGround(.4);return true;
  }
  dismount(){
    const bike=this.riding;if(!bike)return true;
    const exits=this.driving?[[1.45,0],[-1.45,0],[1.8,0],[-1.8,0],[0,2.7]]:[[1.1,0],[-1.1,0],[1.5,0],[-1.5,0],[0,1.8]];
    // Try both sides and rear before changing either the rider or parked collider.
    for(const[u,v]of exits){
      const x=this.position.x+u*Math.cos(this.rideYaw)+v*Math.sin(this.rideYaw),z=this.position.z-u*Math.sin(this.rideYaw)+v*Math.cos(this.rideYaw);
      const origin={x,y:this.position.y+.5,z},hit=this.physics.castRayAndGetNormal(new RAPIER.Ray(origin,{x:0,y:-1,z:0}),1,true,undefined,undefined,this.collider,this.body);
      if(!hit||hit.normal.y<.7)continue;
      const y=origin.y-hit.timeOfImpact+.045;
      const blocked=this.physics.intersectionWithShape({x,y:y+.86,z},{x:0,y:0,z:0,w:1},new RAPIER.Capsule(.57,.27),undefined,undefined,this.collider,this.body);
      if(blocked)continue;
      this.parkBicycle();this.placeOnSupport(x,y,z);return true;
    }
    return false;
  }
  private parkBicycle(){
    const bike=this.riding;if(!bike)return;
    bike.group.position.copy(this.position);bike.group.rotation.y=this.rideYaw;bike.angle=this.rideYaw;
    if(this.driving)Object.assign(bike.solid,{x:this.position.x,y:this.position.y+carFit.centerY,z:this.position.z,angle:this.rideYaw});
    bike.setParked?.(true);
    const collider=this.solidColliders.get(bike.solid)!;
    collider.setTranslation({x:this.position.x,y:this.position.y+(this.driving?carFit.centerY:.52),z:this.position.z});collider.setRotation({x:0,y:Math.sin(this.rideYaw/2),z:0,w:Math.cos(this.rideYaw/2)});collider.setEnabled(true);
    this.riding=null;this.rideSpeed=0;this.collider.setShape(new RAPIER.Capsule(.57,.27));this.collider.setRotationWrtParent({x:0,y:0,z:0,w:1});this.motor.enableAutostep(.3,.2,false);this.clearInput();this.physics.step();
  }
  relocateCar(car:CampusCar,x:number,z:number,yaw:number){
    if(this.riding===car)return false;
    const collider=this.solidColliders.get(car.solid);if(!collider)return false;
    const enabled=collider.isEnabled();collider.setEnabled(false);this.physics.step();
    const top=terrainHeight(x,z)+2.5;
    const sample=(px:number,pz:number)=>this.physics.castRayAndGetNormal(new RAPIER.Ray({x:px,y:top,z:pz},{x:0,y:-1,z:0}),4,true,undefined,undefined,this.collider,this.body);
    const hit=sample(x,z);let y=0,valid=Boolean(hit&&hit.normal.y>.9);
    if(hit){y=top-hit.timeOfImpact+.035;for(const u of[-.9,0,.9])for(const v of[-1.9,0,1.9]){const h=sample(x+u*Math.cos(yaw)+v*Math.sin(yaw),z-u*Math.sin(yaw)+v*Math.cos(yaw));if(!h||h.normal.y<.9||Math.abs(top-h.timeOfImpact-y)>.18)valid=false;}}
    const rotation={x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)};
    if(valid&&this.physics.intersectionWithShape({x,y:y+.86,z},rotation,new RAPIER.Cuboid(.96,.84,2.12),undefined,undefined,this.collider,this.body))valid=false;
    if(!valid){collider.setEnabled(enabled);this.physics.step();return false;}
    car.group.position.set(x,y,z);car.group.rotation.y=yaw;car.angle=yaw;car.setParked(true);car.group.visible=true;
    Object.assign(car.solid,{x,y:y+.84,z,angle:yaw});collider.setTranslation({x,y:y+.84,z});collider.setRotation(rotation);collider.setEnabled(true);this.physics.step();return true;
  }
  groundHeightAt(x:number,z:number){const hit=this.physics.castRay(new RAPIER.Ray({x,y:160,z},{x:0,y:-1,z:0}),200,true,undefined,undefined,this.collider,this.body);return hit?160-hit.timeOfImpact:0;}
  travelTo(x: number, z: number, surface: 'highest' | 'ground' = 'highest') {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    if(this.riding&&!this.dismount())return null;
    const cx = T.MathUtils.clamp(x, bounds.minX + 1, bounds.maxX - 1), cz = T.MathUtils.clamp(z, bounds.minZ + 1, bounds.maxZ - 1);
    for (const radius of [0, .8, 1.6, 3, 5, 8, 13, 21, 34]) for (let i = 0; i < (radius ? 16 : 1); i++) {
      const px = cx + Math.cos(i * Math.PI / 8) * radius, pz = cz + Math.sin(i * Math.PI / 8) * radius;
      if (px < bounds.minX + 1 || px > bounds.maxX - 1 || pz < bounds.minZ + 1 || pz > bounds.maxZ - 1) continue;
      // Named entrances may be beneath a canopy. Search from pedestrian height
      // above the local terrace; free map points still allow rooftop arrivals.
      const rayTop = surface === 'ground' ? terrainHeight(px, pz) + 2.5 : 220;
      const hit = this.physics.castRayAndGetNormal(new RAPIER.Ray({ x: px, y: rayTop, z: pz }, { x: 0, y: -1, z: 0 }), surface === 'ground' ? 3 : 230, true, undefined, undefined, this.collider, this.body);
      if (!hit || hit.normal.y < .68) continue;
      const y = rayTop - hit.timeOfImpact + .06;
      // A capsule must have support across its footprint, not balance on a letter or lamp.
      const supported = [[.28, 0], [-.28, 0], [0, .28], [0, -.28]].every(([dx, dz]) => {
        const support = this.physics.castRayAndGetNormal(new RAPIER.Ray({ x: px + dx, y: y + .25, z: pz + dz }, { x: 0, y: -1, z: 0 }), .6, true, undefined, undefined, this.collider, this.body);
        return support && support.normal.y > .65 && Math.abs(y + .25 - support.timeOfImpact - (y - .06)) < .21;
      });
      if (!supported) continue;
      const obstacle = this.physics.intersectionWithShape({ x: px, y: y + .86, z: pz }, { x: 0, y: 0, z: 0, w: 1 }, this.collider.shape, undefined, undefined, this.collider, this.body);
      if (obstacle) continue;
      this.finishFlight(); this.seated = false; this.noclip = false; this.clearInput(); this.accumulated = 0;
      this.placeOnSupport(px, y, pz); return { x: px, y, z: pz, adjusted: radius > 0 };
    }
    return null;
  }
  startFlight(){
    if(this.riding)return false;
    const overhead=this.physics.castRay(new RAPIER.Ray({x:this.position.x,y:this.position.y+1.85,z:this.position.z},{x:0,y:1,z:0}),30,true,undefined,undefined,this.collider,this.body);
    if(overhead)return false;
    this.fallPeak=null;this.seated=false;this.flightState='launching';this.launchTime=0;this.launchTarget=Math.min(this.position.y+26,maxFlightAltitude-2);this.flightVelocity.set(0,0,0);this.motor.disableAutostep();this.motor.disableSnapToGround();this.glider.visible=true;return true;
  }
  land(){if(this.flying)this.flightState='landing';}
  private finishFlight(){this.fallPeak=null;this.flightState='walking';this.flightVelocity.set(0,0,0);this.velocityY=0;this.motor.enableAutostep(.3,.2,false);this.motor.enableSnapToGround(.4);this.glider.visible=false;this.avatar.root.rotation.z=0;}
  reset() { this.parkBicycle();this.finishFlight();this.teleport(spawn.x, spawn.y, spawn.z); this.seated = false; this.clearInput(); this.avatar.root.rotation.y = 0; }
  private respawnAfterFall(fallHeight:number){
    const impact={x:this.position.x,y:this.position.y,z:this.position.z};
    this.reset();this.accumulated=0;this.speed=0;this.rideCameraTurn=0;this.rideSteering=0;this.pedalPhase=0;this.direction.set(0,0,0);
    const event:FallRespawnEvent={reason:'fall',count:++this.respawnCount,fallHeight,impact,spawn:{x:this.position.x,y:this.position.y,z:this.position.z}};
    this.lastRespawn=event;this.onRespawn(event);
  }
  teleport(x: number, y: number, z: number) {
    this.placeOnSupport(x,Math.max(.03,terrainHeight(x,z)+.035,y),z);
  }
  // Travel and mount/dismount already verify support and clearance. Preserve their actual
  // floor elevation, including lower landings, without changing teleport rules.
  private placeOnSupport(x:number,y:number,z:number){
    this.fallPeak=null;this.grounded=false;this.jumpRequest=0;
    this.position.set(T.MathUtils.clamp(x, bounds.minX + 1, bounds.maxX - 1), y, T.MathUtils.clamp(z, bounds.minZ + 1, bounds.maxZ - 1));
    this.body.setTranslation({ x: this.position.x, y: this.position.y + .86, z: this.position.z }, true);
    this.body.setNextKinematicTranslation({ x: this.position.x, y: this.position.y + .86, z: this.position.z }); this.velocityY = 0; this.previous.copy(this.position); this.avatar.root.position.copy(this.position);
  }
  update(dt: number, yaw: number, active: boolean) {
    this.yaw = yaw;
    const forward = active ? T.MathUtils.clamp(Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) + this.moveInput.y, -1, 1) : 0;
    const right = active ? T.MathUtils.clamp(Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')) + this.moveInput.x, -1, 1) : 0;
    this.direction.set(right * Math.cos(yaw) - forward * Math.sin(yaw), 0, -forward * Math.cos(yaw) - right * Math.sin(yaw));
    if (this.direction.lengthSq() > 1) this.direction.normalize();
    let desired: number = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) ? speeds.run : speeds.walk;
    this.rideCameraTurn=0;
    if(this.riding){
      const boost=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'),braking=this.keys.has('Space');
      const target=braking?0:forward<0?(this.driving?-speeds.carReverse:-2.5):forward>0||boost?(this.driving?(boost?speeds.carBoost:speeds.car):(boost?speeds.bicycleBoost:speeds.bicycle))*Math.max(forward,boost?1:0):0;
      this.rideSpeed=active?T.MathUtils.damp(this.rideSpeed,target,braking?10:target<0?3:2.4,dt):0;
      const look=Math.atan2(Math.sin(yaw-(this.driving?this.rideYaw:this.rideViewYaw)),Math.cos(yaw-(this.driving?this.rideYaw:this.rideViewYaw)));
      this.rideCameraTurn=active?-right*(Math.abs(this.rideSpeed)>6?1.7:2.4)*dt*(this.rideSpeed<-.15?-1:1):0;
      const turn=(active?(this.driving?T.MathUtils.clamp(look,-1.8*dt,1.8*dt):look):0)+this.rideCameraTurn;
      const nextYaw=this.rideYaw+turn;
      const rotation={x:0,y:Math.sin(nextYaw/2),z:0,w:Math.cos(nextYaw/2)};
      if(!this.driving||!this.physics.intersectionWithShape(this.body.translation(),rotation,this.collider.shape,undefined,undefined,this.collider,this.body))this.rideYaw=nextYaw;
      else this.rideCameraTurn=0;
      this.rideViewYaw=yaw+this.rideCameraTurn;
      this.rideSteering=T.MathUtils.damp(this.rideSteering,active?T.MathUtils.clamp(-right*.42+look*3,-.55,.55):0,10,dt);
      this.collider.setRotationWrtParent({x:0,y:Math.sin(this.rideYaw/2),z:0,w:Math.cos(this.rideYaw/2)});
      this.direction.set(-Math.sin(this.rideYaw),0,-Math.cos(this.rideYaw));desired=this.rideSpeed;
    }
    if (this.seated) this.direction.set(0, 0, 0);
    if(this.flying&&active){
      const boost=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');
      const cruising=this.flightState==='landing'?0:this.flightState==='launching'?2:forward<0?3:boost?speeds.flightBoost:forward>0?speeds.flight:speeds.flightIdle;
      let vertical=-.7;
      if(this.flightState==='launching'){this.launchTime+=dt;vertical=14;if(this.position.y>=this.launchTarget||this.launchTime>3)this.flightState='gliding';}
      else if(this.flightState==='landing')vertical=-7;
      else vertical=this.keys.has('Space')?speeds.flightUp:(this.keys.has('ControlLeft')||this.keys.has('ControlRight'))?-speeds.flightDown:-.7;
      const lateral=right*4,landing=this.flightState==='landing';
      // Use the same normalized camera-relative direction as the walking/touch input.
      const vx=landing?this.direction.x*2.5:-Math.sin(yaw)*cruising+Math.cos(yaw)*lateral;
      const vz=landing?this.direction.z*2.5:-Math.cos(yaw)*cruising-Math.sin(yaw)*lateral;
      this.flightVelocity.x=T.MathUtils.damp(this.flightVelocity.x,vx,3.5,dt);this.flightVelocity.z=T.MathUtils.damp(this.flightVelocity.z,vz,3.5,dt);this.flightVelocity.y=T.MathUtils.damp(this.flightVelocity.y,vertical,4,dt);
      this.flightBank=T.MathUtils.damp(this.flightBank,-right*.2,5,dt);
    }
    this.accumulated = Math.min(this.accumulated + dt, .1); this.previous.copy(this.position);
    while (this.accumulated >= 1 / 60) {
      const step = 1 / 60; this.accumulated -= step;
      // Capture before collision handling: a controlled touchdown can call finishFlight.
      const trackFall=active&&!this.flying&&!this.noclip&&!this.seated,startHeight=this.position.y;
      if(this.flying||this.noclip||this.seated)this.fallPeak=null;
      if(active){
        if(this.jumpRequest>0&&this.grounded&&!this.riding&&!this.flying&&!this.seated){this.velocityY=4.8;this.grounded=false;this.jumpRequest=0;}
        this.jumpRequest=Math.max(0,this.jumpRequest-step);
        this.velocityY = Math.max(-18, this.velocityY - 9.81 * step);
      }
      const movement = !active?{x:0,y:0,z:0}:this.flying?{x:this.flightVelocity.x*step,y:this.flightVelocity.y*step,z:this.flightVelocity.z*step}:{ x: this.direction.x * desired * step, y: this.velocityY * step, z: this.direction.z * desired * step };
      if (this.noclip) { movement.y = (Number(this.keys.has('Space')) - Number(this.keys.has('ControlLeft'))) * desired * step; this.velocityY = 0; }
      let move = movement;
      if (!this.noclip && !this.seated) { this.motor.computeColliderMovement(this.collider, movement,undefined,undefined,this.driving?c=>c.isEnabled()&&c!==this.solidColliders.get(this.riding!.solid):undefined); move = this.motor.computedMovement(); if(active)this.grounded=this.motor.computedGrounded();if(this.grounded&&movement.y<=0&&active) {this.velocityY = -.5;if(this.flying&&movement.y<0)this.finishFlight();}if(active&&movement.y>0&&move.y<movement.y*.25)this.velocityY=Math.min(0,this.velocityY); }
      if (this.seated) move = { x: 0, y: 0, z: 0 };
      const current = this.body.translation();
      const next = { x: T.MathUtils.clamp(current.x + move.x, bounds.minX + .75, bounds.maxX - .75), y: Math.min(current.y + move.y,maxFlightAltitude+.86), z: T.MathUtils.clamp(current.z + move.z, bounds.minZ + .75, bounds.maxZ - .75) };
      this.body.setNextKinematicTranslation(next); this.physics.step();
      const p = this.body.translation(); this.position.set(p.x, p.y - .86, p.z);
      if (this.position.y < -3 || !Number.isFinite(this.position.y)) this.reset();
      else if(trackFall){
        // Include both endpoints of every physics substep, even on the first step
        // off a ledge. Grounded stairs reset the peak; pausing never erases a fall.
        this.fallPeak=Math.max(this.fallPeak??startHeight,startHeight,this.position.y);
        if(this.grounded&&movement.y<=0){
          let landingHeight=this.position.y;
          // Fast contacts can report grounded a few centimetres before the
          // capsule settles. Only near a fatal drop, resolve the real support
          // locally instead of adding a raycast to ordinary walking/stairs.
          if(this.fallPeak-landingHeight>=FATAL_FALL_HEIGHT-.5){
            const origin={x:this.position.x,y:landingHeight+.1,z:this.position.z};
            const support=this.physics.castRayAndGetNormal(new RAPIER.Ray(origin,{x:0,y:-1,z:0}),.6,true,undefined,undefined,this.collider,this.body);
            if(support&&support.normal.y>.65)landingHeight=origin.y-support.timeOfImpact;
          }
          const fallHeight=this.fallPeak-landingHeight;this.fallPeak=null;
          // Rapier's float contact coordinates can undershoot an exact metre
          // boundary by sub-millimetres; this does not change the 10m rule.
          if(fallHeight+1e-3>=FATAL_FALL_HEIGHT){this.respawnAfterFall(fallHeight);break;}
        }
      }
    }
    this.speed = dt > 0 ? Math.hypot(this.position.x - this.previous.x, this.position.z - this.previous.z) / dt : 0;
    this.avatar.root.position.copy(this.position);
    if (this.speed > .1) {
      const target = this.riding?this.rideYaw:this.flying?yaw:Math.atan2(-this.direction.x, -this.direction.z);
      const delta = Math.atan2(Math.sin(target - this.avatar.root.rotation.y), Math.cos(target - this.avatar.root.rotation.y));
      this.avatar.root.rotation.y += delta * Math.min(1, dt * 12);
    }
    this.avatar.root.rotation.z=this.flying?this.flightBank:0;
    if(this.riding){
      this.pedalPhase+=this.speed*dt*1.6*Math.sign(this.rideSpeed);this.riding.group.position.copy(this.position);this.riding.group.rotation.y=this.rideYaw;this.avatar.root.rotation.y=this.rideYaw;this.riding.update(this.speed*dt*Math.sign(this.rideSpeed),this.pedalPhase,this.rideSteering);
    }
    this.avatar.update(dt, this.speed, this.seated,this.flying,this.seatHeight-this.position.y,this.riding?this.pedalPhase:undefined,this.rideSteering,!this.grounded&&Math.abs(this.velocityY)>.6);
  }
}
