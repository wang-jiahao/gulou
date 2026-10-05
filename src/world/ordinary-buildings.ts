import * as T from 'three';
import { splitBuildingRoof } from './building-roof.ts';
import { Builder, curvedRoof, rng } from './geometry.ts';
import type { Materials } from './materials.ts';
import type { CollisionMesh } from './collision-mesh.ts';
import { collisionMesh } from './collision-mesh.ts';
import { insidePolygon, planShape, type MapFeature, type MapPolygon } from './campus-map.ts';
import {buildFeiYimin} from './fei-yimin.ts';
import {buildPhysicsBuilding} from './physics-building.ts';
import {buildPearlMemorial} from './pearl-memorial.ts';
import {buildZhongshan} from './zhongshan.ts';
import {buildRabeHouse} from './rabe-house.ts';
import {buildChemistryEntrance,chemistryFrontage} from './chemistry-entrance.ts';
import {createChemistryFacade} from './chemistry-facade.ts';
import {buildHospitalEntrance} from './hospital-entrance.ts';
import {buildSportsHall} from './sports-halls.ts';
import {buildLibraryComplex} from './library-complex.ts';
import {buildSpecific} from './specific-buildings.ts';
import {entranceMaterials,addEntrance,type DoorRecord} from './building-entrances.ts';
import { getBuildingProfile } from './building-profiles.ts';
import {createSufuteFacade} from './sufute-facade.ts';
import {createTianFacade} from './tian-facade.ts';
import {createTangFacade} from './tang-facade.ts';
import {buildYifuTower,yifuTower} from './yifu-tower.ts';
import {buildYifuEntrance} from './yifu-entrance.ts';
import {buildTangEntrance} from './tang-entrance.ts';
import {buildNanyuanDining} from './nanyuan-dining.ts';
import {buildYaoliangHall} from './yaoliang-hall.ts';

export const heroIds = ['88778620', '88778613', '88778615', '88778619'];
export function buildOrdinaryBuildings(features: MapFeature[], mats: Materials, roads:MapPolygon[] = []) {
  const doors:DoorRecord[]=[],doorMaterials=entranceMaterials();
  const b = new Builder(), fixedMeshes: CollisionMesh[] = [], cameraSolids: T.Object3D[] = [];
  const occupiedBounds=features.filter(f=>f.tags.building).map(f=>({f,minX:Math.min(...f.points.map(p=>p[0])),maxX:Math.max(...f.points.map(p=>p[0])),minZ:Math.min(...f.points.map(p=>p[1])),maxZ:Math.max(...f.points.map(p=>p[1]))}));
  const occupied=(x:number,z:number)=>occupiedBounds.some(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ&&insidePolygon(x,z,a.f));
  const cameraMaterial = new T.MeshBasicMaterial({ side: T.DoubleSide });
  const roof = new T.MeshStandardMaterial({ name:'background-roof',color:0x515754,roughness:.94 });
  const tile = new T.MeshStandardMaterial({ name:'campus-roof-tile',color:0x4e5553,roughness:.9,side:T.DoubleSide });
  tile.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vTilePosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTilePosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader='varying vec3 vTilePosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nvec2 tileUv=vTilePosition.xz/vec2(.28,.43);vec2 seam=abs(fract(tileUv)-.5);vec2 aa=fwidth(tileUv);float line=max(smoothstep(.44-aa.x,.48+aa.x,seam.x),smoothstep(.45-aa.y,.49+aa.y,seam.y));diffuseColor.rgb*=mix(1.08,.73,line);');
  };
  const ridge = new T.MeshStandardMaterial({name:'campus-roof-ridge',color:0x666c64,roughness:.92});
  const stone = new T.MeshStandardMaterial({name:'campus-trim',color:0xb6b4a8,map:mats.textures.get('stone-grain.webp'),roughness:.94});
  const plinth = new T.MeshStandardMaterial({name:'campus-plinth',color:0x74776f,map:mats.textures.get('stone-grain.webp'),roughness:.96});
  const recess = new T.MeshStandardMaterial({name:'window-reveal',color:0x303a37,roughness:.95});
  const glass = [0x4d6362,0x5d706d,0x3d5357].map((color,i)=>new T.MeshStandardMaterial({name:i===1?'window-glass-warm':'window-glass-cool',color,roughness:.32,metalness:.32,envMapIntensity:.7}));
  const gardenGlass = new T.MeshStandardMaterial({name:'songlin-garden-glazing',color:0x769ba3,roughness:.34,metalness:.22,envMapIntensity:1.1});
  const utility = new T.MeshStandardMaterial({name:'utility-casing',color:0xbdbfb1,roughness:.85});
  const louvre = new T.MeshStandardMaterial({name:'utility-grille',color:0x727a73,roughness:.78});
  const windowGuard = new T.MeshStandardMaterial({name:'window-guard',color:0x87908b,roughness:.65,metalness:.35});
  const archShape=(w:number,h:number)=>{const s=new T.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2-w/2);s.absarc(0,h/2-w/2,w/2,0,Math.PI,false);s.closePath();return s;};
  const paints = new Map<string,T.MeshStandardMaterial>();
  const paint = (color:number,brick=false) => {
    const key=`${color}-${brick}`;
    if(!paints.has(key))paints.set(key,new T.MeshStandardMaterial({name:brick?'campus-masonry':'campus-plaster',color,map:mats.textures.get(brick?'historic-brick.webp':'stone-grain.webp'),roughness:.94}));
    return paints.get(key)!;
  };
  const detailCells = new Map<string,{b:Builder;center:T.Vector3;group?:T.Group}>();
  const plaques=new T.Group();plaques.name='Nanyuan dormitory entrances and number plates';
  const sufute=createSufuteFacade(),tian=createTianFacade(),tang=createTangFacade(),chemistry=createChemistryFacade();
  let yifu:ReturnType<typeof buildYifuEntrance>|undefined;
  let yifuUpper:ReturnType<typeof buildYifuTower>|undefined;
  let tangEntrance:ReturnType<typeof buildTangEntrance>|undefined;
  let chemistryEntry:ReturnType<typeof buildChemistryEntrance>|undefined;
  const records: {id:string;name:string;source:string;height:number;windows:number;roof:string;dormitory:boolean;frontage?:number[];entrance?:ReturnType<typeof buildHospitalEntrance>}[]=[];
  for (const f of features) {
    if (!f.tags.building || f.tags['gulou:custom-model'] || heroIds.includes(f.id) || f.points.length < 3) continue;
    if(f.id==='plan-66'){records.push(buildLibraryComplex(mats,b,fixedMeshes,cameraSolids,doors,doorMaterials));continue;}
    if(f.id==='plan-4'){records.push(buildFeiYimin(f,mats,b,fixedMeshes,cameraSolids,doors,doorMaterials));continue;}
    if(f.id==='plan-70'){records.push(buildPhysicsBuilding(f,b,fixedMeshes,cameraSolids,doors));continue;}
    if(f.id==='plan-50'){records.push(buildPearlMemorial(f,mats,b,fixedMeshes,cameraSolids,doors));continue;}
    if(f.id==='plan-128'){records.push(buildRabeHouse(f,b,fixedMeshes,cameraSolids,doors));continue;}
    if(f.id==='plan-77'){records.push(buildZhongshan(f,b,fixedMeshes,cameraSolids,doors));continue;}
    if(f.id==='plan-113'){records.push(buildNanyuanDining(f,b,fixedMeshes,cameraSolids,doors));continue;}
    if(f.id==='plan-114'){records.push(buildYaoliangHall(f,mats,b,fixedMeshes,cameraSolids,doors));continue;}
    if(f.id==='plan-6'||f.id==='plan-13'){records.push(buildSportsHall(f,b,fixedMeshes,cameraSolids,doors));continue;}
    const specific=buildSpecific(f,mats,b,fixedMeshes,cameraSolids,doors,doorMaterials);if(specific){records.push(specific);continue;}
    const profile=getBuildingProfile(f),teaching=f.id==='teaching-priority',points=f.points,shape=planShape(f);
    const height=teaching?16.6:f.id==='plan-10'?yifuTower.height:profile.levels*3.25, floorHeight=height/profile.levels;
    const wall=paint(profile.wall,profile.style==='historic'||profile.style==='villa'),defaultFrame=paint(profile.frame);
    const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
    const key=`${Math.floor(cx/100)}:${Math.floor(cz/100)}`;
    if(!detailCells.has(key))detailCells.set(key,{b:new Builder(),center:new T.Vector3((Math.floor(cx/100)+.5)*100,0,(Math.floor(cz/100)+.5)*100)});
    const detail=detailCells.get(key)!.b;
    if(f.id==='plan-10')yifu=buildYifuEntrance(f,b,fixedMeshes,cameraSolids,doors,height,wall,roof);
    else if(f.id==='plan-22')tangEntrance=buildTangEntrance(f,b,detail,fixedMeshes,cameraSolids,doors,height,wall,roof,tang.materials);
    else{
    const geometry = new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
    const uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);
    const proxy=new T.Mesh(geometry.clone(),cameraMaterial);cameraSolids.push(proxy);fixedMeshes.push(collisionMesh(proxy));
    const surfaces=splitBuildingRoof(geometry);
    b.add(surfaces.walls,wall);b.add(surfaces.roof,roof);geometry.dispose();
    }
    const random=rng(Number(f.tags.plan_id)*71+24);let windows=0;let frontView:number[]|undefined;let entrance:ReturnType<typeof buildHospitalEntrance>|undefined;
    const edges:{len:number;x:number;z:number;angle:number;nx:number;nz:number}[]=[];
    for(const [ri,ring]of [points,...(f.holes??[])].entries())for(let edge=0;edge<ring.length;edge++){
      const [x0,z0]=ring[edge],[x1,z1]=ring[(edge+1)%ring.length],len=Math.hypot(x1-x0,z1-z0);if(len<.6)continue;
      let nx=-(z1-z0)/len,nz=(x1-x0)/len;
      const mx=(x0+x1)/2,mz=(z0+z1)/2;
      const frame=defaultFrame;
      if(insidePolygon(mx+nx*.18,mz+nz*.18,f)){nx=-nx;nz=-nz;}
      const angle=Math.atan2(nx,nz);
      // Positive local Z is always outdoors, including courtyard hole rings.
      const put=(target:Builder,u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material)=>{
        const x=mx+u*Math.cos(angle)+v*nx,z=mz-u*Math.sin(angle)+v*nz;
        if(glass.some(g=>g===mat)||mat===gardenGlass)target.add(new T.PlaneGeometry(w,h),mat,x,y,z,new T.Euler(0,angle,0));
        else target.box(w,h,d,x,y,z,mat,false,angle);
      };
      if(!ri)edges.push({len,x:mx,z:mz,angle,nx,nz});
      if(f.id==='plan-10')continue;
      if(f.id==='plan-3'&&!ri&&chemistry.accepts({len,x:mx,z:mz,angle,nx,nz})){
        windows+=chemistry.face(b,detail,{len,x:mx,z:mz,angle,nx,nz});continue;
      }
      if(f.id==='plan-22'&&!ri&&tang.accepts({len,x:mx,z:mz,angle,nx,nz})){
        windows+=tang.face(b,detail,{len,x:mx,z:mz,angle,nx,nz},height);continue;
      }
      if(f.id==='plan-12'&&!ri&&nx>.98&&len>8){
        windows+=sufute.face(b,detail,{len,x:mx,z:mz,angle,nx,nz},height);continue;
      }
      if(f.id==='plan-17'&&!ri&&len>15&&(nx>.98||nz<-.98)){
        windows+=tian.face(b,detail,plaques,{len,x:mx,z:mz,angle,nx,nz},height);continue;
      }
      put(b,0,.42,.025,len,.84,.12,plinth);
      // A thin finish stays behind the existing reveals and glass, so the
      // darker storey cannot cover windows or alter the physical footprint.
      if(profile.groundWall!==undefined)put(b,0,floorHeight*.525,.006,len,floorHeight*1.05,.018,paint(profile.groundWall));
      put(b,0,height-.12,.02,len,.22,.30,stone);
      put(b,0,height+.18,0,len,.30,.20,wall);
      if(profile.bands)for(let floor=1;floor<profile.levels;floor++){
        const y=floor*floorHeight+.1;
        put(b,0,y,.04,len,.16,.22,stone);
      }
      // The visible garden faces of Songlin have broad ground-floor glazing.
      // Keep the north entrance and all upper storeys on the existing profile.
      const glazedGarden=profile.gardenGlazing&&!ri&&(nx<-.7||nz>.7)&&len>3;
      if(glazedGarden){
        const width=len-.48,bottom=.88,top=floorHeight-.16,panes=Math.max(2,Math.ceil(width/1.65));
        put(b,0,(bottom+top)/2,.075,width,top-bottom,.02,gardenGlass);
        for(const y of[bottom-.035,top+.035])put(b,0,y,.10,width+.16,.075,.19,stone);
        for(let pane=0;pane<=panes;pane++)put(b,width*(pane/panes-.5),(bottom+top)/2,.115,.055,top-bottom+.08,.15,defaultFrame);
        windows+=panes;
      }
      const bays=Math.floor((len-.8)/profile.bays);
      if(profile.style==='glass')for(let j=0;j<=bays;j++){
        const u=len*((j+.5)/(bays+1)-.5);
        put(b,u,height/2,.07,.18,height,.24,stone);
      }
      for(let j=0;j<bays;j++)for(let floor=0;floor<profile.levels;floor++){
        const u=len*((j+1)/(bays+1)-.5),y=floorHeight*(floor+.60),w=Math.min(profile.windowWidth,len/(bays+1)*.76),h=Math.min(profile.windowHeight,floorHeight*.72);
        const g=glass[Math.floor(random()*glass.length)];
        if(glazedGarden&&floor===0)continue;
        // The photographed entry replaces only the central bays on the old
        // procedural frontage; consume the same RNG sample before skipping.
        if(f.id==='plan-80'&&!ri&&edge===0&&Math.abs(u)-w/2<6.5)continue;
        if(f.id==='plan-3'&&!ri&&floor<2&&chemistryFrontage({len,x:mx,z:mz,angle,nx,nz})&&Math.abs(u)-w/2<11.7)continue;
        if(profile.arched){
          const x=mx+u*Math.cos(angle),z=mz-u*Math.sin(angle);
          b.add(new T.ExtrudeGeometry(archShape(w+.20,h+.20),{depth:.10,bevelEnabled:false}),stone,x+.02*nx,y,z+.02*nz,new T.Euler(0,angle,0));
          b.add(new T.ShapeGeometry(archShape(w,h)),g,x+.13*nx,y,z+.13*nz,new T.Euler(0,angle,0));
        }else{put(b,u,y,.03,w+.14,h+.15,.07,recess);put(b,u,y,.075,w,h,.025,g);}
        windows++;
        for(const side of [-1,1]){
          put(detail,u+side*w/2,y,.12,.065,h+.1,.15,frame);
          if(!profile.arched||side<0)put(detail,u,y+side*h/2,.12,w+.12,.075,.15,frame);
        }
        put(detail,u,y,.13,.052,h,.16,frame);
        put(detail,u,y+h*.19,.13,w,.048,.16,frame);
        if(w>2.2)for(const side of[-1,1])put(detail,u+side*w*.26,y,.12,.04,h,.13,frame);
        put(detail,u,y-h/2-.08,.14,w+.28,.10,.40,stone);
        put(detail,u,y+h/2+.1,.09,w+.18,.10,.23,stone);
        // Leave the central entry bay clear; only the confirmed ground-floor
        // treatment is applied, rather than inventing cages on every storey.
        if(profile.groundWindowGuards&&floor===0&&Math.abs(u)>2.6){
          for(const side of[-1,1]){
            put(detail,u,y+side*h/2,.32,w+.1,.035,.055,windowGuard);
            put(detail,u+side*w/2,y,.20,.035,h,.28,windowGuard);
          }
          const bars=Math.ceil(w/.22);
          for(let q=1;q<bars;q++)put(detail,u+w*(q/bars-.5),y,.32,.022,h,.03,windowGuard);
        }
        if(profile.ac&&(j+floor)%3===0&&floor>0){
          put(detail,u+w*.35,y-h*.73,.33,.70,.45,.45,utility);
          put(detail,u+w*.35,y-h*.73,.57,.52,.31,.025,louvre);
          for(const offset of[-.1,0,.1])put(detail,u+w*.35,y-h*.73+offset,.59,.52,.015,.02,utility);
        }
        if(profile.balcony&&floor>0){
          put(detail,u,y-h/2-.14,.38,w+.5,.14,.8,stone);
          put(detail,u,y-h/2+.42,.70,w+.5,.10,.10,frame);
          for(let q=-2;q<=2;q++)put(detail,u+q*w/5,y-h/2+.14,.70,.035,.55,.045,frame);
        }
      }
      if(len>8)for(const u of[-len/2+.24,len/2-.24]){
        put(detail,u,height/2,.18,.075,height,.075,plinth);
        for(let y=1;y<height;y+=3.3)put(detail,u,y,.2,.14,.045,.14,stone);
      }
    }
    if(f.id==='plan-10'){yifuUpper=buildYifuTower(f,b,detail,fixedMeshes,cameraSolids,yifu!.localFrame);windows=yifuUpper.windows;}
    if(f.id==='plan-3')chemistry.roof(b,detail,fixedMeshes,cameraSolids,edges,edges.find(chemistryFrontage)!);
    // Pitched roofs fit an inscribed rectangle; holes and irregular wings are never
    // covered with a bounding-box roof across their open courtyard.
    if(profile.roof!=='flat'&&!(f.holes?.length)){
      const edge=[...edges].sort((a,c)=>c.len-a.len)[0];
      if(edge){
        const a=edge.angle,cos=Math.cos(a),sin=Math.sin(a);
        const local=points.map(([x,z])=>[(x-cx)*cos-(z-cz)*sin,(x-cx)*sin+(z-cz)*cos]);
        let w=Math.max(...local.map(p=>p[0]))-Math.min(...local.map(p=>p[0]));
        let d=Math.max(...local.map(p=>p[1]))-Math.min(...local.map(p=>p[1]));
        let roofX=cx,roofZ=cz;
        // Irregular/L-shaped buildings keep their perimeter and use a roof over
        // a verified interior part, with the remaining terraces left flat.
        for(let attempt=0;attempt<7;attempt++){
          const fits=[[-.47,-.47],[.47,-.47],[.47,.47],[-.47,.47],[0,0]].every(([u,v])=>insidePolygon(roofX+u*w*cos+v*d*sin,roofZ-u*w*sin+v*d*cos,f));
          if(fits)break;
          if(attempt===2){roofX=edge.x-edge.nx*2.5;roofZ=edge.z-edge.nz*2.5;w=edge.len*.85;d=4.5;}
          else{w*=.88;d*=.88;}
        }
        if(w>3&&d>3){
          const rb=new Builder();curvedRoof(rb,0,0,w+.8,d+.8,height+.35,Math.min(3.6,d*.24),tile,ridge,false);
          const rg=rb.finish('roof');rg.position.set(roofX,0,roofZ);rg.rotation.y=a;rg.updateMatrixWorld(true);
          for(const child of rg.children)if(child instanceof T.Mesh){fixedMeshes.push(collisionMesh(child,true));cameraSolids.push(child);b.add(child.geometry.clone().applyMatrix4(child.matrixWorld),child.material as T.Material);}
        }
      }
    }
    if(profile.dome){
      const radius=3.6,dy=height+2.0;
      b.add(new T.CylinderGeometry(radius,radius,2,32),stone,cx,height+1,cz);
      const hemisphere=new T.SphereGeometry(radius,32,14,0,Math.PI*2,0,Math.PI/2);
      const domeMat=new T.MeshStandardMaterial({name:'observatory-dome',color:0x9eaead,metalness:.42,roughness:.4});
      const domeMesh=new T.Mesh(hemisphere,domeMat);domeMesh.position.set(cx,dy,cz);fixedMeshes.push(collisionMesh(domeMesh,true));cameraSolids.push(domeMesh);b.add(hemisphere.clone(),domeMat,cx,dy,cz);
      b.box(.28,3.9,.3,cx,dy+1.5,cz+radius*.45,plinth);
      // Short polygon segments around the tower cannot fit a regular bay.
      for(const x of [-386.8,-384.3,-381.8])for(const y of [1.65,5.2,8.35]){
        const z=131.72-Math.abs(x+384.3)*.14;
        if(y<2){
          const arch=new T.Shape();arch.moveTo(-.77,-1.2);arch.lineTo(.77,-1.2);arch.lineTo(.77,.52);arch.absarc(0,.52,.77,0,Math.PI,false);arch.closePath();
          detail.add(new T.ExtrudeGeometry(arch,{depth:.12,bevelEnabled:false}),stone,x,y,z);
        }else detail.box(1.5,2.25,.12,x,y,z+.06,stone);
        detail.box(1.12,1.85,.06,x,y-.08,z+.16,y<2?recess:glass[0]);
        detail.box(.055,1.85,.09,x,y-.08,z+.21,defaultFrame);
      }
    }
    if(f.id==='plan-10')frontView=yifu!.frontage;
    if(f.id==='plan-22')frontView=tangEntrance!.frontage;
    if(!teaching&&f.id!=='plan-10'&&f.id!=='plan-22'){
      // Choose a long exterior facade facing the nearest public route, rather
      // than putting a doorway onto an inner hole or a two-metre return wall.
      const candidates=edges.filter(e=>e.len>7),scores=new Map<typeof edges[number],number>();const frontage=f.id==='plan-3'?edges.find(chemistryFrontage):f.id==='plan-17'?edges.find(e=>e.nx>.98&&e.len>15):candidates.sort((a,c)=>{
        const score=(e:typeof a)=>{
          if(scores.has(e))return scores.get(e)!;
          let best=10000;
          for(const distance of [3,5,8,12,18]){
            const x=e.x+e.nx*distance,z=e.z+e.nz*distance;
            if(occupied(x,z))continue;
            const clear=[.6,1.2,2.0,distance*.6].every(d=>!occupied(e.x+e.nx*d,e.z+e.nz*d));
            if(!clear)continue;
            best=Math.min(best,distance+(roads.some(r=>insidePolygon(x,z,r))?0:35)-Math.min(e.len,30)*.02);
          }
          scores.set(e,best);return best;
        };
        return score(a)-score(c);
      })[0];
      if(frontage){
        frontView=[frontage.x,frontage.z,frontage.nx,frontage.nz];
        const e=frontage,w=Math.min(3.8,e.len*.38);
        if(f.id==='plan-12')sufute.name(plaques,e);
        const put=(u:number,y:number,v:number,bw:number,bh:number,bd:number,mat:T.Material)=>detail.box(bw,bh,bd,e.x+u*Math.cos(e.angle)+v*e.nx,y,e.z-u*Math.sin(e.angle)+v*e.nz,mat,false,e.angle);
        if(f.id==='plan-17')frontView=tian.entrance(b,fixedMeshes,doors,e);
        else if(f.id==='plan-3')chemistryEntry=buildChemistryEntrance(b,fixedMeshes,cameraSolids,doors,e);
        else if(f.id==='plan-80')entrance=buildHospitalEntrance(b,fixedMeshes,cameraSolids,plaques,doors,e.x,e.z,e.angle);
        else{
          addEntrance(b,fixedMeshes,doors,doorMaterials,f.tags.name,e.x,e.z,e.angle,w,0);
          const depth=profile.portal==='glass'?1.1:.7;put(0,3.17,depth*.4,w+1.05,.15,depth,stone);
        }
        if(profile.portal==='columns')for(const side of[-1,1])put(side*(w/2+.3),1.52,.5,.18,2.9,.22,stone);
        if(profile.style==='villa'&&profile.balcony){put(0,3.52,.85,w+.7,.13,.13,stone);for(let q=-4;q<=4;q++)put(q*w/8,3.3,.85,.075,.45,.08,stone);}
        if(['plan-34','plan-71','plan-113','plan-117','plan-100'].includes(f.id)){
          const name=f.tags.name;
          const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d')!;
          ctx.fillStyle='#b9b8ac';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#776339';ctx.font='76px "Kaiti SC","STKaiti",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,512,68,990);
          const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
          const sign=new T.Mesh(new T.PlaneGeometry(5,.62),new T.MeshStandardMaterial({map:texture,roughness:.6,transparent:true,depthWrite:false}));const projection=.52;sign.position.set(e.x+e.nx*projection,3.65,e.z+e.nz*projection);sign.rotation.y=e.angle;plaques.add(sign);
        }
        if(profile.style==='dormitory'){
          const numbers=['零','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','二十一'];
          const name=f.tags.name.replace(/\d+/g,n=>numbers[Number(n)]??n);
          const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d')!;
          ctx.fillStyle=f.id==='plan-123'?'#614137':'#294657';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#c5c4ae';ctx.lineWidth=5;ctx.strokeRect(8,8,752,176);
          ctx.fillStyle='#f3efdc';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 72px "Songti SC",serif';ctx.fillText(name,384,100);
          const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
          const plaque=new T.Mesh(new T.PlaneGeometry(3.4,.68),new T.MeshStandardMaterial({map:texture,roughness:.85}));plaque.name=name;
          plaque.position.set(e.x+e.nx*.32,3.75,e.z+e.nz*.32);plaque.rotation.y=e.angle;plaques.add(plaque);
          // Doorway transom and a roof over the bicycle-side entrance distinguish
          // the dormitory base from the repeated residential floors above it.
          put(0,2.44,.29,w-.32,.36,.06,glass[1]);
          for(const side of[-1,1])put(side*(w/2+.52),.22,.22,.65,.44,.65,plinth);
        }
      }
    }
    records.push({id:f.id,name:f.tags.name,source:profile.source,height,windows,roof:profile.roof,dormitory:profile.style==='dormitory',frontage:frontView,...(entrance?{entrance}:{})});
  }
  // Every triangle remains present. Independent bounds let the renderer cull
  // buildings outside the camera or shadow frustum instead of drawing campus-wide batches.
  const group=b.finish('plan-based campus buildings with VR facade profiles',120);
  group.add(plaques);
  for(const mesh of group.children)if(mesh instanceof T.Mesh&&(glass.includes(mesh.material as T.MeshStandardMaterial)||mesh.material===gardenGlass)){mesh.receiveShadow=false;mesh.castShadow=false;}
  group.userData.buildings=records;
  group.userData.sufuteFacade=sufute.metadata;
  group.userData.tianFacade=tian.metadata;
  group.userData.tangFacade=tang.metadata;
  group.userData.tangEntrance=tangEntrance;
  group.userData.chemistryEntrance=chemistryEntry;
  group.userData.chemistryFacade=chemistry.metadata;
  if(yifu){const{local,...metadata}=yifu;void local;group.userData.yifuEntrance=metadata;group.userData.yifuTower=yifuUpper;}
  for(const cell of detailCells.values()){cell.group=cell.b.finish('nearby facade details');cell.group.visible=false;for(const mesh of cell.group.children)mesh.castShadow=false;group.add(cell.group);}
  let detailShadows=false;
  const updateVisibility=(position:T.Vector3,quality:string,flying:boolean)=>{
    const shadows=quality==='high'&&!flying;
    if(shadows!==detailShadows){for(const cell of detailCells.values())for(const mesh of cell.group!.children)mesh.castShadow=shadows;detailShadows=shadows;}
    const range=flying?(quality==='high'?125:85):quality==='high'?200:quality==='low'?85:115;
    for(const cell of detailCells.values())cell.group!.visible=position.distanceTo(cell.center)<range;
  };
  return {group,fixedMeshes,cameraSolids,updateVisibility,records,doors};
}
