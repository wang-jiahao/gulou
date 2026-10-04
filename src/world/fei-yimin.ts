import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {addEntrance,entranceMaterials,type DoorRecord} from './building-entrances.ts';
import type {Materials} from './materials.ts';

/** Official VR gl-3 / gl-4-02 and the 2024 plan show a west tower, a five-storey
 * south wing, and a west-open court. Dimensions and unseen faces are estimates.
 * The visible southwest column recess is NOT evidence of a through-building tunnel. */
export function buildFeiYimin(f:MapFeature,mats:Materials,b:Builder,meshes:CollisionMesh[],cameraSolids:T.Object3D[],doors:DoorRecord[],doorMats:ReturnType<typeof entranceMaterials>){
 const origin=f.points[0],angle=Math.atan2(f.points[7][1]-origin[1],f.points[7][0]-origin[0]),co=Math.cos(angle),si=Math.sin(angle);
 const point=(u:number,v:number)=>[origin[0]+u*co-v*si,origin[1]+u*si+v*co];
 const local=f.points.map(([x,z])=>[(x-origin[0])*co+(z-origin[1])*si,-(x-origin[0])*si+(z-origin[1])*co]);
 const paint=(name:string,color:number,stone=false)=>new T.MeshStandardMaterial({name:`fei-${name}`,color,roughness:.86,map:stone?mats.textures.get('stone-grain.webp'):null});
 const wall=paint('pale-stone',0xd0d2cb,true),trim=paint('window-piers',0xd4d5ce),plinth=paint('base',0x969b91,true),roof=paint('roof',0x626d69),red=paint('podium-ground-red',0x793b36),dark=paint('reveal',0x505957);
 roof.side=T.DoubleSide;
 // Keep the thin roof visible from either side, but use its back faces in
 // shadow passes to avoid self-shadow stripes without weakening campus shadows.
 roof.shadowSide=T.BackSide;
 const glass=new T.MeshStandardMaterial({name:'fei-blue-grey-glass',color:0x768989,metalness:.18,roughness:.4});
 const canopy=new T.MeshStandardMaterial({name:'fei-court-glass-canopy',color:0xa0b7b6,transparent:true,opacity:.57,roughness:.32,side:T.DoubleSide,depthWrite:false});
 const parts:{name:string;points:number[][];bottom:number;height:number}[]=[];
 let windows=0;
 function mass(name:string,points:number[][],height:number,bottom=0,material:T.Material=wall){
  const worldPoints=points.map(([u,v])=>point(u,v)),shape=planShape({points:worldPoints});
  const geometry=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false}).rotateX(-Math.PI/2).translate(0,bottom,0);
  const uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);
  const proxy=new T.Mesh(geometry.clone(),new T.MeshBasicMaterial({side:T.DoubleSide}));meshes.push(collisionMesh(proxy));cameraSolids.push(proxy);
  // Render each triangle once. Builder merges by material and ignores groups;
  // overlaying a separate roof above the extrusion causes distant z-fighting.
  const normal=geometry.getAttribute('normal'),top:number[]=[],sides:number[]=[];
  for(let i=0;i<normal.count;i+=3)(normal.getY(i)>.5?top:sides).push(i,i+1,i+2);
  b.add(geometry.clone().setIndex(top),roof);b.add(geometry.setIndex(sides),material);
  parts.push({name,points:worldPoints,height,bottom});
 }
 function box(u:number,y:number,v:number,w:number,h:number,d:number,material:T.Material,solid=false){
  const[x,z]=point(u,v);b.box(w,h,d,x,y,z,material,false,-angle);
  if(solid){const p=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({side:T.DoubleSide}));p.position.set(x,y,z);p.rotation.y=-angle;meshes.push(collisionMesh(p));cameraSolids.push(p);}
 }
 const clip=(points:number[][],axis:number,value:number,side:number)=>{const out:number[][]=[];for(let i=0;i<points.length;i++){const a=points[i],c=points[(i+1)%points.length],ai=(a[axis]-value)*side>=0,ci=(c[axis]-value)*side>=0;if(ai)out.push(a);if(ai!==ci){const t=(value-a[axis])/(c[axis]-a[axis]);out.push([a[0]+t*(c[0]-a[0]),a[1]+t*(c[1]-a[1])]);}}return out;};
 // Internal lines in the official plan correspond to the narrow front/rear
 // recesses and the tower/low-wing division, corroborated by south and west VR.
 const tower=[[0,0],[18.5,0],[18.5,6.7],[26.1,6.7],[26.1,0],[46,0],[46,37.04],[26,37.04],[26,30],[18.3,30],[18.3,37.04],[-1.53,37.02]];
 mass('tower-upper',tower,61.2,7.2);
 mass('tower-ground-east',clip(tower,0,6.2,1),7.2);
 mass('tower-ground-northwest',clip(clip(tower,0,6.2,-1),1,21,-1),7.2);
 const columns=[24,30,36];for(const v of columns)box(-.8,3.6,v,1.25,7.2,1.35,trim,true);
 const northeast=clip(clip(local,1,37.04,-1),0,46,1),east=clip(clip(local,1,37.04,1),1,52.8,-1),south=clip(local,1,52.8,1);
 mass('northeast-low-wing',northeast,19);mass('east-court-link',east,19);mass('south-five-storey-wing',south,19);
 function facade(points:number[][],height:number,style:'tower'|'podium',firstFloor=0){
  const polygon={points};
  for(let i=0;i<points.length;i++){
   const a=points[i],c=points[(i+1)%points.length],dx=c[0]-a[0],dv=c[1]-a[1],len=Math.hypot(dx,dv),mx=(a[0]+c[0])/2,mv=(a[1]+c[1])/2;
   let nu=-dv/len,nv=dx/len;if(insidePolygon(mx+nu*.1,mv+nv*.1,polygon)){nu=-nu;nv=-nv;}
   const yaw=Math.atan2(nu*co-nv*si,nu*si+nv*co),world=point(mx,mv);
   const put=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material)=>{
    const x=world[0]+u*Math.cos(yaw)+v*Math.sin(yaw),z=world[1]-u*Math.sin(yaw)+v*Math.cos(yaw);
    if(mat===glass)b.add(new T.PlaneGeometry(w,h),mat,x,y,z,new T.Euler(0,yaw,0));else b.box(w,h,d,x,y,z,mat,false,yaw);
   };
   const towerFace=style==='tower',floor=towerFace?3.6:3.8,levels=towerFace?19:5;
   // The west end of the south wing has a broad stone strip for its vertical
   // name. Reserve that wall before laying out windows, including their frames.
   const letteringFace=!towerFace&&mx<9&&mv>52.8,reserve=letteringFace?5.4:0;
   const bays=Math.max(1,Math.floor((len-reserve)/(towerFace?2.2:3.3))),pitch=(len-reserve)/bays;
   // Hidden seams where the low wings meet get no duplicate facade. The east
   // tower windows begin above the low roof; open column bays stay unglazed.
   if(!towerFace&&((mx>45.9&&mx<46.1)||(Math.abs(mv-37.04)<.05&&mx>58)||(Math.abs(mv-52.8)<.05&&mx>58)))continue;
   for(let level=firstFloor;level<levels;level++){
    const y=floor*(level+.55),h=towerFace?2.65:2.55;
    if(towerFace&&mx>45.9&&y<20)continue;
    const inRecess=towerFace&&((Math.abs(mv-30)<.05)||(Math.abs(mv-6.7)<.05));
    for(let bay=0;bay<bays;bay++){
     const u=reserve+(bay+.5)*pitch-len/2,lu=mx+u*Math.cos(yaw+angle),lv=mv-u*Math.sin(yaw+angle);
     if(towerFace&&level<2&&lu<6.3&&lv>20.5)continue;
     if(!towerFace&&level===0&&Math.abs(mv-71.4)<.5){put(u,y,.11,pitch-.4,3.25,.12,glass);put(u-pitch/2+.12,1.9,.25,.36,3.8,.45,red);windows++;continue;}
     const w=pitch-(towerFace?.64:.58);
     put(u,y,.025,w+.14,h+.12,.055,dark);put(u,y,.057,w,h,.02,glass);
     for(const side of[-1,1]){put(u+side*w/2,y,.075,.055,h+.12,.075,trim);put(u,y+side*h/2,.075,w+.14,.065,.075,trim);}
     put(u,y+.28,.085,w,.04,.08,trim);
     if(!towerFace)put(u,y,.085,.055,h,.08,trim);
     windows++;
    }
    if(!inRecess&&level>=2)put(reserve/2,floor*level,.03,len-reserve,level%2===0?.42:.20,.10,trim);
   }
   put(0,height-.07,.08,len,.22,.26,trim);
  }
 }
 facade(tower,68.4,'tower');facade(northeast,19,'podium');facade(east,19,'podium');facade(south,19,'podium');
 // The southwest recess has an opaque inner wall. Glazing on that wall gives
 // depth while keeping the visibly open outer bays free of fake doors/windows.
 for(const v of[23.5,27.5,31.5,35.5]){
  box(6.16,3.35,v,.055,5.75,2.8,glass);
  for(const edge of[-1,1]){box(6.11,3.35,v+edge*1.4,.08,5.85,.07,trim);box(6.11,3.35+edge*2.875,v,.08,.07,2.87,trim);}
  box(6.11,3.35,v,.08,5.75,.055,trim);box(6.11,3.6,v,.08,.08,2.8,trim);
 }
 // Short glass canopy bridges the west-open courtyard without blocking its
 // ground route. Its dimensions are fitted to the VR, not survey measurements.
 box(12.7,4.55,44.92,11.8,.16,16.05,canopy,true);
 for(const u of[6.8,9.75,12.7,15.65,18.6])box(u,4.42,44.92,.10,.17,16.1,trim);
 for(const v of[37.0,40.2,43.4,46.6,49.8,52.95])box(12.7,4.42,v,12,.17,.10,trim);
 const entry=point(39,37.04),yaw=-angle;
 addEntrance(b,meshes,doors,doorMats,f.tags.name,entry[0],entry[1],yaw,5.4,0);
 // Equipment follows the actual tower and the long south roof.
 box(31,69.2,13,7,1.6,8,roof,true);
 for(const u of[21,27,33,39,45,51]){box(u,19.5,63,3.8,1,2.2,plinth,true);for(const v of[62.3,63,63.7])box(u,20.05,v,3.8,.07,.10,trim);}
 // Correct west-end vertical placement. The available pixels do not justify
 // pretending that a system-font approximation is the original calligraphy.
 const canvas=document.createElement('canvas');canvas.width=160;canvas.height=768;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#b1923f';ctx.font='116px "Kaiti SC","STKaiti",serif';ctx.textAlign='center';ctx.textBaseline='middle';
 [...'费彝民楼'].forEach((s,i)=>ctx.fillText(s,80,96+i*183,145));
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const signMat=new T.MeshStandardMaterial({name:'fei-vertical-gold-lettering',map,transparent:true,roughness:.55,depthWrite:false});
 const westEdge=south.map((p,i)=>[p,south[(i+1)%south.length]]).sort((a,c)=>(a[0][0]+a[1][0])-(c[0][0]+c[1][0]))[0];
 const [wa,wc]=westEdge,signV=56.5,signU=wa[0]+(wc[0]-wa[0])*(signV-wa[1])/(wc[1]-wa[1]),slope=(wc[0]-wa[0])/(wc[1]-wa[1]);
 const signYaw=-Math.PI/2+Math.atan(slope)-angle,sign=point(signU,signV);
 b.add(new T.PlaneGeometry(1.15,5.52),signMat,sign[0]+Math.sin(signYaw)*.035,14.9,sign[1]+Math.cos(signYaw)*.035,new T.Euler(0,signYaw,0));
 return{id:f.id,name:f.tags.name,source:'NJU 2024 plan + official VR scene_gl-3 f / scene_gl-4-02 r',height:68.4,windows,roof:'west tower / five-storey south podium / open court',dormitory:false,frontage:[entry[0],entry[1],Math.sin(yaw),Math.cos(yaw)],parts,approximateHeights:true,approximateLettering:true,localFrame:{origin,angle},recess:{u:[-1.5,6.2],v:[21,37.04],clearance:7.2,throughBuilding:false},canopy:{u:[6.8,18.6],v:[36.9,52.95],clearance:4.34},labels:[{text:'费彝民楼',orientation:'vertical',face:'south wing west end'}]};
}
