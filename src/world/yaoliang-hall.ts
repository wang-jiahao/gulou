import * as T from 'three';
import {Builder} from './geometry.ts';
import {planShape,type MapFeature} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {splitBuildingRoof} from './building-roof.ts';
import type {Materials} from './materials.ts';
import type {DoorRecord} from './building-entrances.ts';

/** gl110 f/l: low flat portico, tall glass and a stone sign wall.
 * Preserve the independent plan114 outline. The tall residential blocks seen
 * behind it are not evidence for five storeys here. Hidden faces and all
 * dimensions remain approximate; the Nanqing Gelu entrance is unverified. */
export function buildYaoliangHall(f:MapFeature,mats:Materials,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const a=f.points[5],c=f.points[6],len=Math.hypot(c[0]-a[0],c[1]-a[1]);
 const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,nx=-(c[1]-a[1])/len,nz=(c[0]-a[0])/len,yaw=Math.atan2(nx,nz);
 const point=(u:number,v:number)=>[x+u*nz+v*nx,z-u*nx+v*nz];
 const local=(px:number,pz:number)=>[(px-x)*nz-(pz-z)*nx,(px-x)*nx+(pz-z)*nz];
 const polygon=f.points.map(([px,pz])=>local(px,pz));
 const height=8.8,floor=.9,recess=4.8,entryU=[-7.15,7.15];
 const mat=(name:string,color:number)=>new T.MeshStandardMaterial({name:`yaoliang-${name}`,color,roughness:.84});
 const wall=mat('pale-grey-cladding',0xd0d5cf),stone=mat('grey-stone',0x969f94),roof=mat('flat-roof',0x818985),seam=mat('stone-joints',0x737e75),metal=mat('silver-frames',0xaebfbc),glass=mat('green-glazing',0x779b93);
 metal.metalness=.55;metal.roughness=.35;glass.metalness=.32;glass.roughness=.28;
 const proxyMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
 const parts:{name:string;u:number;v:number;bottom:number;height:number;width:number;depth:number}[]=[];
 const collider=(geometry:T.BufferGeometry)=>{const m=new T.Mesh(geometry,proxyMaterial);meshes.push(collisionMesh(m));camera.push(m);};
 function box(name:string,u:number,y:number,v:number,w:number,h:number,d:number,material:T.Material,solid=false){
  const[px,pz]=point(u,v);b.box(w,h,d,px,y,pz,material,false,yaw);
  if(solid){collider(new T.BoxGeometry(w,h,d).rotateY(yaw).translate(px,y,pz));parts.push({name,u,v,bottom:y-h/2,height:h,width:w,depth:d});}
 }
 function mass(points:number[][],h:number,material:T.Material){
  const shape=planShape({points:points.map(([u,v])=>point(u,v))});
  const g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
  collider(g.clone());const surfaces=splitBuildingRoof(g);b.add(surfaces.walls,material);b.add(surfaces.roof,h>floor?roof:material);g.dispose();
 }
 const clip=(value:number,side:number)=>{
  const out:number[][]=[];
  for(let i=0;i<polygon.length;i++){
   const p=polygon[i],q=polygon[(i+1)%polygon.length],pd=(p[1]-value)*side,qd=(q[1]-value)*side;
   if(pd>=0)out.push(p);
   if(pd*qd<0){const t=pd/(pd-qd);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
  }return out;
 };
 mass(clip(-recess,-1),height,wall);
 mass(clip(-recess,1),floor,stone);
 // A single tall glazed volume behind the name wall, with recessed side doors.
 box('central-glazing',0,(height+floor)/2,-2.15,10.5,height-floor-.35,.16,glass,true);
 for(const u of[-5.2,5.2])box('glass-return',u,(height+floor)/2,-3.5,.16,height-floor-.35,2.6,glass,true);
 box('canopy',0,height-.18,-2.24,20.3,.36,5.55,wall,true);
 const columns=[-9.2,-4.8,0,4.8,9.2];
 for(const u of columns){
  const[px,pz]=point(u,.15);b.cylinder(new T.Vector3(px,.02,pz),new T.Vector3(px,height-.36,pz),.12,.12,metal,10);
  collider(new T.CylinderGeometry(.12,.12,height-.38,10).translate(px,(height-.36+.02)/2,pz));
 }
 for(let u=-5.1;u<=5.2;u+=1.275)box('mullion',u,4.72,-2.04,.06,7.45,.08,metal);
 for(const y of[1.02,3.35,5.7,8.42])box('transom',0,y,-2.03,10.5,.075,.1,metal);
 for(const u of[-5.22,5.22])for(const y of[1.02,3.35,5.7,8.42])box('return-transom',u,y,-3.5,.1,.075,2.7,metal);
 // Close the unmodelled interior with visible glazing. The two sheltered
 // landings remain reachable from the pavement by six shallow steps.
 for(const u of entryU){
  box('entry-landing',u,floor/2,-2.48,3.4,floor,4.5,stone,true);
  for(let i=0;i<6;i++){
   const top=(i+1)*.15,v=1.56-i*.34;
   box('entry-step',u,top/2,v,3.4,top,.35,stone,true);
  }
  box('closed-entry',u,2.65,-4.69,3.35,3.5,.12,glass);
  for(const du of[-1.62,0,1.62])box('door-frame',u+du,2.63,-4.59,.06,3.5,.1,metal);
  box('door-transom',u,4.38,-4.58,3.4,.07,.1,metal);
  for(const du of[-.14,.14])box('handle',u+du,1.95,-4.48,.035,.5,.06,metal);
  for(const side of[-1,1]){
   const railU=u+side*1.62,[ax,az]=point(railU,1.65),[bx,bz]=point(railU,-.27);
   b.cylinder(new T.Vector3(ax,1.1,az),new T.Vector3(bx,1.87,bz),.033,.033,metal,6);
   for(const [v,base]of[[1.56,.15],[.88,.45],[.20,.75],[-.27,.9]])box('handrail-post',railU,base+.48,v,.055,.96,.055,metal);
   box('landing-rail',railU,1.85,-2.48,.06,.06,4.4,metal);
   for(const v of[-1.2,-2.6,-4.4])box('landing-post',railU,1.37,v,.055,.94,.055,metal);
   // Simple proxies cover the open railing, so the player and camera cannot
   // pass sideways through the metal or drop off the raised landing.
   collider(new T.BoxGeometry(.065,.95,4.5).rotateY(yaw).translate(...(()=>{const[pX,pZ]=point(railU,-2.48);return[pX,1.375,pZ] as const;})()));
  }
 }
 box('sign-wall',0,1.5,.16,10.55,3,.36,stone,true);
 for(let u=-5.25;u<=5.3;u+=1.06)box('vertical-joint',u,1.5,.348,.015,2.99,.008,seam);
 for(const y of[.6,1.2,1.8,2.4])box('horizontal-joint',0,y,.348,10.5,.012,.008,seam);
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=512;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#394b3d';ctx.textAlign='center';ctx.textBaseline='middle';
 const spaced=(text:string,center:number,y:number,spacing:number)=>[...text].forEach((letter,i)=>ctx.fillText(letter,center+(i-(text.length-1)/2)*spacing,y));
 ctx.font='104px "Kaiti SC","STKaiti",serif';spaced('南京大学',1080,90,150);
 ctx.font='132px "Kaiti SC","STKaiti",serif';spaced('鼓楼校区综合服务大厅',1024,260,178);
 ctx.font='49px sans-serif';ctx.fillText('Comprehensive Services Hall of Gulou Campus',1024,365);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const lettering=new T.MeshStandardMaterial({name:'yaoliang-services-hall-lettering',map:texture,transparent:true,alphaTest:.15,roughness:.85});
 const[sx,sz]=point(0,.355);b.add(new T.PlaneGeometry(9.75,2.43),lettering,sx,1.7,sz,new T.Euler(0,yaw,0));
 const badge=new T.MeshStandardMaterial({name:'yaoliang-university-emblem',map:mats.textures.get('nju-emblem.png'),transparent:true,alphaTest:.25,roughness:.8});
 // The shared emblem is white linework with transparent areas. The real
 // service-hall plaque has a purple shield behind that linework.
 const shield=new T.Shape();shield.moveTo(-.3,.26);shield.lineTo(0,.24);shield.lineTo(.3,.26);shield.lineTo(.29,-.08);shield.quadraticCurveTo(.2,-.22,0,-.3);shield.quadraticCurveTo(-.2,-.22,-.29,-.08);shield.closePath();
 const[px,pz]=point(-1.62,.362);b.add(new T.ShapeGeometry(shield),mat('purple-emblem-backing',0x694270),px,2.49,pz,new T.Euler(0,yaw,0));
 const[bx,bz]=point(-1.62,.365);b.add(new T.PlaneGeometry(.64,.60),badge,bx,2.49,bz,new T.Euler(0,yaw,0));
 // Retain the previous arrival and vegetation exclusion record exactly.
 const[dx,dz]=point(0,1.5);doors.push({name:f.tags.name,x:dx,y:0,z:dz,yaw,width:3.8});
 return{id:f.id,name:f.tags.name,source:'Official VR gl110 f/l + campus map plan114; concealed mass and dimensions approximate',height,windows:1,roof:'flat',dormitory:false,frontage:[x,z,nx,nz],hall:{frame:{x,z,nx,nz,yaw},height,floor,recess,entryU,columns,parts,dimensions:'approximate',nanqingEntrance:'unverified'}};
}
