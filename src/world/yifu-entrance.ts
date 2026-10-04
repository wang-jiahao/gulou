import * as T from 'three';
import {Builder} from './geometry.ts';
import {planShape,type MapFeature} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {splitBuildingRoof} from './building-roof.ts';
import type {DoorRecord} from './building-entrances.ts';

/** gl-4-10 f shows daylight and another building through the central portal.
 * The plan fixes the footprint; entrance dimensions and hidden finishes are
 * approximate. Retain the old tower height until its storeys are verified. */
export function buildYifuEntrance(f:MapFeature,b:Builder,meshes:CollisionMesh[],cameraSolids:T.Object3D[],doors:DoorRecord[],height:number,wall:T.Material,roof:T.Material){
 const a=f.points[5],c=f.points[6],length=Math.hypot(c[0]-a[0],c[1]-a[1]);
 const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,nx=-(c[1]-a[1])/length,nz=(c[0]-a[0])/length,yaw=Math.atan2(nx,nz);
 const point=(u:number,v:number)=>[x+u*nz+v*nx,z-u*nx+v*nz];
 const local=(px:number,pz:number)=>[(px-x)*nz-(pz-z)*nx,(px-x)*nx+(pz-z)*nz];
 const polygon=f.points.map(([px,pz])=>local(px,pz)),clearance=6.2,halfWidth=3.1,porticoHalf=length/2,depth=3.2,floor=.42;
 const rear=Math.min(...polygon.map(p=>p[1]));
 const material=(name:string,color:number)=>new T.MeshStandardMaterial({name:`yifu-${name}`,color,roughness:.86});
 const stone=material('entrance-stone',0xb8b1a0),paving=material('pale-steps',0xc4c3b7),joints=material('stone-joints',0x7e8077),metal=material('dark-frame',0x39413e),pot=material('square-planters',0x858c87),soil=material('soil',0x453d30),trunk=material('cycad-trunk',0x665443),leaf=material('cycad-fronds',0x526b36);
 const glass=material('recessed-glass',0x536c6b);glass.roughness=.32;glass.metalness=.25;
 const lamp=material('ceiling-lights',0xe0daca);lamp.emissive.setHex(0xd3c6a0);lamp.emissiveIntensity=.18;
 const proxyMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
 const parts:{name:string;points:number[][];bottom:number;height:number}[]=[],obstacles:{name:string;u:number;v:number;width:number;depth:number;bottom:number;height:number}[]=[];
 function collider(geometry:T.BufferGeometry){const mesh=new T.Mesh(geometry,proxyMaterial);meshes.push(collisionMesh(mesh));cameraSolids.push(mesh);}
 const clip=(points:number[][],axis:number,value:number,side:number)=>{
  const out:number[][]=[];
  for(let i=0;i<points.length;i++){
   const p=points[i],q=points[(i+1)%points.length],pd=(p[axis]-value)*side,qd=(q[axis]-value)*side;
   if(pd>=0)out.push(p);
   if((pd<0&&qd>0)||(pd>0&&qd<0)){const t=pd/(pd-qd);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
  }
  return out;
 };
 function mass(name:string,points:number[][],bottom:number,h:number,mat:T.Material=wall){
  const world=points.map(([u,v])=>point(u,v));
  const geometry=new T.ExtrudeGeometry(planShape({points:world}),{depth:h,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2).translate(0,bottom,0);
  const uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);
  collider(geometry.clone());
  const surfaces=splitBuildingRoof(geometry);b.add(surfaces.walls,mat);b.add(surfaces.roof,bottom+h===height?roof:mat);geometry.dispose();
  parts.push({name,points:world,bottom,height:h});
 }
 function box(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material,solidName?:string){
  const[px,pz]=point(u,v);b.box(w,h,d,px,y,pz,mat,false,yaw);
  if(solidName){collider(new T.BoxGeometry(w,h,d).rotateY(yaw).translate(px,y,pz));obstacles.push({name:solidName,u,v,width:w,depth:d,bottom:y-h/2,height:h});}
 }
 mass('continuous-upper-storeys',polygon,clearance,height-clearance);
 for(const side of[-1,1]){
  mass(side<0?'ground-west-wing':'ground-east-wing',clip(polygon,0,side*porticoHalf,side),0,clearance);
  const inner=clip(clip(clip(polygon,0,side*porticoHalf,-side),0,side*halfWidth,side),1,-depth,-1);
  mass(side<0?'ground-west-inner':'ground-east-inner',inner,0,clearance,stone);
 }
 // One raised floor through the opening, with shallow steps at both ends.
 const floorPolygon=clip(clip(polygon,0,-halfWidth,1),0,halfWidth,-1);
 mass('passage-floor',floorPolygon,0,floor,paving);
 for(const side of[-1,1])box(side*(porticoHalf+halfWidth)/2,floor/2,-depth/2,porticoHalf-halfWidth,floor,depth,paving,'portico-floor');
 for(let i=0;i<3;i++){
  const h=.14*(i+1),d=(3-i)*.46;
  box(0,h/2,d/2,length,h,d,paving,'south-step');
  box(0,h/2,rear-d/2,halfWidth*2,h,d,paving,'north-step');
 }
 // Deep front columns and side glazing, leaving the centre unobstructed.
 for(const side of[-1,1]){
  const u=side*3.72;box(u,clearance/2,-.43,.96,clearance,.92,stone,'front-column');
  const gw=porticoHalf-halfWidth,gc=side*(porticoHalf+halfWidth)/2;
  box(gc,3.03,-depth+.035,gw-.12,5.2,.055,glass);
  for(let k=0;k<=3;k++)box(side*(halfWidth+k*gw/3),3.03,-depth+.09,.065,5.26,.075,metal);
  box(gc,4.46,-depth+.09,gw,.065,.075,metal);
  // Stone joints stay on the front and return of each pier.
  for(let y=.75;y<clearance;y+=.6){box(u,y,.036,.96,.018,.012,joints);for(const edge of[-1,1])box(u+edge*.486,y,-.43,.012,.018,.92,joints);}
  box(side*(halfWidth+.30),2.37,-depth+.07,.6,3.9,.22,stone);
 }
 box(0,5.01,-depth+.08,halfWidth*2,1.9,.22,metal,'passage-transom');
 box(0,5.48,-depth+.205,halfWidth*2-.12,.8,.035,glass);
 for(const u of[-2,-1,0,1,2])box(u,5.48,-depth+.235,.04,.8,.04,metal);
 // Grid soffit, with a few small recessed lights. No per-lamp shadow lights.
 box(0,6.29,.32,length+.3,.18,1,stone,'projecting-lintel');
 for(let u=-7;u<=7;u++)box(u,clearance-.012,-depth/2,.018,.018,depth,joints);
 for(let v=-depth;v<=.7;v+=.8)box(0,clearance-.012,v,length,.018,.018,joints);
 for(const u of[-5.6,0,5.6])for(const v of[-.7,-2.4]){const[px,pz]=point(u,v);b.add(new T.CylinderGeometry(.09,.09,.025,10),lamp,px,clearance-.026,pz);}
 // VR fixes the visible prefixes; the college's official site corroborates the
 // institution names. The last characters and calligraphy remain a reconstruction.
 const plates=[{u:-3.72,text:'南京大学终身教育学院',visiblePrefix:'南京大学终身教育学'},{u:3.72,text:'南京大学全国干部教育培训基地',visiblePrefix:'南京大学全国干部教育培训'}];
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=1024;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#b9a469';ctx.fillRect(0,0,256,1024);ctx.fillStyle='#302f24';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='58px "Kaiti SC","STKaiti",serif';
 plates.forEach((p,k)=>[...p.text].forEach((char,i)=>ctx.fillText(char,64+k*128,72+i*62,70)));
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const plateMaterial=new T.MeshStandardMaterial({name:'yifu-entrance-plates',map,roughness:.65});
 plates.forEach((p,k)=>{const geometry=new T.PlaneGeometry(.55,3.85),uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setX(i,(uv.getX(i)+k)/2);const[px,pz]=point(p.u,.05);b.add(geometry,plateMaterial,px,3.4,pz,new T.Euler(0,yaw,0));});
 for(const side of[-1,1]){
  const u=side*3.72,v=1.52;box(u,.31,v,1.06,.62,1.06,pot,'planter');box(u,.625,v,.86,.025,.86,soil);
  const[px,pz]=point(u,v);b.cylinder(new T.Vector3(px,.64,pz),new T.Vector3(px,1.45,pz),.15,.11,trunk,8);
  // Compact opaque fronds merge into one material batch, with no alpha layers.
  for(let j=0;j<12;j++){
   const theta=j*Math.PI/6,dx=Math.cos(theta),dz=Math.sin(theta),start=new T.Vector3(px,1.38,pz),mid=new T.Vector3(px+dx*.56,2.01,pz+dz*.56),end=new T.Vector3(px+dx*1.13,1.50,pz+dz*1.13);
   b.cylinder(start,mid,.025,.02,leaf,4);b.cylinder(mid,end,.02,.006,leaf,4);
   for(let k=1;k<8;k++)for(const wing of[-1,1]){
    const t=k/8,center=t<.5?start.clone().lerp(mid,t*2):mid.clone().lerp(end,(t-.5)*2),span=.23*Math.sin(t*Math.PI);
    const tip=center.clone().add(new T.Vector3(dx*.13-dz*span*wing,-.10,dz*.13+dx*span*wing));
    b.cylinder(center,tip,.028,.003,leaf,3);
   }
  }
 }
 // The existing navigation name remains available at the photographed entrance.
 doors.push({name:f.tags.name,x,y:floor,z,yaw,width:halfWidth*2});
 return{source:'official VR gl-4-10 f (2304px) / gl-4-02 r + user plan',dimensions:'approximate',heightRetained:height,frontage:[x,z,nx,nz],localFrame:{x,z,nx,nz,yaw},passage:{halfWidth,rear,clearance:4.06,floor},portico:{halfWidth:porticoHalf,depth,ceiling:clearance},plates:plates.map(p=>({text:p.text,visiblePrefix:p.visiblePrefix,institutionSource:'https://slle.nju.edu.cn/sy/ldpxxm/gbjypx/index.html',completeTextPhotographed:false})),parts,obstacles,local};
}
