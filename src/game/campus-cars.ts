import * as T from 'three';
import {createCampusCar,type CampusCar} from '../world/car.ts';
import type {Player} from '../player/controller.ts';

/** Gameplay parking, not a claim about real campus parking permissions. */
export class CampusCars {
  readonly parked:CampusCar[]=[];
  private summoned:CampusCar;
  constructor(scene:T.Scene,private player:Player,cameraSolids:T.Object3D[]) {
    const make=(id:string,color:number)=>{const car=createCampusCar(id,color);car.group.visible=false;car.group.position.set(0,-40,0);car.solid.y=-40;scene.add(car.group);player.addSolids([car.solid]);cameraSolids.push(car.cameraHull);return car;};
    for(const [id,x,z,color] of [['teaching-car',-100,153,0x557b6c],['library-car',-77,285,0xd8d5c6],['south-car',-40,527,0x637e9b]] as const){
      const car=make(id,color);
      let found=false;for(const [dx,dz]of[[0,0],[3,0],[-3,0],[0,6],[0,-6],[6,0],[-6,0]]){if(player.relocateCar(car,x+dx,z+dz,0)){found=true;break;}}
      if(found)this.parked.push(car);
    }
    this.summoned=make('summoned-car',0x496d64);
  }
  get all(){return [...this.parked,...(this.summoned.group.position.y>-10?[this.summoned]:[])];}
  summon(yaw:number){
    if(this.player.riding&&!this.player.dismount())return false;
    if(this.player.flying||!this.player.grounded){if(!this.player.travelTo(this.player.position.x,this.player.position.z,'ground'))return false;}
    const p=this.player.position.clone();
    for(const radius of[0,3,6,10])for(let i=0;i<(radius?8:1);i++){
      const x=p.x+Math.cos(i*Math.PI/4)*radius,z=p.z+Math.sin(i*Math.PI/4)*radius;
      if(!this.player.relocateCar(this.summoned,x,z,yaw))continue;
      if(this.player.position.distanceTo(this.summoned.group.position)>3.2){if(!this.player.travelTo(x+1.5*Math.cos(yaw),z-1.5*Math.sin(yaw),'ground'))continue;}
      if(this.player.mount(this.summoned))return true;
    }
    return false;
  }
}
