import * as T from 'three';
import {Builder} from './geometry.ts';

type Edge={len:number;x:number;z:number;angle:number;nx:number;nz:number};
/** The left cube face of gl-4-10 looks west across the Yifu forecourt.
 * The map places Sufute there; the opposite cube face is Tian Jiabing.
 * Keep the traced shell. Heights, hidden ground bays and dimensions are estimates. */
export function createSufuteFacade(){
 const mat=(name:string,color:number)=>new T.MeshStandardMaterial({name:`sufute-${name}`,color,roughness:.85});
 const wall=mat('pale-wall',0xd0d0c8),slab=mat('slab-edge',0xb9bcb6),reveal=mat('window-recess',0x394b4b),frame=mat('silver-frame',0xabb5b1),glass=mat('blue-grey-glass',0x647e82);
 glass.roughness=.34;glass.metalness=.25;frame.metalness=.35;
 const faces:{role:string;windowRows:number;bays:number;frontage:number[]}[]=[];
 const source='official VR gl-4-10 l + user campus plan';
 return{
  metadata:{source,dimensions:'approximate; lower bays obscured by trees',faces},
  face(b:Builder,detail:Builder,e:Edge,height:number){
   const role=e.len>20?'courtyard':'north-stair',rows=6,bays=role==='courtyard'?8:2,storey=height/rows;
   const box=(target:Builder,u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>target.box(w,h,d,e.x+u*e.nz+v*e.nx,y,e.z-u*e.nx+v*e.nz,m,false,e.angle);
   box(b,0,.36,.025,e.len,.72,.12,slab);
   box(b,0,height+.18,0,e.len,.30,.20,wall);
   const span=role==='courtyard'?e.len-7.6:e.len*.54,step=span/bays;
   if(role==='courtyard'){
    // Broad horizontal ledges and slender projecting piers frame the central
    // window grid. Plain end walls and the northern stair block stay distinct.
    for(let floor=1;floor<rows;floor++)box(b,0,floor*storey+.12,.20,span+.8,.28,.48,slab);
    box(b,0,height-.5,.17,span+.8,.24,.42,slab);
    for(let bay=0;bay<=bays;bay++)box(b,(bay-bays/2)*step,height*.56,.26,.22,height*.79,.56,wall);
   }
   for(let floor=0;floor<rows;floor++)for(let bay=0;bay<bays;bay++){
    const u=(bay-(bays-1)/2)*step,y=(floor+.6)*storey,w=role==='courtyard'?step-.45:1.03,h=role==='courtyard'?1.53:1.12;
    box(b,u,y,.035,w+.18,h+.18,.07,reveal);
    b.add(new T.PlaneGeometry(w,h),glass,e.x+u*e.nz+.079*e.nx,y,e.z-u*e.nx+.079*e.nz,new T.Euler(0,e.angle,0));
    for(const side of[-1,1]){
     box(detail,u+side*w/2,y,.12,.065,h+.08,.12,frame);
     box(detail,u,y+side*h/2,.12,w+.1,.065,.12,frame);
    }
    if(role==='courtyard'){
     for(const side of[-1,1])box(detail,u+side*w/6,y,.12,.045,h,.12,frame);
     box(detail,u,y+h*.19,.12,w,.04,.12,frame);
    }else box(detail,u,y,.12,.045,h,.12,frame);
   }
   faces.push({role,windowRows:rows,bays,frontage:[e.x,e.z,e.nx,e.nz]});
   return rows*bays;
  },
  name(plaques:T.Group,e:Edge){
   // User-requested identification while the original inscription is unverified.
   // This is a provisional nameplate, not a recovered photographic glyph shape.
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
   const ctx=canvas.getContext('2d')!;ctx.fillStyle='#c8c9bf';ctx.fillRect(0,0,512,96);
   ctx.fillStyle='#61502d';ctx.font='bold 63px "Kaiti SC","STKaiti",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('苏富特大楼',256,51,480);
   const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
   const sign=new T.Mesh(new T.PlaneGeometry(4.7,.88),new T.MeshStandardMaterial({name:'sufute-provisional-name',map:texture,roughness:.8}));
   sign.name='苏富特大楼 · entrance name';sign.position.set(e.x+e.nx*.64,3.71,e.z+e.nz*.64);sign.rotation.y=e.angle;
   sign.userData={text:'苏富特大楼',placement:'existing entrance; provisional nameplate',font:'approximate; real inscription not yet verified'};plaques.add(sign);
  }
 };
}
