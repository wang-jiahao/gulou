import * as T from 'three';
import {Builder,rng} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';

/** The visible entrance surroundings in official VR gl-2-21-f. Sculpture,
 * planting sizes and lamp detail are approximate; no unreadable plaque text. */
export function museumForecourt(b:Builder,meshes:CollisionMesh[],cameraSolids:T.Object3D[],x:number,z:number,yaw:number){
 const paint=(name:string,color:number)=>new T.MeshStandardMaterial({name,color,roughness:.92});
 const stone=paint('museum-lion-warm-stone',0xada993),carving=paint('museum-lion-carved-recess',0x747669),metal=paint('museum-lamp-dark-metal',0x393d36);
 const glass=new T.MeshStandardMaterial({name:'museum-lamp-frosted-glass',color:0xe7dfb7,emissive:0xd6bc74,emissiveIntensity:.16,roughness:.72});
 const nx=Math.sin(yaw),nz=Math.cos(yaw),point=(u:number,y:number,v:number)=>new T.Vector3(x+u*nz+v*nx,y,z-u*nx+v*nz);
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material)=>{const p=point(u,y,v);b.box(w,h,d,p.x,p.y,p.z,mat,false,yaw);};
 const ellipsoid=(u:number,y:number,v:number,rx:number,ry:number,rz:number,mat:T.Material,segments=12)=>{const p=point(u,y,v);b.add(new T.SphereGeometry(1,segments,8).scale(rx,ry,rz),mat,p.x,p.y,p.z,new T.Euler(0,yaw,0));};
 const line=(coords:number[][],radius:number,mat:T.Material)=>b.line(coords.map(([u,y,v])=>point(u,y,v)),radius,mat,6);
 const solid=(u:number,y:number,v:number,w:number,h:number,d:number)=>{const p=point(u,y,v),proxy=new T.Mesh(new T.BoxGeometry(w,h,d));proxy.position.copy(p);proxy.rotation.y=yaw;meshes.push(collisionMesh(proxy));cameraSolids.push(proxy);};
 for(const side of[-1,1]){
  // Frosted tapered lantern on the inner pale jamb, with a small dark cup.
  const u=side*1.27;
  box(u,2.82,1.61,.14,.42,.045,metal);
  ellipsoid(u,2.94,1.77,.102,.23,.105,glass);
  b.cylinder(point(u,2.70,1.77),point(u,2.79,1.77),.045,.105,metal,10);
  line([[u,2.69,1.76],[u,2.62,1.71],[u,2.69,1.62]],.021,metal);
  // Seated guardian: a square carved pedestal, haunches behind vertical
  // forelegs, broad mane and muzzle. Curled relief is simplified geometry.
  const lu=side*2.65,lv=1.96;
  box(lu,.30,lv,.80,.60,.84,stone);
  box(lu,.68,lv,.72,.24,.75,stone);box(lu,.85,lv,.82,.10,.85,stone);
  box(lu,.68,lv+.385,.53,.16,.016,carving);
  for(const su of[-1,1]){
   line([[lu+su*.27,.61,lv+.403],[lu+su*.17,.67,lv+.425],[lu+su*.24,.75,lv+.41]],.035,stone);
   ellipsoid(lu+su*.23,1.02,lv-.09,.18,.22,.22,stone);
   // Long front legs read as a seated animal rather than stacked spheres.
   b.cylinder(point(lu+su*.16,.94,lv+.20),point(lu+su*.15,1.43,lv+.10),.083,.105,stone,10);
   ellipsoid(lu+su*.16,.95,lv+.27,.125,.065,.15,stone);
   for(const toe of[-.055,0,.055])line([[lu+su*.16+toe,.95,lv+.375],[lu+su*.16+toe,.99,lv+.31]],.008,carving);
  }
  ellipsoid(lu,1.26,lv-.05,.245,.38,.25,stone);
  ellipsoid(lu,1.63,lv+.015,.29,.30,.23,stone);
  // Small overlapping curls form the mane's silhouette and cheek relief.
  for(let i=0;i<13;i++){
   const a=i/13*Math.PI*2,du=Math.sin(a)*.255,dy=Math.cos(a)*.255;
   ellipsoid(lu+du,1.64+dy,lv+.075,.083,.079,.077,stone,8);
   if(i%2===0)line([[lu+du-.035,1.64+dy,lv+.143],[lu+du,1.67+dy,lv+.155],[lu+du+.032,1.64+dy,lv+.143]],.009,carving);
  }
  for(const su of[-1,1]){
   ellipsoid(lu+su*.215,1.82,lv+.035,.09,.11,.075,stone);
   ellipsoid(lu+su*.12,1.72,lv+.224,.033,.029,.012,carving,8);
   line([[lu+su*.055,1.77,lv+.23],[lu+su*.12,1.785,lv+.241],[lu+su*.177,1.755,lv+.21]],.033,stone);
   ellipsoid(lu+su*.09,1.60,lv+.26,.112,.07,.09,stone);
  }
  ellipsoid(lu,1.535,lv+.242,.16,.051,.055,carving);
  ellipsoid(lu,1.485,lv+.235,.16,.046,.072,stone);
  ellipsoid(lu,1.658,lv+.29,.08,.042,.06,carving);
  for(const su of[-1,1])box(lu+su*.1,1.55,lv+.289,.035,.038,.025,stone);
  line([[lu-side*.22,1.05,lv-.19],[lu-side*.31,1.22,lv-.22],[lu-side*.26,1.37,lv-.18]],.045,stone);
  // One tight proxy per statue; the broad central steps stay clear.
  solid(lu,1.00,lv,.82,2.00,.85);
 }
 // Dense small leaves are generated locally. No photographic reference
 // texture is included in the game, and planting remains within lawn edges.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d')!,random=rng(2131);ctx.fillStyle='#3c5122';ctx.fillRect(0,0,256,256);
 for(let i=0;i<7000;i++){
  const shade=Math.floor(65+random()*70);ctx.fillStyle=`rgb(${shade},${shade+24},${Math.floor(shade*.45)})`;
  ctx.beginPath();ctx.ellipse(random()*256,random()*256,1.2+random()*1.6,.6+random(),random()*Math.PI,0,Math.PI*2);ctx.fill();
 }
 const leafMap=new T.CanvasTexture(canvas);leafMap.colorSpace=T.SRGBColorSpace;leafMap.wrapS=leafMap.wrapT=T.RepeatWrapping;leafMap.anisotropy=8;
 const leaves=new T.MeshStandardMaterial({name:'museum-clipped-small-leaves',map:leafMap,roughness:.96});
 for(const side of[-1,1]){
  const u=side*6.6,v=8.5;
  ellipsoid(u,.40,v,2.05,1.80,1.85,leaves,24);
  // Low cuboid proxy sits inside the rounded crown, avoiding invisible
  // collision corners outside the foliage silhouette.
  solid(u,.70,v,3.2,1.40,2.7);
  const hu=side*7.4,hv=12.2;
  box(hu,.62,hv,4.8,1.2,2.4,leaves);
  solid(hu,.62,hv,4.8,1.2,2.4);
 }
 return{source:'official VR gl-2-21-f',approximate:true,lamps:2,guardians:2,roundedBushes:2,lowHedges:2};
}
