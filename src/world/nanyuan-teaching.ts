import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {splitBuildingRoof} from './building-roof.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

/** Official gl-1-13: north entrance, two visible storeys, central gable.
 * Footprint follows the asset-office plan; dimensions and obscured wings
 * are approximate. The recessed porch is open, the interior is not modelled. */
export function buildNanyuanTeaching(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const mat=(name:string,color:number)=>new T.MeshStandardMaterial({name:`nanyuan-teaching-${name}`,color,roughness:.88});
 // The user's newer side photograph shows warm ochre plaster and pale trim.
 // Colour is approximate: trees shade much of the facade in that reference.
 const wall=mat('plaster',0xd8ba78),base=mat('lower-plaster',0xcdb279),stone=mat('stone',0xa39b84),trim=mat('ivory-frame',0xe1dcc5),dark=mat('recess',0x364440),glass=mat('glass',0x617877),shade=mat('upper-window-shade',0xd9d7c5),roof=mat('roof',0x555951);
 glass.roughness=.3;glass.metalness=.2;
 const a=f.points[3],c=f.points[4],len=Math.hypot(c[0]-a[0],c[1]-a[1]),cx=(a[0]+c[0])/2,cz=(a[1]+c[1])/2;
 let nx=-(c[1]-a[1])/len,nz=(c[0]-a[0])/len;if(insidePolygon(cx+nx*.2,cz+nz*.2,f)){nx=-nx;nz=-nz;}
 const yaw=Math.atan2(nx,nz),point=(u:number,v:number):[number,number]=>[cx+u*nz+v*nx,cz-u*nx+v*nz];
 const solid=(g:T.BufferGeometry)=>{const proxy=new T.Mesh(g.clone());meshes.push(collisionMesh(proxy));camera.push(proxy);};
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,collide=false)=>{
  const[x,z]=point(u,v);b.box(w,h,d,x,y,z,m,false,yaw);
  if(collide){const g=new T.BoxGeometry(w,h,d).rotateY(yaw).translate(x,y,z);solid(g);g.dispose();}
 };
 const body=(points:number[][],bottom:number,height:number)=>{
  const g=new T.ExtrudeGeometry(planShape({points}),{depth:height,bevelEnabled:false}).rotateX(-Math.PI/2).translate(0,bottom,0);solid(g);
  const surfaces=splitBuildingRoof(g);b.add(surfaces.walls,bottom?wall:base);b.add(surfaces.roof,roof);g.dispose();
 };
 // Remove the ground-floor front strip instead of drawing a doorway over a
 // solid collision mesh. Upper floor bridges the porch; rear doors are closed.
 const halfPorch=6.55,depth=2.35;
 const lower=f.points.flatMap((p,i)=>i===3?[p,point(-halfPorch,0),point(-halfPorch,-depth),point(halfPorch,-depth),point(halfPorch,0)]:[p]);
 body(lower,0,3.45);body(f.points,3.45,4.55);
 let windows=0;
 const window=(u:number,y:number,v:number,w:number,h:number,panes:number,upperShade=false)=>{
  box(u,y,v,w+.16,h+.16,.12,dark);box(u,y,v+.075,w,h,.05,glass);
  // In gl-1-13 the upper windows have pale covered panels above a low
  // strip of clear glazing, with a dark transom above the covered band.
  const bar=upperShade?-.65:.38;
  if(upperShade)box(u,y,v+.109,w,1.3,.012,shade);
  for(let j=0;j<=panes;j++)box(u-w/2+j*w/panes,y,v+.12,.055,h,.075,trim);
  for(const yy of[y-h/2,y+h/2,y+bar])box(u,yy,v+.13,w+.12,.065,.1,trim);
  box(u,y-h/2-.11,v+.16,w+.27,.14,.34,stone);windows++;
 };
 // The source shows three wide upper bays and narrow windows beside the porch.
 for(const u of[-4.8,0,4.8])window(u,5.85,.07,4.28,2.8,4,true);
 for(const u of[-7.95,7.95]){window(u,1.75,.07,1.95,1.75,2);window(u,5.85,.07,1.95,2.8,2,true);}
 for(const u of[-7.15,-2.4,2.4,7.15])box(u,6.0,.19,.34,3.96,.46,wall);
 box(0,3.92,.20,13.9,.84,.34,wall);box(0,3.43,.31,14.15,.17,.63,stone);
 box(0,.06,.80,14.2,.12,1.6,stone,true);
 // A continuous upper landing avoids coplanar collider seams beneath feet.
 box(0,.12,-1.095,13.8,.24,2.51,stone,true);
 for(const u of[-2.4,2.4])box(u,1.84,-.49,.40,3.20,.45,stone,true);
 // Recessed glazed door wall and transom are visible behind the two columns.
 window(0,1.69,-depth+.025,12.9,2.61,10);
 for(const u of[-.13,.13])box(u,1.43,-depth+.21,.04,.43,.07,trim);
 // Match the canvas and plane aspect ratios so the characters stay square.
 const text=document.createElement('canvas');text.width=2048;text.height=138;
 const ctx=text.getContext('2d')!;ctx.fillStyle='#6d858e';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='110px "Kaiti SC","STKaiti",serif';
 [...'南园教学楼'].forEach((character,i)=>ctx.fillText(character,1024+(i-2)*310,71));
 const texture=new T.CanvasTexture(text);texture.colorSpace=T.SRGBColorSpace;
 const sign=new T.MeshStandardMaterial({name:'nanyuan-teaching-lettering',map:texture,transparent:true,depthWrite:false,roughness:.9});
 const[sx,sz]=point(0,.383);b.add(new T.PlaneGeometry(11.7,.79),sign,sx,3.93,sz,new T.Euler(0,yaw,0));
 // A plain pitched central gable, not the former full-width curved roof.
 const gable=new T.Shape();gable.moveTo(-len/2,8);gable.lineTo(len/2,8);gable.lineTo(0,10.8);gable.closePath();
 const centreDepth=29.7,g=new T.ExtrudeGeometry(gable,{depth:centreDepth,bevelEnabled:false}).translate(0,0,-centreDepth).rotateY(yaw).translate(cx,0,cz);
 solid(g);b.add(g,wall);
 const slope=Math.atan2(2.8,len/2),slopeWidth=Math.hypot(len/2,2.8)+.45;
 for(const side of[-1,1]){
  const g=new T.BoxGeometry(slopeWidth,.16,centreDepth+.55).rotateZ(-side*slope).translate(side*len/4,9.43,-centreDepth/2).rotateY(yaw).translate(cx,0,cz);b.add(g,roof);
 }
 box(0,10.84,-centreDepth/2,.23,.18,centreDepth+.7,roof);
 window(0,9.12,.08,.78,1.03,1);
 for(const u of[-2.1,2.1])box(u,8.94,.09,.18,1.76,.2,wall);
 // No source resolves the remaining elevations: retain a restrained two-floor
 // treatment on the map outline, without adding new entrances or false signs.
 for(let i=0;i<f.points.length;i++){
  if(i===3)continue;const p=f.points[i],q=f.points[(i+1)%f.points.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]);if(length<3)continue;
  const x=(p[0]+q[0])/2,z=(p[1]+q[1])/2;let ex=-(q[1]-p[1])/length,ez=(q[0]-p[0])/length;if(insidePolygon(x+ex*.2,z+ez*.2,f)){ex=-ex;ez=-ez;}const angle=Math.atan2(ex,ez);
  b.box(length+.13,.18,.28,x+ex*.08,8.04,z+ez*.08,trim,false,angle);
  const bays=Math.max(1,Math.floor(length/3.6));
  for(let k=0;k<bays;k++)for(const y of[1.8,5.7]){
   const u=(k-(bays-1)/2)*length/bays,xx=x+u*ez,zz=z-u*ex,w=Math.min(2.05,length/bays-.7);
   b.box(w+.16,2.1,.12,xx+ex*.07,y,zz+ez*.07,trim,false,angle);
   b.box(w,1.94,.055,xx+ex*.15,y,zz+ez*.15,glass,false,angle);
   b.box(.065,1.94,.08,xx+ex*.20,y,zz+ez*.20,trim,false,angle);windows++;
  }
 }
 const[dx,dz]=point(0,-depth+.22);doors.push({name:f.tags.name,x:dx,y:.24,z:dz,yaw,width:4.4});
 return{id:f.id,name:f.tags.name,source:'Official NJU VR gl-1-13 north facade; user phase96 south-teaching-color for ochre plaster; asset-office footprint; colours, dimensions and hidden elevations approximate',height:10.93,windows,roof:'central straight gable; hidden wings approximate',dormitory:false,frontage:[cx,cz,nx,nz],storeys:2,porch:{width:halfPorch*2,depth,stepHeight:.24},lettering:'南园教学楼'};
}
