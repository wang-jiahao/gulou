import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';

export type DoorRecord={name:string;x:number;y:number;z:number;yaw:number;width:number};
export function entranceMaterials(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d')!;c.fillStyle='#263d38';c.fillRect(0,0,512,96);c.fillStyle='#ebeada';c.font='32px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('室内暂未开放',256,48);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  return{
    glass:new T.MeshStandardMaterial({name:'entry-clear-glass',color:0xb4d0cd,transparent:true,opacity:.18,roughness:.13,metalness:.05,depthWrite:false,side:T.DoubleSide}),
    frame:new T.MeshStandardMaterial({name:'door-frame',color:0x7f8b85,metalness:.6,roughness:.38}),
    steel:new T.MeshStandardMaterial({name:'indoor-access-gate',color:0xb9c2bd,metalness:.65,roughness:.4}),
    inside:new T.MeshStandardMaterial({name:'entry-background',color:0x404c47,roughness:1}),
    floor:new T.MeshStandardMaterial({name:'entry-floor',color:0xc2bfb0,roughness:.9}),
    screen:new T.MeshStandardMaterial({name:'entry-reader',color:0x122f28,emissive:0x377359,emissiveIntensity:.5,roughness:.4}),
    notice:new T.MeshBasicMaterial({map,toneMapped:false,side:T.DoubleSide}),
  };
}
/** A shallow visible vestibule outside the solid building envelope. Closed
 * glass doors have their own collider; the access gates are a future-interior preview. */
export function addEntrance(b:Builder,meshes:CollisionMesh[],doors:DoorRecord[],m:ReturnType<typeof entranceMaterials>,name:string,x:number,z:number,yaw:number,width=3.8,y=0){
  const nx=Math.sin(yaw),nz=Math.cos(yaw),point=(u:number,v:number)=>[x+u*Math.cos(yaw)+v*nx,z-u*Math.sin(yaw)+v*nz];
  const box=(u:number,cy:number,v:number,w:number,h:number,d:number,mat:T.Material)=>{const[p,q]=point(u,v);b.box(w,h,d,p,cy+y,q,mat,false,yaw);};
  box(0,1.35,.12,width,2.7,.08,m.inside);box(0,.06,.75,width,.12,1.4,m.floor);box(0,2.74,.75,width+.16,.15,1.5,m.frame);
  for(const side of[-1,1]){box(side*(width/2-.06),1.4,.78,.12,2.8,1.5,m.frame);box(side*.08,1.38,1.53,.045,.48,.055,m.steel);}
  for(const u of[-width*.25,0,width*.25])box(u,1.36,1.49,.055,2.72,.075,m.frame);
  box(0,1.40,1.47,width-.18,2.6,.025,m.glass);
  for(const u of[-width*.29,0,width*.29]){box(u,.51,.68,.22,1.0,.55,m.steel);box(u,1.19,.77,.14,.28,.08,m.screen);}
  for(const u of[-width*.145,width*.145])box(u,.65,.92,width*.20,.50,.025,m.glass);
  const[p,q]=point(0,1.50);const collision=new T.Mesh(new T.BoxGeometry(width,2.7,.06));collision.position.set(p,y+1.4,q);collision.rotation.y=yaw;meshes.push(collisionMesh(collision));
  b.add(new T.PlaneGeometry(Math.min(2.2,width-.3),.38),m.notice,p,y+2.18,q+.005*nz,new T.Euler(0,yaw,0));
  doors.push({name,x:p,y,z:q,yaw,width});
}
