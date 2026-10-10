import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';

/** Four hanging banners and the open photo frame in the user's 2026 welcome
 * photographs. Proportions are fitted to the existing facade, not surveyed. */
export function addTeachingWelcome(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],x:number,z:number,yaw:number,emblem?:T.Texture){
 const point=(u:number,y:number,v:number)=>new T.Vector3(x+u*Math.cos(yaw)+v*Math.sin(yaw),y,z-u*Math.sin(yaw)+v*Math.cos(yaw));
 const purple=new T.MeshStandardMaterial({name:'teaching-welcome-purple',color:0x352257,roughness:.88});
 const pale=new T.MeshStandardMaterial({name:'teaching-welcome-numerals',color:0xc7b5d5,roughness:.78});
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material,solid=false)=>{
  const p=point(u,y,v);b.box(w,h,d,p.x,p.y,p.z,mat,false,yaw);
  if(solid){const m=new T.Mesh(new T.BoxGeometry(w,h,d));m.position.copy(p);m.rotation.y=yaw;meshes.push(collisionMesh(m));camera.push(m);}
 };
 const bannerNames=['2026 NJU','南京大学 NANJING UNIVERSITY','Hi! 你好新同学!','HELLO New NJUers!'];
 for(let i=0;i<4;i++){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=1536;const c=canvas.getContext('2d')!;
  c.fillStyle=['#634083','#f1f1ed','#ddbd54','#664190'][i];c.fillRect(0,0,256,1536);
  c.textAlign='center';c.textBaseline='middle';
  if(i===0||i===3){
   c.save();c.translate(128,790);c.rotate(Math.PI/2);c.fillStyle=i===0?'#e2cee8':'#eee5cc';c.font=`italic bold ${i===0?155:110}px Arial,sans-serif`;c.fillText(i===0?'2026   NJU':'HELLO New NJUers!',0,0,1190);c.restore();
  }else if(i===1){
   if(emblem?.image){c.fillStyle='#87336a';c.fillRect(59,225,138,151);c.drawImage(emblem.image,61,225,134,151);}
   c.fillStyle='#872e62';c.font='88px "Kaiti SC","STKaiti",serif';[...'南京大学'].forEach((ch,j)=>c.fillText(ch,157,630+j*120));
   c.save();c.translate(69,863);c.rotate(Math.PI/2);c.font='34px Georgia,serif';c.fillText('NANJING UNIVERSITY',0,0,620);c.restore();
  }else{
   c.fillStyle='#fff5d9';c.font='italic bold 86px Arial,sans-serif';c.fillText('Hi!',112,426);
   [...'你好新同学!'].forEach((ch,j)=>{c.fillStyle=j===2?'#633785':'#fff5d9';c.font='bold 91px "Kaiti SC","STKaiti",serif';c.fillText(ch,129+(j%2?8:-8),578+j*116);});
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const material=new T.MeshStandardMaterial({name:`teaching-welcome-banner-${i}`,map:texture,side:T.DoubleSide,roughness:.96});
  const geometry=new T.PlaneGeometry(2.05,9.03,4,18),positions=geometry.attributes.position;
  for(let j=0;j<positions.count;j++)positions.setZ(j,.025*Math.sin(positions.getX(j)*5+i)+.018*Math.sin(positions.getY(j)*2));
  geometry.computeVertexNormals();const p=point((i-1.5)*2.77,10.93,1.15);b.add(geometry,material,p.x,p.y,p.z,new T.Euler(0,yaw,0));
  box((i-1.5)*2.77,15.46,1.15,2.16,.04,.055,purple);
 }
 // Frame posts and the numerals flank a 2.96m clear central approach. No solid
 // box fills the aperture or the original steps/doorway behind it.
 const v=7.55,width=4.50,height=3.36;
 box(0,.055,v,5.4,.11,.62,purple);
 for(const side of[-1,1])box(side*width/2,height/2+.1,v,.30,height,.26,purple,true);
 box(0,height+.02,v,width+.30,.42,.26,purple,true);
 const top=document.createElement('canvas');top.width=1024;top.height=160;const c=top.getContext('2d')!;
 c.fillStyle='#f4eef6';c.font='48px "Kaiti SC","STKaiti",serif';c.textBaseline='middle';c.fillText('南京大学',36,80);
 c.font='italic bold 61px "PingFang SC",sans-serif';c.fillStyle='#efe0a3';c.fillText('你好，新同学!',430,81);
 const texture=new T.CanvasTexture(top);texture.colorSpace=T.SRGBColorSpace;
 const ink=new T.MeshStandardMaterial({name:'teaching-welcome-frame-title',map:texture,alphaTest:.35,roughness:.8});
 const q=point(0,height+.02,v+.145);b.add(new T.PlaneGeometry(4.4,.37),ink,q.x,q.y,q.z,new T.Euler(0,yaw,0));
 const zero=()=>{const s=new T.Shape();s.absellipse(0,.62,.45,.62,0,Math.PI*2,false,0);const h=new T.Path();h.absellipse(0,.62,.28,.43,0,Math.PI*2,true,0);s.holes.push(h);return s;};
 const two=()=>{const s=new T.Shape();s.moveTo(-.43,.97);s.quadraticCurveTo(-.34,1.32,.03,1.27);s.quadraticCurveTo(.58,1.20,.41,.77);s.quadraticCurveTo(.31,.52,-.24,.19);s.lineTo(.46,.19);s.lineTo(.46,0);s.lineTo(-.47,0);s.lineTo(-.47,.18);s.quadraticCurveTo(.40,.81,.23,1.02);s.quadraticCurveTo(.02,1.23,-.24,.90);s.closePath();return s;};
 const six=()=>{const s=new T.Shape();s.moveTo(.34,1.29);s.lineTo(.07,1.29);s.quadraticCurveTo(-.43,.91,-.45,.47);s.quadraticCurveTo(-.45,-.03,.03,0);s.quadraticCurveTo(.51,.02,.43,.48);s.quadraticCurveTo(.37,.86,-.13,.70);s.quadraticCurveTo(-.06,.93,.34,1.29);const h=new T.Path();h.absellipse(.01,.36,.25,.20,0,Math.PI*2,true,0);s.holes.push(h);return s;};
 for(const [u,shape]of [[-2.99,two()],[-1.94,zero()],[1.98,two()],[3.02,six()]] as const){
  const p=point(u,.11,v+.30);b.add(new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSize:.018,bevelThickness:.014,bevelSegments:1}),pale,p.x,p.y,p.z,new T.Euler(0,yaw,0));
  // Keep decorative digit collisions below shoulder height and outside the
  // centre. Their bounding boxes do not obstruct the open frame aperture.
  const proxy=new T.Mesh(new T.BoxGeometry(.94,1.24,.18));proxy.position.copy(point(u,.73,v+.40));proxy.rotation.y=yaw;meshes.push(collisionMesh(proxy));camera.push(proxy);
 }
 return{source:'user teaching welcome photographs 2026-10-10',banners:bannerNames,frame:{u:0,v,width,height,clearCentralWidth:2.96},year:2026,dimensions:'approximate photo proportions'};
}
