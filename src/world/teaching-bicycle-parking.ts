import * as T from 'three';
import {createBicycle,type CampusBicycle} from './bicycle.ts';
import {Builder} from './geometry.ts';
import type {Materials} from './materials.ts';

// Open rows visible in official VR gl-3-16, gl-2-22 and gl-2-53.
// Counts and spacing are fitted to this model; these are not surveyed stalls.
export const teachingBicycleBays=[
  {id:'new-teaching-north',name:'新教学楼北侧',x:37.3,z:91.7,angle:Math.PI/2},
  {id:'new-teaching-south',name:'新教学楼南侧',x:37.3,z:108.2,angle:Math.PI/2},
  {id:'library-north',name:'图书馆北侧',x:-73,z:274,angle:Math.PI/2},
  {id:'library-south',name:'图书馆南侧',x:-73,z:299,angle:Math.PI/2},
  {id:'south-teaching',name:'南教学楼西入口旁',x:-47,z:355.8,angle:0},
];

export function teachingParkingClearance(x:number,z:number){
  return teachingBicycleBays.some(bay=>{
    const dx=x-bay.x,dz=z-bay.z,c=Math.cos(bay.angle),s=Math.sin(bay.angle);
    return Math.abs(dx*c-dz*s)<4.8&&Math.abs(dx*s+dz*c)<4.5;
  });
}

export function createTeachingBicycleParking(mats:Materials){
  const b=new Builder(),bicycles:CampusBicycle[]=[];
  const paving=new T.MeshStandardMaterial({name:'open-cycle-parking-paving',color:0x9d9e91,map:mats.textures.get('stone-grain.webp'),roughness:.95});
  const paint=new T.MeshStandardMaterial({name:'cycle-parking-marking',color:0xcac9b5,roughness:.95});
  const signFrame=new T.MeshStandardMaterial({name:'cycle-parking-sign-frame',color:0x89918b,roughness:.6,metalness:.5});
  const signs=new T.Group();signs.name='south teaching purple parking sign';
  for(const bay of teachingBicycleBays){
    const south=bay.id==='south-teaching',floor=south?.115:.05;
    const c=Math.cos(bay.angle),s=Math.sin(bay.angle);
    const point=(u:number,y:number,v:number)=>new T.Vector3(bay.x+u*c+v*s,y,bay.z-u*s+v*c);
    const box=(w:number,h:number,d:number,u:number,y:number,v:number,m:T.Material,solid=false)=>{
      const p=point(u,y,v);b.box(w,h,d,p.x,p.y,p.z,m,solid,bay.angle);
    };
    // Low paving leaves the front and both ends open to pedestrians and riders.
    // The south bay fits inside the narrow apron, north of Hankou Road's kerb.
    box(7.6,south?.11:.045,south?2.4:3.8,0,south?.055:.0225,south?-.3:.2,paving,south);
    for(const u of[-3.45,3.45])box(.055,.008,2.1,u,floor,0,paint);
    for(let slot=0;slot<5;slot++){
      const p=point((slot-2)*1.3,floor,0),bike=createBicycle(slot);
      bike.group.position.copy(p);bike.group.rotation.y=bay.angle;
      const solid={x:p.x,y:p.y+.52,z:p.z,w:.5,h:1.04,d:1.85,angle:bay.angle};
      b.solids.push(solid);
      bicycles.push({...bike,id:`${bay.id}-bike-${slot}`,solid,home:p.clone(),angle:bay.angle});
    }
    if(bay.id==='south-teaching'){
      // Freestanding purple P board is visible in gl-2-53-r, outside the row.
      const u=4.5;
      for(const side of[-1,1]){
        box(.035,1.02,.035,u+side*.65,.56,0,signFrame);
        box(.055,.05,.75,u+side*.65,.075,0,signFrame);
      }
      box(1.45,.61,.045,u,.9,0,signFrame,true);
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=320;
      const ctx=canvas.getContext('2d')!;ctx.fillStyle='#43326f';ctx.fillRect(0,0,768,320);
      ctx.strokeStyle='#dad8ca';ctx.lineWidth=8;ctx.strokeRect(7,7,754,306);
      ctx.fillStyle='#f3f0df';ctx.font='bold 190px sans-serif';ctx.fillText('P',35,232);
      ctx.font='bold 36px sans-serif';ctx.textAlign='center';ctx.fillText('校园共享单车指定停车区',468,136);
      ctx.font='32px sans-serif';ctx.fillText('请按车位有序停车',468,192);
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      const face=new T.Mesh(new T.PlaneGeometry(1.4,.56),new T.MeshStandardMaterial({map:texture,roughness:.9,side:T.DoubleSide}));
      face.position.copy(point(u,.9,-.026));face.rotation.y=bay.angle+Math.PI;signs.add(face);
    }
  }
  const group=b.finish('teaching and library open bicycle parking',100);
  group.add(signs,...bicycles.map(bike=>bike.group));group.userData.bays=teachingBicycleBays;
  return{group,solids:b.solids,bicycles,bays:teachingBicycleBays};
}
