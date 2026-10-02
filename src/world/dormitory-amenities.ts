import * as T from 'three';
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
 const b=new Builder(),placements:Placement[]=[],lamps:T.Vector3[]=[];
 const green=new T.MeshStandardMaterial({name:'cycle-shelter-roof',color:0x456456,roughness:.74,metalness:.18,side:T.DoubleSide});
 const soffit=new T.MeshStandardMaterial({name:'cycle-shelter-soffit',color:0xc6cbbb,roughness:.86});
 const rail=new T.MeshStandardMaterial({color:0x637873,roughness:.55,metalness:.55});
 const tyre=new T.MeshStandardMaterial({color:0x262b28,roughness:.93});
 const rim=new T.MeshStandardMaterial({color:0xa9b3b0,roughness:.42,metalness:.8});
 const frameColors=[0x435d72,0x965b48,0x718675].map(color=>new T.MeshStandardMaterial({color,roughness:.6,metalness:.35}));
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
  const[fx,fz,nx,nz]=residence.frontage,angle=Math.atan2(nx,nz);let placement:Placement|undefined;
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
   const u=-2.5+slot*1.22,frame=frameColors[slot%3];
   for(const v of[-.58,.58]){
    const p=point(u,.34,v),rotation=new T.Euler(0,angle+Math.PI/2,0);
    b.add(new T.TorusGeometry(.31,.028,5,20),tyre,p.x,p.y,p.z,rotation);
    b.add(new T.TorusGeometry(.27,.012,4,20),rim,p.x,p.y,p.z,rotation);
    for(let spoke=0;spoke<8;spoke++){const a=spoke*Math.PI/4;b.cylinder(p,point(u,.34+Math.sin(a)*.26,v+Math.cos(a)*.26),.003,.003,rim,3);}
   }
   const rear=point(u,.34,.58),front=point(u,.34,-.58),crank=point(u,.32,.12),saddle=point(u,.86,.25),steer=point(u,.80,-.39);
   for(const[a,c]of[[rear,saddle],[saddle,steer],[steer,crank],[crank,rear],[crank,saddle],[steer,front]])b.cylinder(a,c,.015,.015,frame,6);
   b.cylinder(steer,point(u,1.03,-.43),.015,.015,rim,6);b.cylinder(point(u-.19,1.03,-.43),point(u+.19,1.03,-.43),.016,.016,tyre,6);
   box(.20,.055,.28,u,.91,.25,tyre);box(.48,.07,.07,u,.23,.12,rail);
   const p=point(u,.52,0);b.solids.push({x:p.x,y:p.y,z:p.z,w:.5,h:1.04,d:1.85,angle});
  }
  const lp=point(3.25,2.75,1.15);b.cylinder(point(3.25,0,1.15),lp,.04,.04,rail,8);b.add(new T.SphereGeometry(.13,12,8),light,lp.x,lp.y,lp.z);lamps.push(lp);
 }
 const group=b.finish('Nanyuan cycle shelters and parked bicycles',100);group.userData.placements=placements;
 return{group,solids:b.solids,lamps,placements};
}
