import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createAvatar } from './avatar.ts';
import { bounds, spawn, maxFlightAltitude } from '../world/world.ts';
import type { Solid } from '../world/geometry.ts';
import type { CollisionMesh } from '../world/collision-mesh.ts';
import { createGlider } from './glider.ts';

export class Player {
  avatar: Awaited<ReturnType<typeof createAvatar>>;
  readonly physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  readonly body = this.physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, 1, spawn.z));
  readonly collider = this.physics.createCollider(RAPIER.ColliderDesc.capsule(.57, .27), this.body);
  readonly motor = this.physics.createCharacterController(.02);
  readonly position = spawn.clone();
  keys = new Set<string>();
  readonly moveInput = new T.Vector2();
  clearInput() { this.keys.clear(); this.moveInput.set(0, 0); }
  velocityY = 0;
  speed = 0;
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
      this.physics.createCollider(desc);
    }
  }
  addMeshes(meshes:CollisionMesh[]){for(const mesh of meshes)this.physics.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));this.physics.step();}
  get flying(){return this.flightState!=='walking';}
  groundHeightAt(x:number,z:number){const hit=this.physics.castRay(new RAPIER.Ray({x,y:160,z},{x:0,y:-1,z:0}),200,true,undefined,undefined,this.collider,this.body);return hit?160-hit.timeOfImpact:0;}
  travelTo(x: number, z: number) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const cx = T.MathUtils.clamp(x, bounds.minX + 1, bounds.maxX - 1), cz = T.MathUtils.clamp(z, bounds.minZ + 1, bounds.maxZ - 1);
    for (const radius of [0, .8, 1.6, 3, 5, 8, 13, 21, 34]) for (let i = 0; i < (radius ? 16 : 1); i++) {
      const px = cx + Math.cos(i * Math.PI / 8) * radius, pz = cz + Math.sin(i * Math.PI / 8) * radius;
      if (px < bounds.minX + 1 || px > bounds.maxX - 1 || pz < bounds.minZ + 1 || pz > bounds.maxZ - 1) continue;
      const hit = this.physics.castRayAndGetNormal(new RAPIER.Ray({ x: px, y: 220, z: pz }, { x: 0, y: -1, z: 0 }), 230, true, undefined, undefined, this.collider, this.body);
      if (!hit || hit.normal.y < .68) continue;
      const y = 220 - hit.timeOfImpact + .06;
      // A capsule must have support across its footprint, not balance on a letter or lamp.
      const supported = [[.28, 0], [-.28, 0], [0, .28], [0, -.28]].every(([dx, dz]) => {
        const support = this.physics.castRayAndGetNormal(new RAPIER.Ray({ x: px + dx, y: y + .25, z: pz + dz }, { x: 0, y: -1, z: 0 }), .6, true, undefined, undefined, this.collider, this.body);
        return support && support.normal.y > .65 && Math.abs(y + .25 - support.timeOfImpact - (y - .06)) < .21;
      });
      if (!supported) continue;
      const obstacle = this.physics.intersectionWithShape({ x: px, y: y + .86, z: pz }, { x: 0, y: 0, z: 0, w: 1 }, this.collider.shape, undefined, undefined, this.collider, this.body);
      if (obstacle) continue;
      this.finishFlight(); this.seated = false; this.noclip = false; this.clearInput(); this.accumulated = 0;
      this.teleport(px, y, pz); return { x: px, y, z: pz, adjusted: radius > 0 };
    }
    return null;
  }
  startFlight(){
    const overhead=this.physics.castRay(new RAPIER.Ray({x:this.position.x,y:this.position.y+1.85,z:this.position.z},{x:0,y:1,z:0}),30,true,undefined,undefined,this.collider,this.body);
    if(overhead)return false;
    this.seated=false;this.flightState='launching';this.launchTime=0;this.launchTarget=Math.min(this.position.y+26,maxFlightAltitude-2);this.flightVelocity.set(0,0,0);this.motor.disableAutostep();this.motor.disableSnapToGround();this.glider.visible=true;return true;
  }
  land(){if(this.flying)this.flightState='landing';}
  private finishFlight(){this.flightState='walking';this.flightVelocity.set(0,0,0);this.velocityY=0;this.motor.enableAutostep(.3,.2,false);this.motor.enableSnapToGround(.4);this.glider.visible=false;this.avatar.root.rotation.z=0;}
  reset() { this.finishFlight();this.teleport(spawn.x, spawn.y, spawn.z); this.seated = false; this.clearInput(); this.avatar.root.rotation.y = 0; }
  teleport(x: number, y: number, z: number) {
    this.position.set(T.MathUtils.clamp(x, bounds.minX + 1, bounds.maxX - 1), Math.max(.03, y), T.MathUtils.clamp(z, bounds.minZ + 1, bounds.maxZ - 1));
    this.body.setTranslation({ x: this.position.x, y: this.position.y + .86, z: this.position.z }, true);
    this.body.setNextKinematicTranslation({ x: this.position.x, y: this.position.y + .86, z: this.position.z }); this.velocityY = 0; this.previous.copy(this.position); this.avatar.root.position.copy(this.position);
  }
  update(dt: number, yaw: number, active: boolean) {
    this.yaw = yaw;
    const forward = active ? T.MathUtils.clamp(Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) + this.moveInput.y, -1, 1) : 0;
    const right = active ? T.MathUtils.clamp(Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')) + this.moveInput.x, -1, 1) : 0;
    this.direction.set(right * Math.cos(yaw) - forward * Math.sin(yaw), 0, -forward * Math.cos(yaw) - right * Math.sin(yaw));
    if (this.direction.lengthSq() > 1) this.direction.normalize();
    const desired = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) ? 4.2 : 1.65;
    if (this.seated) this.direction.set(0, 0, 0);
    if(this.flying&&active){
      const boost=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');
      const cruising=this.flightState==='landing'?0:this.flightState==='launching'?2:forward<0?3:boost?22:forward>0?14:9;
      let vertical=-.7;
      if(this.flightState==='launching'){this.launchTime+=dt;vertical=14;if(this.position.y>=this.launchTarget||this.launchTime>3)this.flightState='gliding';}
      else if(this.flightState==='landing')vertical=-7;
      else vertical=this.keys.has('Space')?7:(this.keys.has('ControlLeft')||this.keys.has('ControlRight'))?-8:-.7;
      const lateral=right*(this.flightState==='landing'?2.5:4);
      const vx=-Math.sin(yaw)*cruising+Math.cos(yaw)*lateral,vz=-Math.cos(yaw)*cruising-Math.sin(yaw)*lateral;
      this.flightVelocity.x=T.MathUtils.damp(this.flightVelocity.x,vx,3.5,dt);this.flightVelocity.z=T.MathUtils.damp(this.flightVelocity.z,vz,3.5,dt);this.flightVelocity.y=T.MathUtils.damp(this.flightVelocity.y,vertical,4,dt);
      this.flightBank=T.MathUtils.damp(this.flightBank,-right*.2,5,dt);
    }
    this.accumulated = Math.min(this.accumulated + dt, .1); this.previous.copy(this.position);
    while (this.accumulated >= 1 / 60) {
      const step = 1 / 60; this.accumulated -= step;
      this.velocityY = Math.max(-18, this.velocityY - 9.81 * step);
      const movement = this.flying?{x:active?this.flightVelocity.x*step:0,y:active?this.flightVelocity.y*step:0,z:active?this.flightVelocity.z*step:0}:{ x: this.direction.x * desired * step, y: this.velocityY * step, z: this.direction.z * desired * step };
      if (this.noclip) { movement.y = (Number(this.keys.has('Space')) - Number(this.keys.has('ControlLeft'))) * desired * step; this.velocityY = 0; }
      let move = movement;
      if (!this.noclip && !this.seated) { this.motor.computeColliderMovement(this.collider, movement); move = this.motor.computedMovement(); if (this.motor.computedGrounded()) {this.velocityY = -.5;if(this.flying&&movement.y<0)this.finishFlight();} }
      if (this.seated) move = { x: 0, y: 0, z: 0 };
      const current = this.body.translation();
      const next = { x: T.MathUtils.clamp(current.x + move.x, bounds.minX + .75, bounds.maxX - .75), y: Math.min(current.y + move.y,maxFlightAltitude+.86), z: T.MathUtils.clamp(current.z + move.z, bounds.minZ + .75, bounds.maxZ - .75) };
      this.body.setNextKinematicTranslation(next); this.physics.step();
      const p = this.body.translation(); this.position.set(p.x, p.y - .86, p.z);
      if (this.position.y < -3 || !Number.isFinite(this.position.y)) this.reset();
    }
    this.speed = dt > 0 ? Math.hypot(this.position.x - this.previous.x, this.position.z - this.previous.z) / dt : 0;
    this.avatar.root.position.copy(this.position);
    if (this.speed > .1) {
      const target = this.flying?yaw:Math.atan2(-this.direction.x, -this.direction.z);
      const delta = Math.atan2(Math.sin(target - this.avatar.root.rotation.y), Math.cos(target - this.avatar.root.rotation.y));
      this.avatar.root.rotation.y += delta * Math.min(1, dt * 12);
    }
    this.avatar.root.rotation.z=this.flying?this.flightBank:0;
    this.avatar.update(dt, this.speed, this.seated,this.flying,this.seatHeight-this.position.y);
  }
}
