import * as T from 'three';
import {Builder,curvedRoof} from './geometry.ts';
import {planShape,insidePolygon,type MapPolygon} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {entranceMaterials,type DoorRecord} from './building-entrances.ts';
import {addBuildingLettering} from './building-lettering.ts';
import {libraryEntrance} from './library-entrances.ts';
import {splitBuildingRoof} from './building-roof.ts';
import type {Materials} from './materials.ts';

/** Separate volumes follow the user's overhead image and 2024 campus plan.
 * Heights and concealed sides remain approximate; original photos stay local. */
export function buildLibraryComplex(mats:Materials,b:Builder,meshes:CollisionMesh[],cameraSolids:T.Object3D[],doors:DoorRecord[],doorMats:ReturnType<typeof entranceMaterials>){
 const paint=(name:string,color:number,stone=false)=>new T.MeshStandardMaterial({name,color,map:stone?mats.textures.get('stone-grain.webp'):null,roughness:.9});
 const wall=paint('library-pale-masonry',0xc2c3b9,true),oldWall=paint('museum-grey-masonry',0xaaa799,true),trim=paint('library-white-fins',0xdadfd4),plinth=paint('library-plinth',0x7f847c,true);
 const roof=paint('library-flat-roof',0x90968e),tile=paint('museum-dark-tiles',0x4c514b),red=paint('museum-red-window-wood',0x684234),green=paint('museum-painted-eaves',0x436d60);
 tile.side=T.DoubleSide;
 const glass=new T.MeshStandardMaterial({name:'library-window-pane',color:0x8caaa8,metalness:.2,roughness:.36});
 const blindCanvas=document.createElement('canvas');blindCanvas.width=24;blindCanvas.height=256;const ctx=blindCanvas.getContext('2d')!;
 for(let y=0;y<256;y+=8){ctx.fillStyle='#d9ddd4';ctx.fillRect(0,y,24,5);ctx.fillStyle='#818a81';ctx.fillRect(0,y+5,24,3);}
 const blindMap=new T.CanvasTexture(blindCanvas);blindMap.colorSpace=T.SRGBColorSpace;blindMap.anisotropy=8;
 const blind=new T.MeshStandardMaterial({name:'library-white-louvres',map:blindMap,roughness:.94});
 const parts:{name:string;points:number[][];height:number;bottom:number}[]=[];
 let windows=0;
 function mass(name:string,points:number[][],height:number,material:T.Material,bottom=0,style:'modern'|'historic'|'plain'='modern'){
  const polygon={points},shape=planShape(polygon),geometry=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false}).rotateX(-Math.PI/2).translate(0,bottom,0);
  const uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);
  const proxy=new T.Mesh(geometry.clone());meshes.push(collisionMesh(proxy));cameraSolids.push(proxy);
  const surfaces=splitBuildingRoof(geometry);b.add(surfaces.walls,material);b.add(surfaces.roof,roof);geometry.dispose();
  parts.push({name,points,height,bottom});
  for(let i=0;i<points.length;i++){
   const a=points[i],c=points[(i+1)%points.length],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2;
   let nx=-dz/len,nz=dx/len;if(insidePolygon(mx+nx*.1,mz+nz*.1,polygon)){nx=-nx;nz=-nz;}
   const yaw=Math.atan2(nx,nz),put=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material)=>b.box(w,h,d,mx+u*Math.cos(yaw)+v*nx,y+bottom,mz-u*Math.sin(yaw)+v*nz,mat,false,yaw);
   put(0,.35,.035,len,.70,.10,plinth);put(0,height-.08,.09,len,.20,.30,trim);
   if(style==='plain'||len<2.2)continue;
   const bays=Math.max(1,Math.floor(len/(style==='historic'?3.2:2.6))),pitch=len/bays;
   const rows=style==='historic'?[[1.55,1.75],[5.7,2.5]]:[[1.55,2.5],[4.7,1.35],[7.05,2.5],[10.1,2.5]];
   for(let bay=0;bay<bays;bay++){
    const u=pitch*(bay+.5)-len/2;
    for(const [y,h]of rows){
     if(y+h/2>height-.3)continue;
     put(u,y,.05,pitch-.28,h+.16,.11,plinth);put(u,y,.12,pitch-.48,h,.035,glass);
     if(style==='modern'){
      b.add(new T.PlaneGeometry(pitch*.28,h),blind,mx+(u-pitch*.28)*Math.cos(yaw)+nx*.16,y+bottom,mz-(u-pitch*.28)*Math.sin(yaw)+nz*.16,new T.Euler(0,yaw,0));
     }
     const frame=style==='historic'?red:trim;
     for(const side of[-1,1]){put(u+side*(pitch/2-.15),y,.19,.09,h+.18,.20,frame);put(u,y+side*h/2,.19,pitch-.2,.09,.20,frame);}
     put(u,y,.19,.07,h,.20,frame);if(style==='historic'){
      put(u,y+.35,.20,pitch-.25,.06,.2,frame);
      for(const side of[-1,1])put(u+side*(pitch-.48)/4,y,.20,.05,h,.2,frame);
     }
     windows++;
    }
    if(style==='modern')put(u-pitch/2+.04,height/2,.24,.17,height-.35,.55,trim);
   }
  }
 }
 // The western and southern modern wings form an L around an open courtyard.
 mass('modern-west',[[-55.82,241.8],[-32.49,240.83],[-37.4,330.7],[-60.41,332.06]],12.4,wall);
 mass('modern-south',[[-39.04,322.4],[28.67,318.69],[28.2,333.8],[-36.9,339.32],[-39.04,338.65]],12.4,wall);
 // The heritage roof belongs to this northern cross-shaped block, not the
 // middle flat-roof reading room. Preserve the gaps between separate wings.
 const historic:MapPolygon={points:[[-28.77,261.5],[-10.94,260.38],[-10.23,257.77],[7.21,256.64],[8.76,259.1],[24.27,257.8],[24.95,276.72],[7.02,278.3],[6.04,280.86],[-11.14,281.84],[-11.63,279.76],[-28.77,280.38]]};
 mass('historic-north',historic.points,8.8,oldWall,0,'historic');
 mass('middle-flat',[[-18.2,286.4],[11.55,284.67],[10.51,309.91],[-18.67,312.13]],10.8,wall);
 mass('south-link',[[-12.8,310.8],[4,309.9],[3.26,320.1],[-13.27,321.83]],7.0,wall,0,'plain');
 // Elevated west connector leaves the courtyard walk underneath open.
 mass('west-bridge',[[-35.2,289.5],[-17.8,288.7],[-18.0,293.4],[-35.5,294.3]],2.7,wall,3.1,'plain');
 mass('north-link',[[-8,280.9],[2.4,280.4],[2.3,285.3],[-8.1,286]],4.2,oldWall,0,'plain');
 // Long dark skylight runs / plant-room upstands are visible on the west roof.
 for(const z of[255,278,306])b.box(12,.65,18,-46,.325+12.4,z,plinth,false,.055);
 b.box(27,.65,8,-4,12.73,328,plinth,false,.07);
 const roofs=new Builder();
 curvedRoof(roofs,-1.8,269,55,23,8.9,3.0,tile,green,false);
 // Upper transverse pavilion, with visible red clerestory on the north face.
 mass('historic-clerestory',[[-10.8,257.5],[7.4,257.5],[7.4,280.5],[-10.8,280.5]],3.7,oldWall,9.6,'plain');
 for(const z of[257.35,280.65])for(let i=0;i<8;i++){
  const x=-9.6+i*2.25;b.box(1.92,2.1,.12,x,11.65,z,glass);
  for(const side of[-1,1])b.box(.07,2.22,.18,x+side*.97,11.65,z,red);
  b.box(.055,2.1,.18,x,11.65,z,red);b.box(1.95,.065,.18,x,12.15,z,red);
  b.box(1.95,.08,.18,x,12.73,z,red);b.box(1.95,.08,.18,x,10.6,z,red);
 }
 const upper=new Builder();curvedRoof(upper,0,0,25.6,20.8,13.35,2.7,tile,green,false);
 const upperGroup=upper.finish('museum upper transverse roof');upperGroup.position.set(-1.7,0,269);upperGroup.rotation.y=Math.PI/2;upperGroup.updateMatrixWorld(true);
 const lowerGroup=roofs.finish('museum northern wing roofs');lowerGroup.updateMatrixWorld(true);
 for(const group of[lowerGroup,upperGroup])for(const child of group.children)if(child instanceof T.Mesh){meshes.push(collisionMesh(child,true));cameraSolids.push(child);b.add(child.geometry.clone().applyMatrix4(child.matrixWorld),child.material as T.Material);}
 // The visible north eaves have dark green painted beams, narrow warm
 // outlines and closely spaced rafter ends. Patterns are simplified, not a
 // claim to reproduce the original ornamental painting or hidden elevations.
 const eaveShadow=paint('museum-eave-shadow',0x2a4339),eaveLine=paint('museum-eave-painted-outlines',0x9a9261),rafter=paint('museum-rafter-wood',0x695244);
 function northEaves(cx:number,z:number,y:number,width:number){
  b.box(width,.46,.22,cx,y,z,green);b.box(width-.2,.23,.025,cx,y,z-.13,eaveShadow);
  for(const dy of[-.185,.185])b.box(width-.2,.025,.028,cx,y+dy,z-.146,eaveLine);
  const bays=Math.max(1,Math.round(width/3.5)),pitch=width/bays;
  for(let i=0;i<bays;i++){
   const x=cx-width/2+pitch*(i+.5),half=pitch/2-.27;
   const points=[[-half+.15,-.105],[half-.15,-.105],[half,0],[half-.15,.105],[-half+.15,.105],[-half,0],[-half+.15,-.105]];
   for(let j=1;j<points.length;j++)b.cylinder(new T.Vector3(x+points[j-1][0],y+points[j-1][1],z-.153),new T.Vector3(x+points[j][0],y+points[j][1],z-.153),.012,.012,eaveLine,4);
   b.box(.12,.52,.32,x-pitch/2+.10,y,z,red);
  }
  const count=Math.floor(width/.28);
  for(let i=0;i<count;i++){
   const x=cx-width/2+(i+.5)*width/count;
   b.box(.105,.105,.83,x,y+.34,z+.18,rafter);
   b.box(.072,.055,.014,x,y+.335,z-.245,eaveLine);
  }
 }
 northEaves(-1.8,257.55,8.76,54.4);northEaves(-1.7,256.28,13.22,20.3);
 // The modern west entrance projects beyond the long wing, as in archive 28.
 mass('west-entry-recess',[[-63.27,279.23],[-57.85,278.79],[-58.42,293.56],[-64.22,293.1]],12.4,wall);
 const entrance={x:-63.74,z:286.2,yaw:-Math.PI/2-.068};
 libraryEntrance(b,meshes,doors,doorMats,'图书馆',entrance.x,entrance.z,entrance.yaw,.6);
 const westPut=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material)=>b.box(w,h,d,entrance.x+u*Math.cos(entrance.yaw)+v*Math.sin(entrance.yaw),y,entrance.z-u*Math.sin(entrance.yaw)+v*Math.cos(entrance.yaw),mat,false,entrance.yaw);
 westPut(0,3.78,1.35,14.2,.42,3.2,trim);
 for(let i=0;i<4;i++){const h=(i+1)*.15,v=2.85-i*.33;westPut(0,h/2,v,14.3,h,.36,trim);const proxy=new T.Mesh(new T.BoxGeometry(14.3,h,.36));proxy.position.set(entrance.x+Math.sin(entrance.yaw)*v,h/2,entrance.z+Math.cos(entrance.yaw)*v);proxy.rotation.y=entrance.yaw;meshes.push(collisionMesh(proxy));}
 // Keep the gold silhouette in front of the projecting facade fins.
 const labels=[addBuildingLettering(b,'library',entrance.x+Math.sin(entrance.yaw)*.68,4.35,entrance.z+Math.cos(entrance.yaw)*.68,7.7,entrance.yaw)];
 // Museum faces north down Jin Da Road. Its small portal inscription sits on
 // the stone lintel, distinct from the library's widely spaced gold characters.
 const museum={x:-1.5,z:257.18,yaw:Math.PI+.065};
 libraryEntrance(b,meshes,doors,doorMats,'校史博物馆',museum.x,museum.z,museum.yaw,.45,true);
 const museumPut=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material)=>b.box(w,h,d,museum.x+u*Math.cos(museum.yaw)+v*Math.sin(museum.yaw),y,museum.z-u*Math.sin(museum.yaw)+v*Math.cos(museum.yaw),mat,false,museum.yaw);
 for(const side of[-1,1])museumPut(side*2.22,2.5,1.30,.46,4.1,.75,trim);
 museumPut(0,4.38,1.20,5.1,.62,.90,trim);
 // The photographed lintel has a shallow tiled cap, without pagoda upturns.
 museumPut(0,4.84,1.18,5.5,.15,1.2,tile);
 for(let i=0;i<23;i++){
  const u=-2.65+i*.24,point=(v:number)=>new T.Vector3(museum.x+u*Math.cos(museum.yaw)+v*Math.sin(museum.yaw),4.94,museum.z-u*Math.sin(museum.yaw)+v*Math.cos(museum.yaw));
  b.cylinder(point(.58),point(1.78),.075,.075,tile,8);
 }
 labels.push(addBuildingLettering(b,'museum',museum.x+Math.sin(museum.yaw)*1.68,4.18,museum.z+Math.cos(museum.yaw)*1.68,3.4,museum.yaw));
 for(let i=0;i<3;i++){const h=(i+1)*.15,z=museum.z-2.5+i*.34;b.box(5.8,h,.36,museum.x,h/2,z,trim);const proxy=new T.Mesh(new T.BoxGeometry(5.8,h,.36));proxy.position.set(museum.x,h/2,z);meshes.push(collisionMesh(proxy));}
 return{id:'plan-66',name:'图书馆',source:'user overhead + NJU 2024 plan + official VR gl-2-21 + archive photo 28',height:16.4,windows,roof:'north heritage / middle flat / modern L wings',dormitory:false,frontage:[entrance.x,entrance.z,Math.sin(entrance.yaw),Math.cos(entrance.yaw)],parts,labels,approximateHeights:true};
}
