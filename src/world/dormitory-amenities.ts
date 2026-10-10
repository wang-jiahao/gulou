import * as T from 'three';
import {createBicycle,type CampusBicycle} from './bicycle.ts';
import {Builder,type Solid} from './geometry.ts';
import {insidePolygon,type CampusMap,type MapPolygon} from './campus-map.ts';
import type {Materials} from './materials.ts';

type Residence={id:string;name:string;dormitory:boolean;frontage?:number[]};
type Placement={id:string;name:string;x:number;z:number;angle:number;w:number;d:number};
const orientation=(a:number[],b:number[],c:number[])=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const crosses=(a:number[],b:number[],c:number[],d:number[])=>orientation(a,b,c)*orientation(a,b,d)<0&&orientation(c,d,a)*orientation(c,d,b)<0;

/** Green cycle canopies and parked bicycles seen in VR gl-1-06. Individual
 * placements are fitted to available plan space, not asserted as surveyed positions. */
export function createDormitoryAmenities(map:CampusMap,residences:Residence[],mats:Materials,obstacles:Solid[]){
 const bicycles:CampusBicycle[]=[];
 const b=new Builder(),placements:Placement[]=[],lamps:T.Vector3[]=[];
 const green=new T.MeshStandardMaterial({name:'cycle-shelter-roof',color:0x456456,roughness:.74,metalness:.18,side:T.DoubleSide});
 const soffit=new T.MeshStandardMaterial({name:'cycle-shelter-soffit',color:0xc6cbbb,roughness:.86});
 const rail=new T.MeshStandardMaterial({color:0x637873,roughness:.55,metalness:.55});
 const light=new T.MeshStandardMaterial({name:'lamp-glass',color:0xf0efce,emissive:0xc2a165,emissiveIntensity:.18,roughness:.35});
 const zones=[...map.features.filter(f=>f.tags.building),...map.roads,...map.lawns].map(p=>({p,minX:Math.min(...p.points.map(q=>q[0])),maxX:Math.max(...p.points.map(q=>q[0])),minZ:Math.min(...p.points.map(q=>q[1])),maxZ:Math.max(...p.points.map(q=>q[1]))}));
 const corners=(x:number,z:number,angle:number,w:number,d:number)=>[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([u,v])=>[x+u*Math.cos(angle)+v*Math.sin(angle),z-u*Math.sin(angle)+v*Math.cos(angle)]);
 const overlaps=(ring:number[][],p:MapPolygon)=>{
  if(ring.some(([x,z])=>insidePolygon(x,z,p)))return true;
  for(const boundary of [p.points,...(p.holes??[])]){
   if(boundary.some(([x,z])=>insidePolygon(x,z,{points:ring})))return true;
   for(let i=0;i<ring.length;i++)for(let j=0;j<boundary.length;j++)if(crosses(ring[i],ring[(i+1)%ring.length],boundary[j],boundary[(j+1)%boundary.length]))return true;
  }
  return false;
 };
 const selected=['plan-94','plan-99','plan-101','plan-106','plan-112','plan-123'];
 for(const id of selected){
  const residence=residences.find(r=>r.id===id);if(!residence?.frontage)continue;
  let cycleFrontage=residence.frontage;
  // Moving Nanyuan 3's doorway does not establish a new cycle-shelter site.
  // Keep its existing north-side placement until that site is checked separately.
  if(id==='plan-101'){
   const feature=map.features.find(f=>f.id===id);
   if(feature)for(let i=0;i<feature.points.length;i++){
    const a=feature.points[i],b=feature.points[(i+1)%feature.points.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<30)continue;
    const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;let nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;
    if(insidePolygon(x+nx*.18,z+nz*.18,feature)){nx=-nx;nz=-nz;}
    if(nz<-.98){cycleFrontage=[x,z,nx,nz];break;}
   }
  }
  const[fx,fz,nx,nz]=cycleFrontage,angle=Math.atan2(nx,nz);let placement:Placement|undefined;
  for(const away of [2.8,4.5,7.0]){
   for(const offset of [9,-9,14,-14,19,-19,25,-25]){
    const x=fx+nx*away+nz*offset,z=fz+nz*away-nx*offset,ring=corners(x,z,angle,7.5,3.3);
    if(ring.some(([x,z])=>x< -225||x>145||z<375||z>730))continue;
    const minX=Math.min(...ring.map(p=>p[0])),maxX=Math.max(...ring.map(p=>p[0])),minZ=Math.min(...ring.map(p=>p[1])),maxZ=Math.max(...ring.map(p=>p[1]));
    if(zones.some(a=>!(maxX<a.minX||minX>a.maxX||maxZ<a.minZ||minZ>a.maxZ)&&overlaps(ring,a.p)))continue;
    if(obstacles.some(s=>s.h>.25&&s.w<20&&Math.hypot(s.x-x,s.z-z)<Math.hypot(s.w,s.d)/2+4))continue;
    if(placements.some(p=>Math.hypot(p.x-x,p.z-z)<9))continue;
    placement={id,name:residence.name,x,z,angle,w:6.6,d:2.4};break;
   }
   if(placement)break;
  }
  if(!placement)continue;placements.push(placement);
  const{x,z}=placement,point=(u:number,y:number,v:number)=>new T.Vector3(x+u*Math.cos(angle)+v*Math.sin(angle),y,z-u*Math.sin(angle)+v*Math.cos(angle));
  const box=(w:number,h:number,d:number,u:number,y:number,v:number,m:T.Material,solid=false)=>{const p=point(u,y,v);b.box(w,h,d,p.x,p.y,p.z,m,solid,angle);};
  box(6.8,.035,2.6,0,.018,0,mats.path);
  // Keep posts outside the five bicycle slots and the front approach.
  for(const v of[-1,1])for(const u of(v<0?[-3.1,.55,3.1]:[-3.1,3.1]))box(.075,2.3,.075,u,1.15,v,rail,true);
  for(const v of[-1,1])box(6.5,.10,.08,0,2.24,v,rail);
  const roofGeometry=new T.BoxGeometry(6.7,.07,2.65).rotateX(-.075);b.add(roofGeometry,green,x,2.39,z,new T.Euler(0,angle,0));
  b.add(new T.PlaneGeometry(6.65,2.60).rotateX(Math.PI/2).translate(0,-.036,0).rotateX(-.075),soffit,x,2.39,z,new T.Euler(0,angle,0));
  // A simple shallow solid provides a stable support if a player lands on the roof.
  b.solids.push({x,y:2.38,z,w:6.7,h:.12,d:2.65,angle});
  for(let u=-3.2;u<3.25;u+=.42){const p=point(u,2.39,0);b.add(new T.BoxGeometry(.023,.03,2.58).translate(0,.05,0).rotateX(-.075),rail,p.x,p.y,p.z,new T.Euler(0,angle,0));}
  for(let slot=0;slot<5;slot++){
   const u=-2.5+slot*1.22,p=point(u,.035,0),bike=createBicycle(slot);
   bike.group.position.copy(p);bike.group.rotation.y=angle;
   const solid={x:p.x,y:p.y+.52,z:p.z,w:.5,h:1.04,d:1.85,angle};b.solids.push(solid);
   bicycles.push({...bike,id:`${id}-bike-${slot}`,solid,home:p.clone(),angle});
  }
  const lp=point(3.25,2.75,1.15);b.cylinder(point(3.25,0,1.15),lp,.04,.04,rail,8);b.add(new T.SphereGeometry(.13,12,8),light,lp.x,lp.y,lp.z);lamps.push(lp);
 }
 const group=b.finish('Nanyuan cycle shelters and parked bicycles',100);group.userData.placements=placements;group.add(...bicycles.map(b=>b.group));
 return{group,solids:b.solids,lamps,placements,bicycles};
}
