import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {splitBuildingRoof} from './building-roof.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

/** User facade photo and official VR gl-1-23: the grey-brick building south
 * of Nanfangyuan. Registered footprint retained; heights and hidden faces approximate. */
export function buildInternationalApartments(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const material=(name:string,color:number)=>new T.MeshStandardMaterial({name:`apartments-${name}`,color,roughness:.87});
 const brick=material('weathered-grey-brick',0xffffff),roof=material('flat-roof-edge',0x3c4344),reveal=material('window-reveal',0x363d3d),frame=material('pale-window-frame',0xa8aeaa),fin=material('black-screen',0x363e40),stone=material('threshold',0x96958b);
 const glass=new T.MeshStandardMaterial({name:'window-glass-apartments',color:0x6d8b99,roughness:.32,metalness:.26});
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#c2beb0';ctx.fillRect(0,0,512,512);
 for(let row=0;row<24;row++)for(let col=-1;col<9;col++){
  const tone=102+(row*31+col*17+97)%44,weather=(row*7+col*11+77)%19===0;
  ctx.fillStyle=weather?'#aca68b':`rgb(${tone},${tone+2},${tone-2})`;ctx.fillRect(col*64+(row%2)*32+1,row*512/24+1,62,512/24-2);
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;brick.map=texture;
 const cameraMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
 const solid=(g:T.BufferGeometry,x=0,y=0,z=0,yaw=0)=>{const m=new T.Mesh(g,cameraMaterial);m.position.set(x,y,z);m.rotation.y=yaw;meshes.push(collisionMesh(m));camera.push(m);};
 const heights=[14.5,10.5],rings=[[0,1,2,5,6,7],[2,3,4,5]];
 const edge=(i:number)=>{
  const[x,z]=f.points[i],[xx,zz]=f.points[(i+1)%f.points.length],len=Math.hypot(xx-x,zz-z),mx=(x+xx)/2,mz=(z+zz)/2;
  let nx=-(zz-z)/len,nz=(xx-x)/len;if(insidePolygon(mx+nx*.4,mz+nz*.4,f)){nx=-nx;nz=-nz;}
  return {i,len,x:mx,z:mz,nx,nz,yaw:Math.atan2(nx,nz)};
 };
 for(const [part,indices]of rings.entries()){
  const shape={...f,points:indices.map(i=>f.points[i]),holes:undefined},height=heights[part];
  const g=new T.ExtrudeGeometry(planShape(shape),{depth:height,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);solid(g.clone());
  const surfaces=splitBuildingRoof(g),p=surfaces.walls.getAttribute('position'),n=surfaces.walls.getAttribute('normal'),uv=surfaces.walls.getAttribute('uv');
  for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)*n.getZ(i)-p.getZ(i)*n.getX(i))/2.3,p.getY(i)/2.3);
  b.add(surfaces.walls,brick);b.add(surfaces.roof,roof);g.dispose();
 }
 const e=edge(0),point=(u:number,v:number)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz];
 const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string)=>{
  const[x,z]=point(u,v);b.box(w,h,d,x,y,z,m,false,e.yaw,2.3);
  if(kind){solid(new T.BoxGeometry(w,h,d),x,y,z,e.yaw);boxes.push({kind,u,y,v,w,h,d});}
 };
 let windows=0;
 for(let i=0;i<f.points.length;i++){
  const a=edge(i),height=i>=2&&i<=4?10.5:14.5;
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>b.box(w,h,d,a.x+u*a.nz+v*a.nx,y,a.z-u*a.nx+v*a.nz,m,false,a.yaw,2.3);
  put(0,height,.04,a.len+.12,.20,.22,roof);put(0,.22,.03,a.len,.44,.08,reveal);
  if(a.len<3)continue;
  const count=Math.max(1,Math.floor(a.len/4.0)),spacing=a.len/count;
  const centers=i===0?[-5.25,-.65]:Array.from({length:count},(_,j)=>(j-(count-1)/2)*spacing);
  for(const u of centers)for(const y of height===14.5?[2.15,5.62,8.97,12.32]:[2.1,5.5,8.85]){
   if(i===0&&y<4.2)continue;
   const w=Math.min(2.35,spacing*.64),h=1.95;
   put(u,y,.07,w+.24,h+.24,.17,reveal);put(u,y,.17,w,h,.055,glass);
   for(const dx of[-w/2,-w/6,w/6,w/2])put(u+dx,y,.22,.055,h,.065,frame);
   for(const dy of[-h/2,h/2])put(u,y+dy,.22,w,.06,.065,frame);
   put(u,y-h/2-.10,.16,w+.25,.13,.28,reveal);windows++;
  }
 }
 // Tall glazed stair at the west (photo-right) end, with fine upright fins.
 const stairU=5.35,stairWidth=4.65;
 box(stairU,9.28,.15,stairWidth,10.25,.12,glass);
 for(let i=0;i<=27;i++)box(stairU-stairWidth/2+i*stairWidth/27,9.28,.27,.055,10.35,.22,fin);
 for(const y of[4.18,7.55,10.9,14.45])box(stairU,y,.28,stairWidth+.10,.065,.24,fin);
 // Ground-floor lobby screen: the English lettering belongs here, below the windows.
 box(0,2.12,.14,15.55,3.97,.10,glass);
 const doorU=5.1,doorWidth=2.3,landing=.14;
 for(let i=0;i<=85;i++){
  const u=-7.77+i*15.54/85;if(Math.abs(u-doorU)<1.48)continue;
  box(u,2.12,.32,.048,3.99,.21,fin);
 }
 for(const y of[.16,4.13])box(0,y,.32,15.65,.10,.25,fin);
 // Shallow glazed vestibule and canopy seen from the northern lane in official VR.
 box(doorU,landing/2,1.10,3.13,landing,2.20,stone,'landing');
 box(doorU,4.22,1.01,3.42,.18,2.25,roof,'canopy');
 for(const s of[-1,1]){
  box(doorU+s*1.47,2.13,.97,.095,3.98,1.96,glass,'vestibule-side');
  box(doorU+s*1.47,2.13,1.91,.13,3.98,.14,fin,'jamb');
 }
 box(doorU,1.80,1.89,doorWidth,3.32,.075,glass,'closed-door');
 for(const u of[doorU-doorWidth/2,doorU,doorU+doorWidth/2])box(u,1.80,1.96,.065,3.32,.07,fin);
 for(const y of[.17,3.45,4.10])box(doorU,y,1.96,2.98,.075,.08,fin);
 box(doorU,3.78,1.91,2.82,.53,.07,glass);
 for(const s of[-1,1])box(doorU+s*.14,1.63,2.03,.04,.62,.06,frame);
 const label=(name:string,w:number,h:number,u:number,y:number,v:number,draw:(c:CanvasRenderingContext2D)=>void,size=[1024,512])=>{
  const c=document.createElement('canvas');[c.width,c.height]=size;draw(c.getContext('2d')!);
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
  const m=new T.MeshStandardMaterial({name:`apartments-${name}`,map:tx,transparent:true,roughness:.62,metalness:.15,depthWrite:false});
  const[x,z]=point(u,v);b.add(new T.PlaneGeometry(w,h),m,x,y,z,new T.Euler(0,e.yaw,0));
 };
 label('english-title',6.2,.94,-2.2,3.53,.455,c=>{
  c.fillStyle='#343b3c';c.fillRect(0,0,1024,156);c.fillStyle='#c9b077';c.font='bold 54px sans-serif';c.textBaseline='middle';
  c.fillText("INTERNATIONAL SCHOLARS'",20,40,990);c.fillText('APARTMENTS',20,112,700);
 },[1024,156]);
 label('vertical-title',1.04,4.08,stairU,10.95,.58,c=>{
  c.fillStyle='#d0ba81';c.textAlign='center';c.textBaseline='middle';c.font='bold 200px "Kaiti SC","STKaiti",serif';
  for(const[ch,i]of Array.from('外教公寓').map((ch,i)=>[ch,i] as const))c.fillText(ch,128,128+i*256,240);
 },[256,1024]);
 label('roof-motif',1.02,.44,stairU,13.35,.58,c=>{
  c.strokeStyle='#d0ba81';c.lineWidth=27;c.beginPath();c.moveTo(40,300);c.lineTo(285,75);c.lineTo(490,248);c.lineTo(723,75);c.lineTo(984,310);c.moveTo(142,365);c.lineTo(290,240);c.lineTo(490,405);c.lineTo(731,234);c.lineTo(878,365);c.stroke();
 });
 const[dx,dz]=point(doorU,1.89);doors.push({name:'外教公寓',x:dx,y:landing,z:dz,yaw:e.yaw,width:doorWidth});
 return {id:f.id,name:'外教公寓',source:'User international-apartments photo + official VR gl-1-23 and registered campus plan; hidden elevations and heights approximate',height:14.6,windows,roof:'four-storey flat grey-brick main block and lower west wing',dormitory:true,frontage:[e.x,e.z,e.nx,e.nz],boxes,landing,doorU,doorWidth,levels:4,wingLevels:3};
}
