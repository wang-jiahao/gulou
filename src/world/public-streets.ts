import * as T from 'three';
import {publicStreets,streetPoint} from './street-layout.ts';
import {Builder} from './geometry.ts';
import type {Materials} from './materials.ts';

/** Public streets outside the two south-facing entrances. Direction follows
 * the registered campus map; carriageway widths/marking dimensions are estimates. */
export function createPublicStreets(mats:Materials){
 const b=new Builder(),asphalt=new T.MeshStandardMaterial({name:'public-street-asphalt',color:0x4a5050,map:mats.textures.get('courtyard-asphalt.webp'),roughness:.94,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-3});
 const paint=new T.MeshStandardMaterial({color:0xdcdccb,roughness:.95,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-5}),yellow=paint.clone();yellow.color.set(0xc1ae54);
 for(const road of publicStreets){
  const {width,length,sidewalk}=road;
  const box=(u:number,v:number,w:number,d:number,y:number,h:number,m:T.Material)=>{const p=streetPoint(road,u,v);b.box(w,h,d,p.x,y,p.z,m,false,p.angle);};
  const breaks=[-length/2,...(road.profile?.map(p=>p[0]-road.x)??[]),length/2];
  // Continuous polygon strips share mitered edges: no coplanar overlap at bends.
  const strip=(v:number,d:number,y:number,h:number,m:T.Material)=>{
   const left=breaks.map(u=>streetPoint(road,u,v-d/2)),right=breaks.map(u=>streetPoint(road,u,v+d/2));
   const shape=new T.Shape([...left,...right.reverse()].map(p=>new T.Vector2(p.x,-p.z)));
   b.add(new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2),m,0,y-h/2,0);
  };
  strip(0,width,.048,.035,asphalt);
  for(const side of[-1,1]){
   strip(side*(width/2+.1+sidewalk/2),sidewalk,.065,.065,mats.path);
   strip(side*(width/2+.10),.2,.09,.12,mats.stone);
   strip(side*.12,.10,.072,.012,yellow);
  }
  for(const side of[-1,1])for(let u=-length/2;u<length/2;u+=12)if(Math.abs(u)>5)box(u,side*width*.25,5,.12,.072,.012,paint);
  for(let u=-3.4;u<=3.4;u+=.85)box(u,0,.45,width-.5,.077,.015,paint);
 }
 const group=b.finish('汉口路与广州路 · public asphalt streets');group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});return group;
}
