import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {splitBuildingRoof} from './building-roof.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';
import type {Materials} from './materials.ts';

// Retain the old sampling exclusion so this entrance refinement does not
// reseed trees across campus. It also clears the new, shallower front door.
export const memorialPlantingClearance={x:-271.17711912470776,z:176.59010312810003};

/** Plan-50 is labelled 赛珍珠楼 on the user's plan, west of 西南楼.
 * NJU Archives' east elevation supplies storey heights; the registered outline,
 * concealed elevations and simplified branching hip roof remain approximate. */
export function buildPearlMemorial(f:MapFeature,mats:Materials,b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[]){
 const mat=(name:string,color:number,roughness=.9)=>new T.MeshStandardMaterial({name:`pearl-${name}`,color,roughness});
 const wall=mat('grey-brick',0xffffff),stone=mat('limestone',0xc9c9ba),base=mat('basement-stone',0x969990),wood=mat('red-wood',0x532e30),shadow=mat('reveal',0x302f2c),glass=mat('glass',0x667873,.34),tile=mat('grey-tiles',0x626966),metal=mat('railing',0x4e5450);
 // Small, flush grey bricks seen in walk frame 0060, not rough castle stone.
 // Procedural pixels only; one repeating 256px texture shared by this building.
 const brickCanvas=document.createElement('canvas');brickCanvas.width=brickCanvas.height=256;
 const brick=brickCanvas.getContext('2d')!;brick.fillStyle='#c1c0b6';brick.fillRect(0,0,256,256);
 for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const grey=155+((row*13+col*7+35)%19);brick.fillStyle=`rgb(${grey},${grey+1},${grey-5})`;brick.fillRect(col*64+(row%2)*32+1,row*32+1,62,30);}
 const brickTexture=new T.CanvasTexture(brickCanvas);brickTexture.colorSpace=T.SRGBColorSpace;brickTexture.wrapS=brickTexture.wrapT=T.RepeatWrapping;wall.map=brickTexture;
 stone.map=mats.textures.get('stone-grain.webp')??null;
 const solid=(g:T.BufferGeometry,x=0,y=0,z=0,yaw=0)=>{const m=new T.Mesh(g);m.position.set(x,y,z);m.rotation.y=yaw;meshes.push(collisionMesh(m));camera.push(m);};
 const height=7.23,g=new T.ExtrudeGeometry(planShape(f),{depth:height,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
 solid(g.clone());const surfaces=splitBuildingRoof(g),wp=surfaces.walls.getAttribute('position'),wn=surfaces.walls.getAttribute('normal'),wu=surfaces.walls.getAttribute('uv');
 for(let i=0;i<wp.count;i++)wu.setXY(i,(wp.getX(i)*wn.getZ(i)-wp.getZ(i)*wn.getX(i))/.96,wp.getY(i)/.96);
 b.add(surfaces.walls,wall);surfaces.roof.dispose();g.dispose();
 const edges=f.points.map(([x,z],i)=>{const [xx,zz]=f.points[(i+1)%f.points.length],len=Math.hypot(xx-x,zz-z),mx=(x+xx)/2,mz=(z+zz)/2;let nx=-(zz-z)/len,nz=(xx-x)/len;if(insidePolygon(mx+nx*.4,mz+nz*.4,f)){nx=-nx;nz=-nz;}return {i,len,x:mx,z:mz,nx,nz,yaw:Math.atan2(nx,nz)};});
 let windows=0;
 for(const e of edges){
  const put=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>b.box(w,h,d,e.x+u*e.nz+v*e.nx,y,e.z-u*e.nx+v*e.nz,m,false,e.yaw);
  put(0,.50,.045,e.len,1,.09,base);
  for(const y of[1.06,4.20,7.15])put(0,y,.085,e.len+.1,.13,.20,stone);
  put(0,7.27,.16,e.len+.22,.14,.38,stone);
  const front=e.i===9;
  const window=(u:number,y:number,w:number,h:number,shutters:boolean)=>{
   put(u,y,.075,w+.20,h+.19,.12,shadow);put(u,y,.15,w,h,.04,glass);
   for(const side of[-1,1]){put(u+side*w/2,y,.20,.065,h,.09,wood);put(u,y+side*h/2,.20,w,.065,.09,wood);}
   put(u,y,.20,.045,h,.09,wood);for(const dy of[-h/6,h/6])put(u,y+dy,.20,w,.045,.09,wood);
   put(u,y-h/2-.11,.15,w+.32,.12,.36,stone);put(u,y+h/2+.12,.12,w+.28,.14,.22,stone);
   if(shutters)for(const side of[-1,1]){const su=u+side*(w/2+.25);put(su,y,.14,.41,h,.07,wood);for(let j=0;j<13;j++)put(su,y-h/2+.08+j*(h-.16)/12,.19,.34,.045,.05,shadow);}
   windows++;
  };
  if(front){
   for(const u of[-3.65,3.65]){for(const side of[-1,1])window(u+side*.48,2.63,.70,1.92,false);window(u,5.79,1.20,1.86,true);}
   window(0,5.63,1.65,2.35,false);
  }else if(e.len>3){
   const count=Math.max(1,Math.floor(e.len/3.15));
   for(let j=0;j<count;j++){const u=(j-(count-1)/2)*e.len/count;window(u,2.63,Math.min(1.2,e.len/count*.44),1.92,true);window(u,5.79,Math.min(1.2,e.len/count*.44),1.86,true);}
  }
  if(e.len>4)for(let j=0,n=Math.floor(e.len/2.25);j<n;j++){
   const u=(j-(n-1)/2)*e.len/n;if(front&&Math.abs(u)<1.65)continue;
   put(u,.53,.11,.83,.68,.08,wood);for(let k=0;k<8;k++)put(u,.25+k*.08,.17,.74,.035,.045,shadow);
  }
 }
 const e=edges[9],point=(u:number,v:number)=>[e.x+u*e.nz+v*e.nx,e.z-u*e.nx+v*e.nz];
 const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string)=>{const[x,z]=point(u,v);b.box(w,h,d,x,y,z,m,false,e.yaw,m===wall?.96:2);if(kind){solid(new T.BoxGeometry(w,h,d),x,y,z,e.yaw);boxes.push({kind,u,y,v,w,h,d});}};
 box(0,.535,.96,3.25,1.07,1.9,stone,'landing');
 for(let i=0;i<6;i++){const h=(6-i)*1.07/7,v=2.10+i*.30;box(0,h/2,v,2.66,h,.32,stone,'step');}
 box(0,2.25,.20,1.86,2.36,.12,wood,'door');
 for(const u of[-1.01,0,1.01])box(u,2.25,.28,.075,2.40,.10,wood);
 for(const u of[-.49,.49]){box(u,2.60,.29,.82,1.50,.04,glass);box(u,1.50,.30,.77,.63,.04,wood);box(u,3.02,.32,.85,.06,.06,wood);}
 for(const u of[-.12,.12])box(u,2.32,.36,.035,.29,.065,stone);
 for(const u of[-1.33,1.33]){
  const[x,z]=point(u,1.55),cg=new T.CylinderGeometry(.23,.23,2.8,16),uv=cg.getAttribute('uv');
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.PI*.46/.96,uv.getY(i)*2.8/.96);
  b.add(cg,wall,x,2.57,z);
  solid(new T.CylinderGeometry(.23,.23,2.8,16),x,2.57,z);
  boxes.push({kind:'column',u,y:2.57,v:1.55,w:.46,h:2.8,d:.46});
  box(u,1.10,1.55,.58,.16,.58,stone,'column-base');box(u,3.98,1.55,.60,.18,.60,stone);
 }
 box(0,4.18,1.01,3.46,.27,2.31,stone,'balcony');
 // Land on the visible coping, including its slight overhang beyond the slab.
 box(0,4.36,1.01,3.63,.09,2.43,stone,'balcony-coping');
 for(const v of[2.13]){box(0,5.04,v,3.39,.095,.10,stone);box(0,4.49,v,3.39,.08,.10,stone);for(let j=0;j<23;j++)box(-1.60+j*3.2/22,4.77,v,.036,.52,.04,metal);}
 for(const side of[-1,1]){box(side*1.65,5.04,1.1,.10,.095,2.04,stone);for(let j=0;j<12;j++)box(side*1.65,4.77,.17+j*1.86/11,.036,.52,.04,metal);box(side*1.65,4.75,2.13,.14,.78,.14,stone,'balcony-post');}
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#262820';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#d2b56a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='100px "Kaiti SC","STKaiti",serif';ctx.fillText('赛珍珠纪念馆',512,105,936);ctx.font='25px Georgia,serif';ctx.fillText('Pearl S. Buck Memorial House',512,200);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const signMat=new T.MeshStandardMaterial({name:'pearl-title',map:texture,roughness:.9});
 box(0,3.74,.29,2.42,.57,.10,shadow);const[sx,sz]=point(0,.351);b.add(new T.PlaneGeometry(2.40,.56),signMat,sx,3.74,sz,new T.Euler(0,e.yaw,0));
 const[dx,dz]=point(0,.20);doors.push({name:f.tags.name,x:dx,y:1.07,z:dz,yaw:e.yaw,width:1.86});
 // A single closed roof skin follows every re-entrant footprint corner.
 // The visible roof is simplified to a long hip ridge plus the east dormer.
 const north=new T.Vector3(-278.8,11.45,171.5),south=new T.Vector3(-279.45,11.45,181.1),positions:number[]=[];
 const triangle=(a:T.Vector3,c:T.Vector3,d:T.Vector3)=>positions.push(...a.toArray(),...c.toArray(),...d.toArray());
 const ridge=(i:number)=>[0,1,2,3,10,11].includes(i)?north:south;
 for(let i=0;i<f.points.length;i++){const j=(i+1)%f.points.length,a=new T.Vector3(f.points[i][0],7.32,f.points[i][1]),c=new T.Vector3(f.points[j][0],7.32,f.points[j][1]),ra=ridge(i),rc=ridge(j);triangle(a,c,rc);if(ra!==rc)triangle(a,rc,ra);b.cylinder(a,c,.075,.075,tile);}
 const roofGeometry=new T.BufferGeometry();roofGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));roofGeometry.computeVertexNormals();tile.side=T.DoubleSide;solid(roofGeometry.clone());b.add(roofGeometry,tile);b.cylinder(north,south,.11,.11,tile);
 const roofPoint=(u:number,y:number,v:number)=>{const[x,z]=point(u,v);return new T.Vector3(x,y,z);};
 const dormer=new T.Shape([new T.Vector2(-1.33,8.18),new T.Vector2(1.33,8.18),new T.Vector2(1.33,9.38),new T.Vector2(0,10.57),new T.Vector2(-1.33,9.38)]);
 const[wx,wz]=point(0,-3.30);const dg=new T.ExtrudeGeometry(dormer,{depth:2.55,bevelEnabled:false,steps:1});solid(dg.clone(),wx,0,wz,e.yaw);b.add(dg,stone,wx,0,wz,new T.Euler(0,e.yaw,0));
 box(0,8.84,-.70,2.20,1.17,.06,glass);for(const u of[-1.1,-.66,0,.66,1.1])box(u,8.84,-.64,.055,1.17,.08,wood);for(const y of[8.27,8.65,9.02,9.42])box(0,y,-.64,2.22,.05,.08,wood);
 const dp=[roofPoint(-1.52,9.38,-.52),roofPoint(0,10.75,-.52),roofPoint(1.52,9.38,-.52),roofPoint(0,11.45,-5.65)];
 const dRoof=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([...dp[0].toArray(),...dp[1].toArray(),...dp[3].toArray(),...dp[1].toArray(),...dp[2].toArray(),...dp[3].toArray()],3));dRoof.computeVertexNormals();solid(dRoof.clone());b.add(dRoof,tile);
 for(let i=0;i<2;i++)b.cylinder(dp[i],dp[i+1],.09,.09,stone);
 const chimneys=[[-6.9,-2.15,10.8],[-3.6,-5.8,12.25],[1.5,-5.2,12.71],[5.8,-3.1,12.2],[7.5,-1.8,12.15]];
 for(const [u,v,top]of chimneys){box(u,(top+7.4)/2,v,.54,top-7.4,.66,wall,'chimney');box(u,top-.48,v,.66,.42,.78,stone);box(u,top-.47,v+.401,.31,.24,.035,shadow);box(u,top-.14,v,.79,.13,.91,stone);}
 return {id:f.id,name:f.tags.name,source:'NJU Archives 2023-12-24 / user plan 50 / gl-2-05 / walk 0060; registered dimensions and roof branches approximate',height:12.71,windows,roof:'hip with east dormer',dormitory:false,frontage:[e.x,e.z,e.nx,e.nz],columns:boxes.filter(p=>p.kind==='column'),boxes,sign:'赛珍珠纪念馆',chimneys:chimneys.length};
}
