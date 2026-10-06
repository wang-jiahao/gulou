import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {splitBuildingRoof} from './building-roof.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';
import {addBuildingLettering} from './building-lettering.ts';

/** Official gl-2-15 frontage on the 2024 plan's outer U, facing Zhongda Road.
 * Dimensions and unobserved elevations are approximate; the courtyard is retained. */
export function buildPhysicsBuilding(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const height=18,mat=(name:string,color:number,roughness=.88,metalness=0)=>new T.MeshStandardMaterial({name:`physics-${name}`,color,roughness,metalness});
 const wall=mat('pale-grey-render',0xc2c4bd),stone=mat('projecting-stone',0xd0d0c5),edge=mat('stone-edge',0xb5b8b0),roof=mat('flat-roof',0x777f77);
 const recess=mat('recess',0x3b4541),glass=mat('grey-green-glass',0x7e9493,.32,.18),frame=mat('window-frame',0x7f8d86,.58,.2);
 const cage=mat('beige-louvres',0xb5ad98,.76,.12),cageDark=mat('louvre-shadow',0x727870),doorGlass=mat('door-glass',0x344943,.36,.2);
 const doorStripe=mat('door-red-band',0x963c3f),soffit=mat('portico-soffit',0x999d92);
 const solid=(g:T.BufferGeometry,x=0,y=0,z=0,yaw=0)=>{const p=new T.Mesh(g);p.position.set(x,y,z);p.rotation.y=yaw;meshes.push(collisionMesh(p));camera.push(p);};
 const geometry=new T.ExtrudeGeometry(planShape(f),{depth:height,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
 solid(geometry.clone());const surfaces=splitBuildingRoof(geometry);b.add(surfaces.walls,wall);b.add(surfaces.roof,roof);geometry.dispose();
 const edges=f.points.map(([x,z],i)=>{
  const [xx,zz]=f.points[(i+1)%f.points.length],len=Math.hypot(xx-x,zz-z),mx=(x+xx)/2,mz=(z+zz)/2;
  let nx=-(zz-z)/len,nz=(xx-x)/len;if(insidePolygon(mx+nx*.4,mz+nz*.4,f)){nx=-nx;nz=-nz;}
  return {i,len,x:mx,z:mz,nx,nz,yaw:Math.atan2(nx,nz)};
 });
 let windows=0;
 for(const e of edges){
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>b.box(w,h,d,e.x+u*e.nz+v*e.nx,y,e.z-u*e.nx+v*e.nz,m,false,e.yaw);
  put(0,height-.24,.19,e.len,.24,.46,stone);put(0,.28,.08,e.len,.45,.20,edge);
  if(e.len<3)continue;
  const front=e.i===14,count=Math.floor((e.len-(front?0:1.2))/3.6),spacing=front?3.6:(e.len-1)/count;
  for(let j=0;j<count;j++){
   const u=(j-(count-1)/2)*spacing,w=front?(j%2?1.55:2.85):1.9;
   for(let floor=0;floor<5;floor++){
    if(front&&floor===0&&Math.abs(u)<6.4)continue;
    const y=floor===0?2.05:5.8+(floor-1)*3.4,h=floor===0?2.75:2.65;
    put(u,y,.06,w+.16,h+.18,.12,recess);put(u,y,.14,w,h,.05,glass);
    for(const side of[-1,1]){put(u+side*w/2,y,.19,.055,h,.10,frame);put(u,y+side*h/2,.19,w,.055,.10,frame);}
    put(u,y+.47,.19,w,.05,.10,frame);put(u,y,.19,.05,h,.10,frame);
    if(w>2.4)for(const side of[-1,1])put(u+side*w*.25,y-.39,.19,.045,h-.82,.10,frame);
    windows++;
    if(front&&floor>1){
     const cy=y-1.16,ch=1.42;
     put(u,cy,.37,w+.10,ch,.52,cageDark);
     for(const side of[-1,1]){put(u+side*(w/2+.05),cy,.46,.065,ch+.06,.63,cage);put(u,cy+side*ch/2,.69,w+.16,.055,.065,cage);}
     for(let k=0;k<15;k++)put(u,cy-ch/2+.055+k*(ch-.11)/14,.71,w+.08,.037,.055,cage);
     if(w>2.4)put(u,cy,.75,.045,ch,.07,cage);
    }
   }
   if(front)for(const side of[-1,1])put(u+side*(w/2+.20),10.97,.24,.16,13.35,.25,stone);
  }
 }
 const e=edges[14],point=(u:number,v:number)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz];
 const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string)=>{
  const[x,z]=point(u,v);b.box(w,h,d,x,y,z,m,false,e.yaw);
  if(kind){solid(new T.BoxGeometry(w,h,d),x,y,z,e.yaw);boxes.push({kind,u,y,v,w,h,d});}
 };
 box(0,.24,2.25,12.35,.48,4.35,stone,'landing');
 for(let i=0;i<3;i++){const h=(3-i)*.16,v=4.63+i*.42;box(0,h/2,v,12.35,h,.44,stone,'step');box(0,h-.025,v+.19,12.35,.025,.04,edge);}
 for(const u of[-5.4,-1.8,1.8,5.4]){box(u,2.33,3.1,.72,3.70,.72,stone,'column');box(u,.54,3.1,.80,.12,.80,edge);box(u,4.03,3.1,.78,.15,.78,edge);}
 box(0,4.31,2,12.4,.30,3.65,stone,'canopy');box(0,4.49,2,12.65,.06,3.88,edge);
 // gl-2-15: the doors already sit behind the four columns. Close the rear
 // reveals and lintel, retaining that external portico instead of cutting the U shell.
 box(0,3.86,.78,12.35,.60,1.44,wall,'rear-lintel');
 // Overlap under the 75mm door frames so Float32 edges leave no camera slit.
 for(const [left,right]of[[-6.175,-4.55],[-2.65,-1.4],[1.4,2.65],[4.55,6.175]])
  box((left+right)/2,2.02,.78,right-left+.06,3.08,1.44,wall,'rear-jamb');
 box(0,4.15,2,12.25,.02,3.50,soffit);
 for(const u of[0,-3.6,3.6]){
  const w=u===0?2.80:1.90;box(u,1.98,.11,w,3,.12,recess);box(u,2.02,1.45,w,3.08,.07,doorGlass,'door');
  for(const side of[-1,1])box(u+side*w/2,2.02,1.51,.075,3.08,.1,frame);
  for(const y of[.50,2.92,3.54])box(u,y,1.51,w,.06,.1,frame);
  box(u,2.02,1.51,.065,3.08,.1,frame);
  for(const side of[-1,1])box(u+side*.11,1.79,1.59,.045,.48,.055,stone);
  // Opaque diffuser geometry, no extra dynamic light or per-frame update.
  const[lx,lz]=point(u,2.35);
  b.add(new T.SphereGeometry(.25,12,6).scale(1,.24,1),stone,lx,4.10,lz);
  box(u,4.13,2.35,.56,.055,.56,edge);
  if(u===0){
   box(u,1.72,1.555,w-.10,.10,.014,doorStripe);
   // Only the observed pale notice blocks are represented; their text is unreadable.
   for(const side of[-1,1])for(let row=0;row<3;row++)for(let col=0;col<3;col++)
    box(side*(.29+col*.32),1.20+row*.18,1.55,.27,.11,.012,edge);
   for(const side of[-1,1])box(side*.69,.81,1.55,1.26,.035,.016,frame);
  }
  const[x,z]=point(u,1.45);doors.push({name:f.tags.name,x,y:.48,z,yaw:e.yaw,width:w});
 }
 const sign=point(0,.48),lettering=addBuildingLettering(b,'physics',sign[0],4.69,sign[1],7.8,e.yaw);
 for(const u of[-3.8,0,3.8])box(u,4.84,.43,.035,.64,.04,frame);
 return {id:f.id,name:f.tags.name,source:'gl-2-15 / 2024 campus plan; dimensions and hidden elevations approximate',height,windows,roof:'flat',dormitory:false,frontage:[e.x,e.z,e.nx,e.nz],columns:boxes.filter(p=>p.kind==='column'),boxes,lettering};
}
