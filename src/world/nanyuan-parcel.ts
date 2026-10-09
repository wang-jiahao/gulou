import * as T from 'three';
import {Builder} from './geometry.ts';
import type {MapFeature} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';
import {buildParcelEntrance} from './parcel-entrance.ts';
import {facilityFaces,facilityFront,facilityMaterial,facilityShell} from './life-facility-geometry.ts';

/** User nanyuan-parcel.png: a single-storey gable, separate from China Post.
 * East approach follows the earlier matching in-game screenshot. Rear length
 * follows plan100; unshown rear, absolute dimensions and roof depth approximate. */
export function buildNanyuanParcel(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const wall=facilityMaterial('parcel-white-plaster',0xdbded3),dark=facilityMaterial('parcel-dark-timber-trim',0x414a48),roof=facilityMaterial('parcel-grey-roof',0x59605e),stone=facilityMaterial('parcel-stone-base',0xa3a695),glass=facilityMaterial('parcel-side-glazing',0x607d79);
 const edges=facilityFaces(f),front=edges.filter(e=>e.nx>.9).sort((a,c)=>c.len-a.len)[0],{box,point,beam}=facilityFront(b,front,meshes,camera);
 const eaves=3.8,rise=1.7,half=front.len/2;
 facilityShell(f,eaves,b,meshes,camera,wall,dark);
 const v=f.points.map(([x,z])=>(x-front.x)*front.nx+(z-front.z)*front.nz),back=Math.min(...v),length=-back;
 const addPrism=(shape:T.Shape,material:T.Material,depth:number,start:number)=>{
  const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),p=point(0,start);g.rotateY(front.yaw);g.translate(p.x,0,p.z);
  const proxy=new T.Mesh(g.clone());meshes.push(collisionMesh(proxy));camera.push(proxy);b.add(g,material);
 };
 const gable=new T.Shape();gable.moveTo(-half,eaves);gable.lineTo(half,eaves);gable.lineTo(0,eaves+rise);gable.closePath();addPrism(gable,wall,length,back);
 const roofProfile=new T.Shape();roofProfile.moveTo(-half-.24,eaves-.08);roofProfile.lineTo(-half-.24,eaves+.10);roofProfile.lineTo(0,eaves+rise+.18);roofProfile.lineTo(half+.24,eaves+.10);roofProfile.lineTo(half+.24,eaves-.08);roofProfile.lineTo(0,eaves+rise);roofProfile.closePath();addPrism(roofProfile,roof,length+.5,back-.25);
 let windows=0;
 for(const e of edges){
  const {box:sideBox}=facilityFront(b,e,meshes,camera);sideBox(0,.43,.055,e.len,.86,.14,stone);
  if(e===front)continue;
  const bays=Math.max(1,Math.floor(e.len/4.8));for(let i=0;i<bays;i++){
   const u=(i-(bays-1)/2)*e.len/bays;sideBox(u,2.35,.10,1.8,1.5,.12,dark);sideBox(u,2.35,.18,1.64,1.34,.06,glass);sideBox(u,2.35,.23,.05,1.38,.06,wall);windows++;
  }
 }
 // Dark structural lines, white gable and teapot-shaped silhouette visible in photo.
 for(const u of[-half+.18,-1.85,1.85,half-.18])box(u,2.09,.16,.10,3.42,.14,dark);
 box(0,3.75,.18,front.len,.11,.16,dark);box(0,3.30,.20,front.len-.4,.10,.17,dark);
 beam([-half,3.86,.22],[0,5.50,.22],.085,dark);beam([0,5.50,.22],[half,3.86,.22],.085,dark);
 for(const u of[-1.85,1.85]){const top=eaves+rise*(1-Math.abs(u)/half);box(u,(3.78+top)/2,.18,.08,top-3.78,.10,dark);}
 for(let i=0;i<15;i++)box((i-7)*.255,3.53,.24,.10,.28,.06,dark);
 const c=document.createElement('canvas');c.width=256;c.height=160;const ctx=c.getContext('2d')!;ctx.fillStyle='#414a48';ctx.beginPath();ctx.ellipse(127,92,60,36,0,0,Math.PI*2);ctx.fill();ctx.fillRect(100,49,54,8);ctx.beginPath();ctx.arc(127,46,8,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(74,91);ctx.lineTo(41,56);ctx.lineTo(62,60);ctx.lineTo(86,73);ctx.fill();ctx.strokeStyle='#414a48';ctx.lineWidth=10;ctx.beginPath();ctx.ellipse(185,78,22,20,-.35,0,Math.PI*2);ctx.stroke();
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const p=point(0,.25);b.add(new T.PlaneGeometry(1.75,1.09),new T.MeshStandardMaterial({name:'parcel-photo-teapot-silhouette',map:texture,transparent:true,depthWrite:false}),p.x,4.48,p.z,new T.Euler(0,front.yaw,0));
 const parcelEntrance=buildParcelEntrance(b,meshes,camera,doors,f.tags.name,front.x,front.z,front.yaw);
 return{id:f.id,name:f.tags.name,source:'User nanyuan-parcel.png 2026-10-07 + prior east-facing game screenshot; plan100 footprint; dimensions/rear approximate',height:5.68,storeys:1,windows,roof:'single grey pitched roof and white dark-trimmed gable',dormitory:false,frontage:[front.x,front.z,front.nx,front.nz],parcelEntrance};
}
