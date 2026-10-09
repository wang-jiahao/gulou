import * as T from 'three';
import {dormitoryNames} from './building-profiles.ts';

type Face={ri:number;len:number;x:number;z:number;angle:number;nx:number;nz:number};

/** Thin wall-mounted nameplates; their position follows the retained frontage.
 * The user confirms side plates for both families, not surveyed mount points. */
export function addDormitorySidePlaque(group:T.Group,id:string,faces:Face[],front:Face,height:number){
  const identity=dormitoryNames[id];
  if(!identity||id==='plan-118')return; // Existing photographed three plaque.
  const side=faces.filter(e=>!e.ri&&e.len>4&&Math.abs(e.nx*front.nx+e.nz*front.nz)<.45)
    .sort((a,b)=>Math.hypot(a.x-front.x,a.z-front.z)-Math.hypot(b.x-front.x,b.z-front.z))[0];
  if(!side)return;
  const localFront=(front.x-side.x)*Math.cos(side.angle)-(front.z-side.z)*Math.sin(side.angle);
  const u=(localFront<0?-1:1)*(side.len/2-.80),v=.23;
  const family=identity.family==='nanyuan'?'南园':'陶园';
  const c=document.createElement('canvas');c.width=256;c.height=320;
  const ctx=c.getContext('2d')!;
  ctx.fillStyle='#9a8250';ctx.fillRect(0,0,256,320);
  ctx.strokeStyle='#d4bd7a';ctx.lineWidth=7;ctx.strokeRect(7,7,242,306);
  ctx.fillStyle='#f3e2a6';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`bold ${identity.number.length>2?76:158}px sans-serif`;ctx.fillText(identity.number,128,131,224);
  ctx.font='bold 63px "Songti SC",serif';ctx.fillText(family,128,248,224);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
  const plaque=new T.Group();
  plaque.add(new T.Mesh(new T.BoxGeometry(.64,.85,.045),new T.MeshStandardMaterial({color:0x9a8250,metalness:.35,roughness:.7})));
  const lettering=new T.Mesh(new T.PlaneGeometry(.64,.85),new T.MeshStandardMaterial({map:texture,metalness:.2,roughness:.7}));
  lettering.position.z=.024;plaque.add(lettering);
  plaque.name=`${family}${identity.number}舍 · 侧面名牌`;
  plaque.position.set(side.x+u*Math.cos(side.angle)+v*side.nx,Math.min(8.95,height-1.1),side.z-u*Math.sin(side.angle)+v*side.nz);
  plaque.rotation.y=side.angle;group.add(plaque);
  return {family,number:identity.number,side:[side.x,side.z,side.nx,side.nz],u,y:plaque.position.y};
}
