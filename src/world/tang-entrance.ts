import * as T from 'three';
import {Builder} from './geometry.ts';
import {planShape,type MapFeature} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {splitBuildingRoof} from './building-roof.ts';
import type {DoorRecord} from './building-entrances.ts';

// gl-4-05 f confirms a deep portico with side glazing. Its rear is not proven
// to be a through passage; keep a physical glazed boundary at the assumed depth.
export const tangPortal={left:-14,right:-5.5,glassRight:3.2,pierWidth:1.25,depth:6.2,clearance:6.55,floor:.12};
type FacadeMaterials={stone:T.Material;panels:T.Material;glass:T.Material;frame:T.Material};
export function buildTangEntrance(f:MapFeature,b:Builder,detail:Builder,meshes:CollisionMesh[],cameraSolids:T.Object3D[],doors:DoorRecord[],height:number,wall:T.Material,roof:T.Material,m:FacadeMaterials){
 const a=f.points[23],c=f.points[24],length=Math.hypot(c[0]-a[0],c[1]-a[1]);
 const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,nx=-(c[1]-a[1])/length,nz=(c[0]-a[0])/length,yaw=Math.atan2(nx,nz);
 const point=(u:number,v:number)=>[x+u*nz+v*nx,z-u*nx+v*nz];
 const p=tangPortal,center=(p.left+p.right)/2,width=p.right-p.left;
 const material=(name:string,color:number)=>new T.MeshStandardMaterial({name:`tang-entrance-${name}`,color,roughness:.85});
 const paving=material('paving',0xaaa99e),dark=material('door-frame',0x344741),joint=material('soffit-grid',0x737b72),stripe=material('red-safety-stripe',0xb52d3b);
 const rearGlass=material('rear-glass',0x5c7d75);rearGlass.roughness=.32;rearGlass.metalness=.22;
 const lamp=material('recessed-light',0xe4e4ce);lamp.emissive.setHex(0xd9d3af);lamp.emissiveIntensity=.16;
 const proxyMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
 const parts:{name:string;bottom:number;height:number}[]=[];
 const collider=(geometry:T.BufferGeometry)=>{const mesh=new T.Mesh(geometry,proxyMaterial);meshes.push(collisionMesh(mesh));cameraSolids.push(mesh);};
 const mass=(name:string,points:number[][],bottom:number,h:number,mat:T.Material)=>{
  const geometry=new T.ExtrudeGeometry(planShape({points}),{depth:h,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2).translate(0,bottom,0);
  const uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);
  collider(geometry.clone());const surfaces=splitBuildingRoof(geometry);b.add(surfaces.walls,mat);b.add(surfaces.roof,bottom===p.clearance?roof:mat);geometry.dispose();parts.push({name,bottom,height:h});
 };
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material,target=b)=>{const[px,pz]=point(u,v);target.box(w,h,d,px,y,pz,mat,false,yaw);};
 const panel=(u:number,y:number,v:number,w:number,h:number,angle=yaw)=>{
  const geometry=new T.PlaneGeometry(w,h),uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,(u-w/2+uv.getX(i)*w)/1.25,(y-h/2+uv.getY(i)*h)/.65);
  const[px,pz]=point(u,v);b.add(geometry,m.panels,px,y,pz,new T.Euler(0,angle,0));
 };
 // Edge 23 runs from negative to positive local u. Insert the portico notch
 // directly into that boundary, retaining every other concave corner exactly.
 const lower=[...f.points.slice(0,24),point(p.left,0),point(p.left,-p.depth),point(p.right,-p.depth),point(p.right,0),...f.points.slice(24)];
 mass('ground-with-recess',lower,0,p.clearance,wall);
 mass('unchanged-upper-footprint',f.points,p.clearance,height-p.clearance,wall);
 mass('portico-floor',[point(p.left,0),point(p.left,-p.depth),point(p.right,-p.depth),point(p.right,0)],0,p.floor,paving);
 // Stone pier between the open portico and its large ground-level side window.
 box(p.right+p.pierWidth/2,p.clearance/2,.23,p.pierWidth,p.clearance,.46,m.stone);
 panel(p.right+p.pierWidth/2,p.clearance/2,.466,p.pierWidth,p.clearance);
 for(const side of[-1,1]){
  const u=side<0?p.left:p.right;
  panel(u+(side<0?.006:-.006),p.clearance/2,-p.depth/2,p.depth,p.clearance,yaw+(side<0?Math.PI/2:-Math.PI/2));
 }
 // Large fixed pane beside the entrance, with the photographed red safety band.
 const glassLeft=p.right+p.pierWidth,gw=p.glassRight-glassLeft,gc=(p.glassRight+glassLeft)/2;
 box(gc,p.clearance/2,.48,gw,p.clearance,.045,m.glass);
 for(let i=0;i<=5;i++)box(glassLeft+gw*i/5,p.clearance/2,.52,.055,p.clearance,.075,m.frame,detail);
 box(gc,1.13,.53,gw,.09,.045,stripe);box(gc,3.2,.53,gw,.055,.075,m.frame,detail);
 // A glazed return makes the entry read as a sheltered recess. These planes
 // rest against the same solid shell as the rear, rather than implying access.
 const returnGeometry=new T.PlaneGeometry(p.depth-.15,p.clearance-.3),[rx,rz]=point(p.right-.025,-p.depth/2);
 b.add(returnGeometry,m.glass,rx,p.clearance/2,rz,new T.Euler(0,yaw-Math.PI/2,0));
 for(let i=0;i<=4;i++)box(p.right-.07,p.clearance/2,-p.depth*i/4,.065,p.clearance-.22,.055,m.frame,detail);
 box(p.right-.07,1.13,-p.depth/2,.075,.09,p.depth-.1,stripe);
 box(center,p.clearance/2,-p.depth+.028,width,p.clearance-.12,.045,rearGlass);
 for(let i=0;i<=6;i++)box(p.left+width*i/6,p.clearance/2,-p.depth+.08,.06,p.clearance-.12,.08,dark,detail);
 for(const y of[1.13,3.65])box(center,y,-p.depth+.09,width,y===1.13?.09:.075,.08,y===1.13?stripe:dark);
 box(center,3.73,-p.depth+.18,3.7,.24,.18,dark);
 for(const side of[-1,1])box(center+side*1.77,1.93,-p.depth+.18,.16,3.6,.18,dark);
 for(const u of[center-.17,center+.17])box(u,1.55,-p.depth+.25,.045,.55,.10,m.frame,detail);
 // Grid ceiling and dim emissive inserts add no dynamic lights or frame work.
 for(let u=p.left;u<=p.right;u+=1.05)box(u,p.clearance-.014,-p.depth/2,.04,.028,p.depth,joint,detail);
 for(let v=-p.depth;v<=0;v+=1.03)box(center,p.clearance-.014,v,width,.028,.04,joint,detail);
 for(const u of[center-2.1,center+2.1])for(const v of[-1.5,-4.6])box(u,p.clearance-.03,v,.35,.04,.35,lamp,detail);
 const[doorX,doorZ]=point(center,-p.depth+.22);doors.push({name:f.tags.name,x:doorX,y:p.floor,z:doorZ,yaw,width:3.4});
 const[frontX,frontZ]=point(center,0);
 return{source:'official VR gl-4-05 f, 2560px / user campus plan',dimensions:'approximate; photographed recess, unmeasured depth and clearance',throughPassage:false,localFrame:{x,z,nx,nz,yaw},frontage:[frontX,frontZ,nx,nz],portal:{...p},parts};
}
