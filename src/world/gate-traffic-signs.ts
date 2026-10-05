import * as T from 'three';
import {Builder} from './geometry.ts';

/** Original pictograms redrawn from the Guangzhou gate photo and video 00:23.
 * The small supplementary plates are illegible and deliberately left unmodelled. */
export function addGateTrafficSigns(b:Builder,x:number,z:number,metal:T.Material){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const ctx=canvas.getContext('2d')!;
 const stroke=(points:number[][],width=10)=>{
  ctx.lineWidth=width;ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();
 };
 const wheel=(cx:number,cy:number,r:number)=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();};
 for(let i=0;i<4;i++){
  ctx.save();ctx.translate(i*256,0);ctx.fillStyle='#f1f0e8';ctx.fillRect(0,0,256,256);
  ctx.strokeStyle='#b92d32';ctx.lineWidth=18;wheel(128,128,114);
  ctx.strokeStyle=ctx.fillStyle='#222728';ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=10;
  if(i===0){
   // One front-facing car, not the two-car overtaking symbol.
   ctx.beginPath();ctx.moveTo(76,113);ctx.lineTo(89,77);ctx.lineTo(167,77);ctx.lineTo(180,113);ctx.closePath();ctx.stroke();
   ctx.fillRect(68,114,120,58);ctx.fillRect(76,165,18,24);ctx.fillRect(162,165,18,24);
   ctx.fillStyle='#f1f0e8';ctx.fillRect(79,130,23,13);ctx.fillRect(154,130,23,13);ctx.fillRect(99,153,58,6);
  }else if(i===1){
   ctx.beginPath();ctx.moveTo(61,105);ctx.lineTo(97,120);ctx.lineTo(97,141);ctx.lineTo(61,158);ctx.closePath();ctx.fill();
   stroke([[96,124],[166,124],[182,134],[169,144],[121,144],[111,153],[124,166],[153,166]],9);
   ctx.strokeStyle='#b92d32';stroke([[56,51],[205,205]],15);
  }else if(i===2){
   ctx.font='500 155px "Arial Narrow",Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('10',126,133,167);
  }else{
   ctx.lineWidth=10;wheel(76,159,25);wheel(182,159,25);
   stroke([[76,159],[111,120],[144,153],[104,155],[91,137]],10);
   stroke([[140,95],[156,99],[180,155]],11);
   stroke([[117,113],[148,110]],16);stroke([[95,102],[118,102]],11);
   ctx.beginPath();ctx.moveTo(108,125);ctx.lineTo(157,121);ctx.lineTo(144,147);ctx.lineTo(126,143);ctx.closePath();ctx.fill();
  }
  ctx.restore();
 }
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const face=new T.MeshStandardMaterial({name:'guangzhou-traffic-pictograms',map,roughness:.74,metalness:.12});
 const y=2.99,r=.30;
 b.box(2.7,.045,.045,x,y-.12,z-.06,metal);
 for(const dx of[-.72,.72])b.box(.04,.82,.045,x+dx,2.61,z-.06,metal);
 for(let i=0;i<4;i++){
  const sx=x+(i-1.5)*.67;
  b.cylinder(new T.Vector3(sx,y,z-.045),new T.Vector3(sx,y,z),r,r,metal,32);
  const disc=new T.CircleGeometry(r*.98,32),uv=disc.getAttribute('uv');
  for(let j=0;j<uv.count;j++)uv.setX(j,(uv.getX(j)+i)/4);
  b.add(disc,face,sx,y,z+.003);
 }
}
