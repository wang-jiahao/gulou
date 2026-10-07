import * as T from 'three';
import {Builder} from './geometry.ts';
import {insidePolygon,planShape,type MapFeature} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import {entranceMaterials,type DoorRecord} from './building-entrances.ts';
import type {Materials} from './materials.ts';

/** Official VR gl-3 / gl-4-02 and the 2024 plan show a west tower, a five-storey
 * south wing, and a west-open court. Dimensions and unseen faces are estimates.
 * The southwest recess retains its back wall. The separate south-wing passage
 * follows the user's location report; its dimensions are approximate. */
export function buildFeiYimin(f:MapFeature,mats:Materials,b:Builder,meshes:CollisionMesh[],cameraSolids:T.Object3D[],doors:DoorRecord[],doorMats:ReturnType<typeof entranceMaterials>){
 const origin=f.points[0],angle=Math.atan2(f.points[7][1]-origin[1],f.points[7][0]-origin[0]),co=Math.cos(angle),si=Math.sin(angle);
 const point=(u:number,v:number)=>[origin[0]+u*co-v*si,origin[1]+u*si+v*co];
 const local=f.points.map(([x,z])=>[(x-origin[0])*co+(z-origin[1])*si,-(x-origin[0])*si+(z-origin[1])*co]);
 const paint=(name:string,color:number,stone=false)=>new T.MeshStandardMaterial({name:`fei-${name}`,color,roughness:.86,map:stone?mats.textures.get('stone-grain.webp'):null});
 const wall=paint('pale-stone',0xd0d2cb,true),trim=paint('window-piers',0xd4d5ce),plinth=paint('base',0x969b91,true),roof=paint('roof',0x626d69),red=paint('podium-ground-red',0x793b36),dark=paint('reveal',0x505957),tan=paint('south-upper-tan-stone',0xb79a7f,true);
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
 // Photo: the school entrance is recessed under the canopy, with lettering
 // on its left stone column. Cut the mass as well as the facade windows.
 mass('tower-ground-entry-left',clip(clip(tower,0,6.2,1),0,9,-1),7.2);
 mass('tower-ground-entry-right',clip(tower,0,16.4,1),7.2);
 mass('tower-ground-entry-back',clip(clip(clip(tower,0,9,1),0,16.4,-1),1,34.2,-1),7.2);
 mass('tower-ground-northwest',clip(clip(tower,0,6.2,-1),1,21,-1),7.2);
 const columns=[24,30,36];for(const v of columns)box(-.8,3.6,v,1.25,7.2,1.35,trim,true);
 // The inner south edge slopes slightly in the plan. Partition along that
 // actual edge: a horizontal cut leaves a thin, full-height wedge across the
 // northern exit of a ground passage.
 const frontV=(u:number)=>local[3][1]+(u-local[3][0])*(local[4][1]-local[3][1])/(local[4][0]-local[3][0]);
 const splitSouth=(points:number[][],side:number)=>{const out:number[][]=[];for(let i=0;i<points.length;i++){const a=points[i],c=points[(i+1)%points.length],da=(a[1]-frontV(a[0]))*side,dc=(c[1]-frontV(c[0]))*side;if(da>=-1e-8)out.push(a);if((da>0&&dc<0)||(da<0&&dc>0)){const t=da/(da-dc);out.push([a[0]+t*(c[0]-a[0]),a[1]+t*(c[1]-a[1])]);}}// Remove collinear backtracking spikes before extrusion; their side faces
 // would otherwise form an invisible wall across the empty court edge.
 return out.filter((p,i)=>{const a=out[(i+out.length-1)%out.length],c=out[(i+1)%out.length];return Math.abs((p[0]-a[0])*(c[1]-p[1])-(p[1]-a[1])*(c[0]-p[0]))>1e-7;});};
 const northeast=clip(clip(local,1,37.04,-1),0,46,1),east=splitSouth(clip(local,1,37.04,1),-1),south=splitSouth(local,1);
 mass('northeast-low-wing',northeast,19);mass('east-court-link',east,19);
 // Keep the upper floors continuous while opening an actual ground route at
 // the user's indicated right side. The court-facing slogan has a separate
 // shallow alcove, not a second tunnel. mass() also replaces the solid physics.
 const clearance=3.8,section=(lo:number,hi:number)=>clip(clip(south,0,lo,1),0,hi,-1);
 mass('south-upper-floors',south,19-clearance,clearance);
 mass('south-ground-west',clip(south,0,29,-1),clearance);
 mass('south-alcove-back',clip(section(29,44),1,56.4,1),clearance);
 mass('south-ground-between-openings',section(44,49),clearance);
 mass('south-ground-east',clip(south,0,55,1),clearance);
 box(52,clearance/2,70.9,1,clearance,1,red,true);
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
   const exteriorSouth=!towerFace&&Math.abs(mv-71.4)<.5;
   const bays=Math.max(1,Math.floor(len/(towerFace?2.2:3.3))),pitch=len/bays;
   // Hidden seams where the low wings meet get no duplicate facade. The east
   // tower windows begin above the low roof; open column bays stay unglazed.
   if(!towerFace&&((mx>45.9&&mx<46.1)||(Math.abs(mv-37.04)<.05&&mx>58)||(Math.abs(mv-52.8)<.05&&mx>58)))continue;
   for(let level=firstFloor;level<levels;level++){
    const y=floor*(level+.55),h=towerFace?2.65:2.55;
    const upperTan=exteriorSouth&&level>=3;
    if(upperTan)put(0,floor*(level+.5),.04,len,floor,.08,tan);
    if(towerFace&&mx>45.9&&y<20)continue;
    const inRecess=towerFace&&((Math.abs(mv-30)<.05)||(Math.abs(mv-6.7)<.05));
    for(let bay=0;bay<bays;bay++){
     const u=(bay+.5)*pitch-len/2,lu=mx+u*Math.cos(yaw+angle),lv=mv-u*Math.sin(yaw+angle);
     if(towerFace&&level<2&&lu<6.3&&lv>20.5)continue;
     if(towerFace&&level<2&&Math.abs(mv-37.04)<.05&&lu+pitch/2+.2>9&&lu-pitch/2-.2<16.4)continue;
     if(!towerFace&&level===0&&mv>=52.6){
      // Skip entire bays whose windows, frames or red piers overlap an opening.
      const half=pitch/2+.2,front=Math.abs(mv-frontV(mx))<.05,back=mv>70;
      if((front||back)&&lu+half>49&&lu-half<55)continue;
      if(front&&lu+half>29&&lu-half<44)continue;
     }
     if(!towerFace&&level===0&&Math.abs(mv-71.4)<.5){put(u,y,.11,pitch-.4,3.25,.12,glass);put(u-pitch/2+.12,1.9,.25,.36,3.8,.45,red);windows++;continue;}
     if(upperTan){
      // The photographed upper two storeys have grouped vertical lights,
      // while the lower two retain broad grey-framed windows.
      const w=pitch*.18;
      for(const offset of[-.27,0,.27]){const q=u+pitch*offset;put(q,y,.095,w+.10,h+.12,.055,dark);put(q,y,.13,w,h,.02,glass);put(q,y-.36,.15,w,.05,.07,trim);windows++;}
      put(u-pitch/2,y,.086,.018,floor,.018,plinth);
      continue;
     }
     const w=pitch-(towerFace?.64:.58);
     put(u,y,.025,w+.14,h+.12,.055,dark);put(u,y,.057,w,h,.02,glass);
     for(const side of[-1,1]){put(u+side*w/2,y,.075,.055,h+.12,.075,trim);put(u,y+side*h/2,.075,w+.14,.065,.075,trim);}
     put(u,y+.28,.085,w,.04,.08,trim);
     if(!towerFace)put(u,y,.085,.055,h,.08,trim);
     windows++;
    }
    if(!inRecess&&level>=2)put(0,floor*level,.10,len,upperTan?.04:level%2===0?.42:.20,.10,upperTan?plinth:trim);
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
 box(12.7,7.6,44.92,11.8,.16,16.05,canopy,true);
 for(const u of[6.8,9.75,12.7,15.65,18.6])box(u,7.47,44.92,.10,.17,16.1,trim);
 for(const v of[37.0,40.2,43.4,46.6,49.8,52.95])box(12.7,7.47,v,12,.17,.10,trim);
 const entry=point(12.7,34.32),yaw=-angle;
 // Double-height glazing and a broad stone transom sit at the back of the
 // real recess. The closed door/back mass prevents access to unbuilt rooms.
 box(12.7,3.55,34.24,7.4,7.1,.045,glass);
 for(const u of[9.05,10.9,12.7,14.5,16.35])box(u,3.55,34.29,.08,7.1,.08,doorMats.frame);
 for(const y of[.05,2.8,4.3,7.1])box(12.7,y,34.29,7.4,.08,.08,doorMats.frame);
 box(12.7,3.55,35.7,7.4,.64,2.68,wall);
 for(const u of[12.55,12.85])box(u,1.3,34.37,.04,.6,.07,doorMats.steel);
 doors.push({name:'软件学院',x:entry[0],y:0,z:entry[1],yaw,width:3.6});
 box(8.4,3.6,36.9,1.2,7.2,.28,wall);
 for(let y=.9;y<7.2;y+=.9)box(8.4,y,37.045,1.2,.018,.012,plinth);
 // The photo shows a low left-hand access ramp and two stainless handrails.
 // Its extent and rise are approximate; the central door approach stays open.
 box(12.7,.09,36.8,7.4,.18,5.1,plinth,true);
 const ramp=new T.BoxGeometry(8.4,.18,1.65),rp=ramp.getAttribute('position');
 for(let i=0;i<rp.count;i++)rp.setY(i,rp.getY(i)>0?.015+(rp.getX(i)+4.2)/8.4*.165:0);
 ramp.computeVertexNormals();
 const rampPoint=point(4.8,38.525),rampRotation=new T.Euler(0,-angle,0);
 // Builder transforms its input in place; keep the collider in local space.
 b.add(ramp.clone(),plinth,rampPoint[0],0,rampPoint[1],rampRotation);
 const rampProxy=new T.Mesh(ramp,new T.MeshBasicMaterial({side:T.DoubleSide}));
 rampProxy.position.set(rampPoint[0],0,rampPoint[1]);rampProxy.rotation.copy(rampRotation);
 meshes.push(collisionMesh(rampProxy));cameraSolids.push(rampProxy);
 const railPoint=(u:number,y:number,v:number)=>{const[x,z]=point(u,v);return new T.Vector3(x,y,z);};
 for(const u of[.8,2.7,4.6,6.5,8.4]){
  const rise=.015+(u-.6)/8.4*.165;
  b.cylinder(railPoint(u,rise,39.36),railPoint(u,rise+.98,39.36),.023,.023,doorMats.steel,8);
 }
 for(const h of[.66,.98])b.line([railPoint(.6,h+.015,39.36),railPoint(8.65,h+.173,39.36),railPoint(8.82,h+.15,39.36)],.026,doorMats.steel,8);
 // A thin collision-only envelope keeps the player from crossing the rail.
 const railProxy=new T.Mesh(new T.BoxGeometry(8.4,1.16,.06),new T.MeshBasicMaterial({side:T.DoubleSide}));
 const railPosition=point(4.8,39.36);railProxy.position.set(railPosition[0],.58,railPosition[1]);railProxy.rotation.y=-angle;
 meshes.push(collisionMesh(railProxy));cameraSolids.push(railProxy);
 const schoolCanvas=document.createElement('canvas');schoolCanvas.width=180;schoolCanvas.height=1440;
 const schoolCtx=schoolCanvas.getContext('2d')!;schoolCtx.textAlign='center';schoolCtx.textBaseline='middle';
 [...'南京大学软件学院'].forEach((s,i)=>{schoolCtx.font=`${i<4?146:134}px ${i<4?'"Kaiti SC","STKaiti",serif':'"PingFang SC",sans-serif'}`;schoolCtx.fillStyle='#68665e';schoolCtx.fillText(s,94,95+i*176,160);schoolCtx.fillStyle='#dddcd2';schoolCtx.fillText(s,90,91+i*176,160);});
 const schoolMat=signMaterial('fei-software-column-lettering',schoolCanvas);schoolMat.transparent=true;schoolMat.depthWrite=false;
 const schoolPoint=point(8.4,37.07);
 b.add(new T.PlaneGeometry(.64,5.12),schoolMat,schoolPoint[0],3.72,schoolPoint[1],new T.Euler(0,yaw,0));
 // The photographed courtyard slogan remains a static canvas sign.
 function signMaterial(name:string,canvas:HTMLCanvasElement){const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;return new T.MeshStandardMaterial({name,map,roughness:.85});}
 const sloganCanvas=document.createElement('canvas');sloganCanvas.width=1320;sloganCanvas.height=660;
 const sc=sloganCanvas.getContext('2d')!;sc.fillStyle='#803456';sc.fillRect(0,0,1320,660);
 // Reconstruct a restrained campus line drawing; never bundle the user photo
 // (which also contains an unrelated screenshot overlay).
 sc.strokeStyle='#b67b99';sc.globalAlpha=.43;sc.lineWidth=2;
 for(const [x,y,w,h]of[[10,380,360,180],[350,430,360,155],[880,410,430,170]]){
  sc.strokeRect(x,y,w,h);sc.beginPath();sc.moveTo(x-20,y);sc.lineTo(x+w*.2,y-65);sc.lineTo(x+w*.5,y-105);sc.lineTo(x+w*.8,y-65);sc.lineTo(x+w+20,y);sc.stroke();
  for(let wx=x+22;wx<x+w-15;wx+=35){sc.strokeRect(wx,y+25,16,42);sc.strokeRect(wx,y+90,16,42);}
  for(let d=8;d<35;d+=8){sc.beginPath();sc.moveTo(x-20,y+d);sc.lineTo(x+w*.5,y-105+d);sc.lineTo(x+w+20,y+d);sc.stroke();}
 }
 sc.globalAlpha=1;sc.fillStyle='#f4ebe5';sc.font='30px "PingFang SC",sans-serif';sc.textAlign='center';sc.textBaseline='middle';
 const sloganLines=['世界上不会有第二个哈佛、牛津、斯坦福、麻省理工、剑桥，但会有','第一个北大、清华、浙大、复旦、南大等中国著名学府。我们要认真吸收','世界上先进的办学治学经验，更要遵循教育规律，扎根中国大地办大学。”'];
 sloganLines.forEach((line,i)=>sc.fillText(line,660,215+i*75,1210));
 const sloganPoint=point(35.5,56.34);
 b.add(new T.PlaneGeometry(6.3,3.15),signMaterial('fei-court-purple-slogan',sloganCanvas),sloganPoint[0],1.83,sloganPoint[1],new T.Euler(0,Math.PI-angle,0));
 // Viewed from the court toward +v, screen-right is decreasing local u.
 // The photographed right-hand glazing sits against the retained rear wall.
 box(30.5,1.7,56.34,2.8,3.35,.035,glass);
 for(const u of[29.1,30.5,31.9])box(u,1.7,56.28,.07,3.4,.07,trim);
 for(const y of[.03,2.75,3.4])box(30.5,y,56.28,2.87,.07,.07,trim);
 for(const u of[30.36,30.64])box(u,1.25,56.20,.04,.58,.06,trim);
 const paving=paint('sheltered-paving',0xb4b7af,true);
 box(36.5,.006,54.6,15,.012,3.6,paving);
 box(52,.006,62.1,6,.012,18.6,paving);
 // Visible ceiling joints make the covered space legible from ground level.
 for(const u of[30,32,34,36,38,40,42])box(u,3.792,54.6,.018,.016,3.6,dark);
 for(const v of[53.6,55.6])box(36.5,3.792,v,15,.016,.018,dark);
 // Equipment follows the actual tower and the long south roof.
 box(31,69.2,13,7,1.6,8,roof,true);
 for(const u of[21,27,33,39,45,51]){box(u,19.5,63,3.8,1,2.2,plinth,true);for(const v of[62.3,63,63.7])box(u,20.05,v,3.8,.07,.10,trim);}
 // User photo locates the traditional horizontal name over the exterior
 // passage. Its calligraphy remains an approximation, not a traced original.
 const canvas=document.createElement('canvas');canvas.width=800;canvas.height=160;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#b1923f';ctx.font='128px "Kaiti SC","STKaiti",serif';ctx.textAlign='center';ctx.textBaseline='middle';
 [...'費彝民樓'].forEach((s,i)=>ctx.fillText(s,112+i*192,80,160));
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const signMat=new T.MeshStandardMaterial({name:'fei-passage-gold-lettering',map,transparent:true,roughness:.55,depthWrite:false});
 const sign=point(52,71.46);
 b.add(new T.PlaneGeometry(3.5,.7),signMat,sign[0],4.2,sign[1],new T.Euler(0,-angle,0));
 return{id:f.id,name:f.tags.name,source:'NJU 2024 plan + official VR scene_gl-3 f / scene_gl-4-02 r + user phase96 software-entry / feiyimin-passage-title / south slogan references + software.nju.edu.cn/lxwm/index.html',height:68.4,windows,roof:'west tower / five-storey south podium / open court',dormitory:false,frontage:[entry[0],entry[1],Math.sin(yaw),Math.cos(yaw)],parts,approximateHeights:true,approximateLettering:true,localFrame:{origin,angle},recess:{u:[-1.5,6.2],v:[21,37.04],clearance:7.2,throughBuilding:false},canopy:{u:[6.8,18.6],v:[36.9,52.95],clearance:7.385},passage:{u:[49,55],v:[52.8,71.4],clearance,approximate:true},sloganAlcove:{u:[29,44],v:[52.8,56.4],clearance,lines:sloganLines,approximateLocation:true},softwareEntry:{u:[9,16.4],v:[34.2,37.04],clearance:7.2,plaque:{u:8.4,v:37.07,face:'left entrance column'}},passagePier:{u:52,v:70.9,width:1,depth:1},labels:[{text:'費彝民樓',orientation:'horizontal',face:'above south through passage'},{text:'南京大学软件学院',orientation:'vertical',face:'left entrance column'}]};
}
