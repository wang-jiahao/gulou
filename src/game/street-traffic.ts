import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {Builder} from '../world/geometry.ts';
import type {Player} from '../player/controller.ts';

const streets=[{name:'汉口路',x:-91,z:367,width:18},{name:'广州路',x:-35,z:739,width:20}];
const angle=.025,cos=Math.cos(angle),sin=Math.sin(angle);
function carModel(color:number){
 const b=new Builder(),body=new T.MeshStandardMaterial({color,metalness:.35,roughness:.4}),glass=new T.MeshStandardMaterial({color:0x425b63,metalness:.35,roughness:.22}),rubber=new T.MeshStandardMaterial({color:0x222825,roughness:.9}),trim=new T.MeshStandardMaterial({color:0xb6bdb7,metalness:.7,roughness:.3});
 b.box(4.2,.62,1.78,0,.64,0,body);b.box(3.65,.18,1.80,0,.29,0,trim);b.box(2.05,.61,1.53,-.15,1.23,0,body);
 for(const side of[-1,1]){b.box(1.8,.43,.025,-.15,1.24,side*.773,glass);b.box(.08,.50,.04,-.12,1.24,side*.8,body);for(const x of[-1.32,1.30]){b.add(new T.CylinderGeometry(.34,.34,.18,16).rotateX(Math.PI/2),rubber,x,.35,side*.91);b.add(new T.CylinderGeometry(.18,.18,.19,12).rotateX(Math.PI/2),trim,x,.35,side*.925);}}
 b.box(.025,.43,1.42,.887,1.24,0,glass);b.box(.025,.43,1.42,-1.187,1.24,0,glass);
 const front=new T.MeshStandardMaterial({color:0xffedbd,emissive:0xffe6a0,emissiveIntensity:.3});
 const brake=new T.MeshStandardMaterial({color:0x962729,emissive:0xc32222,emissiveIntensity:.1});
 for(const side of[-1,1]){b.box(.06,.15,.48,2.12,.68,side*.58,front);b.box(.06,.18,.42,-2.12,.68,side*.58,brake);b.box(.17,.13,.22,.53,1.12,side*.94,body);}
 const group=b.finish('slow street car');return{group,brake};
}
/** Local visual traffic, never a network service. Cars brake before pedestrians
 * or a reserved crossing, and the same kinematic body provides solid collision. */
export class StreetTraffic{
 readonly cars:ReturnType<StreetTraffic['createCars']>;
 private createCars(){return streets.flatMap((road,r)=>[-1,1].map((direction,i)=>{
  const {group,brake}=carModel([0x6c8390,0xc1c3b9,0x706e68,0x8b4642][r*2+i]);
  const u=direction>0?-42:56,lane=direction*(road.width*.25),p=this.point(road,u,lane);group.position.copy(p);group.rotation.y=angle+(direction<0?Math.PI:0);this.scene.add(group);
  const body=this.player.physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x,p.y+.80,p.z));
  this.player.physics.createCollider(RAPIER.ColliderDesc.cuboid(2.16,.78,1.04).setRotation({x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)}),body);
  return{id:`${road.name}-${direction}`,road,direction,lane,u,group,brake,body,speed:0,waiting:false,distance:0};
 }));}
 constructor(private scene:T.Scene,private player:Player){this.cars=this.createCars();}
 private point(road:{x:number;z:number},u:number,lane:number){return new T.Vector3(road.x+u*cos+lane*sin,.06,road.z-u*sin+lane*cos);}
 prepare(dt:number,active:boolean){
  for(const car of this.cars){
   if(!active){car.speed=0;car.body.setNextKinematicTranslation(car.body.translation());continue;}
   const p=this.player.position,dx=p.x-car.road.x,dz=p.z-car.road.z,along=dx*cos-dz*sin,lateral=dx*sin+dz*cos,ahead=(along-car.u)*car.direction;
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
   const next=this.point(car.road,car.u,car.lane);if(Math.abs(car.u-oldU)>100){if(next.distanceTo(this.player.position)<10){car.u=oldU;car.speed=0;continue;}car.body.setTranslation({x:next.x,y:next.y+.80,z:next.z},true);}
   car.body.setNextKinematicTranslation({x:next.x,y:next.y+.80,z:next.z});car.group.position.copy(next);car.brake.emissiveIntensity=car.waiting?1.4:.12;
  }
 }
 sync(){for(const car of this.cars){const p=car.body.translation();car.group.position.set(p.x,p.y-.80,p.z);}}
 snapshot(){return this.cars.map(c=>({id:c.id,position:c.group.position.toArray(),speed:c.speed,waiting:c.waiting,distance:c.distance}));}
}
