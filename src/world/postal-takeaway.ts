import * as T from 'three';
import {Builder} from './geometry.ts';
import type {CollisionMesh} from './collision-mesh.ts';
import {southBoundaryRuns} from './south-boundary-layout.ts';
import {facilityFront,facilityMaterial} from './life-facility-geometry.ts';

/** The marked street view places the lockers across from South Teaching,
 * between the granite panels in front of Nanyuan 18/19, east of Zhongshan.
 * Keep this corrected location when restoring the user-preferred legacy
 * Meituan cabinet appearance; physical dimensions remain approximate. */
export function hankouTakeawayFrontage(){
 const points=southBoundaryRuns.find(r=>r.name==='south-north-east')!.points;
 const i=points.findIndex(([x,z])=>x===-30.573&&z===376.013);
 const at=(a:number[],c:number[],t:number)=>[a[0]+(c[0]-a[0])*t,a[1]+(c[1]-a[1])*t];
 // Both neighbouring segments have four bays; the existing granite panels
 // occupy their fourth bays. Use the intervening railing, not the gate return.
 const a=at(points[i-1],points[i],.875),c=at(points[i],points[i+1],.875);
 const span=Math.hypot(c[0]-a[0],c[1]-a[1]);
 const e={x:(a[0]+c[0])/2,z:(a[1]+c[1])/2,nx:-(c[1]-a[1])/span,nz:(c[0]-a[0])/span,len:span-4.1,yaw:0};
 e.yaw=Math.atan2(e.nx,e.nz);return e;
}
export function buildPostalTakeaway(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[]){
 const e=hankouTakeawayFrontage(),len=e.len;
 const {box,sign,point}=facilityFront(b,e,meshes,camera);
 const stone=facilityMaterial('postal-takeaway-stone',0xb5b7ab),joint=facilityMaterial('postal-takeaway-stone-joints',0x737c72),grey=facilityMaterial('postal-takeaway-locker-doors',0xd1d1c6),dark=facilityMaterial('postal-takeaway-locker-casing',0x343c3b),yellow=facilityMaterial('postal-takeaway-yellow-header',0xe2b94f);
 // A thin backing conceals the old railing visually. Its original closed
 // boundary collision is retained, so the facility creates no campus opening.
 box(0,1.575,.28,len,3.15,.16,stone,true);
 for(const u of[-len/2+.3,0,len/2-.3]){
  box(u,1.59,.50,.60,3.18,.54,stone,true);
  for(let y=.42;y<3.17;y+=.42)box(u,y,.777,.6,.018,.014,joint);
 }
 // One shared small label atlas for forty doors instead of forty textures.
 const labels=document.createElement('canvas');labels.width=512;labels.height=512;const ctx=labels.getContext('2d')!;ctx.fillStyle='#4c5550';ctx.textAlign='right';ctx.font='22px sans-serif';
 for(let row=0;row<4;row++)for(let col=0;col<5;col++)ctx.fillText(String(1+row*5+col),(col+1)*102.4-12,(3-row)*128+28);
 const map=new T.CanvasTexture(labels);map.colorSpace=T.SRGBColorSpace;const numbers=new T.MeshStandardMaterial({name:'postal-takeaway-shared-number-atlas',map,transparent:true,depthWrite:false,roughness:.8});
 const bays=[];
 for(const u of[-1.82,1.82]){
  const w=2.77;box(u,1.47,.61,w,2.77,.74,dark,true);
  for(let row=0;row<4;row++)for(let col=0;col<5;col++){
   const du=u+(col-2)*.54,y=.43+row*.58;box(du,y,.999,.514,.553,.045,grey);
  }
  const labelPoint=point(u,1.026);b.add(new T.PlaneGeometry(2.70,2.32),numbers,labelPoint.x,1.30,labelPoint.z,new T.Euler(0,e.yaw,0));
  box(u,2.77,1.001,w,.32,.05,yellow);sign('美团外卖',u,2.77,1.032,1.98,.26,'#4d4b3f');
  bays.push({u,width:w,columns:5,rows:4});
 }
 return{frontage:[e.x,e.z,e.nx,e.nz],banks:2,doors:40,canopies:0,publicSide:true,bays,source:'User-requested legacy Meituan cabinet appearance 2026-10-11; corrected Hankou location and canopy removal retained',approximate:'legacy Meituan appearance restored at user request; physical cabinet dimensions remain approximate'};
}
