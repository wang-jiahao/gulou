import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {entranceMaterials,type DoorRecord} from './building-entrances.ts';

/** Reference-specific closed entrances. The old door planes and records stay
 * fixed so the existing stairs and approach routes remain usable. */
export function libraryEntrance(b:Builder,meshes:CollisionMesh[],doors:DoorRecord[],m:ReturnType<typeof entranceMaterials>,name:string,x:number,z:number,yaw:number,y:number,historic=false){
 const nx=Math.sin(yaw),nz=Math.cos(yaw);
 const point=(u:number,cy:number,v:number)=>new T.Vector3(x+u*nz+v*nx,y+cy,z-u*nx+v*nz);
 const box=(u:number,cy:number,v:number,w:number,h:number,d:number,mat:T.Material)=>{const p=point(u,cy,v);b.box(w,h,d,p.x,p.y,p.z,mat,false,yaw);};
 const paint=(name:string,color:number)=>new T.MeshStandardMaterial({name,color,roughness:.8});
 const width=historic?3.3:7.4;
 const collider=(u:number,w:number)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,2.7,.06));mesh.position.copy(point(u,1.4,1.5));mesh.rotation.y=yaw;meshes.push(collisionMesh(mesh));};
 collider(0,width);const p=point(0,0,1.5);doors.push({name,x:p.x,y,z:p.z,yaw,width});
 if(!historic){
  // Archive photo 28: a wide glazed frontage surrounds a narrow dark double
  // door, with three rectangular lamps in the underside of the flat canopy.
  const dark=paint('library-entry-dark-frame',0x343e3b),pane=new T.MeshStandardMaterial({name:'library-entry-glazing',color:0x81948a,metalness:.38,roughness:.22});
  box(0,1.42,.24,12.8,2.84,.14,m.inside);box(0,.06,.75,12.8,.12,1.4,m.floor);
  box(0,1.44,1.43,12.64,2.82,.04,pane);
  for(const u of[-6.4,-4.8,-3.2,-1.65,1.65,3.2,4.8,6.4])box(u,1.45,1.48,.055,2.9,.08,m.frame);
  box(0,2.91,1.46,12.9,.1,.12,m.frame);box(0,.06,1.47,12.8,.1,.10,m.frame);
  // Reflections are deliberately simple; no source photograph is a texture.
  for(const u of[-5.6,-4,-2.4,2.4,4,5.6])box(u,1.73,1.46,.028,2.14,.015,m.frame);
  box(0,1.15,1.5,1.85,2.3,.08,dark);
  for(const side of[-1,1]){
   box(side*.465,1.31,1.55,.74,1.75,.026,pane);
   box(side*.14,1.16,1.61,.038,.53,.055,m.steel);
   box(side*.98,1.18,1.54,.12,2.36,.12,dark);
   // Extend collision only across the new outer fixed glass panels.
   collider(side*5.05,2.7);
  }
  box(0,2.37,1.52,3.45,.14,.18,m.frame);
  box(0,2.0,1.58,.055,.6,.025,dark);
  const lamp=new T.MeshStandardMaterial({name:'library-canopy-lamps',color:0xf0ead0,emissive:0xe7dfb7,emissiveIntensity:.35,roughness:.8});
  box(0,2.94,1.35,13.98,.08,3.05,dark);
  for(const u of[-4.2,0,4.2])box(u,2.885,2.22,.40,.025,.26,lamp);
  return;
 }
 // Official VR gl-2-21 front: brown timber leaves, diamond grilles in the
 // upper panels and transom, narrow sidelights, and pale stone inner jambs.
 const wood=paint('museum-entry-dark-timber',0x493329),edge=paint('museum-entry-wood-moulding',0x705044),recess=paint('museum-entry-recess',0x282821),stone=paint('museum-entry-stone',0xc7c5b5);
 const brass=new T.MeshStandardMaterial({name:'museum-entry-brass',color:0x978052,metalness:.62,roughness:.48});
 box(0,1.77,1.32,4.05,3.54,.16,recess);box(0,.045,.82,3.3,.09,1.40,m.floor);
 for(const side of[-1,1]){
  box(side*1.27,1.77,1.46,.38,3.54,.26,stone);
  box(side*1.80,1.77,1.45,.11,3.54,.18,stone);
  box(side*.525,1.34,1.48,1.02,2.68,.12,wood);
  box(side*.525,1.88,1.555,.75,1.30,.035,recess);
  for(const u of[side*.525-.42,side*.525+.42])box(u,1.34,1.58,.055,2.68,.045,edge);
  for(const cy of[.18,.86,1.16,2.59])box(side*.525,cy,1.58,.87,.055,.045,edge);
  for(const cy of[.48,.97]){
   box(side*.525,cy,1.56,.75,.27,.028,edge);
   box(side*.525,cy,1.58,.64,.19,.02,wood);
  }
  box(side*.12,1.32,1.62,.045,.24,.06,brass);
  for(const u of[-.1,.1])box(side*1.62+u,1.82,1.51,.024,3.12,.035,edge);
  for(let cy=.25;cy<3.5;cy+=.36)box(side*1.62,cy,1.51,.32,.022,.035,edge);
 }
 box(0,2.77,1.49,2.15,.14,.18,wood);box(0,3.14,1.47,2.15,.62,.12,wood);box(0,3.14,1.545,1.94,.44,.035,recess);
 const lattice=(u:number,cy:number,w:number,h:number)=>{
  for(const slope of[-1,1])for(let offset=-h/2-w/2;offset<=h/2+w/2;offset+=.22){
   const ends:number[][]=[];
   for(const xx of[-w/2,w/2]){const yy=slope*xx+offset;if(yy>=-h/2&&yy<=h/2)ends.push([xx,yy]);}
   for(const yy of[-h/2,h/2]){const xx=(yy-offset)/slope;if(xx>-w/2&&xx<w/2)ends.push([xx,yy]);}
   if(ends.length===2)b.cylinder(point(u+ends[0][0],cy+ends[0][1],1.59),point(u+ends[1][0],cy+ends[1][1],1.59),.012,.012,edge,5);
  }
 };
 for(const side of[-1,1])lattice(side*.525,1.88,.75,1.3);lattice(0,3.14,1.94,.44);
 box(0,1.34,1.59,.035,2.68,.035,edge);
}
