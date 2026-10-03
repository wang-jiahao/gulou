import * as T from 'three';
import {Builder} from './geometry.ts';
import type {Materials} from './materials.ts';

/** Public streets outside the two south-facing entrances. Direction follows
 * the registered campus map; carriageway widths/marking dimensions are estimates. */
export function createPublicStreets(mats:Materials){
 const b=new Builder(),asphalt=new T.MeshStandardMaterial({name:'public-street-asphalt',color:0x4a5050,map:mats.textures.get('courtyard-asphalt.webp'),roughness:.94,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-3});
 const paint=new T.MeshStandardMaterial({color:0xdcdccb,roughness:.95,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-5}),yellow=paint.clone();yellow.color.set(0xc1ae54);
 for(const[x,z,width,length,angle]of[[-91,367,18,710,.025],[-35,739,20,710,.025]]){
  const point=(u:number,v:number)=>[x+u*Math.cos(angle)+v*Math.sin(angle),z-u*Math.sin(angle)+v*Math.cos(angle)];
  const box=(u:number,v:number,w:number,d:number,y:number,h:number,m:T.Material)=>{const[px,pz]=point(u,v);b.box(w,h,d,px,y,pz,m,false,angle);};
  box(0,0,length,width,.048,.035,asphalt);
  for(const side of[-1,1]){
   box(0,side*(width/2+1.7),length,3.2,.065,.065,mats.path);
   box(0,side*(width/2+.10),length,.2,.09,.12,mats.stone);
   box(0,side*.12,length,.10,.072,.012,yellow);
   for(let u=-length/2;u<length/2;u+=12)if(Math.abs(u)>5)box(u,side*width*.25,5,.12,.072,.012,paint);
  }
  for(let u=-3.4;u<=3.4;u+=.85)box(u,0,.45,width-.5,.077,.015,paint);
 }
 const group=b.finish('汉口路与广州路 · public asphalt streets');group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});return group;
}
