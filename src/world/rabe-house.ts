import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {splitBuildingRoof} from './building-roof.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

// Keep the old exclusion point so refining this door cannot reseed campus trees.
export const rabePlantingClearance={x:131.7747189512805,z:688.8129643810108};

/** User photograph and official gl-1-08: two brick storeys plus an attic,
 * enclosed projecting porch, circular stone balustrade and red entrance steps.
 * Mapped envelope retained. VR links place Taoyuan to the north and the
 * courtyard exit to the east: the entrance is registered on the south.
 * The simplified plan includes the porch; a recessed main wall leaves it
 * within that envelope. Registration, setbacks and dimensions are approximate. */
export function buildRabeHouse(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const mat=(name:string,color:number)=>new T.MeshStandardMaterial({name:`rabe-${name}`,color,roughness:.9});
 const wall=mat('grey-brick',0xffffff),trim=mat('cream-wood',0xe0ddbf),stone=mat('pale-stone',0xbfc1b7),base=mat('dark-plinth',0x454b4a),tile=mat('grey-roof',0x4b514e),glass=mat('glass',0x6a7b77),dark=mat('reveal',0x333b37),red=mat('red-steps',0x99392f),carpet=mat('red-mat',0xc03c35),metal=mat('lamp-stem',0x454c42),globe=mat('lamp-globe',0xe3d6a4);
 glass.roughness=.34;tile.side=T.DoubleSide;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#858982';ctx.fillRect(0,0,256,256);
 for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const g=71+((row*17+col*11+53)%17);ctx.fillStyle=`rgb(${g},${g+5},${g+5})`;ctx.fillRect(col*64+(row%2)*32+1,row*32+1,62,30);}
 const brick=new T.CanvasTexture(canvas);brick.colorSpace=T.SRGBColorSpace;brick.wrapS=brick.wrapT=T.RepeatWrapping;wall.map=brick;
 const solid=(g:T.BufferGeometry,x=0,y=0,z=0,yaw=0)=>{const mesh=new T.Mesh(g);mesh.position.set(x,y,z);mesh.rotation.y=yaw;meshes.push(collisionMesh(mesh));camera.push(mesh);};
 // Read the southern edge of the mapped envelope before recessing the body.
 const [sx,sz]=f.points[2],[ex,ez]=f.points[3],frontLength=Math.hypot(ex-sx,ez-sz);
 const frontNormal={x:-(ez-sz)/frontLength,z:(ex-sx)/frontLength};
 const mainWallSetback=2.7,bodyFeature={...f,points:f.points.map(([x,z],i)=>i>=2?[x-frontNormal.x*mainWallSetback,z-frontNormal.z*mainWallSetback]:[x,z])};
 const body=new T.ExtrudeGeometry(planShape(bodyFeature),{depth:7.6,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
 solid(body.clone());const surfaces=splitBuildingRoof(body),p=surfaces.walls.getAttribute('position'),n=surfaces.walls.getAttribute('normal'),uv=surfaces.walls.getAttribute('uv');
 for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)*n.getZ(i)-p.getZ(i)*n.getX(i))/1.04,p.getY(i)/1.04);
 b.add(surfaces.walls,wall);surfaces.roof.dispose();body.dispose();
 const edges=bodyFeature.points.map(([x,z],i)=>{const [xx,zz]=bodyFeature.points[(i+1)%bodyFeature.points.length],len=Math.hypot(xx-x,zz-z),mx=(x+xx)/2,mz=(z+zz)/2;let nx=-(zz-z)/len,nz=(xx-x)/len;if(insidePolygon(mx+nx*.3,mz+nz*.3,bodyFeature)){nx=-nx;nz=-nz;}return {i,len,x:mx,z:mz,nx,nz,yaw:Math.atan2(nx,nz)};});
 const e=edges[2],porchU=-2.85;
 const point=(u:number,v:number)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz];
 const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string)=>{const[x,z]=point(u,v);b.box(w,h,d,x,y,z,m,false,e.yaw,m===wall?1.04:2);if(kind){solid(new T.BoxGeometry(w,h,d),x,y,z,e.yaw);boxes.push({kind,u,y,v,w,h,d});}};
 let windows=0;
 const window=(put:(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>void,u:number,y:number,w=1.52,h=1.94,v=0)=>{
  put(u,y,v+.07,w+.18,h+.18,.12,dark);put(u,y,v+.15,w,h,.06,glass);
  for(const side of[-1,1]){put(u+side*w/2,y,v+.21,.09,h,.10,trim);put(u,y+side*h/2,v+.21,w,.08,.1,trim);}
  put(u,y,v+.21,.06,h,.10,trim);put(u,y-.22,v+.21,w,.06,.1,trim);
  put(u,y+h/2+.19,v+.12,w+.38,.24,.23,stone);put(u,y-h/2-.08,v+.17,w+.26,.13,.32,stone);windows++;
 };
 for(const edge of edges){
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>b.box(w,h,d,edge.x+u*edge.nz+v*edge.nx,y,edge.z-u*edge.nx+v*edge.nz,m,false,edge.yaw);
  put(0,.37,.04,edge.len,.74,.08,base);put(0,7.46,.18,edge.len+.24,.21,.48,stone);
  if(edge.i===2){for(const u of[1.15,4.68])for(const y of[2.28,5.62])window(put,u,y);window(put,porchU,5.86,2.40,2.40);}
  else for(const u of[-4.6,-1.55,1.55,4.6])for(const y of[2.28,5.62])window(put,u,y,1.38,2.0);
 }
 // The vestibule is enclosed in the photographs; its double door is closed.
 box(porchU,2.17,1.00,4.45,4.34,2.00,wall,'porch');
 box(porchU,.45,1.33,4.55,.9,2.67,base,'landing');
 for(let i=0;i<5;i++){const h=(5-i)*.9/6;box(porchU,h/2,2.81+i*.32,3.25+i*.12,h,.34,red,'step');}
 box(porchU,.018,4.90,4.0,.028,1.2,carpet);
 box(porchU,2.48,2.065,2.78,3.16,.12,trim,'door');
 for(const side of[-1,1]){
  const u=porchU+side*.67;box(u,2.07,2.15,1.22,2.30,.08,trim);
  box(u,2.55,2.20,.99,1.03,.035,glass);
  for(const dy of[-.53,0,.53])box(u,2.55+dy,2.23,1.0,.05,.05,trim);
  box(u,2.55,2.23,.05,1.07,.05,trim);
  for(const y of[1.21,1.57])box(u,y,2.20,.99,.24,.06,stone);
  box(porchU+side*.13,2.05,2.25,.035,.28,.075,metal);
 }
 box(porchU,3.46,2.16,2.48,.88,.05,glass);
 for(const u of[-1.28,-.43,.43,1.28])box(porchU+u,3.46,2.22,.08,.95,.09,trim);
 for(const y of[2.98,3.94])box(porchU,y,2.22,2.68,.09,.09,trim);
 box(porchU,4.20,1.13,4.68,.23,2.45,stone,'balcony');box(porchU,4.39,1.13,4.89,.15,2.60,base,'balcony-coping');
 // A single extruded panel per side has real circular cut-outs and narrow
 // vertical openings above/below them. No transparent painted railing plane.
 const rail=(width:number,u:number,v:number,yaw:number)=>{
  const shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width/2,1);shape.lineTo(-width/2,1);shape.closePath();
  const count=Math.max(2,Math.floor((width-.22)/.53)),spacing=(width-.3)/count;
  for(let i=0;i<count;i++){
   const x=(i-(count-1)/2)*spacing,hole=new T.Path();hole.absarc(x,.52,.157,0,Math.PI*2,true);shape.holes.push(hole);
   for(const [a,c]of[[.12,.29],[.75,.90]]){const slit=new T.Path();slit.moveTo(x-.047,a);slit.lineTo(x-.047,c);slit.lineTo(x+.047,c);slit.lineTo(x+.047,a);slit.closePath();shape.holes.push(slit);}
  }
  const g=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false,curveSegments:12}),[x,z]=point(u,v);solid(g.clone(),x,4.48,z,yaw);b.add(g,stone,x,4.48,z,new T.Euler(0,yaw,0));
 };
 rail(4.78,porchU,2.35,e.yaw);
 for(const side of[-1,1])rail(2.35,porchU+side*2.30,1.17,e.yaw+Math.PI/2);
 box(porchU,5.52,2.41,4.98,.13,.34,stone,'rail-cap');
 for(const side of[-1,1]){
  box(porchU+side*2.32,5.52,1.21,.32,.13,2.55,stone,'side-rail-cap');
  box(porchU+side*2.30,4.98,2.37,.28,1.10,.28,stone,'rail-post');
  const[x,z]=point(porchU+side*1.76,2.16);b.add(new T.CylinderGeometry(.033,.043,.83,8),metal,x,2.48,z);b.add(new T.SphereGeometry(.17,12,8),globe,x,2.96,z);
 }
 window(box,porchU-2.33,2.37,1.15,1.87,0);
 // Retain the mapped outline and build one overhanging hip roof over the attic.
 const center=new T.Vector2(bodyFeature.points.reduce((s,p)=>s+p[0],0)/4,bodyFeature.points.reduce((s,p)=>s+p[1],0)/4);
 const corners=bodyFeature.points.map(([x,z])=>new T.Vector3(x+(x-center.x)*.09,7.70,z+(z-center.y)*.075));
 const a=new T.Vector3(center.x,10.52,center.y-2.05),c=new T.Vector3(center.x,10.52,center.y+2.05),positions:number[]=[];
 const tri=(a:T.Vector3,c:T.Vector3,d:T.Vector3)=>positions.push(...a.toArray(),...c.toArray(),...d.toArray());
 const ridge=[a,a,c,c];
 for(let i=0;i<4;i++){const j=(i+1)%4;tri(corners[i],corners[j],ridge[j]);if(ridge[i]!==ridge[j])tri(corners[i],ridge[j],ridge[i]);b.cylinder(corners[i],corners[j],.085,.085,base);}
 const roof=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));roof.computeVertexNormals();solid(roof.clone());b.add(roof,tile);b.cylinder(a,c,.10,.10,tile);
 // Broad cream soffit below the roof, with a single front attic dormer.
 for(const edge of edges)b.box(edge.len+1.2,.11,.82,edge.x+edge.nx*.28,7.60,edge.z+edge.nz*.28,trim,false,edge.yaw);
 box(-.6,8.71,-2.85,2.55,1.78,2.5,trim,'dormer');window(box,-.6,8.74,1.60,1.44,-1.56);
 box(-.6,9.67,-2.83,2.88,.19,2.91,tile,'dormer-roof');
 // Freestanding pale stone marker with the legible green inscription.
 const markerU=porchU-3.6;
 box(markerU,.10,2.15,2.30,.20,.95,stone,'marker-foot');box(markerU,.61,2.15,1.98,.84,.60,stone,'marker-base');
 box(markerU,1.12,2.15,2.32,.18,.83,stone,'marker-ledge');box(markerU,1.82,2.13,1.92,1.25,.28,stone,'marker');
 const label=document.createElement('canvas');label.width=768;label.height=256;const text=label.getContext('2d')!;text.fillStyle='#3f7863';text.textAlign='center';text.textBaseline='middle';text.font='100px "Kaiti SC","STKaiti",serif';text.fillText('拉贝旧居',384,128,700);
 const texture=new T.CanvasTexture(label);texture.colorSpace=T.SRGBColorSpace;const title=new T.MeshStandardMaterial({name:'rabe-marker-title',map:texture,transparent:true,depthWrite:false,roughness:.9}),[tx,tz]=point(markerU,2.276);b.add(new T.PlaneGeometry(1.68,.56),title,tx,1.96,tz,new T.Euler(0,e.yaw,0));
 const[dx,dz]=point(porchU,2.16);doors.push({name:f.tags.name,x:dx,y:.9,z:dz,yaw:e.yaw,width:2.78});
 return {id:f.id,name:f.tags.name,source:'user Rabe photograph + official gl-1-08; south-facing registration inferred from VR links; mapped envelope includes porch; dimensions and hidden faces approximate',height:10.52,storeys:2,attic:true,windows,roof:'hip with dormer',dormitory:false,frontage:[dx,dz,e.nx,e.nz],porchU,mainWallSetback,bodyOutline:bodyFeature.points,boxes,sign:'拉贝旧居'};
}
