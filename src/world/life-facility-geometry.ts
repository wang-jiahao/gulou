import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {splitBuildingRoof} from './building-roof.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';

export const facilityMaterial=(name:string,color:number)=>new T.MeshStandardMaterial({name,color,roughness:.86});
export function facilityFaces(f:MapFeature){
 return f.points.map(([x,z],i)=>{const[xx,zz]=f.points[(i+1)%f.points.length],len=Math.hypot(xx-x,zz-z),mx=(x+xx)/2,mz=(z+zz)/2;let nx=-(zz-z)/len,nz=(xx-x)/len;if(insidePolygon(mx+nx*.2,mz+nz*.2,f)){nx=-nx;nz=-nz;}return{x:mx,z:mz,nx,nz,len,yaw:Math.atan2(nx,nz)};});
}
export type FacilityFace=ReturnType<typeof facilityFaces>[number];
export function facilityFront(b:Builder,e:FacilityFace,meshes:CollisionMesh[],camera:T.Object3D[]){
 const point=(u:number,v:number)=>new T.Vector3(e.x+u*e.nz+v*e.nx,0,e.z-u*e.nx+v*e.nz);
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,solid=false)=>{
  const p=point(u,v);b.box(w,h,d,p.x,y,p.z,m,false,e.yaw);
  if(solid){const proxy=new T.Mesh(new T.BoxGeometry(w,h,d));proxy.position.set(p.x,y,p.z);proxy.rotation.y=e.yaw;meshes.push(collisionMesh(proxy));camera.push(proxy);}
 };
 const sign=(label:string,u:number,y:number,v:number,w:number,h:number,color:string,background?:string)=>{
  const c=document.createElement('canvas');c.width=Math.min(1024,Math.max(64,2**Math.ceil(Math.log2(w*90))));c.height=Math.min(256,Math.max(64,2**Math.ceil(Math.log2(h*90))));const ctx=c.getContext('2d')!;
  if(background){ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);}
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${c.height*.64}px "PingFang SC",sans-serif`;ctx.fillText(label,c.width/2,c.height/2,c.width*.95);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.MeshStandardMaterial({name:`facility-sign-${label}`,map,transparent:!background,depthWrite:!!background,roughness:.75});
  const p=point(u,v);b.add(new T.PlaneGeometry(w,h),m,p.x,y,p.z,new T.Euler(0,e.yaw,0));
 };
 const beam=(a:number[],c:number[],radius:number,m:T.Material)=>{const p=point(a[0],a[2]),q=point(c[0],c[2]);p.y=a[1];q.y=c[1];b.cylinder(p,q,radius,radius,m,6);};
 return{box,sign,point,beam};
}
export function facilityShell(f:MapFeature,height:number,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],wall:T.Material,roof:T.Material){
 const g=new T.ExtrudeGeometry(planShape(f),{depth:height,bevelEnabled:false}).rotateX(-Math.PI/2),proxy=new T.Mesh(g.clone());meshes.push(collisionMesh(proxy));camera.push(proxy);
 const surfaces=splitBuildingRoof(g);b.add(surfaces.walls,wall);b.add(surfaces.roof,roof);g.dispose();
}
