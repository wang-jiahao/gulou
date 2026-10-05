import * as T from 'three';
import {buildDiningLowerEntries} from './nanyuan-dining-lower.ts';
import {Builder} from './geometry.ts';
import {planShape,type MapFeature} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {splitBuildingRoof} from './building-roof.ts';
import type {DoorRecord} from './building-entrances.ts';

/** gl110/note145 and gl115/note145 identify this as the dining complex.
 * gl124 b fixes the north elevation; gl110 b is its east gallery, not plan114.
 * Retain the mapped outline. Heights, setbacks and concealed faces are estimates. */
export function buildNanyuanDining(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const a=f.points[0],c=f.points[1],length=Math.hypot(c[0]-a[0],c[1]-a[1]);
 const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,nx=-(c[1]-a[1])/length,nz=(c[0]-a[0])/length,yaw=Math.atan2(nx,nz);
 const point=(u:number,v:number)=>[x+u*nz+v*nx,z-u*nx+v*nz];
 const local=(px:number,pz:number)=>[(px-x)*nz-(pz-z)*nx,(px-x)*nx+(pz-z)*nz];
 const polygon=f.points.map(([px,pz])=>local(px,pz));
 const height=18,ceiling=5,floor=1.05,depth=4.2,entryU=-3;
 const mat=(name:string,color:number)=>new T.MeshStandardMaterial({name:`nanyuan-dining-${name}`,color,roughness:.85});
 const wall=mat('pale-cladding',0xd3d6d0),stone=mat('steps',0xa8afaa),roof=mat('roof',0x858b87),metal=mat('silver-frames',0xa1b3b4),dark=mat('recess',0x334746),glass=mat('blue-grey-glazing',0x587780);
 glass.roughness=.3;glass.metalness=.3;metal.roughness=.45;metal.metalness=.55;
 const proxyMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
 const parts:{name:string;bottom:number;height:number}[]=[],obstacles:{name:string;u:number;v:number;width:number;depth:number;bottom:number;height:number}[]=[];
 const collider=(g:T.BufferGeometry)=>{const m=new T.Mesh(g,proxyMaterial);meshes.push(collisionMesh(m));camera.push(m);};
 const clip=(points:number[][],axis:number,value:number,side:number)=>{
  const out:number[][]=[];
  for(let i=0;i<points.length;i++){
   const p=points[i],q=points[(i+1)%points.length],pd=(p[axis]-value)*side,qd=(q[axis]-value)*side;
   if(pd>=0)out.push(p);
   if((pd<0&&qd>0)||(pd>0&&qd<0)){const t=pd/(pd-qd);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
  }return out;
 };
 function mass(name:string,points:number[][],bottom:number,h:number,holes:number[][][]=[],material:T.Material=wall){
  const shape=planShape({points:points.map(([u,v])=>point(u,v)),holes:holes.map(r=>r.map(([u,v])=>point(u,v)))});
  const geometry=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2).translate(0,bottom,0);
  collider(geometry.clone());const surfaces=splitBuildingRoof(geometry);b.add(surfaces.walls,material);b.add(surfaces.roof,bottom>=ceiling?roof:material);geometry.dispose();parts.push({name,bottom,height:h});
 }
 function box(u:number,y:number,v:number,w:number,h:number,d:number,material:T.Material,name?:string){
  const[px,pz]=point(u,v);b.box(w,h,d,px,y,pz,material,false,yaw);
  if(name){collider(new T.BoxGeometry(w,h,d).rotateY(yaw).translate(px,y,pz));obstacles.push({name,u,v,width:w,depth:d,bottom:y-h/2,height:h});}
 }
 // Use the mapped east edge, rather than assuming the two elevations are
 // perpendicular. s runs north along the gallery; t points out to the east.
 const ea=f.points[3],ec=f.points[0],eastLength=Math.hypot(ec[0]-ea[0],ec[1]-ea[1]);
 const ex=(ea[0]+ec[0])/2,ez=(ea[1]+ec[1])/2,enx=-(ec[1]-ea[1])/eastLength,enz=(ec[0]-ea[0])/eastLength,eastYaw=Math.atan2(enx,enz);
 const eastPoint=(s:number,t:number)=>[ex+s*enz+t*enx,ez-s*enx+t*enz];
 const eastLocal=(u:number,v:number)=>{const[px,pz]=point(u,v);return[(px-ex)*enz-(pz-ez)*enx,(px-ex)*enx+(pz-ez)*enz];};
 const eastClip=(points:number[][],axis:number,value:number,side:number)=>clip(points.map(([u,v])=>eastLocal(u,v)),axis,value,side).map(([s,t])=>local(...eastPoint(s,t) as [number,number]));
 const galleryHalf=18,galleryDepth=5.2,galleryFloor=1.65,galleryLevels=[5,9.06,13.12];
 function eastBox(s:number,y:number,t:number,w:number,h:number,d:number,material:T.Material,name?:string){
  const[px,pz]=eastPoint(s,t);b.box(w,h,d,px,y,pz,material,false,eastYaw);
  if(name){collider(new T.BoxGeometry(w,h,d).rotateY(eastYaw).translate(px,y,pz));parts.push({name,bottom:y-h/2,height:h});}
 }
 function recessedMass(name:string,points:number[][],bottom:number,h:number,holes:number[][][]=[]){
  mass(`${name}-north`,eastClip(points,0,galleryHalf,1),bottom,h);
  mass(`${name}-south`,eastClip(points,0,-galleryHalf,-1),bottom,h);
  const middle=eastClip(eastClip(points,0,-galleryHalf,1),0,galleryHalf,-1);
  mass(`${name}-core`,eastClip(middle,1,-galleryDepth,-1),bottom,h,holes);
 }
 const courtyard=[[-19,-13],[8,-13],[8,-32],[-19,-32]];
 recessedMass('upper-ring',polygon,ceiling,height-ceiling,[courtyard]);
 recessedMass('ground-rear',clip(polygon,1,-depth,-1),0,ceiling);
 const front=clip(polygon,1,-depth,1);
 mass('east-end',clip(front,0,-24,-1),0,ceiling);
 mass('west-stair-wing',clip(front,0,17,1),0,ceiling);
 const portico=clip(clip(front,0,-24,1),0,17,-1);
 mass('raised-portico',portico,0,floor,[],stone);
 // Recessed glazing remains physically closed. The photographed portico is
 // accessible, but there is no evidence for a through route across this block.
 box(-3.5,3.02,-depth+.03,41,3.9,.06,glass);
 for(let u=-24;u<=17;u+=2.05)box(u,3.02,-depth+.08,.07,3.9,.08,metal);
 box(-3.5,3.9,-depth+.09,41,.10,.10,metal);
 for(const u of[-23,-15,-7,1,9,16])box(u,ceiling/2,-.5,.68,ceiling,.78,wall,'portico-column');
 for(let i=0;i<7;i++){
  const h=.15*(i+1),d=(7-i)*.4;
  box(entryU,h/2,d/2,14,h,d,stone,'north-step');
 }
 // The handrails follow the rise, leaving two broad stair lanes.
 for(const u of[entryU-6.6,entryU,entryU+6.6]){
  const [ax,az]=point(u,2.65),[bx,bz]=point(u,-.7);
  b.cylinder(new T.Vector3(ax,1.04,az),new T.Vector3(bx,1.96,bz),.038,.038,metal,6);
  for(const v of[2.6,1.4,.2,-.7]){const h=v>0?.15*(7-Math.floor(v/.4)):floor;box(u,h+.44,v,.055,.88,.055,metal);}
 }
 // Three continuous glazed storeys, interrupted by the broad west stair tower
 // and the blank east end panel seen in the aerial photograph.
 const rows=[7.02,11.08,15.14],bands=[[-24,17],[26,32]];
 for(const [lo,hi]of bands){
  for(const y of rows){
   box((lo+hi)/2,y,.045,hi-lo,3.65,.07,glass);
   box((lo+hi)/2,y-1.9,.19,hi-lo,.22,.42,wall);
   box((lo+hi)/2,y+1.77,.19,hi-lo,.12,.35,metal);
   box((lo+hi)/2,y-.47,.145,hi-lo,.055,.18,metal);
   const count=Math.ceil((hi-lo)/1.65);
   for(let j=0;j<=count;j++)box(lo+j*(hi-lo)/count,y,.135,.055,3.7,.16,metal);
  }
 }
 box(-26.6,9,-.02,4.5,18,.28,wall);
 box(21.5,10.1,-.02,9,20.2,.28,wall,'west-tower-front');
 // Stair windows and horizontal ventilation slots are separate from the
 // main curtain wall. Their exact spacing is reconstructed from gl124 b.
 for(const y of[2.35,6.0,9.8,13.6,17.4]){
  box(23.6,y,.15,1.9,2.25,.07,dark);box(23.6,y,.20,1.68,2.03,.045,glass);
  box(23.6,y-.05,.24,1.7,.06,.07,metal);
 }
 for(let y=5.1;y<19.5;y+=.5)box(18.15,y,.155,1.02,.16,.045,dark);
 // A low roof ring with an open rectangular light court and cross-beams.
 for(let e=0;e<polygon.length;e++){
  const p=polygon[e],q=polygon[(e+1)%polygon.length],mid=point((p[0]+q[0])/2,(p[1]+q[1])/2),p0=point(...p as [number,number]),p1=point(...q as [number,number]);
  const w=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]),angle=Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]);
  b.box(w+.2,.45,.42,mid[0],height+.2,mid[1],wall,false,angle);
 }
 for(const v of[-13,-32])box(-5.5,height+.48,v,27,.95,.3,wall,'light-court-rim');
 for(const u of[-19,8])box(u,height+.48,-22.5,.3,.95,19,wall,'light-court-rim');
 for(const u of[-12,-4,4])box(u,height-.18,-22.5,.5,.38,19,wall,'light-court-beam');
 // Muted service boxes are static and share existing material batches.
 for(const u of[-25,-15,0,13]){box(u,height+.55,-5,2.1,1.1,1.8,roof,'roof-service');for(let j=0;j<5;j++)box(u-.8+j*.4,height+.55,-4.085,.08,.85,.045,dark);}
 box(21.5,19,-8,9,2,7,wall,'stair-roof');
 // gl110 b: open recessed galleries, broad pale fascia boards, silver rails
 // and full-height round columns. These are actual openings in both meshes.
 // Keep the upper deck, with the two lower vestibules clear underneath.
 eastBox(0,galleryFloor-.18,-galleryDepth/2,36,.36,galleryDepth,stone,'east-landing');
 eastBox(0,.645,-galleryDepth/2,26.6,1.29,galleryDepth,stone,'east-landing-core');
 eastBox(0,.645,-3.6,36,1.29,3.2,stone,'east-landing-rear');
 for(const s of[-17.95,17.95])eastBox(s,.645,-1,.1,1.29,2,stone,'east-landing-edge');
 for(const level of [...galleryLevels,height]){
  eastBox(0,level-.18,-galleryDepth/2,36,.36,galleryDepth,wall,'east-gallery-slab');
  if(level===height)continue;
  eastBox(0,level+.22,-.12,36,.78,.24,wall,'east-gallery-parapet');
  for(const rail of[.70,.91,1.12])eastBox(0,level+rail,-.1,36,.045,.05,metal);
  for(let s=-18;s<=18;s+=1.5)eastBox(s,level+.83,-.1,.045,.65,.05,metal);
 }
 for(const level of [galleryFloor,...galleryLevels]){
  const top=level===galleryFloor?5:level===13.12?18:level+4.06;
  eastBox(0,(level+top)/2,-galleryDepth+.025,36,top-level-.25,.05,glass);
  for(let s=-18;s<=18;s+=1.8)eastBox(s,(level+top)/2,-galleryDepth+.075,.06,top-level-.25,.10,metal);
  eastBox(0,level+.82,-galleryDepth+.085,36,.08,.12,metal);
 }
 // The high-resolution gl110 b photograph resolves the southern gallery
 // door's six characters. Keep its inset glazing closed; portal dimensions
 // and typeface are approximate, and the partly hidden banner is omitted.
 const restaurantS=-12,portalWidth=6.2,headerY=galleryFloor+2.64;
 eastBox(restaurantS,headerY,-galleryDepth+.13,portalWidth,.68,.18,wall);
 for(const side of[-1,1])eastBox(restaurantS+side*(portalWidth/2-.16),galleryFloor+1.2,-galleryDepth+.13,.32,2.4,.18,wall);
 for(const offset of[-2.68,0,2.68])eastBox(restaurantS+offset,galleryFloor+1.15,-galleryDepth+.14,.065,2.3,.12,metal);
 eastBox(restaurantS,galleryFloor+2.29,-galleryDepth+.14,5.42,.065,.12,metal);
 for(const offset of[-.14,.14])eastBox(restaurantS+offset,galleryFloor+1.08,-galleryDepth+.23,.035,.42,.05,metal);
 const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=144;
 const signContext=signCanvas.getContext('2d')!;
 signContext.fillStyle='#3b534c';signContext.font='102px "Kaiti SC","STKaiti",serif';signContext.textAlign='center';signContext.textBaseline='middle';
 [...'第二学生餐厅'].forEach((letter,i)=>signContext.fillText(letter,100+i*164,76));
 const signTexture=new T.CanvasTexture(signCanvas);signTexture.colorSpace=T.SRGBColorSpace;
 const signMaterial=new T.MeshStandardMaterial({name:'nanyuan-dining-second-student-restaurant-lettering',map:signTexture,transparent:true,alphaTest:.1,roughness:.85});
 const[signX,signZ]=eastPoint(restaurantS,-galleryDepth+.226);
 b.add(new T.PlaneGeometry(5.3,.57),signMaterial,signX,headerY,signZ,new T.Euler(0,eastYaw,0));
 const eastColumns=[-16,-8,0,8,16];
 for(const s of eastColumns){
  const[px,pz]=eastPoint(s,.10),bottom=galleryFloor,top=height+.18;
  b.cylinder(new T.Vector3(px,bottom,pz),new T.Vector3(px,top,pz),.5,.5,metal,12);
  collider(new T.CylinderGeometry(.5,.5,top-bottom,12).translate(px,(top+bottom)/2,pz));
  for(let y=bottom+2;y<top;y+=2)b.add(new T.CylinderGeometry(.51,.51,.045,12),dark,px,y,pz);
 }
 // The central stair retains its independent route to the upper gallery.
 for(let i=0;i<11;i++){
  const h=.15*(i+1),d=(11-i)*.36;
  eastBox(0,h/2,d/2,26,h,d,stone,'east-step');
 }
 for(const s of[-12.7,-4.3,4.3,12.7]){
  const[ax,az]=eastPoint(s,3.85),[bx,bz]=eastPoint(s,-.5);
  b.cylinder(new T.Vector3(ax,1.03,az),new T.Vector3(bx,galleryFloor+.92,bz),.035,.035,metal,6);
  for(const t of[3.85,2.7,1.5,.3,-.5]){const rise=t>0?Math.max(.15,.15*(11-Math.floor(t/.36))):galleryFloor;eastBox(s,rise+.44,t,.055,.88,.055,metal);}
 }
 for(const s of[-15.6,15.6]){
  eastBox(s,galleryFloor+.47,.06,4.8,.94,.16,wall,'east-landing-side');
  eastBox(s,galleryFloor+1.09,.06,4.8,.06,.07,metal);
 }
 // Until their own reference pass, side/rear elevations are explicitly
 // approximate horizontal glazing, without adding unsupported entrances.
 for(let edge=1;edge<3;edge++){
  const p=polygon[edge],q=polygon[(edge+1)%polygon.length],p0=point(...p as [number,number]),p1=point(...q as [number,number]);
  const w=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]),ex=(p0[0]+p1[0])/2,ez=(p0[1]+p1[1])/2,enx=-(p1[1]-p0[1])/w,enz=(p1[0]-p0[0])/w,angle=Math.atan2(enx,enz);
  for(const y of rows){
   b.box(w-2,3.2,.05,ex+enx*.04,y,ez+enz*.04,glass,false,angle);
   for(let u=-w/2+1;u<w/2-1;u+=1.8)b.box(.07,3.2,.10,ex+u*enz+enx*.08,y,ez-u*enx+enz*.08,metal,false,angle);
  }
 }
 // Keep the original arrival point/plant exclusion stable for the rest of
 // campus; the accessible landing is reached by the broad north steps.
 const[dx,dz]=point(0,1.5);doors.push({name:f.tags.name,x:dx,y:0,z:dz,yaw,width:7.2});
 const lowerEntries=buildDiningLowerEntries(f,b,meshes,camera,stone,metal,glass);
 return{id:f.id,name:f.tags.name,source:'Official VR gl110/gl115 note145 + gl124 b north aerial; official map footprint; dimensions approximate',height,windows:3,roof:'flat light court',dormitory:false,frontage:[x,z,nx,nz],dining:{source:'gl124 b / gl110 b',dimensions:'approximate',frame:{x,z,nx,nz,yaw},floor,ceiling,depth,entryU,rows,courtyard,parts,obstacles,eastGallery:{frame:{x:ex,z:ez,nx:enx,nz:enz,yaw:eastYaw},half:galleryHalf,depth:galleryDepth,floor:galleryFloor,levels:galleryLevels,columns:eastColumns,lowerCanopiesPending:false,lowerEntries}}};
}
