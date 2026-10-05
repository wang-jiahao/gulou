import * as T from 'three';
import {Builder} from './geometry.ts';
import type {Materials} from './materials.ts';
import {addGateTrafficSigns} from './gate-traffic-signs.ts';

/** User night photo and BV1HT4y1U7TE 00:00/00:23: pale raised stone sign,
 * four gold text rows and capped grille piers. VR gl-1-12 retains entrance context.
 * Dimensions and the full entrance layout remain approximate. */
export function createGuangzhouGate(mats:Materials){
 const b=new Builder(),x=-35.067,z=720.0;
 const stone=new T.MeshStandardMaterial({name:'guangzhou-gate-stone',color:0xb9beb5,map:mats.textures.get('stone-grain.webp'),roughness:.83});
 const glass=new T.MeshStandardMaterial({name:'guangzhou-guard-glass',color:0x638483,transparent:true,opacity:.55,roughness:.22,metalness:.18});
 const trim=new T.MeshStandardMaterial({color:0x65706b,metalness:.35,roughness:.55});
 // Keep the central road and both pedestrian lanes aligned with access equipment.
 for(const side of[-1,1]){
  const px=x+side*8;
  b.box(1.15,2.58,1.2,px,1.29,z,stone);
  b.box(1.24,.16,1.28,px,2.66,z,stone);
  for(const dx of[-.49,.49])for(const dz of[-.52,.52])b.box(.055,.5,.055,px+dx,2.99,z+dz,trim);
  for(const y of[2.80,2.98,3.16]){
   for(const dz of[-.52,.52])b.box(1.04,.065,.045,px,y,z+dz,trim);
   for(const dx of[-.49,.49])b.box(.045,.065,1.08,px+dx,y,z,trim);
  }
  b.box(1.38,.30,1.4,px,3.39,z,stone);
  b.solids.push({x:px,y:1.77,z,w:1.15,h:3.54,d:1.2,angle:0});
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
 b.box(5.2,1.78,.13,plaqueX,1.12,plaqueZ+.30,plaqueStone,true);
 for(const y of[.72,1.43])b.box(5.18,.01,.008,plaqueX,y,plaqueZ+.37,joint);
 for(const dx of[-1.30,1.30])b.box(.01,1.76,.008,plaqueX+dx,1.12,plaqueZ+.37,joint);
 // A transparent original lettering texture leaves the stone visible.
 const c=document.createElement('canvas');c.width=1536;c.height=640;const ctx=c.getContext('2d')!;
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#756644';ctx.shadowBlur=2;ctx.shadowOffsetY=2;ctx.fillStyle='#b49958';
 const spaced=(text:string,y:number,font:string,width:number)=>{
  ctx.font=font;const chars=[...text],widths=chars.map(char=>ctx.measureText(char).width);
  const gap=(width-widths.reduce((a,v)=>a+v,0))/(chars.length-1);let left=(c.width-width)/2;
  chars.forEach((char,i)=>{ctx.fillText(char,left+widths[i]/2,y);left+=widths[i]+gap;});
 };
 spaced('南京大学',144,'178px "Kaiti SC","STKaiti",serif',1296);
 spaced('NANJING UNIVERSITY',282,'72px Georgia,serif',1320);
 spaced('广州路门',412,'76px "Kaiti SC","STKaiti",serif',800);
 spaced('GUANG ZHOU LU GATE',514,'58px Arial,sans-serif',1090);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 b.add(new T.PlaneGeometry(4.95,1.73),new T.MeshStandardMaterial({name:'guangzhou-gate-bilingual-lettering',map,transparent:true,depthWrite:false,roughness:.45,metalness:.35}),plaqueX,1.12,plaqueZ+.383);
 addGateTrafficSigns(b,plaqueX,plaqueZ+.20,trim);
 // Spherical stone bollards visible beside the public sidewalk; gaps preserve
 // both pedestrian approaches and the central vehicle lane.
 for(const side of[-1,1])for(const u of[8.2,11.6,15]){
  // Keep the complete sphere behind the public footway's inner edge.
  const bx=x+side*u,bz=z+5.7;b.box(.68,.12,.68,bx,.10,bz,stone);
  b.add(new T.SphereGeometry(.36,16,12).scale(1,.82,1),stone,bx,.39,bz);
  b.solids.push({x:bx,y:.33,z:bz,w:.67,h:.60,d:.67});
 }
 // Short approach paving; no beam is invented over the road.
 b.box(15,.025,12,x,.019,z-1,mats.path);
 const group=b.finish('广州路门 · stone piers and guard pavilion');group.userData={source:'user night photo; official VR gl-1-12/16; BV1HT4y1U7TE 00:00–00:03, 00:23',signText:['南京大学','NANJING UNIVERSITY','广州路门','GUANG ZHOU LU GATE'],trafficPictograms:['front-facing car','no horn','10','motorcycle'],confidence:'lettering, raised stone plaque, capped grille piers and four main traffic pictograms verified; supplementary text unverified; dimensions and full entrance layout approximate'};
 return{group,solids:b.solids};
}
