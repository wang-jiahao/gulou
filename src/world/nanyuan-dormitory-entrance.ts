import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Builder} from './geometry.ts';
import {planShape,type MapFeature,type MapPolygon} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

type Frontage={x:number;z:number;nx:number;nz:number;angle:number;len:number};
const clip=(ring:number[][],axis:number,value:number,side:number)=>{
 const out:number[][]=[];
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],da=(a[axis]-value)*side,db=(b[axis]-value)*side;
  if(da>=0)out.push(a);
  if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
 }
 return out;
};
const area=(ring:number[][])=>Math.abs(ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
const local=(e:Frontage,[x,z]:number[])=>[(x-e.x)*Math.cos(e.angle)-(z-e.z)*Math.sin(e.angle),(x-e.x)*e.nx+(z-e.z)*e.nz];
export const nanyuanEntryPoint=(e:Frontage,u:number,y:number,v:number)=>new T.Vector3(e.x+u*Math.cos(e.angle)+v*e.nx,y,e.z-u*Math.sin(e.angle)+v*e.nz);

const triangleCache=new WeakMap<MapPolygon,number[][][]>();
const polygonTriangles=(polygon:MapPolygon)=>{
 let triangles=triangleCache.get(polygon);
 if(!triangles){
  const rings=[polygon.points,...(polygon.holes??[])].map(r=>{
   const points=r.map(p=>new T.Vector2(p[0],p[1]));
   if(points.length>1&&points[0].equals(points[points.length-1]))points.pop();
   return points;
  }),points=rings.flat();
  triangles=T.ShapeUtils.triangulateShape(rings[0],rings.slice(1)).map(ids=>ids.map(i=>points[i].toArray()));
  triangleCache.set(polygon,triangles);
 }
 return triangles;
};

/** User's complete Nanyuan 3 photograph and requested entrance family.
 * Heights, stair count and slopes are game approximations, not a survey or
 * an accessibility-compliance claim. Keep the existing mapped road clear. */
export function planNanyuanDormitoryEntrance(f:MapFeature,e:Frontage,roads:MapPolygon[],features:MapFeature[]){
 const width=Math.min(6.8,e.len-.8),half=width/2;
 let routeClearance=8;
 for(const polygon of [...roads,...features.filter(other=>other!==f&&other.tags.building)]){
  // The campus road surface has courtyard/building holes. Intersect its
  // filled triangles so a hole is never mistaken for a road at the facade.
  for(const triangle of polygonTriangles(polygon)){
   const ring=clip(clip(clip(triangle.map(p=>local(e,p)),0,-half-.2,1),0,half+.2,-1),1,0,1);
   if(area(ring)>1e-7)routeClearance=Math.min(routeClearance,...ring.map(p=>p[1]));
  }
 }
 const toe=Math.min(1.65,routeClearance-.4),risers=8,rise=.12,tread=.30,run=risers*tread,landingDepth=1.25;
 const landingV=toe-run,depth=landingDepth-landingV;
 return {id:f.id,name:f.tags.name,e,width,stairWidth:width-2.36,rampWidth:1.06,risers,rise,tread,run,toe,landingV,landingDepth,depth,floor:risers*rise,ceiling:3.65,routeClearance,roadMargin:routeClearance-toe};
}
export type NanyuanDormitoryEntry=ReturnType<typeof planNanyuanDormitoryEntrance>;

/** Only the ground-floor porch is removed. Triangulating first also preserves
 * concave footprints and courtyard holes without joining disconnected wings. */
export function nanyuanDormitoryShell(f:MapFeature,height:number,p:NanyuanDormitoryEntry){
 const rings=[f.points,...(f.holes??[])].map(r=>r.map(v=>local(p.e,v)));
 const points=rings.flat(),triangles=T.ShapeUtils.triangulateShape(rings[0].map(v=>new T.Vector2(...v)),rings.slice(1).map(r=>r.map(v=>new T.Vector2(...v))));
 const half=p.width/2+.10,parts:T.BufferGeometry[]=[];
 const extrude=(ring:number[][],y:number,h:number)=>{
  if(area(ring)<1e-7||h<1e-7)return;
  const world=ring.map(([u,v])=>{const q=nanyuanEntryPoint(p.e,u,0,v);return[q.x,q.z];});
  parts.push(new T.ExtrudeGeometry(planShape({points:world}),{depth:h,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2).translate(0,y,0));
 };
 parts.push(new T.ExtrudeGeometry(planShape(f),{depth:height-p.ceiling,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2).translate(0,p.ceiling,0));
 for(const ids of triangles){
  const triangle=ids.map(i=>points[i]);
  const strip=clip(clip(triangle,1,-p.depth,1),1,.06,-1);
  const opening=clip(clip(strip,0,-half,1),0,half,-1);
  if(area(opening)<1e-7){extrude(triangle,0,p.ceiling);continue;}
  for(const piece of [clip(triangle,1,-p.depth,-1),clip(triangle,1,.06,1),clip(strip,0,-half,-1),clip(strip,0,half,1)])extrude(piece,0,p.ceiling);
 }
 const geometry=mergeGeometries(parts)!;for(const part of parts)part.dispose();return geometry;
}

export function buildNanyuanDormitoryEntrance(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],plaques:T.Group,doors:DoorRecord[],p:NanyuanDormitoryEntry,number:string){
 const point=(u:number,y:number,v:number)=>nanyuanEntryPoint(p.e,u,y,v);
 const material=(name:string,color:number,roughness=.85,metalness=0)=>new T.MeshStandardMaterial({name:`nanyuan-family-${name}`,color,roughness,metalness});
 const grey=material('clean-grey-entry',0x929a97),stone=material('light-grey-stairs',0xb4b5ab),dark=material('recess-shadow',0x45504e),silver=material('silver-frames-and-rails',0xbec5c1,.35,.55),glass=material('recessed-glazing',0x567275,.25,.08);
 const blockers:{name:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const register=(name:string,g:T.BufferGeometry)=>{const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.name=`${p.id}-${name}`;meshes.push(collisionMesh(mesh));camera.push(mesh);};
 const box=(name:string,u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,solid=false)=>{
  const q=point(u,y,v);b.box(w,h,d,q.x,y,q.z,m,false,p.e.angle);
  if(solid){register(name,new T.BoxGeometry(w,h,d).rotateY(p.e.angle).translate(q.x,y,q.z));blockers.push({name,u,y,v,w,h,d});}
 };
 // Closed glass sits at the back of an actual walkable recess. There is no
 // extra generic vestibule, access-gate preview or hidden front-door blocker.
 const doorV=-p.depth+.09,doorWidth=3.25,doorHeight=2.22;
 box('back-wall-finish',0,p.ceiling/2,-p.depth+.018,p.width,p.ceiling,.035,grey);
 box('landing',0,p.floor/2,(p.landingV-p.depth)/2,p.width,p.floor,p.landingDepth,stone,true);
 box('closed-glass-door',0,p.floor+doorHeight/2,doorV,doorWidth,doorHeight,.045,glass,true);
 for(const u of[-doorWidth/2,-doorWidth/4,0,doorWidth/4,doorWidth/2])box('door-frame',u,p.floor+doorHeight/2,doorV+.04,.065,doorHeight+.09,.085,silver);
 for(const y of[p.floor,p.floor+doorHeight])box('door-frame',0,y,doorV+.04,doorWidth+.09,.065,.085,silver);
 for(const side of[-1,1])box('door-handle',side*.12,p.floor+1.02,doorV+.11,.045,.46,.08,silver);
 const dp=point(0,p.floor,doorV);doors.push({name:p.name,x:dp.x,y:dp.y,z:dp.z,yaw:p.e.angle,width:doorWidth});
 for(const side of[-1,1])box('porch-return',side*(p.width/2+.04),p.ceiling/2,-p.depth/2,.12,p.ceiling,p.depth,grey);
 box('flat-canopy',0,p.ceiling+.08,.15,p.width+.44,.24,.95,grey,true);
 box('canopy-soffit',0,p.ceiling-.055,.15,p.width+.25,.035,.85,dark);
 for(let step=0;step<p.risers;step++){
  const h=(p.risers-step)*p.rise,v=p.landingV+(step+.5)*p.tread;
  box('wide-stair',0,h/2,v,p.stairWidth,h,p.tread,stone,true);
  box('stair-nosing',0,h+.007,v+p.tread/2-.025,p.stairWidth,.014,.045,silver);
 }
 for(const side of[-1,1]){
  const u=side*(p.width/2-p.rampWidth/2-.06),a=u-p.rampWidth/2,c=u+p.rampWidth/2;
  const verts=[point(a,0,p.landingV),point(c,0,p.landingV),point(a,0,p.toe),point(c,0,p.toe),point(a,p.floor,p.landingV),point(c,p.floor,p.landingV)];
  const ramp=new T.BufferGeometry();ramp.setAttribute('position',new T.Float32BufferAttribute(verts.flatMap(v=>v.toArray()),3));ramp.setAttribute('uv',new T.Float32BufferAttribute(verts.flatMap(v=>[v.x*.5,v.z*.5]),2));
  ramp.setIndex([4,2,3,4,3,5,0,1,3,0,3,2,0,4,5,0,5,1,0,2,4,1,5,3]);
  const flat=ramp.toNonIndexed();flat.computeVertexNormals();ramp.dispose();b.add(flat.clone(),stone);register('side-ramp',flat);
  for(const railU of[a,c]){
   const start=point(railU,p.floor+.91,p.landingV),end=point(railU,.91,p.toe);b.line([start,end],.033,silver,8);
   for(let post=0;post<=6;post++){
    const t=post/6,v=p.landingV+p.run*t,y=p.floor*(1-t);
    b.cylinder(point(railU,y,v),point(railU,y+.91,v),.025,.025,silver,8);
   }
   const mid=point(railU,p.floor/2+.46,(p.landingV+p.toe)/2),rail=new T.BoxGeometry(.07,.88,Math.hypot(p.run,p.floor));
   rail.rotateX(Math.atan2(p.floor,p.run)).rotateY(p.e.angle).translate(mid.x,mid.y,mid.z);register('ramp-handrail',rail);
  }
 }
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=112;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#b8c7bd';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#233d39';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 75px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText(`南 园  ${number} 舍`,384,58,720);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const sign=new T.Mesh(new T.PlaneGeometry(doorWidth,.32),new T.MeshStandardMaterial({map:texture,roughness:.85}));sign.position.copy(point(0,p.floor+doorHeight+.21,doorV+.055));sign.rotation.y=p.e.angle;sign.name=`${p.name} · recessed transom`;plaques.add(sign);
 return {...p,frontage:[p.e.x,p.e.z,p.e.nx,p.e.nz],door:{v:doorV,width:doorWidth,height:doorHeight},ramps:2,blockers,source:'user Nanyuan 3 full entrance photograph + explicitly requested Nanyuan family; dimensions and slopes approximate, not accessibility certification'};
}
