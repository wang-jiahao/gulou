import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

type Frontage={x:number;z:number;nx:number;nz:number;angle:number;len:number};
const recess={depth:1.65,halfWidth:9.3,floor:.6,ceiling:3.15};
/** Official VR gl-4-13 front: three upper windows over a recessed colonnade.
 * This is plan-34 (逸夫馆), not plan-10 (逸夫管理科学楼). Sizes are approximate. */
export function isYifuHallFront(e:Frontage){
 return e.nx>.9&&e.x> -325&&e.x< -315&&e.z>24&&e.z<43&&e.len>15;
}
/** Cut only the ground-floor porch out of the actual building shell. Work in
 * frontage coordinates so its slightly oblique wall meets both wings cleanly.
 * The map footprint and upper volume remain unchanged. */
export function yifuHallVolumes(points:number[][],height:number,e?:Frontage){
 const whole=[{points,y:0,height}];if(!e)return whole;
 const local=points.map(([x,z])=>[(x-e.x)*Math.cos(e.angle)-(z-e.z)*Math.sin(e.angle),(x-e.x)*e.nx+(z-e.z)*e.nz]);
 const clip=(ring:number[][],axis:number,value:number,side:number)=>{
  const out:number[][]=[];
  for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length],da=(a[axis]-value)*side,db=(b[axis]-value)*side;
   if(da>=0)out.push(a);
   if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }
  return out;
 };
 const area=(p:number[][])=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
 const front=clip(local,1,-recess.depth,1);
 if(area(clip(clip(front,0,-recess.halfWidth,1),0,recess.halfWidth,-1))<1e-6)return whole;
 // A half-plane can split a concave wing into separate islands. Clipping
 // the whole ring would join them with a phantom wall across the courtyard.
 // Triangulate first so every retained fragment is convex and stays inside
 // the original footprint; the builder batches their visible surfaces.
 const triangles=T.ShapeUtils.triangulateShape(local.map(([u,v])=>new T.Vector2(u,v)),[]);
 const retained=triangles.flatMap(ids=>{
  const ring=ids.map(i=>local[i]),front=clip(ring,1,-recess.depth,1);
  if(area(clip(clip(front,0,-recess.halfWidth,1),0,recess.halfWidth,-1))<1e-6)return [ring];
  return [clip(ring,1,-recess.depth,-1),clip(front,0,-recess.halfWidth,-1),clip(front,0,recess.halfWidth,1)];
 });
 return [{points,y:0,height:recess.floor},{points,y:recess.ceiling,height:height-recess.ceiling},
  ...retained.filter(p=>area(p)>1e-6).map(p=>({points:p.map(([u,v])=>[e.x+u*Math.cos(e.angle)+v*e.nx,e.z-u*Math.sin(e.angle)+v*e.nz]),y:recess.floor,height:recess.ceiling-recess.floor}))];
}
export function buildYifuHallFacade(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[],e:Frontage,m:{pale:T.Material;dark:T.Material;glass:T.Material}){
 const point=(u:number,v:number)=>[e.x+u*Math.cos(e.angle)+v*e.nx,e.z-u*Math.sin(e.angle)+v*e.nz];
 const put=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material,solid=false)=>{
  const[x,z]=point(u,v);b.box(w,h,d,x,y,z,mat,false,e.angle);
  if(solid){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d));mesh.position.set(x,y,z);mesh.rotation.y=e.angle;meshes.push(collisionMesh(mesh));camera.push(mesh);}
 };
 // The upper stone face stays on the original frontage; the lower wall is
 // behind the piers, with real floor, soffit and end returns in the shell.
 put(0,(7.2+recess.ceiling)/2,.055,e.len,7.2-recess.ceiling,.10,m.pale);
 const pane=(u:number,y:number,w:number,h:number,divisions:number,offset=0)=>{
  put(u,y,offset+.13,w+.12,h+.12,.10,m.dark);
  const[x,z]=point(u,offset+.19);b.add(new T.PlaneGeometry(w,h),m.glass,x,y,z,new T.Euler(0,e.angle,0));
  for(let k=1;k<divisions;k++)put(u-w/2+w*k/divisions,y,offset+.215,.035,h,.055,m.dark);
  put(u,y+h*.12,offset+.22,w,.04,.055,m.dark);
 };
 const centers=[-6,0,6];
 for(const u of centers){
  pane(u,5.12,4.65,1.55,6);
  put(u,4.29,.18,4.86,.10,.28,m.pale);
 }
 for(const u of[-6,6])pane(u,1.88,4.65,2.50,4,-recess.depth);
 pane(0,1.88,5.4,2.50,6,-recess.depth);
 for(const u of[-9,-3,3,9])put(u,1.875,.17,.62,2.55,.70,m.pale,true);
 put(0,3.22,.27,e.len,.22,.46,m.pale);
 for(const u of[-.12,.12])put(u,1.59,.27-recess.depth,.035,.48,.075,m.dark);
 // Keep the interior closed behind the accessible porch.
 put(0,1.88,.17-recess.depth,5.4,2.5,.08,m.glass,true);
 const[dx,dz]=point(0,.22-recess.depth);doors.push({name:'逸夫馆',x:dx,y:.6,z:dz,yaw:e.angle,width:5.4});
 put(0,.585,-recess.depth/2,recess.halfWidth*2,.03,recess.depth,m.pale);
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
 return{source:'NJU official VR scene_gl-4-13-f/l/r; dimensions approximate',upperWindows:3,groundOpenings:3,entryHeight:.6,stairWidth:12,risers:4,lettering:'逸夫館',letteringWidth:3.55,projectingVestibule:false,recessDepth:recess.depth,porchClearHeight:recess.ceiling-recess.floor,solidPiers:4};
}
