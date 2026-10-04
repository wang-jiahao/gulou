import * as T from 'three';
import {Builder,rng} from './geometry.ts';

/** Visible central north frontage in official VR gl-2-21-f. Dimensions fit
 * the existing map-based shell approximately; concealed wings are untouched. */
export function museumNorthFacade(b:Builder,x:number,z:number,yaw:number,width:number){
 const paint=(name:string,color:number,map:T.Texture|null=null)=>new T.MeshStandardMaterial({name,color,map,roughness:.91});
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d')!,random=rng(2121);
 ctx.fillStyle='#77786d';ctx.fillRect(0,0,512,512);
 // A small, tileable running bond: 2 metres contains eight by 32 bricks.
 for(let row=0;row<32;row++)for(let col=-1;col<9;col++){
  const shade=Math.floor(157+random()*18),u=col*64+(row%2)*32;
  ctx.fillStyle=`rgb(${shade+6},${shade+4},${shade-6})`;ctx.fillRect(u+1,row*16+1,62,14);
  ctx.fillStyle='rgba(228,220,194,.16)';ctx.fillRect(u+1,row*16+1,62,1);
 }
 const brickMap=new T.CanvasTexture(canvas);brickMap.colorSpace=T.SRGBColorSpace;brickMap.wrapS=brickMap.wrapT=T.RepeatWrapping;brickMap.anisotropy=8;
 const brick=paint('museum-north-fine-brick',0xffffff,brickMap),stone=paint('museum-north-pale-stone',0xc7c6b5);
 const joint=paint('museum-north-stone-joints',0x8e9086),wood=paint('museum-north-timber',0x67483b),recess=paint('museum-north-window-recess',0x414c43),lattice=paint('museum-north-window-lattice',0xacad91);
 const pane=new T.MeshStandardMaterial({name:'museum-north-window-glass',color:0x8d9785,metalness:.08,roughness:.60});
 const nx=Math.sin(yaw),nz=Math.cos(yaw),point=(u:number,y:number,v:number)=>new T.Vector3(x+u*nz+v*nx,y,z-u*nx+v*nz);
 const box=(u:number,y:number,v:number,w:number,h:number,d:number,mat:T.Material)=>{const p=point(u,y,v);b.box(w,h,d,p.x,p.y,p.z,mat,false,yaw);};
 // One skin in front of the shell; windows and stonework sit further out.
 box(0,4.4,.075,width,8.8,.14,brick);
 box(0,.58,.17,width,1.16,.18,stone);
 const blocks=Math.round(width/.86);
 for(let i=1;i<blocks;i++)box(-width/2+i*width/blocks,.55,.265,.015,1.05,.013,joint);
 box(0,3.70,.20,width,.48,.24,stone);box(0,4.13,.27,width+.1,.32,.38,stone);
 box(0,3.94,.30,width,.035,.30,joint);
 for(let u=-width/2+1.3;u<width/2;u+=1.3){box(u,3.70,.325,.012,.45,.012,joint);box(u,4.13,.465,.012,.28,.012,joint);}
 // Two pairs flank the portal. The gap in the middle is deliberately free
 // of decorative windows, preserving the existing closed timber entrance.
 for(const side of[-1,1])for(const offset of[-.65,.65]){
  const u=side*5.22+offset,w=1.02,h=1.40,y=2.49;
  box(u,y,.17,w+.14,h+.16,.18,recess);box(u,y,.28,w,h,.03,pane);
  for(const s of[-1,1]){box(u+s*w/2,y,.32,.055,h+.07,.085,wood);box(u,y+s*h/2,.32,w+.1,.06,.085,wood);}
  box(u,y,.32,.06,h,.085,wood);box(u,y+.30,.32,w,.05,.085,wood);
  for(const s of[-1,1])box(u+s*.23,y-.02,.37,.018,h-.17,.022,lattice);
  for(const dy of[-.46,.53])box(u,y+dy,.37,w-.11,.022,.022,lattice);
  box(u,1.72,.25,1.17,.14,.34,stone);box(u,1.41,.19,1.17,.45,.24,stone);
  // Shallow chamfered rectangular inset beneath each stone sill.
  const outline=[[-.42,-.12],[.42,-.12],[.47,-.06],[.47,.06],[.42,.12],[-.42,.12],[-.47,.06],[-.47,-.06],[-.42,-.12]];
  for(let i=1;i<outline.length;i++)b.cylinder(point(u+outline[i-1][0],1.41+outline[i-1][1],.318),point(u+outline[i][0],1.41+outline[i][1],.318),.014,.014,joint,4);
 }
 // Three large upper bays, divided by round timber posts. Glazing has a
 // separate transom and restrained rectilinear grille, not invented painting.
 const pitch=(width-.40)/3,windowHeight=3.12,windowY=6.71;
 for(let bay=0;bay<3;bay++){
  const u=(bay-1)*pitch,w=pitch-.43;
  box(u,windowY,.18,w+.10,windowHeight+.12,.15,recess);box(u,windowY,.28,w,windowHeight,.03,pane);
  for(const s of[-1,1])box(u,windowY+s*windowHeight/2,.35,w+.16,.13,.20,wood);
  box(u,7.55,.35,w,.12,.20,wood);
  for(let k=0;k<=3;k++)box(u-w/2+k*w/3,windowY,.35,.10,windowHeight,.20,wood);
  for(let k=0;k<3;k++){
   const cx=u-w/2+(k+.5)*w/3,ww=w/3-.14;
   box(cx,6.34,.34,.045,2.17,.10,wood);
   for(const s of[-1,1]){
    const centre=cx+s*ww/4,gw=ww*.30;
    for(const edge of[-1,1])box(centre+edge*gw/2,6.32,.415,.018,1.54,.025,lattice);
    for(const yy of[5.55,7.09])box(centre,yy,.415,gw,.018,.025,lattice);
    box(centre,6.32,.415,gw+.08,.018,.025,lattice);
   }
   for(const dy of[-.16,.16])box(cx,7.91+dy,.415,ww-.13,.018,.025,lattice);
   for(const s of[-1,1])box(cx+s*(ww/2-.065),7.91,.415,.018,.32,.025,lattice);
  }
 }
 for(let i=0;i<=3;i++){
  const u=-pitch*1.5+i*pitch;
  b.cylinder(point(u,4.29,.30),point(u,8.65,.30),.20,.18,wood,12);
  box(u,4.33,.29,.44,.12,.48,stone);
 }
 return 13;
}
