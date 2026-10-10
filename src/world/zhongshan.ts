import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {splitBuildingRoof} from './building-roof.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

// Preserve the previous tree-sampling exclusion when relocating the entrance.
export const zhongshanPlantingClearance={x:-64.80700450091429,z:377.690886385467};

/** User facade photograph + official gl-1-04 courtyard panorama.
 * The west porch faces the courtyard beside Songlin; heights, map registration,
 * concealed roof and rear windows remain approximate, not a measured survey. */
export function buildZhongshan(f:MapFeature,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const mat=(name:string,color:number)=>new T.MeshStandardMaterial({name:`zhongshan-${name}`,color,roughness:.88});
 const wall=mat('yellow-plaster',0xe0d39a),trim=mat('cream-trim',0xe5dfbb),base=mat('grey-plinth',0x666a69),stone=mat('steps',0xa8aaa6),metal=mat('black-guards',0x292d2b),wood=mat('dark-double-door',0x30312b),glass=mat('window-glass',0x647878),tile=mat('grey-roof',0x535956),red=mat('dormer-red',0x815552);
 glass.roughness=.32;tile.side=T.DoubleSide;
 const solid=(g:T.BufferGeometry,x=0,y=0,z=0,yaw=0)=>{const mesh=new T.Mesh(g);mesh.position.set(x,y,z);mesh.rotation.y=yaw;meshes.push(collisionMesh(mesh));camera.push(mesh);};
 const body=new T.ExtrudeGeometry(planShape(f),{depth:7.65,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
 solid(body.clone());const surfaces=splitBuildingRoof(body);b.add(surfaces.walls,wall);surfaces.roof.dispose();body.dispose();
 const edges=f.points.map(([x,z],i)=>{const [xx,zz]=f.points[(i+1)%f.points.length],len=Math.hypot(xx-x,zz-z),mx=(x+xx)/2,mz=(z+zz)/2;let nx=-(zz-z)/len,nz=(xx-x)/len;if(insidePolygon(mx+nx*.3,mz+nz*.3,f)){nx=-nx;nz=-nz;}return {i,len,x:mx,z:mz,nx,nz,yaw:Math.atan2(nx,nz)};});
 let windows=0;
 for(const e of edges){
  const point=(u:number,y:number,v:number)=>new T.Vector3(e.x+u*e.nz+v*e.nx,y,e.z-u*e.nx+v*e.nz);
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>{const p=point(u,y,v);b.box(w,h,d,p.x,y,p.z,m,false,e.yaw);};
  put(0,.57,.035,e.len,1.14,.07,base);
  for(const y of[1.18,4.48,7.40])put(0,y,.06,e.len+.06,.11,.17,trim);
  put(0,7.60,.16,e.len+.16,.20,.38,trim);
  const window=(u:number,y:number,w=1.55,h=2.10)=>{
   put(u,y,.085,w+.18,h+.16,.10,wood);put(u,y,.15,w,h,.06,glass);
   for(const side of[-1,1]){put(u+side*w/2,y,.21,.075,h,.09,trim);put(u,y+side*h/2,.21,w,.075,.09,trim);}
   put(u,y,.21,.07,h,.09,trim);put(u,y-.29,.21,w,.06,.09,trim);put(u,y-h/2-.09,.16,w+.24,.13,.29,trim);
   // Bowed lower guards visible in the courtyard VR, with a flat upper grille.
   for(let j=0;j<9;j++){
    const x=u-w/2+.06+j*(w-.12)/8;
    const pts=[point(x,y+h/2+.035,.30),point(x,y-h*.18,.30),point(x,y-h*.34,.45),point(x,y-h*.50,.53),point(x,y-h*.57,.31)];
    for(let k=0;k<pts.length-1;k++)b.cylinder(pts[k],pts[k+1],.014,.014,metal);
   }
   for(const [dy,v]of[[h/2,.30],[-h*.18,.30],[-h*.50,.53],[-h*.57,.31]])put(u,y+dy,v,w+.03,.028,.028,metal);
   windows++;
  };
  if(e.i===3){for(const u of[-4.10,4.10])for(const y of[2.70,5.90])window(u,y);window(0,5.91,2.6,2.06);}
  else if(e.len>3){const n=Math.max(1,Math.floor(e.len/3.3));for(let i=0;i<n;i++)for(const y of[2.70,5.90])window((i-(n-1)/2)*e.len/n,y,Math.min(1.55,e.len/n*.5));}
 }
 const e=edges[3],point=(u:number,v:number)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz];
 const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string,visualTopInset=0)=>{const [x,z]=point(u,v);b.box(w,h-visualTopInset,d,x,y-visualTopInset/2,z,m,false,e.yaw);if(kind){solid(new T.BoxGeometry(w,h,d),x,y,z,e.yaw);boxes.push({kind,u,y,v,w,h,d});}};
 const landing=1.22;
 // Leave space for the stone cap: overlapping top faces flicker as the camera moves.
 // Keep the original full-height collision volume below the accessible landing.
 box(0,landing/2,1.12,4.62,landing,2.24,base,'landing',.11);
 box(0,landing-.055,1.14,4.72,.11,2.34,stone);
 for(let i=0;i<7;i++){const h=(7-i)*landing/8;box(0,h/2,2.47+i*.32,4.75+i*.11,h,.34,stone,'step');}
 const arch=(width:number,bottom:number,top:number)=>{const s=new T.Shape();s.moveTo(-width/2,bottom);s.lineTo(width/2,bottom);s.lineTo(width/2,top-width/2);s.absarc(0,top-width/2,width/2,0,Math.PI,false);s.closePath();return s;};
 const shape=(s:T.Shape,m:T.Material,u:number,v:number,depth=.06)=>{const[x,z]=point(u,v);b.add(new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:20}),m,x,0,z,new T.Euler(0,e.yaw,0));};
 shape(arch(2.42,landing,3.95),trim,0,.07);shape(arch(2.23,landing,3.85),wood,0,.15);
 box(0,2.34,.22,.045,2.2,.06,trim);box(0,3.10,.22,2.19,.06,.06,trim);
 for(const u of[-.55,.55]){box(u,2.14,.235,.93,1.70,.07,wood);box(u*.20,2.29,.30,.035,.26,.07,stone);}
 // The building shell closes the unavailable interior; the visible arch is flush.
 const[doorX,doorZ]=point(0,.22);solid(new T.BoxGeometry(2.23,1.88,.10),doorX,2.16,doorZ,e.yaw);
 boxes.push({kind:'door',u:0,y:2.16,v:.22,w:2.23,h:1.88,d:.10});
 for(const u of[-1.94,1.94]){
  const[x,z]=point(u,1.91);b.add(new T.CylinderGeometry(.205,.245,3.04,20),trim,x,2.87,z);solid(new T.CylinderGeometry(.205,.245,3.04,20),x,2.87,z);
  boxes.push({kind:'column',u,y:2.87,v:1.91,w:.49,h:3.04,d:.49});
  box(u,1.29,1.91,.62,.16,.62,base,'column-base');box(u,4.40,1.91,.68,.20,.68,trim);
 }
 box(0,4.57,1.13,4.70,.25,2.48,trim,'balcony');box(0,4.75,1.13,4.89,.12,2.60,trim,'balcony-coping');
 const baluster=(u:number,v:number)=>{const[x,z]=point(u,v);b.add(new T.CylinderGeometry(.047,.058,.63,8),trim,x,5.18,z);box(u,4.90,v,.13,.09,.13,trim);box(u,5.46,v,.12,.08,.12,trim);};
 box(0,5.57,2.36,4.86,.15,.22,trim,'balcony-front-rail');box(0,4.88,2.36,4.82,.10,.18,trim);
 for(let i=0;i<23;i++)baluster(-2.18+i*4.36/22,2.36);
 for(const u of[-2.34,2.34]){box(u,5.57,1.18,.22,.15,2.38,trim,'balcony-side-rail');for(let i=0;i<11;i++)baluster(u,.15+i*.20);box(u,5.21,2.36,.24,.66,.24,trim,'balcony-post');}
 const text=(label:string,u:number,y:number,v:number,w:number,h:number,color:string)=>{
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const ctx=canvas.getContext('2d')!;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='112px "Kaiti SC","STKaiti",serif';ctx.fillText(label,384,96,728);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const m=new T.MeshStandardMaterial({name:`zhongshan-title-${label}`,map:tex,transparent:true,depthWrite:false,roughness:.9});const[x,z]=point(u,v);b.add(new T.PlaneGeometry(w,h),m,x,y,z,new T.Euler(0,e.yaw,0));
 };
 text('中 山 楼',0,4.17,.16,1.39,.32,'#65543b');
 // Freestanding west-courtyard marker. Lower inscription is illegible in VR.
 box(-5.40,.10,1.37,2.64,.20,.78,base,'marker-foot');box(-5.40,.48,1.37,2.36,.65,.47,stone,'marker-base');box(-5.40,1.28,1.37,2.45,.93,.23,stone,'marker');
 box(-5.40,.79,1.40,2.65,.12,.56,stone);box(-5.40,1.78,1.37,2.58,.10,.34,stone);text('中 山 楼',-5.40,1.48,1.498,1.75,.30,'#356355');
 const[dx,dz]=point(0,.32);doors.push({name:f.tags.name,x:dx,y:landing,z:dz,yaw:e.yaw,width:2.23});
 // A subdivided roof stays inside the irregular mapped outline. Distance to
 // the eaves supplies a modest pitched form; tree-hidden ridges are approximate.
 const contour=f.points.map(([x,z])=>new T.Vector2(x,z)),triangles=T.ShapeUtils.triangulateShape(contour,[]),positions:number[]=[];
 const roofHeight=(p:T.Vector2)=>{let distance=Infinity;for(let i=0;i<contour.length;i++){const a=contour[i],c=contour[(i+1)%contour.length],d=c.clone().sub(a),t=T.MathUtils.clamp(p.clone().sub(a).dot(d)/d.lengthSq(),0,1);distance=Math.min(distance,p.distanceTo(a.clone().addScaledVector(d,t)));}return 7.72+Math.min(3.10,distance*.58);};
 const tri=(a:T.Vector2,c:T.Vector2,d:T.Vector2,depth=0)=>{if(depth<4){const ac=a.clone().add(c).multiplyScalar(.5),cd=c.clone().add(d).multiplyScalar(.5),da=d.clone().add(a).multiplyScalar(.5);tri(a,ac,da,depth+1);tri(ac,c,cd,depth+1);tri(da,cd,d,depth+1);tri(ac,cd,da,depth+1);}else for(const p of[a,d,c])positions.push(p.x,roofHeight(p),p.y);};
 for(const [a,c,d]of triangles)tri(contour[a],contour[c],contour[d]);
 // Share normals across the sampled roof so triangulation seams do not read
 // as extra architectural folds. This keeps the surface and collision intact.
 const roofSamples=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));
 const roof=mergeVertices(roofSamples);roofSamples.dispose();roof.computeVertexNormals();solid(roof.clone());b.add(roof,tile);
 const dormer=(u:number,v:number,w:number,bottom:number,shoulder:number,top:number,m:T.Material)=>{
  const s=new T.Shape([new T.Vector2(-w/2,bottom),new T.Vector2(w/2,bottom),new T.Vector2(w/2,shoulder),new T.Vector2(0,top),new T.Vector2(-w/2,shoulder)]),[x,z]=point(u,v-1.45),g=new T.ExtrudeGeometry(s,{depth:1.45,bevelEnabled:false});solid(g.clone(),x,0,z,e.yaw);b.add(g,m,x,0,z,new T.Euler(0,e.yaw,0));
  const p=(du:number,y:number,dv:number)=>{const[a,c]=point(u+du,v+dv);return new T.Vector3(a,y,c);};
  for(const side of[-1,1]){
   b.cylinder(p(side*(w/2+.10),shoulder,0),p(0,top+.10,0),.065,.065,trim);
   const a=p(side*(w/2+.13),shoulder+.10,.12),c=p(0,top+.14,.12),d=p(0,top+.14,-1.6),q=p(side*(w/2+.13),shoulder+.10,-1.6);const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([...a.toArray(),...c.toArray(),...d.toArray(),...a.toArray(),...d.toArray(),...q.toArray()],3));g.computeVertexNormals();solid(g.clone());b.add(g,tile);
  }
 };
 dormer(0,-.28,2.83,7.72,8.46,10.14,wall);
 const[cx,cz]=point(0,-.20);b.add(new T.CircleGeometry(.37,24),glass,cx,8.68,cz,new T.Euler(0,e.yaw,0));b.add(new T.TorusGeometry(.40,.07,8,32),trim,cx,8.68,cz,new T.Euler(0,e.yaw,0));box(0,8.68,-.12,.043,.69,.06,trim);box(0,8.68,-.12,.69,.043,.06,trim);
 dormer(3.2,-2.8,1.34,8.2,9.02,9.9,red);box(3.2,8.87,-2.75,.70,.95,.07,trim);box(3.2,8.87,-2.70,.53,.78,.04,glass);
 return {id:f.id,name:f.tags.name,source:'user facade / official VR gl-1-04; west courtyard registration, dimensions and hidden roof approximate',height:10.28,windows,roof:'pitched grey roof with round-window gable and red dormer',dormitory:false,frontage:[e.x,e.z,e.nx,e.nz],columns:boxes.filter(p=>p.kind==='column'),boxes,sign:'中山楼',storeys:2};
}
