import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

type Edge={len:number;x:number;z:number;angle:number;nx:number;nz:number};
/** gl-4-10 b shows the five-storey north face; gl-4-09 f shows the
 * east entrance. The user map resolves these from the taller Yifu building.
 * Footprint, storey heights, hidden faces and lettering shapes remain approximate. */
export function createTianFacade(){
 const mat=(name:string,color:number)=>new T.MeshStandardMaterial({name:`tian-${name}`,color,roughness:.88});
 const wall=mat('pale-wall',0xd2d0c5),stone=mat('base-stone',0x9b8c79),trim=mat('ledge',0xbabcb4),reveal=mat('recess',0x35403b),frame=mat('silver-frame',0xa5afaa),glass=mat('grey-glass',0x647873),door=mat('entrance-stone',0x795f4f);
 glass.roughness=.35;glass.metalness=.22;frame.metalness=.35;
 const canvas=document.createElement('canvas');canvas.width=96;canvas.height=768;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#b99850';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 68px "Kaiti SC","STKaiti",serif';
 [...'田家炳艺术书院'].forEach((c,i)=>ctx.fillText(c,48,65+i*98,84));
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const lettering=new T.MeshStandardMaterial({name:'tian-gold-lettering',map:texture,transparent:true,alphaTest:.08,roughness:.65});
 const faces:{role:string;frontage:number[];bays:number}[]=[];
 const metadata={source:'official VR gl-4-10 b / gl-4-09 f + user campus plan',rows:5,dimensions:'approximate; hidden south/west faces retain generic treatment',lettering:'text and vertical arrangement verified; font approximate',faces};
 const box=(target:Builder,e:Edge,u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>target.box(w,h,d,e.x+u*e.nz+v*e.nx,y,e.z-u*e.nx+v*e.nz,m,false,e.angle);
 const sign=(plaques:T.Group,e:Edge,u:number)=>{
  const mesh=new T.Mesh(new T.PlaneGeometry(.72,5.76),lettering);mesh.name='田家炳艺术书院 · '+(e.nz<-.9?'north':'east')+' inscription';
  mesh.position.set(e.x+u*e.nz+e.nx*.1,10.65,e.z-u*e.nx+e.nz*.1);mesh.rotation.y=e.angle;mesh.userData={text:'田家炳艺术书院',font:'approximate'};plaques.add(mesh);
 };
 return{
  metadata,
  face(b:Builder,detail:Builder,plaques:T.Group,e:Edge,height:number){
   const north=e.nz<-.9,role=north?'north-courtyard':'east-road',rows=5,storey=height/rows,bays=north?10:5;
   const span=north?e.len*.64:e.len*.70,step=span/bays,offset=north?0:e.len*.10;
   box(b,e,0,1.5,.025,e.len,3,.08,stone);
   box(b,e,0,height-.1,.07,e.len,.24,.26,trim);
   box(b,e,0,height+.18,0,e.len,.30,.20,wall);
   for(let row=0;row<rows;row++){
    const slot=north&&(row===0||row===4),h=slot?.65:1.46,y=slot?(row===0?2.36:height-1.28):(row+.59)*storey;
    for(let bay=0;bay<bays;bay++){
     const u=offset+(bay-(bays-1)/2)*step,w=step-.24;
     box(b,e,u,y,.04,w+.15,h+.16,.08,reveal);
     b.add(new T.PlaneGeometry(w,h),glass,e.x+u*e.nz+e.nx*.091,y,e.z-u*e.nx+e.nz*.091,new T.Euler(0,e.angle,0));
     for(const side of[-1,1]){
      box(detail,e,u+side*w/2,y,.13,.065,h+.08,.10,frame);
      box(detail,e,u,y+side*h/2,.13,w+.08,.06,.10,frame);
     }
     box(detail,e,u,y,.13,.045,h,.10,frame);
     if(!slot)box(detail,e,u,y+h*.17,.13,w,.045,.10,frame);
    }
    if(row>0)box(b,e,offset,row*storey+.10,.18,span+.3,.19,.42,trim);
   }
   for(let bay=0;bay<=bays;bay++)box(b,e,offset+(bay-bays/2)*step,height*.55,.21,.19,height*.86,.47,wall);
   // Small flanking slots and projecting sunshades on the north elevation.
   if(north)for(const side of[-1,1])for(let row=0;row<rows;row++){
    const u=side*e.len*.375,w=e.len*.095,y=row*storey+2.32;
    box(b,e,u,y,.04,w,.60,.09,reveal);
    for(const k of[-1,0,1])box(detail,e,u+k*w/4,y,.12,.055,.61,.10,frame);
    if(row>0)box(b,e,u,y+.62,.36,w+.45,.18,.78,trim);
   }
   if(north){
    // The stone feature contains two pairs of small framed windows; its
    // surface sits ahead of the surrounding fins, as seen in gl-4-10 b.
    box(b,e,0,8.18,.52,4.7,4.7,.16,door);
    for(const side of[-1,1])for(const row of[-1,1]){
     const u=side*.96,y=8.18+row*.72,w=1.16,h=.82;
     box(b,e,u,y,.615,w+.18,h+.18,.05,reveal);
     box(b,e,u,y,.65,w,h,.04,glass);
     for(const edge of[-1,1]){
      box(detail,e,u+edge*w/2,y,.70,.06,h+.08,.08,frame);
      box(detail,e,u,y+edge*h/2,.70,w+.06,.06,.08,frame);
     }
     box(detail,e,u,y,.70,.045,h,.08,frame);
     box(b,e,u,y+h/2+.22,.78,1.55,.18,.48,stone);
    }
    box(b,e,0,8.18,.70,.20,3.7,.24,stone);
   }
   sign(plaques,e,-e.len*(north?.455:.405));
   faces.push({role,frontage:[e.x,e.z,e.nx,e.nz],bays});
   return rows*(bays+(north?2:0));
  },
  entrance(b:Builder,meshes:CollisionMesh[],doors:DoorRecord[],e:Edge){
   // The east-side portal sits below the vertical lettering, left of the
   // window grid in gl-4-09 f. Keep the approach at existing ground level.
   const u=-e.len*.405,w=2.25;
   box(b,e,u,1.55,.12,3.6,3.1,.28,door);
   box(b,e,u,1.30,.275,w,2.6,.10,reveal);
   for(const side of[-1,1])box(b,e,u+side*w/2,1.31,.35,.09,2.64,.12,frame);
   box(b,e,u,2.62,.35,w+.1,.09,.12,frame);
   box(b,e,u,1.28,.34,.07,2.56,.12,frame);
   for(const side of[-1,1])box(b,e,u+side*.10,1.30,.44,.045,.46,.06,frame);
   const x=e.x+u*e.nz+e.nx*.37,z=e.z-u*e.nx+e.nz*.37;
   const proxy=new T.Mesh(new T.BoxGeometry(w,2.6,.08));proxy.position.set(x,1.3,z);proxy.rotation.y=e.angle;meshes.push(collisionMesh(proxy));
   doors.push({name:'田家炳艺术书院',x,y:0,z,yaw:e.angle,width:w});
   return [x,z,e.nx,e.nz];
  }
 };
}
