import * as T from 'three';
import {Builder} from './geometry.ts';
import type {CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';
import {facilityFront,facilityMaterial} from './life-facility-geometry.ts';

/** The latest user exterior establishes the blue Cainiao panels, wide paired
 * glazing, stone base and three entrance risers; lettering scale approximate. */
export function buildParcelEntrance(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[],name:string,x:number,z:number,yaw:number){
 const nx=Math.sin(yaw),nz=Math.cos(yaw),width=3.35,height=2.75,entryY=.48,depth=.24;
 const {box,sign,point}=facilityFront(b,{x,z,nx,nz,yaw,len:9.4},meshes,camera);
 const frame=facilityMaterial('parcel-door-frame',0x727e76),glass=facilityMaterial('parcel-door-glass',0x4f706c),stone=facilityMaterial('parcel-door-stone',0xa6a99d),blue=facilityMaterial('parcel-cainiao-blue',0x1375a3),white=facilityMaterial('parcel-panel-white',0xe8ece2),green=facilityMaterial('parcel-chevron-green',0x46958d),mat=facilityMaterial('parcel-entry-mat',0x744345);
 glass.roughness=.24;glass.metalness=.18;
 box(0,entryY+height/2,.15,width+.1,height,.16,glass,true);
 for(const u of[-width/2,0,width/2])box(u,entryY+height/2,depth,.065,height,.09,frame);
 for(const y of[entryY+.045,entryY+height])box(0,y,depth,width+.12,.07,.10,frame);
 for(const u of[-.13,.13])box(u,1.55,.31,.04,.47,.055,white);
 for(const u of[-3.05,3.05]){
  box(u,1.99,.16,2.13,2.30,.13,white);box(u-.18,2.23,.235,1.76,1.81,.035,blue);
  sign('CAI NIAO',u-.18,2.81,.26,1.54,.26,'#eaf5ee');sign('菜鸟驿站',u-.18,2.33,.26,1.55,.36,'#f4f5e8');
  for(const [a,c]of[[[-.5,0],[0,.35]],[[0,.35],[.5,0]]]){
   const aa=point(u+a[0],.27),cc=point(u+c[0],.27);aa.y=1.12+a[1];cc.y=1.12+c[1];b.cylinder(aa,cc,.047,.047,green,4);
  }
  for(let row=0;row<3;row++)for(let col=0;col<5;col++)box(u-1.02+col*.44+(row%2)*.1,.15+row*.24,.20,.37,.19,.035,(row+col)%3?stone:frame);
 }
 for(let step=1;step<=3;step++){const h=step*.16;box(0,h/2,1.48-(step-1)*.35,8.7,h,.7,stone,true);}
 box(0,.24,.42,8.7,.48,.75,stone,true);box(0,.491,.55,2.65,.016,.61,mat);
 const p=point(0,depth);doors.push({name,x:p.x,y:entryY,z:p.z,yaw,width});
 return{use:'parcel collection',evidence:'user exterior nanyuan-parcel.png 2026-10-07; east location from earlier matching screenshot',design:'photo-based white/dark gable, blue Cainiao side panels and stone risers; dimensions, rear and typography approximate',width,height,depth,entryY,steps:3,brand:'菜鸟驿站'};
}
