import * as T from 'three';
import { splitBuildingRoof } from './building-roof.ts';
import {addBuildingLettering} from './building-lettering.ts';
import {Builder,curvedRoof} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {addEntrance,type DoorRecord,entranceMaterials} from './building-entrances.ts';
import type {Materials} from './materials.ts';

const ids=new Set(['plan-34','plan-71','teaching-priority','new-teaching','plan-73','plan-105','plan-113','plan-100','plan-117']);
const clip=(points:number[][],axis:number,value:number,side:number)=>{
 const out:number[][]=[];for(let i=0;i<points.length;i++){const a=points[i],c=points[(i+1)%points.length],ai=(a[axis]-value)*side>=0,ci=(c[axis]-value)*side>=0;if(ai)out.push(a);if(ai!==ci){const t=(value-a[axis])/(c[axis]-a[axis]);out.push([a[0]+t*(c[0]-a[0]),a[1]+t*(c[1]-a[1])]);}}return out;
};
const area=(points:number[][])=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
export function splitTeachingFeature(f:MapFeature){
 const north=clip(f.points,1,87,-1);
 // Hand-regularized against the 2024 plan: keep the projecting west entrance
 // wing and the east classroom wing, without the old northward lab connector.
 const south=[[40.35,87.24],[52.22,87.34],[52.05,90.73],[54.19,91.28],[90.8,91.3],[90.6,107.4],[52.3,107.65],[51.19,111.84],[40.16,111.94]];
 return[{...f,points:north},{...f,id:'new-teaching',points:south,tags:{...f.tags,name:'新教学楼',plan_id:'36B',source:'NJU 2024 asset-office plan; west entrance verified in official VR scene_gl-3-16'}}];
}
const materialCache=new WeakMap<Materials,Map<string,T.MeshStandardMaterial>>();
export function buildSpecific(f:MapFeature,mats:Materials,b:Builder,meshes:CollisionMesh[],cameraSolids:T.Object3D[],doors:DoorRecord[],doorMats:ReturnType<typeof entranceMaterials>){
 if(!ids.has(f.id))return null;
 let cache=materialCache.get(mats);if(!cache){cache=new Map();materialCache.set(mats,cache);}
 const mat=(name:string,color:number,glass=false)=>{if(!cache!.has(name))cache!.set(name,new T.MeshStandardMaterial({name,color,roughness:glass?.27:.88,metalness:glass?.24:0,envMapIntensity:glass?1.2:.3}));return cache!.get(name)!;};
 const pale=mat('specific-pale-frame',0xd4d4c9),dark=mat('specific-dark-frame',0x4c5555),glass=mat('specific-window-glass',0x597275,true),roof=mat('specific-roof',0x747b76);
 const food=['plan-113','plan-100','plan-117'].includes(f.id),yifu=f.id==='plan-34',meng=f.id==='plan-71',teaching=f.id==='teaching-priority',south=f.id==='plan-73',newTeaching=f.id==='new-teaching';
 const color=teaching?0x969288:yifu?0xcec7af:food?0xc5baa3:0xd1d2c9;
 const wall=mat(`specific-wall-${f.id}`,color);
 const xs=f.points.map(p=>p[0]),zs=f.points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
 const heightAt=(x:number,z:number)=>yifu?(z>24&&z<43&&x> -341?7.2:23.4):meng?(x>55&&x<85&&z>297&&z<325?59.4:12.8):teaching?(x> -94&&x< -74?20.2:15.6):south?7.6:f.id==='new-teaching'?18.0:f.id==='plan-105'?10.2:food?(f.id==='plan-113'?12.3:7.2):13;
 const xbreak=[minX,...(yifu?[-341]:meng?[55,85]:teaching?[-94,-74]:[]).filter(x=>x>minX&&x<maxX),maxX].sort((a,c)=>a-c);
 const zbreak=[minZ,...(yifu?[24,43]:meng?[297,325]:[]).filter(z=>z>minZ&&z<maxZ),maxZ].sort((a,c)=>a-c);
 const sections:{height:number;area:number;bounds:number[];points:number[][]}[]=[];
 for(let ix=0;ix<xbreak.length-1;ix++)for(let iz=0;iz<zbreak.length-1;iz++){
  let points=f.points;for(const[axis,value,side]of[[0,xbreak[ix],1],[0,xbreak[ix+1],-1],[1,zbreak[iz],1],[1,zbreak[iz+1],-1]])points=clip(points,axis,value,side);
  if(points.length<3||area(points)<.1)continue;
  const height=heightAt((xbreak[ix]+xbreak[ix+1])/2,(zbreak[iz]+zbreak[iz+1])/2),shape=planShape({points});
  const geometry=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false}).rotateX(-Math.PI/2),proxy=new T.Mesh(geometry.clone());meshes.push(collisionMesh(proxy));cameraSolids.push(proxy);
  const surfaces=splitBuildingRoof(geometry);
  b.add(surfaces.walls,wall);b.add(surfaces.roof,roof);geometry.dispose();
  sections.push({height,area:area(points),points,bounds:[xbreak[ix],xbreak[ix+1],zbreak[iz],zbreak[iz+1]]});
 }
 let windows=0;
 const edges:{x:number;z:number;nx:number;nz:number;angle:number;len:number}[]=[];
 for(let edge=0;edge<f.points.length;edge++){
  const a=f.points[edge],c=f.points[(edge+1)%f.points.length],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz);if(len<.3)continue;
  let nx=-dz/len,nz=dx/len;const mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2;if(insidePolygon(mx+nx*.1,mz+nz*.1,f)){nx=-nx;nz=-nz;}const angle=Math.atan2(nx,nz);
  edges.push({x:mx,z:mz,nx,nz,angle,len});
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>{const x=mx+u*Math.cos(angle)+v*nx,z=mz-u*Math.sin(angle)+v*nz;if(m===glass)b.add(new T.PlaneGeometry(w,h),m,x,y,z,new T.Euler(0,angle,0));else b.box(w,h,d,x,y,z,m,false,angle);};
  put(0,.35,.045,len,.7,.12,roof);
  const bayWidth=yifu?5.2:food?4.3:meng?2.9:teaching?3.25:3.4,bays=Math.max(1,Math.floor(len/bayWidth));
  for(let bay=0;bay<bays;bay++){
   const u=(bay+.5)*len/bays-len/2,x=mx+u*Math.cos(angle),z=mz-u*Math.sin(angle),height=Math.min(...[-.48,0,.48].map(t=>heightAt(x+Math.cos(angle)*len/bays*t-nx*.12,z-Math.sin(angle)*len/bays*t-nz*.12))),levels=meng&&height>40?18:f.id==='plan-113'?4:Math.max(2,Math.round(height/3.6)),floor=height/levels,w=Math.min(len/bays-.65,yifu?4.1:food?3.5:teaching?1.7:2.1);
   for(let level=0;level<levels;level++){
    if(teaching&&x> -94&&x< -74&&nz>.7||(south||newTeaching)&&nx<-.5)continue;
    const y=floor*(level+.58),h=teaching?2.05:yifu?1.65:food?1.65:2.05;
    put(u,y,.05,w+.18,h+.15,.12,dark);put(u,y,.14,w,h,.01,glass);
    for(const side of[-1,1]){put(u+side*w/2,y,.19,.075,h,.2,pale);put(u,y+side*h/2,.19,w+.18,.075,.2,pale);}
    const panes=yifu||food?4:2;for(let k=1;k<panes;k++)put(u-w/2+w*k/panes,y,.2,.045,h,.21,dark);
    put(u,y+.3,.21,w,.045,.22,dark);put(u,y-h/2-.13,.21,w+.4,.17,.45,pale);windows++;
   }
   // Distinct structural language: Yifu's recessed horizontal grids and Meng's uninterrupted vertical piers.
   if(meng)put(u-len/bays/2+.1,height/2,.18,.23,height,.45,pale);
   if(yifu||food)for(let y=floor;y<height;y+=floor)put(u,y,.12,len/bays,.22,.3,pale);
   put(u,height-.02,.12,len/bays,.3,.42,pale);
  }
 }
 // Height changes expose walls inside the old single outline (tower/podium
 // and Yifu's low link). Populate those faces above the adjoining roof too.
 for(const section of sections)for(let edge=0;edge<section.points.length;edge++){
  const a=section.points[edge],c=section.points[(edge+1)%section.points.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<3)continue;
  const mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2;let nx=-(c[1]-a[1])/len,nz=(c[0]-a[0])/len;
  if(insidePolygon(mx+nx*.1,mz+nz*.1,{points:section.points})){nx=-nx;nz=-nz;}
  if(!insidePolygon(mx+nx*.15,mz+nz*.15,f))continue;
  const lower=heightAt(mx+nx*.15,mz+nz*.15);if(lower>=section.height-.1)continue;
  const angle=Math.atan2(nx,nz),bays=Math.floor(len/3.3),floor=3.35;
  for(let bay=0;bay<bays;bay++)for(let y=Math.ceil((lower+1.2)/floor)*floor+.7;y<section.height-1;y+=floor){
   const u=(bay+.5)*len/bays-len/2,x=mx+u*Math.cos(angle)+nx*.04,z=mz-u*Math.sin(angle)+nz*.04;
   b.box(2.05,2.10,.13,x,y,z,pale,false,angle);b.add(new T.PlaneGeometry(1.85,1.9),glass,x+nx*.085,y,z+nz*.085,new T.Euler(0,angle,0));b.box(.055,1.9,.15,x+nx*.11,y,z+nz*.11,dark,false,angle);windows++;
  }
 }
 // Pick the documented main approach, rather than reuse a randomly selected
 // generic wall. The footprints still determine the exact exterior boundary.
 let lettering:ReturnType<typeof addBuildingLettering>|undefined;
 const preferred=edges.filter(e=>e.len>7).sort((a,c)=>{
  const score=(e:typeof a)=>yifu?Math.abs(e.x+320)+Math.abs(e.z-33)*2+(e.nx<.5?100:0):meng?Math.abs(e.z-maxZ)+(e.nz>.5?0:80):newTeaching||south?Math.abs(e.x-minX)+(e.nx<-.5?0:80):teaching?Math.abs(e.x+85)*2+Math.abs(e.z-136):f.id==='plan-105'?Math.abs(e.x+84)*2+Math.abs(e.z-maxZ):Math.abs(e.x-cx)+Math.abs(e.z-minZ)+(e.nz<-.5?0:80);
  return score(a)-score(c);
 })[0];
 if(preferred){
  const e=preferred,width=Math.min(e.len-1,yifu?7.6:food||newTeaching?7.2:teaching?8.4:4.5),entryY=teaching?1.20:yifu?.60:newTeaching?.45:0;
  addEntrance(b,meshes,doors,doorMats,f.tags.name,e.x,e.z,e.angle,width,entryY);
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>b.box(w,h,d,e.x+u*Math.cos(e.angle)+v*e.nx,y,e.z-u*Math.sin(e.angle)+v*e.nz,m,false,e.angle);
  if(entryY)for(let step=0;step<Math.round(entryY/.15);step++){const h=(step+1)*.15,v=1.72+(Math.round(entryY/.15)-1-step)*.31;put(0,h/2,v,width+1,h,.34,pale);const proxy=new T.Mesh(new T.BoxGeometry(width+1,h,.34));proxy.position.set(e.x+v*e.nx,h/2,e.z+v*e.nz);proxy.rotation.y=e.angle;meshes.push(collisionMesh(proxy));}
  if(yifu){put(0,5.2,.16,Math.min(e.len,18),2.05,.25,glass);for(const u of[-6,-2,2,6])put(u,3.5,.55,.26,7,.50,pale);}
  if(newTeaching){
   // Official scene_gl-3-16: broad blank side bays, three central window
   // strips, a projecting canopy, and three entrance risers at the lower grade.
   for(let floor=1;floor<5;floor++)for(const u of[-3.0,0,3.0]){
    put(u,floor*3.6+1.55,.10,2.75,1.85,.10,glass);
    put(u,floor*3.6+.56,.24,2.90,.14,.40,pale);put(u,floor*3.6+1.55,.22,.055,1.85,.18,dark);
   }
   for(const u of[-4.6,-1.5,1.5,4.6])put(u,10.2,.21,.30,15.6,.38,pale);
   put(0,3.66,1.15,10.5,.32,2.65,pale);
   for(const u of[-3.9,3.9])put(u,1.95,1.13,.34,3.1,.40,pale);
  }
  if(teaching){
   // Three arches sit in the brick crown; they are not three detached roof dormers.
   for(const u of[-4.3,0,4.3]){
    put(u,9.5,.18,2.4,10.5,.2,pale);
    for(const y of[5.5,9,12.5]){put(u,y,.32,2.15,2.25,.15,glass);put(u,y+.32,.44,2.1,.055,.18,dark);put(u,y,.44,.055,2.25,.18,dark);}
    const arch=new T.Shape();arch.moveTo(-1.45,0);arch.lineTo(1.45,0);arch.lineTo(1.45,1.25);arch.absarc(0,1.25,1.45,0,Math.PI,false);arch.closePath();
    b.add(new T.ShapeGeometry(arch),pale,e.x+u,16.1,e.z+.25);b.add(new T.ShapeGeometry(arch).scale(.78,.80,1),glass,e.x+u,16.28,e.z+.28);
   }
   for(const u of[-6.7,-2.2,2.2,6.7])put(u,9.3,.53,.45,12.8,.65,pale);
   put(0,4.05,1.0,14.8,.40,2.2,pale);put(0,15.6,.52,14.6,.34,1.1,pale);
  }
  if(south){
   // gl-2-53-r: west-entry gold characters stand above a narrow dark canopy,
   // with slim supports against jointed pale stone. Dimensions are approximate.
   const joint=mat('south-teaching-stone-joint',0x9b9e95);
   for(let y=3.1;y<7.6;y+=.65)put(0,y,.015,e.len-.12,.018,.02,joint);
   for(let u=-e.len/2+1.8;u<e.len/2;u+=1.8)put(u,5.35,.015,.014,4.5,.02,joint);
   put(0,2.86,.86,6.8,.18,1.95,dark);
   for(const u of[-2.15,-.70,.75,2.12])put(u,3.23,1.57,.04,.58,.05,dark);
   lettering=addBuildingLettering(b,'southTeaching',e.x+e.nx*1.62,3.18,e.z+e.nz*1.62,5.3,e.angle);
  }
  else if(newTeaching){lettering=addBuildingLettering(b,'newTeaching',e.x+e.nx*.48,4.65,e.z+e.nz*.48,5.6,e.angle);}
  else {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#c9c9bd';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#957534';ctx.font=`64px "Kaiti SC","STKaiti",serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(yifu?'逸 夫 館':teaching?'教 学 楼':f.tags.name,512,66,980);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const signMat=new T.MeshStandardMaterial({map:texture,roughness:.8});
  b.add(new T.PlaneGeometry(Math.min(width+1,9),.70),signMat,e.x+e.nx*.8,teaching?4.55:yifu?3.8:3.7,e.z+e.nz*.8,new T.Euler(0,e.angle,0));
  }
 }
 if(meng){for(const x of[57,83]){b.box(3.2,4.3,4.1,x,61,310,pale);b.box(4.5,.55,5.5,x,63.4,310,roof);}b.box(28,.55,4,70,62.1,310,pale);}
 if(f.id==='plan-105'){const rb=new Builder();curvedRoof(rb,cx,cz,maxX-minX+1,19,10.3,2.4,roof,pale,false);const g=rb.finish('south garden teaching roof');for(const child of g.children)if(child instanceof T.Mesh){meshes.push(collisionMesh(child,true));cameraSolids.push(child);b.add(child.geometry.clone(),child.material as T.Material);}}
 if(food){for(const x of[minX+1,maxX-1])for(const z of[minZ+1,maxZ-1])b.box(.55,heightAt(x,z),.55,x,heightAt(x,z)/2,z,pale);}
 const height=Math.max(...sections.map(s=>s.height));
 return{id:f.id,name:f.tags.name,source:yifu?'VR gl-4-13/3-01':meng?'VR gl-2-23/39':teaching?'VR gl-2-10; local video':south?'NJU official VR gl-2-53 west entry; 2024 map; dimensions and hidden faces approximate':f.id==='new-teaching'?'NJU 2023-02-08 location diagram + official classroom guide (2/5 floors); unseen facades approximate':food?'NJU dining guide + VR gl-1-22/24; hidden faces approximate':'official VR',height,windows,lettering,roof:'individual',dormitory:false,frontage:preferred?[preferred.x,preferred.z,preferred.nx,preferred.nz]:undefined,sections,door:true,footprintArea:area(f.points)};
}
