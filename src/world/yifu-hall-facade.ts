import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

type Frontage={x:number;z:number;nx:number;nz:number;angle:number;len:number};
/** Official VR gl-4-13 front: three separate upper windows and a flush entry.
 * This is plan-34 (逸夫馆), not plan-10 (逸夫管理科学楼). Sizes are approximate. */
export function isYifuHallFront(e:Frontage){
 return e.nx>.9&&e.x> -325&&e.x< -315&&e.z>24&&e.z<43&&e.len>15;
}
export function buildYifuHallFacade(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[],e:Frontage,m:{pale:T.Material;dark:T.Material;glass:T.Material}){
 const point=(u:number,v:number)=>[e.x+u*Math.cos(e.angle)+v*e.nx,e.z-u*Math.sin(e.angle)+v*e.nz];
 const put=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material,solid=false)=>{
  const[x,z]=point(u,v);b.box(w,h,d,x,y,z,mat,false,e.angle);
  if(solid){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d));mesh.position.set(x,y,z);mesh.rotation.y=e.angle;meshes.push(collisionMesh(mesh));camera.push(mesh);}
 };
 // A thin stone face replaces the old generic window arrangement.
 put(0,3.6,.055,e.len,7.2,.10,m.pale);
 const pane=(u:number,y:number,w:number,h:number,divisions:number)=>{
  put(u,y,.13,w+.12,h+.12,.10,m.dark);
  const[x,z]=point(u,.19);b.add(new T.PlaneGeometry(w,h),m.glass,x,y,z,new T.Euler(0,e.angle,0));
  for(let k=1;k<divisions;k++)put(u-w/2+w*k/divisions,y,.215,.035,h,.055,m.dark);
  put(u,y+h*.12,.22,w,.04,.055,m.dark);
 };
 const centers=[-6,0,6];
 for(const u of centers){
  pane(u,5.12,4.65,1.55,6);
  put(u,4.29,.18,4.86,.10,.28,m.pale);
 }
 // Only the ground-floor openings have projecting stone piers.
 for(const u of[-6,6])pane(u,1.88,4.65,2.50,4);
 pane(0,1.88,5.4,2.50,6);
 for(const u of[-9,-3,3,9])put(u,1.87,.31,.38,2.54,.54,m.pale);
 put(0,3.22,.27,e.len,.22,.46,m.pale);
 for(const u of[-.12,.12])put(u,1.59,.27,.035,.48,.075,m.dark);
 // A solid thin door and the original envelope prevent entry into an
 // unmodelled interior. There are no invented turnstiles or glass vestibule.
 put(0,1.88,.17,5.4,2.5,.08,m.glass,true);
 const[dx,dz]=point(0,.22);doors.push({name:'逸夫馆',x:dx,y:.6,z:dz,yaw:e.angle,width:5.4});
 // Broad four-riser flight, contiguous with the shallow landing.
 put(0,.30,.65,12,.60,1.3,m.pale,true);
 for(let step=0;step<4;step++){
  const h=(4-step)*.15;put(0,h/2,1.47+step*.34,12,h,.34,m.pale,true);
 }
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;
 const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,768,160);ctx.fillStyle='#ae8a3e';
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='100px "Kaiti SC","STKaiti",serif';ctx.fillText('逸 夫 館',384,85,730);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const gold=new T.MeshStandardMaterial({name:'yifu-hall-gold-lettering',map:texture,transparent:true,alphaTest:.12,roughness:.65,metalness:.2});
 const[sx,sz]=point(0,.23);b.add(new T.PlaneGeometry(3.55,.74),gold,sx,3.78,sz,new T.Euler(0,e.angle,0));
 return{source:'NJU official VR scene_gl-4-13-f; dimensions approximate',upperWindows:3,groundOpenings:3,entryHeight:.6,stairWidth:12,risers:4,lettering:'逸夫館',letteringWidth:3.55,projectingVestibule:false};
}
