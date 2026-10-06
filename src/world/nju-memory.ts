import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {splitBuildingRoof} from './building-roof.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

/** Official 2016 opening notice: Hankou Road 9, beside the Nanyuan post office.
 * User and 2020 alumni photographs establish the street-facing shopfront.
 * Map footprint retained; dimensions, postal share and hidden elevations approximate. */
export function buildNjuMemory(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const mat=(name:string,color:number)=>new T.MeshStandardMaterial({name:`nju-memory-${name}`,color,roughness:.85});
 const wall=mat('light-plaster',0xcdd0c9),fascia=mat('grey-fascia',0x6c7374),trim=mat('stone-trim',0xbfc3ba),dark=mat('display-recess',0x253330),frame=mat('dark-aluminium',0x424c47),glass=mat('glass',0x637d7b),gold=mat('brass',0xd1bc80),paving=mat('paving',0xa2a8a2),post=mat('postal-green',0x075e49);
 glass.roughness=.22;glass.metalness=.25;
 const body=new T.ExtrudeGeometry(planShape(f),{depth:7.45,bevelEnabled:false}).rotateX(-Math.PI/2);
 const proxy=new T.Mesh(body.clone());meshes.push(collisionMesh(proxy));camera.push(proxy);
 const surfaces=splitBuildingRoof(body);b.add(surfaces.walls,wall);b.add(surfaces.roof,fascia);body.dispose();
 const edges=f.points.map(([x,z],i)=>{const[xx,zz]=f.points[(i+1)%f.points.length],len=Math.hypot(xx-x,zz-z),mx=(x+xx)/2,mz=(z+zz)/2;let nx=-(zz-z)/len,nz=(xx-x)/len;if(insidePolygon(mx+nx*.3,mz+nz*.3,f)){nx=-nx;nz=-nz;}return{i,len,x:mx,z:mz,nx,nz,yaw:Math.atan2(nx,nz)};});
 let windows=0;
 for(const e of edges){
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>b.box(w,h,d,e.x+u*e.nz+v*e.nx,y,e.z-u*e.nx+v*e.nz,m,false,e.yaw);
  put(0,.24,.04,e.len,.48,.1,fascia);put(0,7.40,.1,e.len+.18,.18,.26,trim);
  const n=Math.max(1,Math.floor(e.len/4.3));
  for(let i=0;i<n;i++)for(const y of e.i===0?[6.0]:[2.25,5.85]){
   const u=(i-(n-1)/2)*e.len/n,w=1.48,h=1.77;
   put(u,y,.07,w+.16,h+.16,.13,frame);put(u,y,.15,w,h,.06,glass);
   put(u,y,.21,.07,h,.07,trim);put(u,y+.25,.21,w,.07,.07,trim);put(u,y-h/2-.08,.19,w+.24,.12,.31,trim);windows++;
  }
 }
 const e=edges[0],point=(u:number,v:number)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>{const[x,z]=point(u,v);b.box(w,h,d,x,y,z,m,false,e.yaw);};
 const text=(label:string,u:number,y:number,v:number,w:number,h:number,color:string,script=false)=>{
  const c=document.createElement('canvas');c.width=1024;c.height=192;const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${script?'':'bold '}126px ${script?'"Kaiti SC","STKaiti",serif':'"PingFang SC",sans-serif'}`;ctx.fillText(label,512,96,990);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.MeshStandardMaterial({name:`nju-memory-sign-${label}`,map:tex,transparent:true,depthWrite:false,roughness:.8});const[x,z]=point(u,v);b.add(new T.PlaneGeometry(w,h),m,x,y,z,new T.Euler(0,e.yaw,0));
 };
 // Positive u is street-view right (west): post office left, gift shop right.
 const shop=6.3,shopWidth=15.0,postal=-8.0,postalWidth=11.3;
 box(shop,3.86,.17,shopWidth,1.53,.38,fascia);box(postal,3.86,.17,postalWidth,1.53,.38,post);
 text('南 大 记 忆',shop,3.92,.373,10.3,1.24,'#e4ce91',true);
 text('中国邮政',postal,4.06,.373,7.5,.86,'#e4c66a');text('CHINA POST',postal,3.42,.373,6.4,.38,'#e4c66a');
 box(shop,1.54,.065,shopWidth,3.06,.10,fascia);box(postal,1.54,.065,postalWidth,3.06,.10,trim);
 const opening=(u:number,w:number,door=false)=>{
  box(u,1.51,.14,w+.14,2.9,.11,trim);box(u,1.51,.21,w,2.76,.07,dark);
  box(u,1.53,.255,w-.12,2.64,.035,glass);
  for(const x of[u-w/2+.04,u,u+w/2-.04])box(x,1.53,.32,.065,2.77,.10,frame);
  for(const y of[.16,1.0,2.87])box(u,y,.32,w,.06,.10,frame);
  if(door){for(const side of[-1,1])box(u+side*.12,1.38,.41,.036,.44,.065,gold);}
  else{
   // Small original display shapes suggest stationery and keepsakes, without
   // embedding source photos or inventing readable advertisements.
   for(const y of[.69,1.39]){box(u,y,.36,w-.18,.045,.16,trim);for(let j=0;j<5;j++)box(u-w*.36+j*w*.18,y+.17,.35,.15,.30,.035,j%2?gold:trim);}
  }
 };
 opening(shop,3.15,true);opening(shop-5.0,3.7);opening(shop+5.0,3.7);opening(postal,8.8,true);
 box(shop,3.04,.39,3.27,.32,.045,trim);text('百廿校庆礼品专柜',shop,3.04,.42,2.98,.25,'#655f4c');
 box(shop+2.52,2.28,.20,1.24,.61,.1,trim);text('纪念品特许经营',shop+2.52,2.28,.26,1.12,.35,'#77674d');
 box(0,.019,2.12,e.len+.12,.038,4.24,paving);
 for(let i=0;i<Math.floor(e.len/.6);i++)box(-e.len/2+.6*i,.041,2.12,.016,.006,4.24,trim);
 for(const v of[.55,1.60,2.65,3.70])box(0,.041,v,e.len,.006,.015,trim);
 box(shop,.048,.88,3.1,.016,.93,dark);
 const[x,z]=point(shop,.39);doors.push({name:f.tags.name,x,y:0,z,yaw:e.yaw,width:3.15});
 return{id:f.id,name:f.tags.name,source:'user storefront; NJU Logistics 2016-05-19 Hankou Road 9 postal neighbour; NJU Alumni 2020 photograph; dimensions approximate',height:7.54,windows,roof:'low flat coping; concealed roof approximate',dormitory:false,frontage:[e.x,e.z,e.nx,e.nz],storeys:2,streetAccessible:true};
}
