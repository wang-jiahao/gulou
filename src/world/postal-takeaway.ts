import * as T from 'three';
import {Builder} from './geometry.ts';
import type {CollisionMesh} from './collision-mesh.ts';
import {southBoundaryRuns} from './south-boundary-layout.ts';
import {facilityFront,facilityMaterial} from './life-facility-geometry.ts';

/** The marked street view places the lockers across from South Teaching,
 * between the granite panels in front of Nanyuan 18/19, east of Zhongshan.
 * Fit the photographed cabinet proportions to those existing fence bays;
 * physical dimensions and small mural strokes are not surveyed. */
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
 const e=hankouTakeawayFrontage(),{box,sign,point}=facilityFront(b,e,meshes,camera);
 const white=facilityMaterial('postal-takeaway-white-casing',0xe1e2dc),joint=facilityMaterial('postal-takeaway-panel-joints',0xa0a69f),door=facilityMaterial('postal-takeaway-locker-doors',0xe8e8e1),edge=facilityMaterial('postal-takeaway-door-recess',0xb3bab3),purple=facilityMaterial('postal-takeaway-purple-label',0x705573),screen=facilityMaterial('postal-takeaway-screen',0x416d77);
 // The continuous original boundary collider remains. This shallow cladding
 // stays within the existing stone ends, with no new campus opening.
 box(0,1.575,.28,e.len,3.15,.16,white,true);
 for(let y=.48;y<3.15;y+=.42)box(0,y,.369,e.len,.012,.014,joint);
 const columns=12,rows=7,w=4.8,pitch=w/columns,rowPitch=.35,baseY=.30;
 const labels=document.createElement('canvas');labels.width=1024;labels.height=512;
 const ctx=labels.getContext('2d')!;ctx.fillStyle='#465049';ctx.textAlign='left';ctx.textBaseline='top';ctx.font='20px sans-serif';let number=1;
 for(let col=0;col<columns;col++)for(let row=0;row<rows;row++){
  if(col===1&&row===1)continue;
  ctx.fillText(String(number++),col*1024/columns+6,row*512/rows+5);
 }
 const map=new T.CanvasTexture(labels);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const numbers=new T.MeshStandardMaterial({name:'postal-takeaway-shared-number-atlas',map,transparent:true,depthWrite:false,roughness:.8});
 const bays=[];
 for(const u of[-3.15,3.15]){
  box(u,1.50,.61,w+.08,2.83,.74,white,true);
  for(let col=0;col<columns;col++)for(let row=0;row<rows;row++){
   const x=u-w/2+(col+.5)*pitch,y=baseY+(rows-row-.5)*rowPitch;
   box(x,y,.994,pitch-.016,rowPitch-.016,.034,edge);
   box(x,y,1.014,pitch-.04,rowPitch-.038,.024,door);
   if(col===1&&row===1){box(x,y,1.03,pitch*.63,rowPitch*.53,.025,purple);box(x,y,1.045,pitch*.49,rowPitch*.39,.012,screen);}
  }
  const p=point(u,1.033);b.add(new T.PlaneGeometry(w,rows*rowPitch),numbers,p.x,baseY+rows*rowPitch/2,p.z,new T.Euler(0,e.yaw,0));
  for(let section=0;section<4;section++){
   const x=u-w/2+(section+.5)*w/4;
   box(x,2.84,1.004,w/4-.025,.21,.05,door);
   sign('外卖柜',x-.17,2.84,1.035,.65,.17,'#50565a');
   box(x+.41,2.84,1.035,.28,.18,.02,purple);
  }
  bays.push({u,width:w,columns,rows,doors:83,screen:{column:1,row:1}});
 }
 return{frontage:[e.x,e.z,e.nx,e.nz],banks:2,doors:166,canopies:0,publicSide:true,bays,source:'Hankou cabinet photograph and marked street view 2026-10-10; existing mapped fence bays east of Zhongshan',approximate:'cabinet dimensions fitted to fence; small header identifiers and continuous architectural mural strokes remain to align'};
}
