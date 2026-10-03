import * as T from 'three';
import {Builder} from './geometry.ts';
import silhouettes from './building-lettering.json';
const gold=new T.MeshStandardMaterial({name:'reconstructed-gold-sign-strokes',color:0xc29a43,metalness:.65,roughness:.38});
/** Each sign retains the spacing and shapes visible in its own reference.
 * These are reconstructed contours, not the original calligrapher's vector file. */
export function addBuildingLettering(b:Builder,name:keyof typeof silhouettes,x:number,y:number,z:number,width:number,yaw:number){
 const sign=silhouettes[name];
 for(const part of sign.shapes){
  const points=part.outline.map(([u,v])=>new T.Vector2(u*width,v*width));
  const shape=new T.Shape(points);
  for(const hole of part.holes)shape.holes.push(new T.Path(hole.map(([u,v])=>new T.Vector2(u*width,v*width))));
  b.add(new T.ExtrudeGeometry(shape,{depth:.028,bevelEnabled:false}),gold,x,y,z,new T.Euler(0,yaw,0));
 }
 return{text:sign.text,x,y,z,width,yaw,height:width*sign.heightRatio,method:sign.method};
}
