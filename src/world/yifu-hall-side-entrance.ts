import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

// The flight enters the recessed wing; its toe aligns approximately with
// the adjoining bed front in gl-4-13-l/b. Do not project the whole run outside.
export const yifuHallSideInset=2.8;

/** Official gl-4-13-l: high stone stair and recessed glass side door.
 * Dimensions and registration along the map's south wing are approximate. */
export function buildYifuHallSideEntrance(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[],e:{x:number;z:number;nx:number;nz:number;angle:number},m:{pale:T.Material;dark:T.Material;glass:T.Material;red:T.Material}){
 const point=(u:number,v:number)=>[e.x+u*Math.cos(e.angle)+(v-yifuHallSideInset)*e.nx,e.z-u*Math.sin(e.angle)+(v-yifuHallSideInset)*e.nz];
 const solid=(geometry:T.BufferGeometry,mat:T.Material)=>{
  const proxy=new T.Mesh(geometry.clone());meshes.push(collisionMesh(proxy));camera.push(proxy);b.add(geometry,mat);
 };
 const put=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material,collision=false)=>{
  const[x,z]=point(u,v);
  if(collision)solid(new T.BoxGeometry(w,h,d).rotateY(e.angle).translate(x,y,z),mat);
  else b.box(w,h,d,x,y,z,mat,false,e.angle);
 };
 const width=6.2,risers=14,rise=.15,tread=.32,landing=1.2,run=risers*tread,top=2.1,depth=.9,ceiling=4.65;
 put(0,top/2,landing/2,width,top,landing,m.pale,true);
 for(let i=0;i<risers;i++){
  const h=(risers-i)*rise;put(0,h/2,landing+(i+.5)*tread,width,h,tread,m.pale,true);
 }
 for(const sign of[-1,1]){
  // Sloping solid cheeks follow the flight, rather than floating handrails.
  const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(-(landing+run),0);shape.lineTo(-(landing+run),.72);shape.lineTo(-landing,top+.72);shape.lineTo(0,top+.72);shape.closePath();
  const[x,z]=point(sign*(width/2+.2),0);
  const geometry=new T.ExtrudeGeometry(shape,{depth:.4,bevelEnabled:false,steps:1}).translate(0,0,-.2).rotateY(e.angle+Math.PI/2).translate(x,0,z);
  solid(geometry,m.pale);
  put(sign*(width/2+.2),.4,landing+run-.06,.49,.8,.45,m.pale,true);
 }
 for(const u of[-3.2,3.2])put(u,(top+ceiling)/2,yifuHallSideInset+.10,.2,ceiling-top,.24,m.pale);
 put(0,ceiling+.10,yifuHallSideInset+.10,6.6,.2,.24,m.pale);
 const back=-depth+.12,doorHeight=2.5;
 put(0,top+doorHeight/2,back,5.95,doorHeight,.08,m.dark);
 put(0,top+doorHeight/2,back+.055,5.7,doorHeight-.12,.025,m.glass,true);
 for(const u of[-1.9,-.95,0,.95,1.9])put(u,top+1.23,back+.08,.055,2.44,.055,m.dark);
 put(0,top+1.98,back+.08,5.75,.065,.055,m.dark);
 put(0,top+.95,back+.12,5.7,.075,.025,m.red);
 for(const u of[-.10,.10])put(u,top+.96,back+.15,.035,.40,.06,m.dark);
 const[x,z]=point(0,back+.1);doors.push({name:'逸夫馆侧门',x,y:top,z,yaw:e.angle,width:5.7});
 return{frontage:[...point(0,0),e.nx,e.nz],wallFrontage:[e.x,e.z,e.nx,e.nz],inset:yifuHallSideInset,width,risers,rise,tread,landing,entryHeight:top,recessDepth:depth,ceiling,cheeks:'solid sloping stone',source:'official VR gl-4-13-l and user campus map; station and dimensions approximate'};
}
