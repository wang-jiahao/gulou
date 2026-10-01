import * as T from 'three';
import { Builder } from '../world/geometry.ts';

/** Original lightweight delta wing; the character remains the collision body. */
export function createGlider() {
  const root = new T.Group(); root.name = 'campus glider'; root.visible = false;
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#dddcca'; ctx.fillRect(0,0,1024,512);
  ctx.fillStyle='#304b51';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(420,0);ctx.lineTo(120,512);ctx.lineTo(0,512);ctx.fill();ctx.beginPath();ctx.moveTo(604,0);ctx.lineTo(1024,0);ctx.lineTo(1024,512);ctx.lineTo(904,512);ctx.fill();
  ctx.strokeStyle='#b5a270';ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(512,0);ctx.lineTo(40,512);ctx.moveTo(512,0);ctx.lineTo(984,512);ctx.stroke();
  ctx.strokeStyle='rgba(45,59,52,.2)';ctx.lineWidth=2;for(let x=40;x<1024;x+=80){ctx.beginPath();ctx.moveTo(512,0);ctx.lineTo(x,512);ctx.stroke();}
  ctx.fillStyle='#30464b';ctx.font='42px serif';ctx.textAlign='center';ctx.fillText('鼓 楼',512,360);
  const texture = new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const sail = new T.MeshStandardMaterial({name:'glider-sail',map:texture,side:T.DoubleSide,roughness:.86});
  const geometry=new T.BufferGeometry(),p:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let row=0;row<=10;row++)for(let col=0;col<=20;col++){
    const t=row/10,u=col/20,x=(u-.5)*7*t,z=-2.1+t*3.4,y=3.15-.24*Math.abs(u*2-1)*t+.10*Math.sin(t*Math.PI);
    p.push(x,y,z);uv.push(u,1-t);
    if(row<10&&col<20){const a=row*21+col;indices.push(a,a+21,a+1,a+1,a+21,a+22);}
  }
  geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const wing=new T.Mesh(geometry,sail);wing.castShadow=true;wing.receiveShadow=true;root.add(wing);
  const b=new Builder(),frame=new T.MeshStandardMaterial({color:0x263438,metalness:.55,roughness:.43}),wire=new T.MeshStandardMaterial({color:0x9daba9,metalness:.7,roughness:.5});
  const tip=new T.Vector3(0,3.15,-2.1),left=new T.Vector3(-3.5,2.91,1.3),right=new T.Vector3(3.5,2.91,1.3),center=new T.Vector3(0,3.2,.7);
  b.cylinder(tip,left,.025,.025,frame,8);b.cylinder(tip,right,.025,.025,frame,8);b.cylinder(tip,center,.028,.028,frame,8);
  const gripL=new T.Vector3(-.64,1.18,-.48),gripR=new T.Vector3(.64,1.18,-.48);
  b.cylinder(gripL,gripR,.028,.028,frame,8);
  for(const grip of [gripL,gripR]){b.cylinder(grip,center,.018,.018,frame,7);b.cylinder(grip,grip.x<0?left:right,.007,.007,wire,5);}
  root.add(b.finish('glider frame'));return root;
}
