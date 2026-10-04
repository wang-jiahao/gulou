import * as T from 'three';
import {Builder} from './geometry.ts';
import type {MapFeature} from './campus-map.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';

// Sixteen upper window rows can be distinguished in gl410 f/u. The heights,
// hidden north elevation and roof depths are a visual estimate,
// not a surveyed storey count. Keep the established 6.2m ground passage.
// The setback wings look lower in the upward view because they are farther
// away. Do not turn that perspective effect into invented missing floors.
export const yifuTower={base:6.2,storey:3.25,rows:16,height:58.2,cuts:[-15.7,-7.8,8.3,16.9],wingRows:[16,16,16,16,16]};
export function yifuRows(u:number){return yifuTower.wingRows[yifuTower.cuts.filter(c=>u>c).length];}
export function buildYifuTower(f:MapFeature,b:Builder,detail:Builder,meshes:CollisionMesh[],cameraSolids:T.Object3D[],frame:{x:number;z:number;nx:number;nz:number;yaw:number}){
 const {x,z,nx,nz,yaw}=frame,point=(u:number,v:number)=>[x+u*nz+v*nx,z-u*nx+v*nz];
 const local=(px:number,pz:number)=>[(px-x)*nz-(pz-z)*nx,(px-x)*nx+(pz-z)*nz];
 const mat=(name:string,color:number)=>new T.MeshStandardMaterial({name:`yifu-tower-${name}`,color,roughness:.86});
 const wall=mat('pale-piers',0xe5e6e1),ledge=mat('ledges',0xd6d8d2),reveal=mat('recess',0x424a46),glass=mat('blue-grey-glass',0x668688),metal=mat('silver-frames',0xa3aca9),blue=mat('roof-cladding',0x709baf),seam=mat('cladding-joints',0x486471);
 glass.roughness=.32;glass.metalness=.28;metal.metalness=.35;blue.metalness=.3;blue.roughness=.56;
 const proxy=new T.MeshBasicMaterial({side:T.DoubleSide});
 const obstacles:{name:string;u:number;v:number;y:number;width:number;height:number;depth:number}[]=[],faces:{edge:number;rows:number;length:number}[]=[];
 function box(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material,solid?:string){
  const[px,pz]=point(u,v);b.box(w,h,d,px,y,pz,m,false,yaw);
  if(solid){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d).rotateY(yaw).translate(px,y,pz),proxy);meshes.push(collisionMesh(mesh));cameraSolids.push(mesh);obstacles.push({name:solid,u,v,y,width:w,height:h,depth:d});}
 }
 let windows=0;
 for(let edge=0;edge<f.points.length;edge++){
  const a=local(...f.points[edge] as [number,number]),c=local(...f.points[(edge+1)%f.points.length] as [number,number]),du=c[0]-a[0],dv=c[1]-a[1],len=Math.hypot(du,dv);
  const ts=[0,1,...yifuTower.cuts.map(cut=>(cut-a[0])/du).filter(t=>t>1e-5&&t<1-1e-5)].sort((a,c)=>a-c);
  for(let seg=0;seg<ts.length-1;seg++){
   const t0=ts[seg],t1=ts[seg+1],tm=(t0+t1)/2,u0=a[0]+du*tm,v0=a[1]+dv*tm,length=len*(t1-t0),rows=yifuRows(u0),top=yifuTower.base+rows*yifuTower.storey;
   const[px,pz]=point(u0,v0),ex=du*nz+dv*nx,ez=-du*nx+dv*nz,enx=-ez/len,enz=ex/len,angle=Math.atan2(enx,enz);
   const put=(target:Builder,u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>target.box(w,h,d,px+u*enz+v*enx,y,pz-u*enx+v*enz,m,false,angle);
   const pane=(u:number,y:number,w:number,h:number,split=true)=>{
    put(b,u,y,.035,w+.12,h+.12,.075,reveal);
    b.add(new T.PlaneGeometry(w,h),glass,px+u*enz+enx*.081,y,pz-u*enx+enz*.081,new T.Euler(0,angle,0));
    for(const s of[-1,1]){put(detail,u+s*w/2,y,.115,.055,h+.06,.09,metal);put(detail,u,y+s*h/2,.115,w+.06,.055,.09,metal);}
    if(split)put(detail,u,y,.115,.045,h,.09,metal);
    put(detail,u,y+h*.19,.115,w,.045,.09,metal);windows++;
   };
   const front=edge===5,back=edge===15,end=edge===0||edge===10;
   faces.push({edge,rows,length});
   if(length<.45)continue;
   // Approximate lower side/rear bays keep the verified central portico open.
   // Split rear trims at the passage, rather than hiding it with a full band.
   if(!front){
    const direction=du/len,groundIntervals=[[-length/2,length/2]];
    // Rear edge runs in the opposite local direction. Derive the two exterior
    // intervals directly from sorted opening endpoints.
    if(back){const ends=[(-3.35-u0)/direction,(3.35-u0)/direction].sort((a,c)=>a-c);groundIntervals.splice(0,groundIntervals.length,[-length/2,Math.min(length/2,ends[0])],[Math.max(-length/2,ends[1]),length/2]);}
    for(const[lo,hi]of groundIntervals)if(hi>lo){
     put(b,(lo+hi)/2,.39,.035,hi-lo,.78,.15,ledge);
     const bays=Math.max(1,Math.floor((hi-lo)/2.8)),step=(hi-lo)/(bays+1);
     for(let j=0;j<bays;j++)for(const y of[1.95,4.87])pane(lo+(j+1)*step,y,Math.min(1.95,step*.72),1.7);
    }
   }
   for(let row=0;row<rows;row++){
    const base=yifuTower.base+row*yifuTower.storey,y=base+1.68;
    if(front){
     for(const s of[-1,1])for(const u of[3.72,5.25,6.78])pane(s*u,y,1.12,1.74);
     if(row<rows-2){
      pane(0,base+1.73,3.7,2.55);for(const u of[-.93,.93])put(detail,u,base+1.73,.12,.045,2.55,.1,metal);
      for(let i=-8;i<=8;i++)put(detail,i*.205,base+.73,.17,.02,.51,.06,metal);
     }else put(b,0,base+1.7,.05,3.7,2.48,.1,reveal);
     for(const s of[-1,1]){
      put(b,s*2.51,y,.06,.63,2.6,.12,reveal);
      for(let j=0;j<10;j++)put(detail,s*2.51,base+.5+j*.24,.17,.63,.07,.14,ledge);
     }
     put(b,0,base+.21,.18,4.02,.28,.4,ledge);
    }else if(end){
     if(row===rows-2){
      // The aerial view shows one tall, dark upper slot spanning two rows.
      pane(0,base+3.1,1.9,5.95,false);
      for(let j=0;j<6;j++)put(detail,0,base+.52+j*.98,.17,1.9,.11,.12,metal);
     }else if(row<rows-2){pane(0,y,1.9,1.8);put(b,0,base+.55,.22,2.4,.14,.48,ledge);}
    }else{
     const bays=Math.max(1,Math.floor((length-.45)/(back?2.8:2.65))),step=length/(bays+1);
     for(let j=0;j<bays;j++)pane((j-(bays-1)/2)*step,y,Math.min(back?2.4:1.95,step*.74),1.8);
     put(b,0,base+.10,.065,length,.16,.18,ledge);
    }
   }
   if(front)for(const u of[-7.6,-5.99,-4.49,-3.06,-2.03,2.03,3.06,4.49,5.99,7.6])put(b,u,(top+6.2)/2,.19,.21,top-6.2,.43,wall);
   put(b,0,top+.14,0,length,.28,.26,wall);
   if(end&&edge===0){
    // Gold vertical name is readable in the official northwest aerial image.
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=1024;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#ba9847';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 82px "Kaiti SC","STKaiti",serif';
    [...'逸夫管理科学楼'].forEach((c,i)=>ctx.fillText(c,64,78+i*137,108));
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    const lettering=new T.MeshStandardMaterial({name:'yifu-gold-building-name',map,alphaTest:.1,roughness:.6});
    const u=-length*.29;b.add(new T.PlaneGeometry(1.1,12.3),lettering,px+u*enz+enx*.095,top*.62,pz-u*enx+enz*.095,new T.Euler(0,angle,0));
   }
  }
 }
 // Central roof: recessed blue-grey service enclosure, open front bays,
 // projecting slab, panel joints and braces, all batched by material.
 const top=yifuTower.height,roofTop=top+3.9;
 box(.2,top+1.72,-15.4,13.7,3.44,13.1,blue,'roof-service');
 box(.2,roofTop,-10.6,18.9,.42,27.1,blue,'roof-cap');
 for(const u of[-7.4,-2.5,2.5,7.5])box(u,top+1.74,-.45,.48,3.48,.55,wall,'roof-front-pier');
 for(const v of[-21.5,-17,-12.5,-8])for(const u of[-7.3,7.7])box(u,top+1.74,v,.42,3.48,.42,wall,'roof-side-pier');
 for(let u=-6.5;u<=6.6;u+=1.5){box(u,top+1.72,-8.838,.02,3.44,.025,seam);box(u,top+1.72,-21.962,.02,3.44,.025,seam);}
 for(const y of[top+.8,top+1.6,top+2.4,top+3.2])for(const v of[-8.838,-21.962])box(.2,y,v,13.7,.023,.025,seam);
 for(const u of[-6.664,7.064]){
  for(let v=-21;v<=-9;v+=1.5)box(u,top+1.72,v,.025,3.44,.024,seam);
  for(const y of[top+.8,top+1.6,top+2.4,top+3.2])box(u,y,-15.4,.025,.023,13.1,seam);
 }
 for(const u of[-7.1,-3.6,0,3.6,7.1]){
  const a=point(u,-.5),c=point(u,2.5);b.cylinder(new T.Vector3(a[0],top+2.2,a[1]),new T.Vector3(c[0],roofTop-.21,c[1]),.075,.075,ledge,4);
 }
 // End-wing blue service crowns are visible separately from the central cap
 // in gl402r. Their plan depth and the hidden opposite end are approximate.
 for(const u of[-19.9,21.1]){
  box(u,top+1.72,-12.2,7.1,3.44,7,blue,'end-roof-service');
  box(u,roofTop,-11.7,10.1,.42,12.8,blue,'end-roof-cap');
  for(const side of[-1,1]){
   box(u+side*3.25,top+1.74,-7.3,.42,3.48,.42,wall,'end-roof-pier');
   const a=point(u+side*3.25,-7.3),c=point(u+side*3.25,-5.4);
   b.cylinder(new T.Vector3(a[0],top+2.1,a[1]),new T.Vector3(c[0],roofTop-.21,c[1]),.075,.075,ledge,4);
   for(let v=-15;v<=-9;v+=1.2)box(u+side*3.562,top+1.72,v,.025,3.44,.025,seam);
   for(const y of[top+.8,top+1.6,top+2.4,top+3.2])box(u+side*3.562,y,-12.2,.025,.023,7,seam);
   box(u+side*3.581,top+1.8,-12.2,.03,.83,1.7,reveal);
   box(u+side*3.605,top+1.8,-12.2,.025,.71,1.58,glass);
   box(u+side*3.625,top+1.8,-12.2,.028,.75,.04,metal);
  }
  for(let q=-3;q<=3;q+=1.2)for(const v of[-8.688,-15.712])box(u+q,top+1.72,v,.025,3.44,.025,seam);
  for(const y of[top+.8,top+1.6,top+2.4,top+3.2])for(const v of[-8.688,-15.712])box(u,y,v,7.1,.023,.025,seam);
 }
 return{source:'official VR gl-4-10 f/u and gl-4-02 r',upperRows:16,storeyCount:'approximately 18 including the tall entrance; not an official floor count',height:top,roofTop:roofTop+.21,dimensions:'approximate common eave height; footprint setbacks, roof depth and hidden elevations reconstructed',lettering:{text:'逸夫管理科学楼',arrangement:'vertical',font:'approximate',edge:0},faces,windows,obstacles};
}
