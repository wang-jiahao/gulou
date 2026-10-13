import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {createCampusCar} from '../world/car.ts';
import type {Player} from '../player/controller.ts';

import {publicStreets as streets,streetPoint,streetLocation,type PublicStreet} from '../world/street-layout.ts';
/** Local visual traffic, never a network service. Cars brake before pedestrians
 * or a reserved crossing, and the same kinematic body provides solid collision. */
export class StreetTraffic{
 readonly cars:ReturnType<StreetTraffic['createCars']>;
 private createCars(){return streets.flatMap((road,r)=>[-1,1].map((direction,i)=>{
  const vehicle=createCampusCar(`${road.name}-${direction}`,[0x6c8390,0xc1c3b9,0x706e68,0x8b4642][r*2+i]);const {group}=vehicle;
  const u=direction>0?-42:56,lane=direction*(road.width*.25),p=this.point(road,u,lane);group.position.copy(p);group.rotation.y=streetPoint(road,u,lane).angle-Math.PI/2+(direction<0?Math.PI:0);this.scene.add(group);
  const body=this.player.physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x,p.y+.80,p.z).setRotation({x:0,y:Math.sin(group.rotation.y/2),z:0,w:Math.cos(group.rotation.y/2)}));
  const collider=this.player.physics.createCollider(RAPIER.ColliderDesc.cuboid(.96,.78,2.12),body);
  this.player.registerVehicle(vehicle.solid,collider);vehicle.angle=group.rotation.y;
  const state={manual:false};const parked=vehicle.setParked;
  vehicle.setParked=(value:boolean)=>{state.manual=true;parked(value);body.setEnabled(value);if(value){body.setTranslation({x:group.position.x,y:group.position.y+.84,z:group.position.z},true);body.setNextKinematicTranslation(body.translation());body.setRotation(group.quaternion,true);body.setNextKinematicRotation(group.quaternion);}};
  return{id:vehicle.id,road,direction,lane,u,group,vehicle,state,body,speed:0,waiting:false,distance:0};
 }));}
 constructor(private scene:T.Scene,private player:Player){this.cars=this.createCars();}
 private point(road:PublicStreet,u:number,lane:number){const p=streetPoint(road,u,lane);return new T.Vector3(p.x,.06,p.z);}
 prepare(dt:number,active:boolean){
  for(const car of this.cars){
   if(car.state.manual)continue;
   if(!active){car.speed=0;car.body.setNextKinematicTranslation(car.body.translation());continue;}
   const p=this.player.position,{u:along,lateral}=streetLocation(car.road,p.x,p.z),ahead=(along-car.u)*car.direction;
   const onRoad=p.y<2.5&&!this.player.flying;
   const inLane=onRoad&&Math.abs(lateral-car.lane)<2.15&&ahead>-2.8&&ahead<12;
   const crossing=onRoad&&Math.abs(along)<5.2&&Math.abs(lateral)<car.road.width/2+2.6;
   const toCrossing=-car.u*car.direction;
   const reserveCrossing=crossing&&toCrossing>0&&toCrossing<15;
   car.waiting=inLane||reserveCrossing;
   const wanted=car.waiting?0:4.5,rate=car.waiting?4.5:1.2;
   car.speed=T.MathUtils.damp(car.speed,wanted,rate,dt);
   if(car.waiting&&((inLane&&ahead<4.6)||(reserveCrossing&&toCrossing<7)))car.speed=0;
   const oldU=car.u,movement=car.speed*dt;car.u+=movement*car.direction;car.distance+=movement;
   if(car.u>350)car.u=-350;if(car.u< -350)car.u=350;
   const next=this.point(car.road,car.u,car.lane),yaw=streetPoint(car.road,car.u,car.lane).angle-Math.PI/2+(car.direction<0?Math.PI:0),rotation={x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)};
   if(Math.abs(car.u-oldU)>100){if(next.distanceTo(this.player.position)<10){car.u=oldU;car.speed=0;continue;}car.body.setTranslation({x:next.x,y:next.y+.80,z:next.z},true);car.body.setRotation(rotation,true);}
   car.body.setNextKinematicRotation(rotation);
   car.body.setNextKinematicTranslation({x:next.x,y:next.y+.80,z:next.z});car.group.position.copy(next);car.vehicle.angle=yaw;car.vehicle.update(movement,0,0);
  }
 }
 sync(){for(const car of this.cars){if(car.state.manual)continue;const p=car.body.translation(),q=car.body.rotation();car.group.position.set(p.x,p.y-.80,p.z);car.group.quaternion.set(q.x,q.y,q.z,q.w);}}
 snapshot(){return this.cars.map(c=>({id:c.id,position:c.group.position.toArray(),speed:c.speed,waiting:c.waiting,distance:c.distance,manual:c.state.manual}));}
}
