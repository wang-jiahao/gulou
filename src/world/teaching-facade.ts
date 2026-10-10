import * as T from 'three';
import {Builder,rng} from './geometry.ts';
import {addTeachingWelcome} from './teaching-welcome.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {addBuildingLettering} from './building-lettering.ts';
import type {DoorRecord} from './building-entrances.ts';

/** Grey running-bond masonry, generated locally; no reference photo texture. */
export function teachingBrick(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const c=canvas.getContext('2d')!,random=rng(3210);c.fillStyle='#72726c';c.fillRect(0,0,512,512);
 for(let row=0;row<32;row++)for(let col=-1;col<9;col++){
  const shade=Math.floor(126+random()*26),x=col*64+(row%2)*32;
  c.fillStyle=`rgb(${shade+7},${shade+5},${shade})`;c.fillRect(x+1,row*16+1,62,14);
  c.fillStyle='rgba(205,202,187,.12)';c.fillRect(x+1,row*16+1,62,1);
 }
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;
 return new T.MeshStandardMaterial({name:'teaching-fine-grey-brick',map,roughness:.92});
}

/** Front matched to the user's photograph and official gl-2-10-f. All dimensions
 * are approximate. The walkable portico projects beyond the closed solid core. */
export function teachingFacade(b:Builder,meshes:CollisionMesh[],cameraSolids:T.Object3D[],doors:DoorRecord[],name:string,x:number,z:number,yaw:number,emblemTexture?:T.Texture){
 const mat=(name:string,color:number,roughness=.86,metalness=0)=>new T.MeshStandardMaterial({name:`teaching-${name}`,color,roughness,metalness});
 const stone=mat('pale-stone',0xd0d0c5),edge=mat('stone-edge',0xb6b8ae),inset=mat('inset-stone',0xc2c4bb),joint=mat('stone-joint',0x92988e);
 const frame=mat('green-grey-frame',0x606e68,.60),recess=mat('window-recess',0x3d4843),glass=mat('glazing',0x7b9497,.30,.16),doorGlass=mat('door-glazing',0x344c43,.40,.15),silver=mat('silver-lettering',0xffffff,.55,.08);
 const bronze=mat('lamp-metal',0x505749,.48,.5),lamp=new T.MeshStandardMaterial({name:'teaching-warm-lantern',color:0xe4d6a1,emissive:0xba9e53,emissiveIntensity:.18,roughness:.65});
 const nx=Math.sin(yaw),nz=Math.cos(yaw),point=(u:number,y:number,v:number)=>new T.Vector3(x+u*nz+v*nx,y,z-u*nx+v*nz);
 const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string)=>{
  const p=point(u,y,v);b.box(w,h,d,p.x,p.y,p.z,m,false,yaw);
  if(kind){const proxy=new T.Mesh(new T.BoxGeometry(w,h,d));proxy.position.copy(p);proxy.rotation.y=yaw;meshes.push(collisionMesh(proxy));cameraSolids.push(proxy);boxes.push({kind,u,y,v,w,h,d});}
 };
 const beam=(u:number,y:number,v:number,a:number,yy:number,vv:number,r:number,m:T.Material)=>b.cylinder(point(u,y,v),point(a,yy,vv),r,r,m,8);
 // Wide landing, eight shallow steps, and sloping stone cheeks.
 box(0,.60,2.04,14.8,1.20,3.88,stone,'landing');
 for(let i=0;i<8;i++){const h=(i+1)*.15,v=4.12+(7-i)*.42;box(0,h/2,v,14.15,h,.44,stone,'step');box(0,h-.035,v+.19,14.15,.035,.035,edge);}
 for(const side of[-1,1]){
  const u=side*7.4,shape=new T.Shape();shape.moveTo(3.91,0);shape.lineTo(7.38,0);shape.lineTo(7.38,.70);shape.lineTo(3.91,1.70);shape.closePath();
  // Shape coordinates are (forward,height), extruded across the stair width.
  const geo=new T.ExtrudeGeometry(shape,{depth:.65,bevelEnabled:false});
  const positions=geo.getAttribute('position');for(let i=0;i<positions.count;i++){const p=point(u+positions.getZ(i)-.325,positions.getY(i),positions.getX(i));positions.setXYZ(i,p.x,p.y,p.z);}geo.computeVertexNormals();
  const proxy=new T.Mesh(geo.clone());meshes.push(collisionMesh(proxy));cameraSolids.push(proxy);b.add(geo,stone);
  beam(u,1.73,3.91,u,.73,7.38,.10,edge);
 }
 // Four substantial square columns. Capitals broaden into stepped brackets.
 const columns=[-6.45,-2.15,2.15,6.45];
 for(const u of columns){
  box(u,3.36,3.02,.95,4.32,.97,stone,'column');
  box(u,1.30,3.02,1.10,.20,1.12,edge);box(u,1.46,3.02,1.01,.13,1.04,stone);
  box(u,5.11,3.02,1.27,.86,1.05,stone);box(u,5.47,3.02,1.48,.22,1.11,stone);
  for(const y of[2.5,3.6,4.6])box(u,y,3.51,.94,.014,.012,joint);
  // Cylindrical wall lanterns, including end caps and narrow cage ribs.
  box(u,3.75,3.55,.20,.90,.13,bronze);
  b.cylinder(point(u,3.38,3.72),point(u,4.10,3.72),.15,.15,lamp,12);
  for(const y of[3.37,3.44,4.05,4.12])b.cylinder(point(u,y-.025,3.72),point(u,y+.025,3.72),.17,.17,bronze,12);
  for(let k=0;k<6;k++){const a=k*Math.PI/3;beam(u+.147*Math.sin(a),3.41,3.72+.147*Math.cos(a),u+.147*Math.sin(a),4.08,3.72+.147*Math.cos(a),.012,bronze);}
 }
 box(0,5.64,2.0,15.0,.42,4.55,stone,'canopy');box(0,5.93,2.03,15.2,.18,4.61,edge);
 box(0,5.32,3.05,13.9,.22,1.05,stone);
 // Rear wall, pier bands and three tall closed double doors. Central record
 // stays first because the map and proximity hint use the first building door.
 box(0,3.30,.15,13.5,4.2,.20,stone);
 for(const u of columns){box(u,3.35,.32,1.03,4.3,.42,stone);box(u,5.08,1.65,1.06,.55,2.72,stone);}
 for(const u of[0,-4.3,4.3]){
  const w=2.78,bottom=1.20,h=3.46,y=bottom+h/2;
  box(u,y,.30,w+.22,h+.18,.24,recess);box(u,y,.45,w,h,.12,frame,'closed-door');
  for(const s of[-1,1]){
   const center=u+s*w/4;box(center,2.57,.525,w/2-.15,2.20,.028,doorGlass);box(center,1.61,.55,w/2-.19,.62,.028,frame);
   for(const dx of[-.32,0,.32])box(center+dx,2.92,.557,.034,1.37,.035,frame);
   for(const yy of[2.28,2.94,3.59])box(center,yy,.557,w/2-.14,.044,.035,frame);
   box(u+s*.13,2.40,.60,.045,.37,.08,bronze);
  }
  box(u,4.15,.54,w-.14,.77,.027,doorGlass);box(u,3.73,.57,w,.08,.07,frame);
  for(let k=1;k<8;k++)box(u-w/2+k*w/8,4.16,.58,.035,.77,.05,frame);
  box(u,4.19,.58,w,.04,.05,frame);box(u,y,.58,.065,h,.07,frame);
  const p=point(u,bottom,.51);doors.push({name,x:p.x,y:bottom,z:p.z,yaw,width:w});
 }
 // Three window strips, with real inset panels between the rows.
 for(const u of[-4.3,0,4.3]){
  box(u,10.70,.14,3.48,9.56,.22,stone);
  for(const y of[6.99,10.22,13.45]){
   const w=2.80,h=2.35;
   box(u,y,.29,w+.16,h+.15,.14,recess);box(u,y,.38,w,h,.045,glass);
   for(const s of[-1,1]){box(u+s*w/2,y,.43,.065,h,.12,frame);box(u,y+s*h/2,.43,w+.10,.065,.12,frame);}
   box(u,y+.53,.43,w,.06,.12,frame);box(u,y-.20,.43,.075,1.85,.12,frame);
   for(const s of[-1,1])box(u+s*.58,y+.88,.43,.045,.62,.12,frame);
   box(u,y-h/2-.10,.43,w+.31,.15,.47,stone);
   if(y<13){const py=y+1.67;box(u,py,.275,w+.07,.77,.17,stone);box(u,py,.37,w-.18,.50,.025,inset);for(const s of[-1,1]){box(u+s*(w-.18)/2,py,.39,.018,.50,.016,joint);box(u,py+s*.25,.39,w-.18,.018,.016,joint);}}
  }
 }
 for(const u of columns)box(u,10.77,.38,.78,9.45,.65,stone);
 // Bracketed cornice and a low parapet in front of the crown windows.
 box(0,15.51,.58,14.3,.42,1.42,stone);box(0,15.80,.68,14.5,.16,1.55,edge);
 for(const u of columns){box(u,15.16,.65,.30,.55,1.17,stone);box(u,14.94,.42,.30,.22,.73,stone);}
 for(const u of[-4.3,0,4.3]){
  box(u,16.10,.78,3.48,.42,.24,stone);box(u,16.38,.81,3.62,.10,.35,edge);
  for(const dx of[-1.2,1.2])box(u+dx,16.48,.71,.16,.22,.18,stone);
 }
 // Three arched windows share a spring line; the centre arch is taller/wider.
 const arches=[];
 for(const u of[-4.3,0,4.3]){
  const r=u===0?1.55:1.25,base=16.27,spring=17.40,trim=.25;
  const shape=(radius:number)=>{const s=new T.Shape();s.moveTo(-radius,0);s.lineTo(radius,0);s.lineTo(radius,spring-base);s.absarc(0,spring-base,radius,0,Math.PI,false);s.closePath();return s;};
  const p=point(u,base,.23);b.add(new T.ShapeGeometry(shape(r+trim)),stone,p.x,p.y,p.z,new T.Euler(0,yaw,0));
  const q=point(u,base,.28);b.add(new T.ShapeGeometry(shape(r)),glass,q.x,q.y,q.z,new T.Euler(0,yaw,0));
  for(const dx of[-r,0,r])box(u+dx,(base+spring)/2,.34,.045,spring-base,.08,frame);
  box(u,spring,.34,2*r,.065,.08,frame);box(u,16.70,.34,2*r,.04,.08,frame);
  for(const t of[Math.PI/4,Math.PI/2,Math.PI*3/4])beam(u,spring,.34,u+r*Math.cos(t),spring+r*Math.sin(t),.34,.022,frame);
  for(const radius of[r,r*.51]){const points=[];for(let i=0;i<=24;i++){const a=i*Math.PI/24;points.push(point(u+radius*Math.cos(a),spring+radius*Math.sin(a),.34));}b.line(points,.023,frame,6);}
  arches.push({u,radius:r,base,spring,top:spring+r});
 }
 // Map the narrow shoulder details onto the two sloping footprint faces.
 // Keeping their normal distinct from the central facade prevents floating sills.
 const shoulder=8.33;
 const shoulderFrame=(u:number,y:number,offset:number)=>{
  const slope=u<0?1.1239/3.7999:-1.1061/3.0367,turn=-Math.atan(slope);
  return{p:point(u+Math.sin(turn)*offset,y,slope*(u-Math.sign(u)*6.695)+Math.cos(turn)*offset),yaw:yaw+turn};
 };
 const shoulderBox=(u:number,y:number,offset:number,w:number,h:number,d:number,m:T.Material)=>{
  const f=shoulderFrame(u,y,offset);b.box(w,h,d,f.p.x,f.p.y,f.p.z,m,false,f.yaw);
 };
 for(const side of[-1,1]){
  const u=side*shoulder;
  for(const y of[7.04,10.27,13.50]){
   shoulderBox(u+.38*side,y,.04,.87,2.17,.15,recess);shoulderBox(u+.38*side,y,.13,.79,2.04,.03,glass);
   shoulderBox(u+.38*side,y,.18,.045,2.04,.07,frame);shoulderBox(u+.38*side,y+.39,.18,.79,.05,.07,frame);
   for(const s of[-1,1])shoulderBox(u+.38*side,y+s*1.14,.12,1.19,.16,.37,stone);
  }
  const outer=side<0?-10.4949:9.7317,inner=side*6.695,length=Math.hypot(outer-inner,side<0?1.1239:1.1061);
  shoulderBox((outer+inner)/2,17.31,.04,length+.08,.19,.38,stone);
 }
 // Reconstruct the square-line emblem as an approximate geometric mark.
 const emblem=document.createElement('canvas');emblem.width=emblem.height=256;const ec=emblem.getContext('2d')!;
 ec.strokeStyle='#ffffff';ec.lineWidth=14;
 for(const [a,c,d,e]of [[35,35,220,35],[220,35,220,220],[220,220,35,220],[35,220,35,35],[35,87,170,87],[87,35,87,170],[87,170,220,170],[170,87,170,220],[121,35,121,132],[121,132,35,132],[170,35,170,57],[35,170,60,170],[121,170,121,220],[170,121,220,121]]){ec.beginPath();ec.moveTo(a,c);ec.lineTo(d,e);ec.stroke();}
 // Alpha-tested cutouts keep the empty canvas from casting a rectangular shadow.
 const et=new T.CanvasTexture(emblem);et.colorSpace=T.SRGBColorSpace;const em=new T.MeshStandardMaterial({name:'teaching-square-emblem-approximation',map:et,alphaTest:.4,roughness:.8});
 for(const side of[-1,1]){
  const ef=shoulderFrame(side*shoulder,16.38,.16);b.add(new T.PlaneGeometry(1.40,1.40),em,ef.p.x,ef.p.y,ef.p.z,new T.Euler(0,ef.yaw,0));
 }
 const label=document.createElement('canvas');label.width=128;label.height=512;const lc=label.getContext('2d')!;lc.fillStyle='#ffffff';lc.font='104px "Kaiti SC","STKaiti",serif';lc.textAlign='center';lc.textBaseline='middle';['郑','钢','楼'].forEach((char,i)=>lc.fillText(char,64,78+i*166));
 const lt=new T.CanvasTexture(label);lt.colorSpace=T.SRGBColorSpace;const lm=silver.clone();lm.name='teaching-zhenggang-lettering';lm.map=lt;lm.alphaTest=.4;
 const lf=shoulderFrame(7.68,13.25,.20);b.add(new T.PlaneGeometry(.96,3.10),lm,lf.p.x,lf.p.y,lf.p.z,new T.Euler(0,lf.yaw,0));
 // Photo shows eight silver characters across the crown; official school
 // history confirms the wording. Calligraphy and dimensions remain approximate.
 const motto='嚴謹求實勤奮創新',crown=document.createElement('canvas');crown.width=2048;crown.height=256;
 const cc=crown.getContext('2d')!;cc.fillStyle='#ffffff';cc.font='210px "Kaiti SC","STKaiti",serif';cc.textAlign='center';cc.textBaseline='middle';
 [...motto].forEach((char,i)=>cc.fillText(char,128+i*256,128));
 const ct=new T.CanvasTexture(crown);ct.colorSpace=T.SRGBColorSpace;
 const cm=silver.clone();cm.name='teaching-crown-motto';cm.map=ct;cm.alphaTest=.4;
 const cp=point(0,19.48,.24);b.add(new T.PlaneGeometry(12.1,1.13),cm,cp.x,cp.y,cp.z,new T.Euler(0,yaw,0));
 const letterPoint=point(0,6.02,4.03),lettering=addBuildingLettering(b,'teaching',letterPoint.x,letterPoint.y,letterPoint.z,9.50,yaw,mat('gold-sign',0xe3bd60,.52,.25));
 const welcome=addTeachingWelcome(b,meshes,cameraSolids,x,z,yaw,emblemTexture);
 return{lettering,facade:{welcome,source:'user photograph phase96 teaching-zhenggang + official VR gl-2-10-f; dimensions, calligraphy and emblem approximate',columns:columns.map(u=>({u,v:3.02,width:.95,base:1.2,top:5.52})),boxes,arches,windows:9,doorBays:3,porticoDepth:3.88,platformHeight:1.2,crownInscription:motto,crownWordingSource:'https://scit.nju.edu.cn/36/eb/c10985a210667/pagem.htm'}};
}
