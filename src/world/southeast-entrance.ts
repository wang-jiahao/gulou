import * as T from 'three';
import {Builder,curvedRoof} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

export const southeastFrontage=(e:{nx:number;len:number})=>e.nx<-.98&&e.len>35;
/** Official gl-2-12-f: a west entrance with red joinery, a stone portal,
 * long stairs and the copper medical-school plaque on the right pier.
 * Dimensions are fitted estimates. Retain the closed original building shell. */
export function buildSoutheastEntrance(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],doors:DoorRecord[],e:{x:number;z:number;nx:number;nz:number;angle:number}){
  const mat=(name:string,color:number,roughness=.9)=>new T.MeshStandardMaterial({name:`southeast-${name}`,color,roughness});
  const stone=mat('limestone',0xc8c4b5),joint=mat('stone-recess',0xaaa798),red=mat('red-joinery',0x803b3f),glass=mat('dark-door-glass',0x334d48,.43),tile=mat('grey-tile',0x6d7470),metal=mat('lantern-frame',0x565d56),lantern=mat('lantern-glass',0xb0bbb0,.65);
  const point=(u:number,v:number)=>({x:e.x+u*e.nz+v*e.nx,z:e.z-u*e.nx+v*e.nz});
  const boxes:{kind:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
  const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,kind?:string)=>{
    const p=point(u,v);b.box(w,h,d,p.x,y,p.z,m,false,e.angle);
    if(kind){const proxy=new T.Mesh(new T.BoxGeometry(w,h,d));proxy.position.set(p.x,y,p.z);proxy.rotation.y=e.angle;meshes.push(collisionMesh(proxy));camera.push(proxy);boxes.push({kind,u,y,v,w,h,d});}
  };
  const landing=2.10,risers=14,run=.42;
  box(0,landing/2,1.34,5.60,landing,2.68,stone,'landing');
  for(let i=0;i<risers;i++){
    const top=(i+1)*.15,v=2.68+(risers-i-.5)*run;
    box(0,top/2,v,5.60,top,run+.018,stone,'step');box(0,top+.008,v+run/2-.025,5.60,.023,.055,joint);
  }
  // A shallow portal covers only the entrance bay, with large rectangular
  // blocks, recessed panels, projecting entablature and a grey tiled cap.
  box(0,4.06,.19,4.42,3.90,.13,glass,'closed-inner-door');
  for(const s of [-1,1]){
    box(s*2.81,4.18,.70,1.04,4.16,1.26,stone,'portal-pier');
    box(s*2.81,landing+.16,.83,1.15,.32,1.45,stone);
    box(s*2.81,4.27,1.345,.72,3.45,.018,joint);
    box(s*2.81,4.27,1.362,.65,3.38,.018,stone);
  }
  box(0,6.20,.70,6.70,.38,1.36,stone,'lintel');box(0,6.48,.80,7.04,.18,1.65,stone);
  // Keep the photograph's two side leaves and tall upper transom. The dark
  // inner surface meets the pre-existing exterior-only building collision.
  for(const s of [-1,1]){
    box(s*1.48,3.38,.43,1.04,2.54,.14,red);box(s*1.48,3.72,.51,.78,1.26,.025,glass);
    for(const du of[-.40,0,.40])box(s*1.48+du,3.72,.545,.045,1.34,.035,red);
    box(s*1.48,3.73,.55,.82,.045,.035,red);box(s*1.48,2.70,.53,.72,.35,.035,red);
    box(s*2.10,4.10,.48,.14,4.0,.18,red);
  }
  for(const y of [4.72,5.94])box(0,y,.48,4.24,.14,.18,red);
  box(0,5.33,.39,4.13,1.05,.035,glass);
  for(const u of [-1.08,0,1.08])box(u,5.33,.48,.09,1.10,.15,red);
  // Four carved circular details above the door, without inventing lettering.
  for(const u of [-1.32,-.44,.44,1.32]){
    const p=point(u,1.42);b.add(new T.CylinderGeometry(.105,.105,.06,8).rotateX(Math.PI/2),stone,p.x,6.12,p.z,new T.Euler(0,e.angle,0));
  }
  const rb=new Builder();curvedRoof(rb,0,.78,7.48,2.24,6.58,.46,tile,stone,false);
  const roof=rb.finish('southeast entrance tiled cap');roof.position.set(e.x,0,e.z);roof.rotation.y=e.angle;roof.updateMatrixWorld(true);
  for(const child of roof.children)if(child instanceof T.Mesh){const g=child.geometry.clone().applyMatrix4(child.matrixWorld),proxy=new T.Mesh(g.clone());meshes.push(collisionMesh(proxy,true));camera.push(proxy);b.add(g,child.material as T.Material);}
  // Squared stone posts, continuous sloping handrails and narrow balusters.
  for(const s of [-1,1]){
    const u=s*3.02,v0=2.42,v1=8.38,y0=landing+.76,y1=.89;
    box(u,landing+.76,1.54,.28,.20,1.78,stone,'landing-rail');
    for(const v of [.75,1.60])box(u,landing+.42,v,.24,.84,.24,stone,'landing-post');
    const center=point(u,(v0+v1)/2),length=Math.hypot(v1-v0,y0-y1),tilt=Math.atan2(y0-y1,v1-v0);
    const geometry=new T.BoxGeometry(.28,.20,length),rotation=new T.Euler(tilt,e.angle,0,'YXZ');
    const proxy=new T.Mesh(geometry.clone());proxy.position.set(center.x,(y0+y1)/2,center.z);proxy.rotation.copy(rotation);meshes.push(collisionMesh(proxy));camera.push(proxy);b.add(geometry,stone,center.x,(y0+y1)/2,center.z,rotation);
    for(let i=0;i<=7;i++){
      const v=v0+(v1-v0)*i/7,y=landing*(1-i/7);
      box(u,y+.42,v,.27,.84,.27,stone,'rail-post');box(u,y+.90,v,.36,.16,.36,stone);
      if(i===7)continue;
      const vv=v+(v1-v0)/14,yy=landing*(1-(i+.5)/7);box(u,yy+.38,vv,.16,.67,.16,stone,'baluster');
    }
  }
  // The original lanterns are unlit fixtures; no new dynamic lamps.
  for(const s of [-1,1]){
    box(s*2.81,4.96,1.57,.30,.58,.22,lantern);
    for(const du of [-.17,.17])box(s*2.81+du,4.96,1.71,.045,.68,.035,metal);
    for(const y of [4.64,5.28])box(s*2.81,y,1.60,.40,.065,.30,metal);
  }
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#aa7959';ctx.fillRect(0,0,768,512);ctx.strokeStyle='#77563f';ctx.lineWidth=10;ctx.strokeRect(12,12,744,488);
  ctx.fillStyle='#423d30';ctx.font='bold 120px "Kaiti SC","STKaiti",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('南京大学',384,170,700);ctx.fillText('医学院',384,355,610);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const plaqueMaterial=new T.MeshStandardMaterial({name:'southeast-medical-school-plaque',map:texture,roughness:.65,metalness:.2});
  const plaque=point(2.81,1.39);b.add(new T.PlaneGeometry(.79,.55),plaqueMaterial,plaque.x,4.13,plaque.z,new T.Euler(0,e.angle,0));
  const door=point(0,.32);doors.push({name:'东南楼',x:door.x,y:landing,z:door.z,yaw:e.angle,width:4.1});
  return {source:'NJU official VR scene_gl-2-12-f; official building note115',frontage:[e.x,e.z,e.nx,e.nz],landing,risers,boxes,plaque:{text:'南京大学医学院',u:2.81,y:4.13,v:1.39},estimatedDimensions:true};
}
