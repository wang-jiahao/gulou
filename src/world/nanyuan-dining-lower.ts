import * as T from 'three';
import {Builder} from './geometry.ts';
import type {MapFeature} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';

/** gl110 b fixes the paired blue barrel canopies and descending mouths.
 * Clear width, descent and closed lower doors are fitted, not surveyed. */
export function diningLowerEntryLayout(f:MapFeature){
 const a=f.points[3],c=f.points[0],length=Math.hypot(c[0]-a[0],c[1]-a[1]);
 const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,nx=-(c[1]-a[1])/length,nz=(c[0]-a[0])/length;
 const point=(s:number,t:number)=>[x+s*nz+t*nx,z-s*nx+t*nz];
 const centers=[-15.6,15.6],half=2.3,mouth=4.04,back=-2,steps=10,run=.34,rise=.15,street=.035;
 const floor=street-steps*rise,foot=mouth-steps*run;
 const outlines=centers.map(s=>({points:[[s-half,back],[s+half,back],[s+half,mouth],[s-half,mouth]].map(([u,v])=>point(u,v))}));
 return{point,frame:{x,z,nx,nz,yaw:Math.atan2(nx,nz)},centers,half,mouth,back,steps,run,rise,street,floor,foot,outlines};
}

export function buildDiningLowerEntries(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],stone:T.Material,metal:T.Material,glass:T.Material){
 const layout=diningLowerEntryLayout(f),{point,frame,centers,half,mouth,back,steps,run,rise,street,floor,foot}=layout;
 const blue=new T.MeshStandardMaterial({name:'dining-lower-blue-panels',color:0x347e9b,roughness:.68,side:T.DoubleSide});
 const roof=new T.MeshStandardMaterial({name:'dining-lower-blue-roof',color:0x337993,roughness:.45,metalness:.12,side:T.DoubleSide});
 const frameBlue=new T.MeshStandardMaterial({name:'dining-lower-canopy-frames',color:0x75a8b8,roughness:.5,metalness:.4});
 const proxy=new T.MeshBasicMaterial({side:T.DoubleSide}),start=meshes.length;
 const solid=(g:T.BufferGeometry)=>{const m=new T.Mesh(g,proxy);meshes.push(collisionMesh(m));camera.push(m);};
 const box=(s:number,y:number,t:number,w:number,h:number,d:number,mat:T.Material,collision=true)=>{
  const[x,z]=point(s,t);b.box(w,h,d,x,y,z,mat,false,frame.yaw);
  if(collision)solid(new T.BoxGeometry(w,h,d).rotateY(frame.yaw).translate(x,y,z));
 };
 const vector=(s:number,y:number,t:number)=>{const[x,z]=point(s,t);return new T.Vector3(x,y,z);};
 const line=(a:T.Vector3,c:T.Vector3,r=.025,mat:T.Material=frameBlue)=>b.cylinder(a,c,r,r,mat,6);
 for(const s of centers){
  const spring=2.05,crown=.8;
  // Ten short risers connect the existing .035m paving to a real lower floor.
  for(let i=0;i<steps;i++){
   const top=street-(i+1)*rise;
   box(s,(floor-.18+top)/2,mouth-(i+.5)*run,half*2,top-floor+.18,run,stone);
   box(s,top+.003,mouth-(i+1)*run+.025,half*2-.08,.006,.05,metal,false);
  }
  box(s,floor-.09,(back+foot)/2,half*2,.18,foot-back,stone);
  // Retaining walls close the soil below the global foundation and guard the
  // stair edges. The inner faces match the terrain/collision holes exactly.
  for(const side of[-1,1]){
   box(s+side*(half+.08),(floor-.18+spring)/2,(back+mouth)/2,.16,spring-floor+.18,mouth-back,blue);
   line(vector(s+side*(half-.16),street+.9,mouth-.1),vector(s+side*(half-.16),floor+.9,foot),.03,metal);
   line(vector(s+side*(half-.16),floor+.9,foot),vector(s+side*(half-.16),floor+.9,back+.2),.03,metal);
  }
  // Door graphics in the source are too small to read; no invented shop name
  // or indoor route. Leave enough space to turn and dismount on the landing.
  box(s,(floor+1.28)/2,back+.055,half*2,1.28-floor,.11,glass);
  for(const u of[-half,0,half])box(s+u,(floor+1.28)/2,back+.125,.06,1.28-floor,.055,metal,false);
  for(const y of[floor+.06,floor+1.15,1.24])box(s,y,back+.13,half*2,.06,.055,metal,false);
  for(const u of[-.15,.15])box(s+u,floor+1.05,back+.18,.035,.42,.04,metal,false);
  const canopyHalf=half+.16,near=mouth+.06,far=.48,segments=20;
  const arc=(i:number,t:number)=>{const angle=Math.PI*i/segments;return vector(s+Math.cos(angle)*canopyHalf,spring+Math.sin(angle)*crown,t);};
  const vertices:number[]=[];
  for(let i=0;i<segments;i++){
   const a=arc(i,near),c=arc(i+1,near),d=arc(i+1,far),e=arc(i,far);
   for(const p of[a,c,d,a,d,e])vertices.push(...p.toArray());
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();solid(g.clone());b.add(g,roof);
  // The photograph shows a blue front fascia across the arch, with the
  // passage open below it. Keep standing clearance at the street threshold.
  const fascia:number[]=[],center=vector(s,spring,near);
  for(let i=0;i<segments;i++)for(const p of[center,arc(i,near),arc(i+1,near)])fascia.push(...p.toArray());
  const front=new T.BufferGeometry();front.setAttribute('position',new T.Float32BufferAttribute(fascia,3));front.computeVertexNormals();solid(front.clone());b.add(front,blue);
  line(vector(s-canopyHalf,spring,near),vector(s+canopyHalf,spring,near));
  for(const t of[far,1.65,2.85,near])for(let i=0;i<segments;i++)line(arc(i,t),arc(i+1,t));
  for(const i of[0,5,10,15,20])line(arc(i,far),arc(i,near));
 }
 return{source:'Official VR gl110 b; approximate width, stair count and depth; lower interior unverified',frame:layout.frame,centers,half,mouth,back,steps,run,rise,street,floor,foot,outlines:layout.outlines,fixedMeshCount:meshes.length-start};
}
