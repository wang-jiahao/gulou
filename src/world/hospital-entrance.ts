import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

/** Official Gulou VR note_191 and the hospital's exchange photograph agree on
 * the canopy, six gold characters, four red-brown posts, glass and grey steps.
 * The photographs do not establish an entrance bearing or measured dimensions.
 * Keep the previous procedural placement until a geolocated view is available. */
export function buildHospitalEntrance(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],plaques:T.Group,doors:DoorRecord[],x:number,z:number,yaw:number){
 const mat=(name:string,color:number,roughness=.85)=>new T.MeshStandardMaterial({name:`hospital-${name}`,color,roughness});
 const wall=mat('pale-wall',0xd4d6d1),cladding=mat('canopy-metal',0xb6b9b4,.58),seam=mat('panel-joints',0x707971),red=mat('red-stone',0x874139,.51),stone=mat('grey-steps',0x93958f),frame=mat('silver-frames',0xa7b1ad,.39),dark=mat('vestibule',0x354543),glass=mat('glazing',0x688480,.29),stripe=mat('door-stripe',0x419f96),blue=mat('small-plates',0x487f92),light=mat('ceiling-lights',0xe9e2c4);
 frame.metalness=.5;cladding.metalness=.22;
 const nx=Math.sin(yaw),nz=Math.cos(yaw),point=(u:number,v:number)=>[x+u*nz+v*nx,z-u*nx+v*nz];
 const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string)=>{
  const[px,pz]=point(u,v);b.box(w,h,d,px,y,pz,m,false,yaw);
  if(kind){const proxy=new T.Mesh(new T.BoxGeometry(w,h,d));proxy.position.set(px,y,pz);proxy.rotation.y=yaw;meshes.push(collisionMesh(proxy));camera.push(proxy);boxes.push({kind,u,y,v,w,h,d});}
 };
 // The old footprint is kept. Cover just the doorway bays with a pale reveal,
 // and place a shallow closed vestibule in front of the existing solid wall.
 box(0,1.93,.075,8.8,3.86,.10,wall);box(0,1.97,.15,8.25,2.98,.04,dark);
 box(0,.24,1.14,9.1,.48,2.28,stone,'landing');
 box(0,.16,2.46,9.25,.32,.36,stone,'upper-step');
 box(0,.08,2.82,9.4,.16,.36,stone,'lower-step');
 for(const [v,y,w]of[[2.277,.48,9.1],[2.637,.32,9.25],[2.997,.16,9.4]])box(0,y-.018,v,w,.035,.025,cladding);
 // note_191 shows a transverse drain beyond the steps. Its span and offset
 // are approximate; shallow decorative bars reuse existing merged materials
 // and do not add a raised obstacle to the entrance approach.
 box(0,.026,4.75,10.2,.016,.46,dark);
 for(const v of[4.52,4.98])box(0,.045,v,10.28,.025,.045,frame);
 for(let i=-25;i<=25;i++)box(i*.204,.045,4.75,.044,.025,.46,frame);
 box(0,1.94,1.485,8.32,2.92,.055,glass,'closed-glass');
 // Window frames, central door leaves and the upper transom remain legible at
 // a walking distance; there are no speculative indoor access turnstiles.
 for(const u of[-4.15,-3.24,-2.24,-1.72,0,1.72,2.24,3.24,4.15])box(u,1.94,1.535,.055,2.96,.085,frame);
 for(const y of[.50,2.96,3.42])box(0,y,1.535,8.38,.06,.085,frame);
 box(0,1.46,1.543,8.28,.11,.015,stripe);
 for(const u of[-.14,.14])box(u,1.73,1.60,.035,.53,.09,frame);
 for(const u of[-4.0,-2.02,2.02,4.0]){
  box(u,2.02,1.72,.53,3.08,.55,red,'column');
  box(u,.53,1.74,.57,.10,.59,cladding);
 }
 // Wide metal fascia and underside panel grid visible in the official image.
 box(0,4.01,1.08,10.2,.94,2.5,cladding,'canopy');
 for(let i=-5;i<=5;i++)box(i*.89,4.01,2.337,.016,.91,.012,seam);
 for(let i=-5;i<=5;i++)box(i*.89,3.535,1.08,.013,.015,2.46,seam);
 for(const v of[.3,1.05,1.80])box(0,3.535,v,10.16,.016,.013,seam);
 for(const u of[-2.75,2.75]){const[px,pz]=point(u,1.21);b.add(new T.CylinderGeometry(.14,.14,.025,12),light,px,3.525,pz);}
 // The photo shows a band of silver-framed windows above the metal canopy.
 box(0,5.43,.095,8.2,1.65,.05,glass);
 for(const u of[-4.1,-2.73,-1.36,0,1.36,2.73,4.1])box(u,5.43,.15,.075,1.73,.11,frame);
 for(const y of[4.58,5.95,6.28])box(0,y,.15,8.3,.07,.11,frame);
 // Side windows and their protective bars are directly visible in note_191.
 for(const side of[-1,1]){
  const u=side*5.64;box(u,1.99,.075,1.58,2.12,.05,glass);
  for(const du of[-.79,0,.79])box(u+du,1.99,.16,.075,2.16,.1,frame);
  for(const y of[.91,1.55,3.07])box(u,y,.19,1.63,.07,.15,frame);
  for(let j=-3;j<=3;j++)box(u+j*.21,1.99,.33,.024,2.13,.035,frame);
  for(const y of[.93,3.05])box(u,y,.26,1.65,.033,.18,frame);
  box(side*4,2.24,2.01,.39,.14,.02,blue);
 }
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=144;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#856a42';ctx.font='102px "Kaiti SC","STKaiti",serif';ctx.textAlign='center';ctx.textBaseline='middle';
 const label='南京大学医院';[...label].forEach((c,i)=>ctx.fillText(c,106+i*162,78));
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const sign=new T.Mesh(new T.PlaneGeometry(7.5,.81),new T.MeshStandardMaterial({name:'hospital-gold-lettering',map:texture,transparent:true,alphaTest:.1,roughness:.57,metalness:.25}));
 const[sx,sz]=point(0,2.355);sign.position.set(sx,4.04,sz);sign.rotation.y=yaw;sign.name=label;plaques.add(sign);
 // Keep the previous ground-plan door location: vegetation seeding and map
 // arrival offsets must not move when refining this entrance.
 const[dx,dz]=point(0,1.5);doors.push({name:'校医院',x:dx,y:.48,z:dz,yaw,width:3.44});
 return {label,source:'official Gulou VR note_191; hospital exchange photograph',registration:'approximate — previous procedural frontage retained',columns:4,stepRisers:3,boxes};
}
