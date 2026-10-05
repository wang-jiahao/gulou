import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

export type ChemistryFrontage={len:number;x:number;z:number;angle:number;nx:number;nz:number};
/** The central south edge on the official plan faces gl-3-18's camera and the
 * Yifu portal behind it. End-wing doorways are not the photographed main entry. */
export const chemistryFrontage=(e:ChemistryFrontage)=>e.nz>.98&&e.len>40&&e.len<60;

/** Official VR gl-3-18 f/r: three deep canopy bays, four stone supports,
 * broad grey stairs, closed glazed lobby. Dimensions/registration are approximate;
 * the existing plan footprint and unverified upper storeys are retained. */
export function buildChemistryEntrance(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[],e:ChemistryFrontage){
 const mat=(name:string,color:number,roughness=.8)=>new T.MeshStandardMaterial({name:`chemistry-${name}`,color,roughness});
 const stone=mat('grey-stairs',0xa1a19a),metal=mat('canopy-cladding',0xa5aaa6,.6),joints=mat('panel-joints',0x717973),frame=mat('dark-silver-frames',0x606c66,.43),glass=mat('lobby-glass',0x536f68,.26),recess=mat('lobby-recess',0x263d35),light=mat('ceiling-insets',0xd7d8c4);
 metal.metalness=.18;frame.metalness=.45;glass.metalness=.25;
 const point=(u:number,v:number)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz];
 const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string)=>{
  const[x,z]=point(u,v);b.box(w,h,d,x,y,z,m,false,e.angle);
  if(kind){const proxy=new T.Mesh(new T.BoxGeometry(w,h,d));proxy.position.set(x,y,z);proxy.rotation.y=e.angle;meshes.push(collisionMesh(proxy));camera.push(proxy);boxes.push({kind,u,y,v,w,h,d});}
 };
 // Profiles are in outward distance / height. Extrusion makes the sloping
 // canopy braces and stair cheeks agree in both rendering and collision.
 const profile=(u:number,w:number,points:number[][],m:T.Material,solid=false)=>{
  const shape=new T.Shape(points.map(([v,y])=>new T.Vector2(v,y)));
  const g=new T.ExtrudeGeometry(shape,{depth:w,bevelEnabled:false,steps:1});
  g.rotateY(-Math.PI/2);g.translate(w/2,0,0);
  const[x,z]=point(u,0);b.add(g.clone(),m,x,0,z,new T.Euler(0,e.angle,0));
  if(solid){const proxy=new T.Mesh(g);proxy.position.set(x,0,z);proxy.rotation.y=e.angle;meshes.push(collisionMesh(proxy));camera.push(proxy);}else g.dispose();
 };
 box(0,.525,2.15,22.4,1.05,4.3,stone,'landing');
 for(let i=0;i<6;i++){
  const h=.9-i*.15,v=4.3+(i+.5)*.38;
  box(0,h/2,v,22.4,h,.38,stone,'step');
  box(0,h-.016,v+.177,22.4,.032,.026,metal);
 }
 for(const u of[-11.5,11.5])profile(u,.6,[[0,0],[6.58,0],[6.58,.42],[4.3,1.52],[0,1.52]],stone,true);
 // The wall behind the shallow lobby remains solid until interiors are modeled.
 box(0,3.08,.11,21.5,4.06,.15,recess);
 box(0,3.08,.29,21.3,4.06,.07,glass,'closed-glazing');
 for(const u of[-10.65,-8.88,-7.1,-5.33,-3.55,-2.5,-1.25,0,1.25,2.5,3.55,5.33,7.1,8.88,10.65])box(u,3.08,.345,.065,4.06,.075,frame);
 for(const y of[1.075,3.65,5.1])box(0,y,.345,21.4,.07,.075,frame);
 for(const u of[-.13,.13])box(u,2.35,.425,.042,.72,.10,metal);
 box(0,2.3,.395,5,.095,.015,metal);
 for(const u of[-10.65,-3.55,3.55,10.65]){
  box(u,3.13,2.55,.88,4.16,1.1,metal,'column');
  profile(u,.88,[[0,4.8],[2.55,4.35],[5.4,5.3],[5.4,5.55],[0,5.55]],metal,true);
  for(const y of[1.7,2.35,3,3.65,4.3])box(u,y,3.106,.884,.015,.012,joints);
 }
 // One continuous top slab with three recessed soffits and four projecting ribs.
 box(0,5.74,2.55,23.2,.88,5.1,metal,'canopy');
 for(const u of[-10.65,-3.55,3.55,10.65])box(u,5.88,2.7,1.02,1.16,5.4,metal,'canopy-rib');
 for(let i=-14;i<=14;i++)box(i*.8,5.74,5.107,.014,.86,.013,joints);
 for(const u of[-7.1,0,7.1]){
  for(const v of[.85,1.7,2.55,3.4,4.25])box(u,5.293,v,6.16,.015,.014,joints);
  for(const du of[-2.37,-1.58,-.79,0,.79,1.58,2.37])box(u+du,5.293,2.55,.014,.015,5.05,joints);
  for(const v of[1.4,3.7])box(u,5.28,v,.24,.022,.24,light);
 }
 const[x,z]=point(0,.32);doors.push({name:'化学楼',x,y:1.05,z,yaw:e.angle,width:5});
 return {source:'official Gulou VR scene_gl-3-18 f/r; official plan south central edge',registration:'approximate plan edge and dimensions',canopyBays:3,columns:4,stepRisers:7,landingHeight:1.05,boxes};
}
