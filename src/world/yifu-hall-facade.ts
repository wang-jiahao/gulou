import * as T from 'three';
import {Builder} from './geometry.ts';
import {addBuildingLettering} from './building-lettering.ts';
import {yifuHallSideInset} from './yifu-hall-side-entrance.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

type Frontage={x:number;z:number;nx:number;nz:number;angle:number;len:number};
const recess={depth:1.65,halfWidth:9.3,floor:.6,ceiling:3.15};
const sideRecess={depth:.9+yifuHallSideInset,halfWidth:3.1,floor:0,ceiling:4.65};
/** Official VR gl-4-13 front: three upper windows over a recessed colonnade.
 * This is plan-34 (逸夫馆), not plan-10 (逸夫管理科学楼). Sizes are approximate. */
export function isYifuHallFront(e:Frontage){
 return e.nx>.9&&e.x> -325&&e.x< -315&&e.z>24&&e.z<43&&e.len>15;
}
/** Cut only the ground-floor porch out of the actual building shell. Work in
 * frontage coordinates so its slightly oblique wall meets both wings cleanly.
 * The map footprint and upper volume remain unchanged. */
export function yifuHallSideFront(edges:Frontage[],front?:Frontage){
 if(!front)return;
 const edge=edges.find(e=>e.x> -308&&e.x< -300&&e.z>42&&e.z<45&&e.nz<-.9&&e.len>30&&e.len<40);
 if(!edge)return;
 // Left wing when facing the main door, opening north into its courtyard.
 // VR and map establish the relationship; the 22m station is approximate.
 const t=(22-(edge.x-front.x)*front.nx-(edge.z-front.z)*front.nz)/(Math.cos(edge.angle)*front.nx-Math.sin(edge.angle)*front.nz);
 return{...edge,x:edge.x+t*Math.cos(edge.angle),z:edge.z-t*Math.sin(edge.angle),len:sideRecess.halfWidth*2};
}
type Volume={points:number[][];y:number;height:number};
function cutRecess(volume:Volume,e:Frontage,r:typeof recess,maxV:number):Volume[]{
 const {points,y,height}=volume,whole=[volume],floor=Math.max(y,r.floor),ceiling=Math.min(y+height,r.ceiling);
 if(ceiling<=floor)return whole;
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
 const strip=(ring:number[][])=>clip(clip(ring,1,-r.depth,1),1,maxV,-1);
 const opening=(ring:number[][])=>clip(clip(strip(ring),0,-r.halfWidth,1),0,r.halfWidth,-1);
 if(area(opening(local))<1e-6)return whole;
 // A half-plane can split a concave wing into separate islands. Clipping
 // the whole ring would join them with a phantom wall across the courtyard.
 // Triangulate first so every retained fragment is convex and stays inside
 // the original footprint; the builder batches their visible surfaces.
 const triangles=T.ShapeUtils.triangulateShape(local.map(([u,v])=>new T.Vector2(u,v)),[]);
 const retained=triangles.flatMap(ids=>{
  const ring=ids.map(i=>local[i]),front=strip(ring);
  if(area(opening(ring))<1e-6)return [ring];
  return [clip(ring,1,-r.depth,-1),clip(ring,1,maxV,1),clip(front,0,-r.halfWidth,-1),clip(front,0,r.halfWidth,1)];
 });
 return [{points,y,height:floor-y},{points,y:ceiling,height:y+height-ceiling},
  ...retained.filter(p=>area(p)>1e-6).map(p=>({points:p.map(([u,v])=>[e.x+u*Math.cos(e.angle)+v*e.nx,e.z-u*Math.sin(e.angle)+v*e.nz]),y:floor,height:ceiling-floor}))].filter(v=>v.height>1e-6);
}
export function yifuHallVolumes(points:number[][],height:number,e?:Frontage,side?:Frontage){
 let volumes:Volume[]=[{points,y:0,height}];
 if(e)volumes=volumes.flatMap(v=>cutRecess(v,e,recess,.05));
 // A bounded strip is essential: an unbounded forward cut also opens the
 // opposite courtyard wing when it intersects the same footprint section.
 if(side)volumes=volumes.flatMap(v=>cutRecess(v,side,sideRecess,.05));
 return volumes;
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
 const gold=new T.MeshStandardMaterial({name:'yifu-hall-gold-lettering',color:0xcda537,roughness:.46,metalness:.45});
 // The photographed strokes occupy this width; a spaced font on a much wider
 // transparent canvas made the old sign look less than half its intended size.
 const[sx,sz]=point(0,.23);addBuildingLettering(b,'yifuHall',sx,3.38,sz,3.55,e.angle,gold);
 return{source:'NJU official VR scene_gl-4-13-f/l/r; dimensions approximate',upperWindows:3,groundOpenings:3,entryHeight:.6,stairWidth:12,risers:4,lettering:'逸夫館',letteringWidth:3.55,projectingVestibule:false,recessDepth:recess.depth,porchClearHeight:recess.ceiling-recess.floor,solidPiers:4};
}
