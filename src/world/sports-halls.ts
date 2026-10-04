import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {splitBuildingRoof} from './building-roof.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

/** gl-3-03 f/l/r and gl-3 aerial: observed elevations, approximate dimensions.
 * Keep the traced L outline; only the swimming hall has the taller rear volume. */
export function buildSportsHall(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const swim=f.id==='plan-13',frontIndex=swim?5:2;
 const mat=(name:string,color:number,roughness=.85,metalness=0)=>new T.MeshStandardMaterial({name:`sports-hall-${name}`,color,roughness,metalness});
 const wall=mat('pale-panel',0xcaccc5),trim=mat('white-trim',0xdfdfd4),seam=mat('panel-seam',0xb0b5ad),frame=mat('aluminium',0x9ca7a1,.48,.35);
 const recess=mat('window-recess',0x4e5e59),glass=mat('grey-green-glass',0x829b9a,.34,.25),doorGlass=mat('door-glass',0x455c58,.35,.2),stone=mat('stairs',0xb3b5a9);
 const metalRoof=mat('standing-seam-roof',0xbfc6c3,.68,.22),flatRoof=mat('gym-flat-roof',0x89938b);
 // A filtered shader supplies small roof seams without thousands of extra meshes.
 metalRoof.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vHallPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHallPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='varying vec3 vHallPosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat rib=vHallPosition.z/.28;float aa=max(fwidth(rib),.001);float line=1.-smoothstep(.018,.018+aa,abs(fract(rib)-.5));diffuseColor.rgb*=mix(1.,.76,line);');
 };
 const edges=f.points.map(([x,z],i)=>{const[xx,zz]=f.points[(i+1)%f.points.length],len=Math.hypot(xx-x,zz-z),mx=(x+xx)/2,mz=(z+zz)/2;let nx=-(zz-z)/len,nz=(xx-x)/len;if(insidePolygon(mx+nx*.4,mz+nz*.4,f)){nx=-nx;nz=-nz;}return{i,x:mx,z:mz,len,nx,nz,yaw:Math.atan2(nx,nz)};});
 const e=edges[frontIndex],point=(u:number,v:number)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz],local=([x,z]:number[])=>[(x-e.x)*e.nz-(z-e.z)*e.nx,(x-e.x)*e.nx+(z-e.z)*e.nz];
 const solid=(g:T.BufferGeometry,x=0,y=0,z=0,yaw=0)=>{const p=new T.Mesh(g);p.position.set(x,y,z);p.rotation.y=yaw;meshes.push(collisionMesh(p));camera.push(p);};
 const masses:{points:number[][];minHeight:number;maxHeight:number}[]=[];
 function mass(points:number[][],roofY:(v:number)=>number,roofMat:T.Material){
  const world=points.map(([u,v])=>point(u,v)),shape=planShape({...f,points:world,holes:[]});
  const g=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
  // Select the original cap before deforming it, so sloped roof triangles are
  // never duplicated or mistaken for walls by a vertical-normal threshold.
  const surfaces=splitBuildingRoof(g);
  for(const geometry of[g,surfaces.roof,surfaces.walls]){
   const p=geometry.getAttribute('position');for(let i=0;i<p.count;i++)if(p.getY(i)>.5)p.setY(i,roofY(local([p.getX(i),p.getZ(i)])[1]));geometry.computeVertexNormals();
  }
  solid(g);b.add(surfaces.walls,wall);b.add(surfaces.roof,roofMat);
  const ys=points.map(p=>roofY(p[1]));masses.push({points:world,minHeight:Math.min(...ys),maxHeight:Math.max(...ys)});
 }
 const localPoints=f.points.map(local);
 const clip=(points:number[][],value:number,side:number)=>{
  const out:number[][]=[];for(let i=0;i<points.length;i++){const a=points[i],c=points[(i+1)%points.length],ai=(a[1]-value)*side>=0,ci=(c[1]-value)*side>=0;if(ai)out.push(a);if(ai!==ci){const t=(value-a[1])/(c[1]-a[1]);out.push([a[0]+t*(c[0]-a[0]),value]);}}
  return out.filter((p,i)=>Math.hypot(p[0]-out[(i+out.length-1)%out.length][0],p[1]-out[(i+out.length-1)%out.length][1])>.0001);
 };
 const lowY=(v:number)=>12+.95*(1-Math.abs(v+8)/8),rearY=(v:number)=>16+1.1*(1-Math.abs(v+33)/17);
 const roofY=(v:number)=>swim?(v>=-16?lowY(v):rearY(v)):7.3;
 if(swim){
  const front=clip(localPoints,-16,1),rear=clip(localPoints,-16,-1);
  for(const side of[-1,1]){mass(clip(front,-8,side),lowY,metalRoof);mass(clip(rear,-33,side),rearY,metalRoof);}
 }else mass(localPoints,()=>7.3,flatRoof);
 let windows=0;
 for(const edge of edges){
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>b.box(w,h,d,edge.x+u*edge.nz+v*edge.nx,y,edge.z-u*edge.nx+v*edge.nz,m,false,edge.yaw);
  const isFront=edge.i===frontIndex,midV=local([edge.x,edge.z])[1],height=roofY(midV),storeys=swim?3:1;
  put(0,.24,.06,edge.len,.48,.16,stone);
  if(!swim){put(0,7.18,.15,edge.len+.24,.48,.44,trim);put(0,6.62,.1,edge.len,.08,.24,seam);}
  else{
   // The front eave is level; returns receive their actual sloped edge below.
   if(isFront)put(0,11.90,.25,edge.len+.38,.23,.62,trim);
   const a=f.points[edge.i],c=f.points[(edge.i+1)%f.points.length];
   const breaks=[0,1];for(const cut of[-33,-16,-8]){const av=local(a)[1],cv=local(c)[1],t=(cut-av)/(cv-av);if(t>0&&t<1)breaks.push(t);}breaks.sort((a,c)=>a-c);
   for(let i=0;i<breaks.length-1;i++){const t0=breaks[i],t1=breaks[i+1],vMid=local([a[0]+(c[0]-a[0])*(t0+t1)/2,a[1]+(c[1]-a[1])*(t0+t1)/2])[1],yFn=vMid>=-16?lowY:rearY;const ends=[t0,t1].map(t=>{const x=a[0]+(c[0]-a[0])*t,z=a[1]+(c[1]-a[1])*t;return new T.Vector3(x,yFn(local([x,z])[1])-.10,z);});b.cylinder(ends[0],ends[1],.085,.085,frame,4);}
   for(const y of[3.45,4.5,5.55,7.65,8.45,10.9])put(0,y,.075,edge.len,.025,.025,seam);
  }
  if(edge.len<4)continue;
  // Only the confirmed low front and side elevations receive dense windows;
  // the high rear enclosure stays predominantly solid, as seen from above.
  if(swim&&midV<-16)continue;
  const count=isFront?7:Math.max(1,Math.floor(edge.len/(swim?4.8:6))),spacing=(edge.len-1)/count,w=spacing-(swim?.60:1.1);
  for(let j=0;j<count;j++){
   const u=(j-(count-1)/2)*spacing;
   for(let floor=0;floor<storeys;floor++){
    if(isFront&&floor===0&&Math.abs(u)<5.2&&swim)continue;
    // The right end has a solid middle-storey panel carrying the vertical
    // gold inscription, below the upper windows (gl-3-03-r).
    if(swim&&isFront&&floor===1&&j===count-1)continue;
    const y=swim?[1.95,6.70,9.7][floor]:4.76,h=swim?(floor===0?2.4:1.85):2.9;
    put(u,y,.075,w+.14,h+.14,.14,recess);put(u,y,.16,w,h,.04,glass);
    const cols=swim?5:3;for(let k=0;k<=cols;k++)put(u+w*(k/cols-.5),y,.21,.055,h,.075,frame);
    for(const dy of[-h/2,h/2,h*.24])put(u,y+dy,.21,w,.055,.075,frame);
    if(!swim)put(u,y-h*.19,.21,w,.045,.075,frame);
    windows++;
   }
  }
  if(isFront)for(let j=0;j<=count;j++)put((j-count/2)*spacing,height/2,.18,swim?.38:.26,height-(swim?.6:.5),.34,trim);
 }
 const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string)=>{const[x,z]=point(u,v);b.box(w,h,d,x,y,z,m,false,e.yaw);if(kind){solid(new T.BoxGeometry(w,h,d),x,y,z,e.yaw);boxes.push({kind,u,y,v,w,h,d});}};
 const entryWidth=8.4;
 box(0,.225,1.05,entryWidth,.45,2.1,stone,'landing');
 for(let i=0;i<3;i++){const h=(3-i)*.15,v=2.31+i*.40;box(0,h/2,v,entryWidth,h,.42,stone,'step');box(0,h-.022,v+.18,entryWidth,.022,.045,trim);}
 const doorUs=swim?[-2.55,0,2.55]:[0],dw=swim?2.5:3.2,dh=swim?2.8:2.65;
 for(const u of doorUs){
  box(u,.45+dh/2,.26,dw,dh,.1,doorGlass,'door');
  for(const side of[-1,1])box(u+side*dw/2,.45+dh/2,.34,.07,dh,.08,frame);
  box(u,.45+dh/2,.34,.055,dh,.08,frame);
  for(const y of[.47,.45+dh,.45+dh*.78])box(u,y,.34,dw,.06,.08,frame);
  // Brushed lower door panels, with glazing above and slim central handles.
  box(u,.95,.33,dw-.10,.93,.03,swim?frame:glass);
  for(const side of[-1,1])box(u+side*.13,1.73,.40,.04,.46,.07,trim);
  const[x,z]=point(u,.26);doors.push({name:f.tags.name,x,y:.45,z,yaw:e.yaw,width:dw});
 }
 box(0,swim?3.60:3.34,1.0,swim?8.5:6.1,.24,2.0,trim,'canopy');
 if(swim){
  box(0,4.78,.14,7.8,2.10,.04,glass);
  for(const u of[-3.9,-2.6,-1.3,0,1.3,2.6,3.9])box(u,4.78,.19,.04,2.1,.06,frame);
  box(0,4.9,.19,7.8,.045,.06,frame);
 }
 const plane=(canvas:HTMLCanvasElement,name:string,u:number,y:number,v:number,w:number,h:number,alpha=false)=>{
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
  const m=new T.MeshStandardMaterial({name:`sports-hall-${name}`,map,roughness:alpha?.48:.84,metalness:alpha?.25:0,alphaTest:alpha?.4:0});
  const[x,z]=point(u,v);b.add(new T.PlaneGeometry(w,h),m,x,y,z,new T.Euler(0,e.yaw,0));
 };
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;const ctx=canvas.getContext('2d')!;
 const title=swim?'南京大学学生体育活动中心':'体育馆';
 if(swim){
  ctx.fillStyle='#2195c3';ctx.fillRect(0,0,1536,256);ctx.fillStyle='#f1efdf';ctx.font='bold 106px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(title,834,135,1340);
  // Simplified blue sports mark; the original logo is not claimed as traced.
  ctx.strokeStyle='#1a518d';ctx.lineWidth=8;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(100,113+i*13,65,18,-.24,0,Math.PI*2);ctx.stroke();}
  box(0,6.13,.29,10.0,1.65,.10,frame);plane(canvas,'activity-centre-sign',0,6.13,.355,9.9,1.55);
  const strip=document.createElement('canvas');strip.width=1280;strip.height=120;const sc=strip.getContext('2d')!;sc.fillStyle='#2597ad';sc.fillRect(0,0,1280,120);
  for(let i=0;i<8;i++){
   const x=i*160+80;sc.fillStyle='#405c60';sc.fillRect(i*160+7,7,146,106);sc.fillStyle='#e3e7df';sc.beginPath();sc.arc(x,29,9,0,Math.PI*2);sc.fill();sc.strokeStyle='#e3e7df';sc.lineWidth=7;sc.lineCap='round';
   sc.beginPath();sc.moveTo(x,44);sc.lineTo(x-5,70);sc.lineTo(x-24,99);sc.moveTo(x-5,70);sc.lineTo(x+23,91);sc.moveTo(x-2,50);sc.lineTo(x-28,48-(i%3)*10);sc.moveTo(x-2,50);sc.lineTo(x+26,28+(i%2)*31);sc.stroke();
  }
  plane(strip,'sport-pictograms',0,3.96,.31,7.85,.53);
  const letters=document.createElement('canvas');letters.width=256;letters.height=1536;
  const lc=letters.getContext('2d')!;lc.fillStyle='#c4a347';lc.font='200px "Kaiti SC","STKaiti",serif';lc.textAlign='center';lc.textBaseline='middle';
  [...'吕志和游泳馆'].forEach((ch,i)=>lc.fillText(ch,128,130+i*252,224));
  plane(letters,'swimming-gold-letters',e.len/2-3.2,5.92,.39,.90,4.85,true);
 }else{
  // Three independent glyphs on a transparent plane, no rectangular plaque.
  ctx.fillStyle='#c4a347';ctx.font='188px "Kaiti SC","STKaiti",serif';ctx.textAlign='center';ctx.textBaseline='middle';[...'体育馆'].forEach((ch,i)=>ctx.fillText(ch,360+i*410,139,255));
  plane(canvas,'gym-gold-letters',0,3.98,.38,4.3,.73,true);
 }
 return{id:f.id,name:f.tags.name,source:'official VR gl-3-03 f/l/r and gl-3 aerial; dimensions, hidden elevations and sign glyphs approximate',height:swim?17.1:7.3,storeys:swim?3:1,windows,roof:swim?'two shallow metal roofs':'flat',dormitory:false,frontage:[e.x,e.z,e.nx,e.nz],boxes,masses,sign:{text:title,method:'reference wording; system-font approximation'},...(swim?{inscription:{text:'吕志和游泳馆',position:'right end of front facade, below upper windows',source:'official VR gl-3-03-r',method:'verified wording; system Kai font, approximate scale'}}:{})};
}
