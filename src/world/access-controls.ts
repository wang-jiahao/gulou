import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, type Solid } from './geometry.ts';
import { southEastGate } from './south-boundary-layout.ts';
import type { Materials } from './materials.ts';

export type CampusEntrance={id:string;name:string;x:number;z:number;angle:number;pedestrians:number[];source:string};
/** Positions follow gate symbols on the registered plan, with the south east gate
 * corrected to the Xiaofenqiao gate symbol. Equipment layouts are gameplay approximations. */
export const campusEntrances:CampusEntrance[]=[
 {id:'hankou',name:'汉口路校门',x:-91.0546,z:344.25,angle:0,pedestrians:[-7.6,7.6],source:'campus plan + official VR gl-2-01'},
 {id:'guangzhou',name:'广州路校门',x:-35.067,z:715.04,angle:0,pedestrians:[-5.2,5.2],source:'campus plan gate position; user photo; equipment spacing approximate'},
 {id:'south-north',name:'南园北门',x:-88.39,z:383.62,angle:0,pedestrians:[-4.7,4.7],source:'campus plan gate symbol [2216,2646]'},
 {id:'beijing-west',name:'北京西路门',x:-346.9,z:-234.17,angle:Math.PI,pedestrians:[-4.8,4.8],source:'campus plan [967,547]; OSM 1984468961'},
 {id:'beijing-east',name:'北京西路东侧出入口',x:-170.29,z:-208.14,angle:Math.PI,pedestrians:[-4.8,4.8],source:'campus plan [1610,583]; OSM 1684918728; descriptive name'},
 {id:'northwest',name:'西北校门',x:-368.66,z:-146.88,angle:Math.PI/2,pedestrians:[-4.8,4.8],source:'campus plan [935,878]; official VR gl-4-02 aerial overview (not a ground-level gate view)'},
 {id:'west',name:'西校门',x:-275.74,z:97.06,angle:Math.PI/2,pedestrians:[-4.8,4.8],source:'campus plan [1391,1732]; OSM 1030348723'},
 {id:'tianjin',name:'天津路门',x:76.29,z:-50.86,angle:-Math.PI/2,pedestrians:[-4.8,4.8],source:'campus plan [2570,1063]; OSM 1615452151'},
 {id:'south-east',name:'小粉桥校门',x:southEastGate[0],z:southEastGate[1],angle:-Math.PI/2,pedestrians:[-4.8],source:'campus plan gate symbol [3037,3212]; equipment approximate'},
];

function label(text:string,w:number,h:number,bg='#263c39',color='#edf2de'){
 const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,512,192);ctx.fillStyle=color;ctx.font='bold 64px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,96);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
 return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,toneMapped:false}));
}
function readerDisplay(open:boolean){
 const c=document.createElement('canvas');c.width=256;c.height=384;const ctx=c.getContext('2d')!;
 ctx.fillStyle='#102b2b';ctx.fillRect(0,0,256,384);ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#c7d8cf';ctx.font='22px system-ui';ctx.fillText('校园通行',128,38);
 ctx.strokeStyle=open?'#80edb1':'#78bfc6';ctx.lineWidth=5;ctx.lineCap='round';
 for(const [x,y,sx,sy]of [[45,86,1,1],[211,86,-1,1],[45,265,1,-1],[211,265,-1,-1]]){ctx.beginPath();ctx.moveTo(x,y+sy*26);ctx.lineTo(x,y);ctx.lineTo(x+sx*26,y);ctx.stroke();}
 if(open){ctx.beginPath();ctx.arc(128,173,52,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(101,173);ctx.lineTo(121,193);ctx.lineTo(158,153);ctx.stroke();}
 else{ctx.beginPath();ctx.arc(128,146,30,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(128,220,51,33,0,Math.PI,0);ctx.stroke();}
 ctx.fillStyle=open?'#98f0bc':'#ddece6';ctx.font='bold 30px system-ui';ctx.fillText(open?'请通行':'请靠近',128,315);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
 return new T.MeshBasicMaterial({name:open?'access-screen-pass':'access-screen-wait',map,toneMapped:false});
}
/** Parts share a parent, material and animation state. Keep the original UVs
 * and non-shadow-casting flags; transparent moving flaps stay independent. */
function mergeEquipment(parts:T.Mesh[],name:string){
 const geometries=parts.map(part=>{part.updateMatrix();return part.geometry.applyMatrix4(part.matrix);});
 const geometry=mergeGeometries(geometries)!;
 for(const part of geometries)part.dispose();
 geometry.computeBoundingSphere();
 const mesh=new T.Mesh(geometry,parts[0].material);mesh.name=name;return mesh;
}
export function createAccessControls(mats:Materials){
 const group=new T.Group();group.name='campus access gates';const solids:Solid[]=[];
 const steel=new T.MeshStandardMaterial({name:'access-stainless-steel',color:0x9ca9a7,metalness:.68,roughness:.35});
 const dark=new T.MeshStandardMaterial({color:0x263c3d,metalness:.25,roughness:.45});
 const white=new T.MeshStandardMaterial({color:0xe5e5d7,roughness:.6});
 const red=new T.MeshStandardMaterial({color:0xb53429,roughness:.57});
 const blue=new T.MeshStandardMaterial({color:0x97c6c7,transparent:true,opacity:.54,roughness:.24,metalness:.05,side:T.DoubleSide});
 const screenWait=readerDisplay(false),screenPass=readerDisplay(true);
 const pedestrianMark=label('人行通道',1.2,.22);
 const readers:{entrance:string;x:number;z:number;flaps:T.Group[];screens:T.Mesh[];authorized:boolean;progress:number;indicator:T.MeshBasicMaterial}[]=[];
 const booms:{entrance:string;x:number;z:number;pivot:T.Group;progress:number}[]=[];
 for(const e of campusEntrances){
  const base=new Builder(),local=new T.Group(),lenses:T.Mesh[]=[];local.name=e.name;local.position.set(e.x,0,e.z);local.rotation.y=e.angle;
  const world=(x:number,z:number)=>({x:e.x+x*Math.cos(e.angle)+z*Math.sin(e.angle),z:e.z-x*Math.sin(e.angle)+z*Math.cos(e.angle)});
  for(const x of e.pedestrians){
   const flaps:T.Group[]=[],screens:T.Mesh[]=[],lights:T.Mesh[]=[],indicator=new T.MeshBasicMaterial({color:0x7bc8af,toneMapped:false});
   for(const side of[-1,1]){
    const sx=x+side*.66;
    base.box(.24,1.0,1.55,sx,.51,0,steel,true);
    base.box(.27,.10,1.59,sx,1.06,0,dark);
    base.box(.045,.45,.045,sx,1.34,.40,steel);
    base.box(.24,.37,.085,sx,1.54,.40,dark);
    const screen=new T.Mesh(new T.PlaneGeometry(.18,.24),screenWait);screen.position.set(sx,1.51,.447);screens.push(screen);
    const lens=new T.Mesh(new T.SphereGeometry(.018,10,8),dark);lens.position.set(sx,1.67,.45);lenses.push(lens);
    const light=new T.Mesh(new T.PlaneGeometry(.16,.035),indicator);light.position.set(sx,1.345,.448);lights.push(light);
    const flap=new T.Group();flap.position.set(sx,0,.02);flap.userData.side=side;
    const panel=new T.Mesh(new T.BoxGeometry(.53,.64,.035),blue);panel.position.set(-side*.28,.59,0);flap.add(panel);flaps.push(flap);local.add(flap);
   }
   const display=mergeEquipment(screens,'paired reader displays');local.add(display,mergeEquipment(lights,'paired reader indicators'));
   const mark=pedestrianMark.clone();mark.position.set(x,.035,1.15);mark.rotation.x=-Math.PI/2;local.add(mark);
   readers.push({entrance:e.id,...world(x,0),flaps,screens:[display],authorized:false,progress:0,indicator});
  }
  local.add(mergeEquipment(lenses,'reader lenses'));
  // A six-metre boom leaves the original centre road open when raised.
  base.box(.48,1.12,.50,3.15,.57,-1.45,white,true);
  base.box(.50,.17,.52,3.15,1.04,-1.45,red);
  const pivot=new T.Group();pivot.position.set(3.15,1.02,-1.45);
  const arm=new T.Mesh(new T.BoxGeometry(6.0,.095,.09),white);arm.position.x=-3.0;pivot.add(arm);
  const stripes:T.Mesh[]=[];
  for(let x=-.4;x>-5.9;x-=.65){const stripe=new T.Mesh(new T.BoxGeometry(.25,.1,.096),red);stripe.position.x=x;stripe.rotation.z=.22;stripes.push(stripe);}
  pivot.add(mergeEquipment(stripes,'boom red stripes'));
  local.add(pivot);booms.push({entrance:e.id,...world(0,-1.45),pivot,progress:0});
  if(e.id!=='hankou'&&e.id!=='guangzhou'){
   for(const side of[-1,1]){base.box(.32,2.1,.32,side*6.0,1.05,0,mats.stone,true);base.box(.35,.13,.35,side*6,2.13,0,steel);}
   const name=label(e.name,2.6,.42);name.position.set(3.7,2.35,-1.8);local.add(name);base.box(.07,2.30,.07,3.7,1.15,-1.84,steel);
  }
  local.add(base.finish('entrance equipment'));group.add(local);
  for(const s of base.solids){const p=world(s.x,s.z);solids.push({...s,...p,angle:(s.angle??0)+e.angle});}
 }
 const update=(dt:number,position:T.Vector3,active:boolean)=>{
  if(!active)return;
  for(const r of readers){const near=position.y<3&&Math.hypot(position.x-r.x,position.z-r.z)<3.4;r.progress=T.MathUtils.damp(r.progress,near?1:0,near?10:3,dt);r.flaps.forEach(f=>f.rotation.y=(f.userData.side as number)*r.progress*Math.PI*.48);r.indicator.color.setHex(near?0x7aebaa:0x65aab0);if(near!==r.authorized){r.authorized=near;r.screens.forEach(screen=>screen.material=near?screenPass:screenWait);}}
  for(const b of booms){const near=position.y<4&&Math.hypot(position.x-b.x,position.z-b.z)<10;b.progress=T.MathUtils.damp(b.progress,near?1:0,near?5:2,dt);b.pivot.rotation.z=-b.progress*Math.PI*.48;}
 };
 const snapshot=()=>({entrances:campusEntrances.length,readers:readers.map(r=>({entrance:r.entrance,x:r.x,z:r.z,open:r.progress,display:r.authorized?'pass':'wait'})),booms:booms.map(b=>({entrance:b.entrance,x:b.x,z:b.z,open:b.progress}))});
 return{group,solids,update,snapshot};
}
