import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {ChemistryFrontage} from './chemistry-entrance.ts';

/** gl-3-18 f/u and gl-4-02 aerial: nine window rows above the two-storey
 * entrance, deep pale spandrels, orange fins and screened roof extraction.
 * The west wing recedes in plan: its lower image position is not a height
 * measurement. Eleven rows share one estimated datum; metres are approximate.
 * Unseen rear windows retain the ordinary profile pending a closer reference. */
export function createChemistryFacade(){
 const mat=(name:string,color:number,roughness=.83)=>new T.MeshStandardMaterial({name:`chemistry-upper-${name}`,color,roughness});
 const slab=mat('pale-spandrel',0xc4c5bd),pier=mat('grey-pier',0x959f9b),orange=mat('orange-fin',0xcb7650),recess=mat('window-recess',0x354b4f),glass=mat('blue-glass',0x66858b,.34),frame=mat('silver-frame',0xb4bdb9,.5),screen=mat('roof-screen',0x7a94a4),plant=mat('roof-duct',0x899b9f),fan=mat('extractor',0xb4bdb8);
 glass.metalness=.22;frame.metalness=.4;
 const faces:{frontage:number[];rows:number;bays:number}[]=[],obstacles:{kind:string;x:number;y:number;z:number;w:number;h:number;d:number;yaw:number}[]=[];
 const rows=11,storey=3.25,height=rows*storey;
 const box=(target:Builder,e:ChemistryFrontage,u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>target.box(w,h,d,e.x+u*e.nz+v*e.nx,y,e.z-u*e.nx+v*e.nz,m,false,e.angle);
 const solid=(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],e:ChemistryFrontage,u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind:string)=>{
  box(b,e,u,y,v,w,h,d,m);
  const x=e.x+u*e.nz+v*e.nx,z=e.z-u*e.nx+v*e.nz,proxy=new T.Mesh(new T.BoxGeometry(w,h,d));proxy.position.set(x,y,z);proxy.rotation.y=e.angle;
  meshes.push(collisionMesh(proxy));camera.push(proxy);obstacles.push({kind,x,y,z,w,h,d,yaw:e.angle});
 };
 return {
  height,
  metadata:{source:'official VR gl-3-18 f/u/l and gl-4-02 aerial',dimensions:'approximate; 11 visible facade rows, no surveyed elevation; rear bays provisional',rows,storey,height,faces,obstacles},
  accepts:(e:ChemistryFrontage)=>e.nz>.98&&e.len>25,
  face(b:Builder,detail:Builder,e:ChemistryFrontage){
   const bays=Math.round(e.len/4.7),step=e.len/bays,main=e.len>40;let windows=0;
   for(let row=0;row<rows;row++)for(let bay=0;bay<bays;bay++){
    const u=(bay-(bays-1)/2)*step,base=row*storey,w=step-.32;
    // The independently verified glass lobby occupies the central lower bays.
    if(main&&row<2&&Math.abs(u)<12)continue;
    box(b,e,u,base+1.28,.045,w,1.82,.11,recess);
    b.add(new T.PlaneGeometry(w-.12,1.70),glass,e.x+u*e.nz+.105*e.nx,base+1.28,e.z-u*e.nx+.105*e.nz,new T.Euler(0,e.angle,0));
    box(b,e,u,base+2.69,.34,w,1.12,.72,slab);
    box(b,e,u,base+1.28,.29,.25,1.75,.48,orange);
    for(const side of[-1,1]){
     box(detail,e,u,base+1.28+side*.86,.15,w,.055,.11,frame);
     box(detail,e,u+side*(w-.07)/2,base+1.28,.15,.055,1.77,.11,frame);
    }
    for(const ratio of[-.375,-.25,-.125,.125,.25,.375])box(detail,e,u+w*ratio,base+1.28,.15,.045,1.72,.11,frame);
    box(detail,e,u,base+1.55,.15,w,.045,.11,frame);
    windows+=2;
   }
   for(let bay=0;bay<=bays;bay++){
    const u=(bay-bays/2)*step,bottom=main&&Math.abs(u)<12?6.5:0;
    box(b,e,u,(height+bottom)/2,.18,.25,height-bottom,.40,pier);
   }
   faces.push({frontage:[e.x,e.z,e.nx,e.nz],rows,bays});return windows;
  },
  roof(b:Builder,detail:Builder,meshes:CollisionMesh[],camera:T.Object3D[],edges:ChemistryFrontage[],front:ChemistryFrontage){
   for(const e of edges){
    solid(b,meshes,camera,e,0,height+.82,-.16,e.len,1.64,.16,screen,'roof-screen');
    const bays=Math.ceil(e.len/2.7);
    for(let i=0;i<=bays;i++)box(detail,e,(i/bays-.5)*e.len,height+.84,-.055,.065,1.7,.08,frame);
    for(const dy of[.03,.58,1.1,1.64])box(detail,e,0,height+dy,-.055,e.len,.055,.08,frame);
   }
   // The aerial verifies a repeated extractor bank; spacing, count and rear
   // placement use the traced roof and remain approximate.
   for(let i=0;i<10;i++){
    const u=(i-4.5)*4.3;
    solid(b,meshes,camera,front,u,height+.6,-10.5,1.65,1.2,3.1,plant,'extractor-base');
    const x=front.x+u*front.nz-11.35*front.nx,z=front.z-u*front.nx-11.35*front.nz;
    const geometry=new T.CylinderGeometry(.56,.78,1.45,12),proxy=new T.Mesh(geometry);proxy.position.set(x,height+1.9,z);
    meshes.push(collisionMesh(proxy));camera.push(proxy);b.add(geometry.clone(),fan,x,height+1.9,z);
    obstacles.push({kind:'extractor-stack',x,y:height+1.9,z,w:1.56,h:1.45,d:1.56,yaw:0});
    b.add(new T.CylinderGeometry(.63,.63,.13,12),plant,x,height+2.58,z);
   }
  }
 };
}
