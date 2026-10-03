import * as T from 'three';
import {Builder} from './geometry.ts';
import type {Materials} from './materials.ts';

/** VR gl-1-12 and BV1HT4y1U7TE 00:00: open entrance, pale stone sign wall,
 * gold bilingual lettering and stone bollards. Dimensions remain approximate. */
export function createGuangzhouGate(mats:Materials){
 const b=new Builder(),x=-35.067,z=720.0;
 const stone=new T.MeshStandardMaterial({name:'guangzhou-gate-stone',color:0xb9beb5,map:mats.textures.get('stone-grain.webp'),roughness:.83});
 const glass=new T.MeshStandardMaterial({name:'guangzhou-guard-glass',color:0x638483,transparent:true,opacity:.55,roughness:.22,metalness:.18});
 const trim=new T.MeshStandardMaterial({color:0x65706b,metalness:.35,roughness:.55});
 // Keep the central road and both pedestrian lanes aligned with access equipment.
 for(const side of[-1,1]){
  b.box(1.15,2.5,1.2,x+side*8.0,1.25,z,stone,true);b.box(1.38,.20,1.4,x+side*8,2.6,z,stone);
  b.box(5.2,1.05,.48,x+side*11.1,.525,z,stone,true);
  b.box(5.3,.14,.65,x+side*11.1,1.12,z,trim);
  for(let u=8.6;u<13.7;u+=.22)b.box(.028,1.1,.045,x+side*u,1.72,z,trim);
 }
 const gx=x-11.0,gz=z-4.1;
 b.box(4.6,1.0,4.8,gx,.5,gz,stone,true);
 b.box(4.6,1.5,4.8,gx,1.74,gz,glass,true);
 b.box(5.15,.24,5.25,gx,2.60,gz,trim,true);
 for(const dx of[-2.25,0,2.25])for(const dz of[-2.4,2.4])b.box(.08,2.0,.09,gx+dx,1.35,gz+dz,stone);
 for(const dz of[-2.3,0,2.3])for(const dx of[-2.3,2.3])b.box(.09,2.0,.08,gx+dx,1.35,gz+dz,stone);
 b.box(1.1,1.9,.08,gx+.7,1.0,gz+2.46,trim);
 b.box(.78,1.2,.035,gx+.7,1.4,gz+2.51,glass);
 const plaqueX=x-11.0,plaqueZ=z+.42;
 const plaqueStone=new T.MeshStandardMaterial({name:'guangzhou-pale-stone-sign-wall',color:0xc9c9c2,map:mats.textures.get('stone-grain.webp'),roughness:.85});
 b.box(5.7,2.15,.48,plaqueX,1.075,plaqueZ,plaqueStone,true);
 b.box(5.9,.14,.62,plaqueX,2.18,plaqueZ,plaqueStone);
 const joint=new T.MeshStandardMaterial({color:0x878b86,roughness:1});
 for(const y of[.35,.93,1.52,2.07])b.box(5.65,.014,.012,plaqueX,y,plaqueZ+.247,joint);
 for(const dx of[-2.78,-1.4,0,1.4,2.78])b.box(.012,2.02,.012,plaqueX+dx,1.04,plaqueZ+.248,joint);
 // A transparent original lettering texture leaves the stone visible.
 const c=document.createElement('canvas');c.width=1536;c.height=640;const ctx=c.getContext('2d')!;
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#756644';ctx.shadowBlur=2;ctx.shadowOffsetY=2;ctx.fillStyle='#b49958';
 ctx.font='154px "Kaiti SC","STKaiti",serif';ctx.fillText('南 京 大 学',768,150);
 ctx.font='48px Georgia,serif';ctx.fillText('NANJING UNIVERSITY',768,284);
 ctx.font='65px "Kaiti SC","STKaiti",serif';ctx.fillText('广 州 路 门',768,410);
 ctx.font='45px Arial,sans-serif';ctx.fillText('GUANG ZHOU GATE',768,504);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 b.add(new T.PlaneGeometry(5.1,1.85),new T.MeshStandardMaterial({name:'guangzhou-gate-bilingual-lettering',map,transparent:true,depthWrite:false,roughness:.45,metalness:.35}),plaqueX,1.14,plaqueZ+.262);
 // Spherical stone bollards visible beside the public sidewalk; gaps preserve
 // both pedestrian approaches and the central vehicle lane.
 for(const side of[-1,1])for(const u of[8.2,11.6,15]){
  const bx=x+side*u,bz=z+6.6;b.box(.68,.12,.68,bx,.10,bz,stone);
  b.add(new T.SphereGeometry(.36,16,12).scale(1,.82,1),stone,bx,.39,bz);
  b.solids.push({x:bx,y:.33,z:bz,w:.67,h:.60,d:.67});
 }
 // Short approach paving; no beam is invented over the road.
 b.box(15,.025,12,x,.019,z-1,mats.path);
 const group=b.finish('广州路门 · stone piers and guard pavilion');group.userData={source:'official VR gl-1-12/16; BV1HT4y1U7TE 00:00–00:03, 00:23',signText:['南京大学','NANJING UNIVERSITY','广州路门','GUANG ZHOU GATE'],confidence:'lettering and pale stone verified; dimensions and unseen layout approximate'};
 return{group,solids:b.solids};
}
