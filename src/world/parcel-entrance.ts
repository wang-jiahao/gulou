import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

/** User identifies the east-facing building as a parcel collection point.
 * Door existence/use are confirmed; this simple closed door's design and size
 * are approximate until an exterior photograph is available. */
export function buildParcelEntrance(b:Builder,meshes:CollisionMesh[],cameraSolids:T.Object3D[],doors:DoorRecord[],name:string,x:number,z:number,yaw:number){
 const nx=Math.sin(yaw),nz=Math.cos(yaw),width=2.05,height=2.65,depth=.24;
 const frame=new T.MeshStandardMaterial({name:'parcel-door-frame',color:0x85918e,roughness:.4,metalness:.55});
 const glass=new T.MeshStandardMaterial({name:'parcel-door-glass',color:0x405954,roughness:.25,metalness:.22});
 const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>b.box(w,h,d,x+u*nz+v*nx,y,z-u*nx+v*nz,m,false,yaw);
 put(0,height/2,.16,width,height,.12,glass);
 for(const u of[-width/2,0,width/2])put(u,height/2,depth,.065,height,.075,frame);
 for(const y of[.045,height])put(0,y,depth,width+.065,.075,.075,frame);
 for(const u of[-.13,.13])put(u,1.12,.30,.04,.42,.055,frame);
 const proxy=new T.Mesh(new T.BoxGeometry(width+.065,height+.075,.18));
 proxy.position.set(x+nx*.19,height/2,z+nz*.19);proxy.rotation.y=yaw;
 meshes.push(collisionMesh(proxy));cameraSolids.push(proxy);
 doors.push({name,x:x+nx*depth,y:0,z:z+nz*depth,yaw,width});
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#d3d2c5';ctx.fillRect(0,0,1024,128);
 ctx.fillStyle='#344d46';ctx.font='64px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,512,66,960);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const sign=new T.MeshStandardMaterial({name:'parcel-location-label',map:texture,roughness:.85});
 b.add(new T.PlaneGeometry(5,.625),sign,x+nx*.25,3.12,z+nz*.25,new T.Euler(0,yaw,0));
 return {use:'parcel collection',evidence:'user correction and matching game screenshot',design:'approximate; door material, size and sign typography unverified',width,height,depth};
}
