import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {southBoundaryRuns} from './south-boundary-layout.ts';
import {facilityFront,facilityMaterial} from './life-facility-geometry.ts';

// The user points to the boundary immediately left/east of China Post.
// Near photograph establishes grey doors, yellow headers, stone piers and
// metal canopies. Number of banks, dimensions and exact offset approximate.
export function buildPostalTakeaway(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[]){
 const points=southBoundaryRuns.find(r=>r.name==='south-west')!.points,[a,c]=points.slice(-2),len=Math.hypot(c[0]-a[0],c[1]-a[1]);
 const e={x:(a[0]+c[0])/2,z:(a[1]+c[1])/2,nx:-(c[1]-a[1])/len,nz:(c[0]-a[0])/len,len,yaw:0};e.yaw=Math.atan2(e.nx,e.nz);
 const {box,sign,beam,point}=facilityFront(b,e,meshes,camera);
 const stone=facilityMaterial('postal-takeaway-stone',0xb5b7ab),joint=facilityMaterial('postal-takeaway-stone-joints',0x737c72),grey=facilityMaterial('postal-takeaway-locker-doors',0xd1d1c6),dark=facilityMaterial('postal-takeaway-locker-casing',0x343c3b),yellow=facilityMaterial('postal-takeaway-yellow-header',0xe2b94f),metal=facilityMaterial('postal-takeaway-canopy-steel',0x858f8a),canopy=facilityMaterial('postal-takeaway-canopy',0xb7beb7);
 metal.metalness=.5;metal.roughness=.45;
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
  // Shallow steel roof and diagonal rear brackets, as in the supplied photograph.
  const p=point(u,.66),g=new T.BoxGeometry(w+.32,.10,1.65);g.rotateX(.075);g.rotateY(e.yaw);g.translate(p.x,3.42,p.z);const proxy=new T.Mesh(g.clone());
  // Keep roof physics/camera aligned with the visible slope.
  meshes.push(collisionMesh(proxy));camera.push(proxy);b.add(g,canopy);box(u,3.46,1.49,w+.36,.13,.10,metal);
  for(const du of[-w/2+.12,w/2-.12]){beam([u+du,2.92,.24],[u+du,3.43,1.37],.045,metal);beam([u+du,3.35,.15],[u+du,3.46,1.43],.045,metal);}
  bays.push({u,width:w,columns:5,rows:4});
 }
 return{frontage:[e.x,e.z,e.nx,e.nz],banks:2,doors:40,canopies:2,publicSide:true,bays,source:'User post-shelter-game.png placement and meituan-lockers.png appearance 2026-10-07',approximate:'bank count, width and exact boundary offset; overview joining China Post and lockers still needed'};
}
