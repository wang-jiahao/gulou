import * as T from 'three';
import {Builder} from './geometry.ts';
import {tangPortal} from './tang-entrance.ts';

type Edge={len:number;x:number;z:number;angle:number;nx:number;nz:number};
/** gl-4-05 f/r shows the stone wings and glazed connector of the north
 * courtyard. The traced plan and approximate scene location resolve its side.
 * The ground-level portico is built separately from the four upper facades. */
export function createTangFacade(){
 const mat=(name:string,color:number)=>new T.MeshStandardMaterial({name:`tang-${name}`,color,roughness:.87});
 const stone=mat('pale-stone',0xd3d3c8),reveal=mat('window-reveal',0x535e59),frame=mat('silver-frame',0x99aaa8),glass=mat('blue-grey-glazing',0x739498),ledge=mat('stone-sill',0xb9bdb3);
 glass.roughness=.33;glass.metalness=.25;frame.metalness=.35;
 // One small shared texture replaces hundreds of individual grout strips.
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#d3d3c8';ctx.fillRect(0,0,256,128);
 ctx.strokeStyle='#b9bdb5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,128);ctx.lineTo(0,0);ctx.lineTo(256,0);ctx.stroke();
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
 const panels=new T.MeshStandardMaterial({name:'tang-stone-panel-grid',map:texture,roughness:.91});
 // The panel skin is only 2mm above its stone backing. Keep the visible layers
 // ordered at flight distance without moving the geometry or clipping plane.
 for(const [surface,units]of [[panels,-1],[reveal,-1],[glass,-2]]as const){surface.polygonOffset=true;surface.polygonOffsetFactor=0;surface.polygonOffsetUnits=units;}
 const faces:{role:string;frontage:number[];bays:number;windowRows:number}[]=[];
 const box=(b:Builder,e:Edge,u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>b.box(w,h,d,e.x+u*e.nz+v*e.nx,y,e.z-u*e.nx+v*e.nz,m,false,e.angle);
 const plane=(b:Builder,e:Edge,u:number,y:number,v:number,w:number,h:number,m:T.Material)=>{
  const geometry=new T.PlaneGeometry(w,h);
  if(m===panels){const uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,(u-w/2+uv.getX(i)*w)/1.25,(y-h/2+uv.getY(i)*h)/.65);}
  b.add(geometry,m,e.x+u*e.nz+v*e.nx,y,e.z-u*e.nx+v*e.nz,new T.Euler(0,e.angle,0));
 };
 const curtain=(b:Builder,detail:Builder,e:Edge,width:number,height:number)=>{
  plane(b,e,0,height/2,.06,width,height,glass);
  const bays=Math.max(2,Math.round(width/1.35)),step=width/bays;
  for(let i=0;i<=bays;i++)box(detail,e,(i-bays/2)*step,height/2,.14,.06,height,.16,frame);
  for(let i=0;i<=6;i++){
   box(b,e,0,i*height/6,.14,width,.14,.28,frame);
   if(i<6)box(detail,e,0,(i+.78)*height/6,.13,width,.04,.14,frame);
  }
  return bays*6;
 };
 return{
  materials:{stone,panels,glass,frame},
  metadata:{source:'official VR gl-4-05 f/r + user campus plan',dimensions:'approximate; 19.5m upper shell retained',entrance:'north courtyard recess; depth approximate, rear glazed boundary',faces},
  accepts(e:Edge){return (e.x>-420&&e.x<-400&&e.z>-69&&e.z<-50&&Math.abs(e.nz)>.98)||(e.nx>.98&&e.z>-78&&e.z<-56&&e.len>14&&e.len<18);},
  face(b:Builder,detail:Builder,e:Edge,height:number){
   const connector=e.nx>.98&&e.x<-410,end=e.nx>.98&&!connector,role=connector?'west-glass-connector':end?'north-wing-east-glass':e.nz<0?'middle-wing-north-stone':'north-wing-south-stone';
   const portico=role==='middle-wing-north-stone',p=tangPortal;
   const rectangles=(u:number,y:number,w:number,h:number)=>{
    if(w<=0||h<=0)return[];
    if(!portico||y-h/2>=p.clearance||u+w/2<=p.left||u-w/2>=p.glassRight)return[{u,y,w,h}];
    const result=[];
    const left=u-w/2,right=u+w/2,bottom=y-h/2,top=y+h/2;
    if(left<p.left)result.push({u:(left+p.left)/2,y,w:p.left-left,h});
    if(right>p.glassRight)result.push({u:(right+p.glassRight)/2,y,w:right-p.glassRight,h});
    if(top>p.clearance){const a=Math.max(left,p.left),c=Math.min(right,p.glassRight);result.push({u:(a+c)/2,y:(p.clearance+top)/2,w:c-a,h:top-Math.max(bottom,p.clearance)});}
    return result;
   };
   for(const r of rectangles(0,height/2,e.len,height))plane(b,e,r.u,r.y,.015,r.w,r.h,panels);
   for(const r of rectangles(0,.22,e.len,.44))box(b,e,r.u,r.y,.04,r.w,r.h,.13,ledge);
   box(b,e,0,height+.10,.04,e.len,.20,.24,stone);
   let windows=0,bays=0;
   if(connector||end){
    const width=connector?e.len-.3:e.len*.43;
    windows=curtain(b,detail,e,width,height-.12);bays=Math.max(2,Math.round(width/1.35));
    if(connector){
     box(b,e,0,height+.70,.46,e.len,.10,.12,frame);
     for(let u=-e.len/2+.3;u<e.len/2;u+=2.05){
      box(detail,e,u,height+.39,.08,.08,.7,.1,frame);
      box(detail,e,u,height+.70,.28,.07,.07,.72,frame);
     }
    }
   }else{
    bays=Math.max(4,Math.round((e.len-3)/3.15));const step=(e.len-3)/bays,ground=3.8,storey=(height-ground)/5;
    const rows=Array.from({length:6},(_,row)=>({y:row===0?2.15:ground+(row-.48)*storey,w:row===0?1.05:1.34,h:row===0?1.20:1.97}));
    // The stone face stays continuous. Glass and slim frames sit behind it;
    // isolated projecting picture frames would misread the real recessed bays.
    const patch=(u:number,y:number,w:number,h:number)=>{
     for(const r of rectangles(u,y,w,h)){
      box(b,e,r.u,r.y,.235,r.w,r.h,.43,stone);
      plane(b,e,r.u,r.y,.452,r.w,r.h,panels);
     }
    };
    for(let col=0;col<=bays;col++){
     const left=col===0?-e.len/2:(col-1-(bays-1)/2)*step+.67;
     const right=col===bays?e.len/2:(col-(bays-1)/2)*step-.67;
     patch((left+right)/2,height/2,right-left,height);
    }
    for(let col=0;col<bays;col++){
     const u=(col-(bays-1)/2)*step;let bottom=0;
     for(const row of rows){
      const {y,w,h}=row,lower=y-h/2,upper=y+h/2;
      patch(u,(bottom+lower)/2,1.34,lower-bottom);
      if(w<1.34)for(const sign of[-1,1])patch(u+sign*(w+1.34)/4,y,(1.34-w)/2,h);
      bottom=upper;
      if(portico&&lower<p.clearance&&u+.67>p.left&&u-.67<p.glassRight){patch(u,y,1.34,h);continue;}
      box(b,e,u,y,.055,w+.06,h+.06,.08,reveal);
      plane(b,e,u,y,.105,w,h,glass);
      for(const sign of[-1,1]){
       box(detail,e,u+sign*w/2,y,.15,.05,h,.10,frame);
       box(detail,e,u,y+sign*h/2,.15,w,.05,.10,frame);
      }
      box(detail,e,u,y,.15,.045,h,.10,frame);
      box(detail,e,u,y+.26,.15,w,.04,.10,frame);
      box(b,e,u,lower-.035,.285,w,.07,.39,ledge);windows++;
     }
     patch(u,(bottom+height)/2,1.34,height-bottom);
    }
   }
   faces.push({role,frontage:[e.x,e.z,e.nx,e.nz],bays,windowRows:6});
   return windows;
  }
 };
}
