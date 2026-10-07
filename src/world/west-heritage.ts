import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {splitBuildingRoof} from './building-roof.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

/** User entrance photos, NJU Archives' southwest-building history and the
 * registered plan. Obscured elevations and registered dimensions approximate. */
export function buildWestHeritage(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const law=f.id==='plan-51',name=law?'西南楼（法学院）':'健忠楼',height=law?14.2:7.9;
 const mat=(label:string,color:number)=>new T.MeshStandardMaterial({name:`${f.id}-${label}`,color,roughness:.9});
 const wall=mat('grey-brick',0xffffff),stone=mat('pale-stone',0xc8c4b4),plaster=mat('cream-plaster',0xd5d2c5),base=mat('dark-base',0x656661),wood=mat('red-doors',0x682b30),frame=mat('window-grid',0x303b37),glass=mat('window-glass',0x567272),tile=mat('grey-tile',0x515956),gold=mat('unreadable-brass-plaques',0xb19a63);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#b4b4a8';ctx.fillRect(0,0,256,256);
 for(let row=0;row<12;row++)for(let col=-1;col<5;col++){const c=137+(row*13+col*7+40)%17;ctx.fillStyle=`rgb(${c},${c+2},${c-4})`;ctx.fillRect(col*64+(row%2)*32+1,row*256/12+1,62,256/12-2);}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;wall.map=texture;
 const solid=(g:T.BufferGeometry,x=0,y=0,z=0,yaw=0)=>{const mesh=new T.Mesh(g);mesh.position.set(x,y,z);mesh.rotation.y=yaw;meshes.push(collisionMesh(mesh));camera.push(mesh);};
 const body=new T.ExtrudeGeometry(planShape(f),{depth:height,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);solid(body.clone());
 const surfaces=splitBuildingRoof(body),p=surfaces.walls.getAttribute('position'),n=surfaces.walls.getAttribute('normal'),uv=surfaces.walls.getAttribute('uv');
 for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)*n.getZ(i)-p.getZ(i)*n.getX(i))/1.15,p.getY(i)/1.15);
 b.add(surfaces.walls,wall);surfaces.roof.dispose();body.dispose();
 const edges=f.points.map(([x,z],i)=>{const[xx,zz]=f.points[(i+1)%f.points.length],len=Math.hypot(xx-x,zz-z),mx=(x+xx)/2,mz=(z+zz)/2;let nx=-(zz-z)/len,nz=(xx-x)/len;if(insidePolygon(mx+nx*.4,mz+nz*.4,f)){nx=-nx;nz=-nz;}return {i,len,x:mx,z:mz,nx,nz,yaw:Math.atan2(nx,nz)};});
 const front=law?10:0,e=edges[front],point=(u:number,v:number)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz];
 let windows=0;
 for(const a of edges){
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>b.box(w,h,d,a.x+u*a.nz+v*a.nx,y,a.z-u*a.nx+v*a.nz,m,false,a.yaw,1.15);
  put(0,law?2.12:.67,.06,a.len,law?4.24:1.34,.14,law?plaster:base);
  for(const y of law?[.35,4.25,8.7,13.84]:[1.38,4.75,7.77])put(0,y,.14,a.len+.1,.16,.3,stone);
  if(law)for(const y of[.9,1.7,2.5,3.3])put(0,y,.137,a.len,.025,.02,base);
  put(0,height,.27,a.len+.36,.25,.62,stone);
  const count=Math.max(1,Math.floor(a.len/(law?4.05:3.5))),spacing=a.len/count;
  for(let j=0;j<count;j++){
   const u=(j-(count-1)/2)*spacing,w=Math.min(law?2.45:1.4,spacing*.58);
   for(const y of law?[2.26,6.47,11.1]:[2.94,6.32]){
    if(a.i===front&&Math.abs(u)<(law?4:4.3)&&y<(law?9:4))continue;
    const h=law?3.22:2.1;put(u,y,.09,w+.2,h+.22,.14,frame);put(u,y,.19,w,h,.05,glass);
    for(const dx of[-w/2,0,w/2])put(u+dx,y,.24,.055,h,.08,frame);
    for(let k=0;k<=4;k++)put(u,y-h/2+k*h/4,.24,w,.05,.08,frame);
    put(u,y-h/2-.12,.19,w+.28,.16,.36,stone);windows++;
   }
   if(law){put(u,8.6,.13,w+.14,1.03,.16,plaster);for(const s of[-1,1])put(u+s*(w/2+.16),9.07,.11,.18,9.14,.22,stone);}
  }
 }
 const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string)=>{const[x,z]=point(u,v);b.box(w,h,d,x,y,z,m,false,e.yaw);if(kind){solid(new T.BoxGeometry(w,h,d),x,y,z,e.yaw);boxes.push({kind,u,y,v,w,h,d});}};
 const cylinder=(u:number,y:number,v:number,r:number,h:number,m:T.Material,kind?:string)=>{const[x,z]=point(u,v);b.add(new T.CylinderGeometry(r,r,h,16),m,x,y,z);if(kind){solid(new T.CylinderGeometry(r,r,h,16),x,y,z);boxes.push({kind,u,y,v,w:r*2,h,d:r*2});}};
 const baluster=(u:number,y:number,v:number)=>{const[x,z]=point(u,v);const profile=[[.065,0],[.08,.06],[.075,.13],[.13,.26],[.12,.34],[.055,.48],[.07,.59],[.085,.65]].map(([r,h])=>new T.Vector2(r,h));b.add(new T.LatheGeometry(profile,8),stone,x,y,z);};
 const title=(text:string,u:number,y:number,v:number,w:number,h:number,dark=false)=>{const c=document.createElement('canvas');c.width=1024;c.height=256;const t=c.getContext('2d')!;t.fillStyle=dark?'#41433d':'#cbc7b7';t.fillRect(0,0,1024,256);t.fillStyle=dark?'#c7ab64':'#514736';t.font='146px "Kaiti SC","STKaiti",serif';t.textAlign='center';t.textBaseline='middle';t.fillText(text,512,131,940);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.MeshStandardMaterial({name:`${f.id}-title`,map:tx,roughness:.9});const[x,z]=point(u,v);b.add(new T.PlaneGeometry(w,h),m,x,y,z,new T.Euler(0,e.yaw,0));};
 const doorU=law?0:-1.22,landing=law?4.25:1.34,doorWidth=law?5.2:1.82,doorHeight=law?3.94:3.06;
 box(doorU,landing+doorHeight/2,.23,doorWidth,doorHeight,.17,wood,'door');
 for(let j=0;j<(law?4:2);j++){
  const u=doorU+(j-(law?1.5:.5))*doorWidth/(law?4:2),w=doorWidth/(law?4:2)-.14;
  box(u,landing+doorHeight*.72,.34,w,doorHeight*.39,.06,glass);
  for(const dy of[.37,.88]){box(u,landing+dy,.36,w,.39,.055,wood);for(const s of[-1,1])box(u+s*w/2,landing+dy,.39,.035,.41,.06,stone);}
  for(const dx of[-w/2,0,w/2])box(u+dx,landing+doorHeight*.72,.39,.04,doorHeight*.39,.06,wood);
  box(u,landing+doorHeight*.72,.40,w,.035,.06,wood);
 }
 if(law){
  // The lower fan of steps and upper flight lead to the second-floor hall.
  box(0,.57,5.95,18,1.14,11.9,stone,'terrace');
  for(let i=0;i<6;i++){const h=1.14*(6-i)/7;box(0,h/2,12.08+i*.36,18.8+i*.12,h,.38,stone,'lower-step');}
  box(0,landing/2,1.12,7.3,landing,2.24,stone,'landing');
  for(let i=0;i<18;i++){const h=1.14+(landing-1.14)*(18-i)/19;box(0,h/2,2.41+i*.32,6.9,h,.34,stone,'upper-step');}
  for(const s of[-1,1]){
   box(s*3.25,6.38,.51,1.17,4.26,.82,stone,'portal');
   for(let i=0;i<=6;i++){const v=2.3+i*.91,y=landing-i*(landing-1.14)/6;box(s*3.64,y+.58,v,.37,1.16,.37,stone,'stair-post');cylinder(s*3.64,y+1.18,v,.25,.12,stone);}
   const a=point(s*3.64,2.3),c=point(s*3.64,7.76);b.cylinder(new T.Vector3(a[0],landing+.94,a[1]),new T.Vector3(c[0],2.08,c[1]),.13,.13,stone);
   // Continuous collision follows the sloping rail between stone posts.
   const rail=new T.BoxGeometry(.22,.27,Math.hypot(5.46,landing-1.14)).rotateX(Math.atan2(landing-1.14,5.46));const[x,z]=point(s*3.64,5.03);solid(rail,x,(landing+1.14)/2+.94,z,e.yaw);
   box(s*3.25,7.14,.96,.26,.65,.12,base);box(s*3.25,7.14,1.04,.20,.46,.06,stone);
  }
  box(0,8.78,.54,7.93,.53,1.11,stone,'portal-lintel');title('法学院',0,8.63,1.104,2.03,.40);
  for(const u of[-1.8,-.6,.6,1.8]){const[x,z]=point(u,.70);b.add(new T.SphereGeometry(.12,10,6),plaster,x,8.20,z);}
  // Shallow curled tile canopy, with raised corners and a low rear ridge.
  const roofPos:number[]=[];const q=(u:number,y:number,v:number):[number,number,number]=>{const[x,z]=point(u,v);return [x,y,z];};
  for(let i=0;i<20;i++){const u=-4.25+i*.425,v=u+.425,y=9.27+.31*(Math.abs(u)/4.25)**6,yy=9.27+.31*(Math.abs(v)/4.25)**6;roofPos.push(...q(u,y,1.48),...q(v,yy,1.48),...q(v,9.9,-.03),...q(u,y,1.48),...q(v,9.9,-.03),...q(u,9.9,-.03));b.cylinder(new T.Vector3(...q(u,y+.04,1.49)),new T.Vector3(...q(u,9.94,-.03)),.052,.052,tile);}
  const cg=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(roofPos,3));cg.computeVertexNormals();solid(cg.clone());b.add(cg,tile);
 }else{
  box(0,landing/2,1.51,8.55,landing,3.02,base,'landing');box(0,landing-.06,1.51,8.78,.12,3.17,stone);
  for(let i=0;i<7;i++){const h=landing*(7-i)/8;box(0,h/2,3.18+i*.29,3.25,h,.31,stone,'step');}
  for(const s of[-1,1]){
   // Solid sloping cheeks frame the seven central treads.
   const shape=new T.Shape([new T.Vector2(2.98,0),new T.Vector2(5.24,0),new T.Vector2(5.24,.30),new T.Vector2(2.98,1.57)]);
   const g=new T.ExtrudeGeometry(shape,{depth:.5,bevelEnabled:false}).rotateY(-Math.PI/2);const[x,z]=point(s*1.88+.25,0);solid(g.clone(),x,0,z,e.yaw);b.add(g,stone,x,0,z,new T.Euler(0,e.yaw,0));
  }
  for(const u of[-3.72,-2.18,2.18,3.72]){
   cylinder(u,2.98,2.63,.225,3.08,stone,'column');cylinder(u,1.53,2.63,.30,.38,base,'column-base');cylinder(u,4.55,2.63,.30,.18,stone);
  }
  for(const u of[-3.72,3.72])cylinder(u,2.98,.62,.19,3.08,stone,'rear-column');
  box(0,4.72,1.51,8.9,.24,3.34,base,'balcony');box(0,4.95,1.51,9.12,.15,3.5,stone,'balcony-coping');
  for(const u of[-4.18,0,4.18])box(u,5.50,3.10,.30,1.10,.34,stone,'balcony-post');
  box(0,5.08,3.10,8.62,.15,.24,stone);box(0,5.88,3.10,8.62,.14,.28,stone,'balcony-rail');
  for(let j=0;j<27;j++)baluster(-4.01+j*8.02/26,5.16,3.10);
  for(const s of[-1,1]){box(s*4.18,5.88,1.6,.24,.14,3.03,stone,'balcony-side');for(let j=0;j<9;j++)baluster(s*4.18,5.16,.28+j*.31);}
  title('健忠楼',0,4.68,3.204,2.70,.40,true);
  for(const[u,y,w,h]of[[1.10,3.67,.62,.39],[1.79,3.67,.62,.39],[1.10,3.16,.62,.39],[1.79,3.16,.62,.39],[1.10,2.65,.62,.39]])box(u,y,.18,w,h,.075,gold);
 }
 const[dx,dz]=point(doorU,.23);doors.push({name,x:dx,y:landing,z:dz,yaw:e.yaw,width:doorWidth});
 // Closed branched hip roof follows the registered outline, including re-entrant corners.
 const peak=law?18.9:11.4;
 const ridges=law?[[ -222,141],[-251,143],[-251,143],[-232,143],[-232,186],[-232,208],[-251,209],[-251,209],[-224,208],[-224,208],[-232,208],[-232,143],[-222,141]]:[[-264,116],[-272,116],[-272,116],[-267,117],[-267,117],[-264,116]];
 const positions:number[]=[];tile.side=T.DoubleSide;
 const tri=(a:T.Vector3,c:T.Vector3,d:T.Vector3)=>positions.push(...a.toArray(),...c.toArray(),...d.toArray());
 for(let i=0;i<f.points.length;i++){const j=(i+1)%f.points.length,a=new T.Vector3(f.points[i][0],height+.15,f.points[i][1]),c=new T.Vector3(f.points[j][0],height+.15,f.points[j][1]),r=new T.Vector3(ridges[i][0],peak,ridges[i][1]),s=new T.Vector3(ridges[j][0],peak,ridges[j][1]);tri(a,c,s);if(!r.equals(s)){tri(a,s,r);b.cylinder(r,s,.13,.13,tile);}b.cylinder(a,c,.12,.12,tile);
  const length=a.distanceTo(c);for(let k=0;k<Math.floor(length/.48);k++){const t=(k+.5)/Math.floor(length/.48),low=a.clone().lerp(c,t),high=r.clone().lerp(s,t);b.cylinder(low,high,.035,.035,tile,5);}
 }
 const rg=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));rg.computeVertexNormals();solid(rg.clone());b.add(rg,tile);
 if(!law){
  // One front dormer is visible above the tree-obscured balcony in the photo.
  box(0,8.79,-2.48,2.16,1.42,1.25,stone,'dormer');box(0,8.85,-1.83,1.55,1.10,.04,glass);
  for(const u of[-.78,0,.78])box(u,8.85,-1.79,.065,1.1,.06,frame);
  const points=[[-1.3,9.46,-1.71],[0,10.34,-1.71],[1.3,9.46,-1.71],[0,11.42,-5.6]].map(([u,y,v])=>{const[x,z]=point(u,v);return new T.Vector3(x,y,z);});
  const dg=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([...points[0].toArray(),...points[1].toArray(),...points[3].toArray(),...points[1].toArray(),...points[2].toArray(),...points[3].toArray()],3));dg.computeVertexNormals();solid(dg.clone());b.add(dg,tile);
 }
 return {id:f.id,name,source:law?'NJU Archives 2024-05-30 + user law-entry; concealed elevations/registered scale approximate':'User jianzhong-entry + NJU 2022 repair notice + historical description; concealed elevations/registered scale approximate',height:peak,windows,roof:'branched grey hip roof',dormitory:false,frontage:[e.x,e.z,e.nx,e.nz],boxes,landing,doorU,doorWidth};
}
