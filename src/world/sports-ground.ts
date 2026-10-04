import * as T from 'three';
import {Builder} from './geometry.ts';
import {insideRing,planShape} from './campus-map.ts';
import type {Materials} from './materials.ts';
import {sportsCourts,sportsFence,sportsGates,sportsStand} from './sports-layout.ts';

type Point = [number,number];
function frame(points:number[][]){
  const x=points.reduce((s,p)=>s+p[0],0)/points.length,z=points.reduce((s,p)=>s+p[1],0)/points.length;
  const width=(Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1])+Math.hypot(points[2][0]-points[3][0],points[2][1]-points[3][1]))/2;
  const length=(Math.hypot(points[3][0]-points[0][0],points[3][1]-points[0][1])+Math.hypot(points[2][0]-points[1][0],points[2][1]-points[1][1]))/2;
  const angle=Math.atan2(points[3][0]+points[2][0]-points[0][0]-points[1][0],points[3][1]+points[2][1]-points[0][1]-points[1][1]);
  return{x,z,width,length,angle,point:(u:number,y:number,v:number)=>new T.Vector3(x+u*Math.cos(angle)+v*Math.sin(angle),y,z-u*Math.sin(angle)+v*Math.cos(angle))};
}

/** Keep planting out of playing surfaces and the paths immediately around them. */
export function sportsClearance(x:number,z:number){
  if(insideRing(x,z,sportsFence))return true;
  if(sportsGates.some(g=>Math.hypot(x-g.x,z-g.z)<6))return true;
  return [...sportsCourts.map(c=>c.points),sportsStand].some(points=>{
    const f=frame(points),dx=x-f.x,dz=z-f.z;
    return Math.abs(dx*Math.cos(f.angle)-dz*Math.sin(f.angle))<f.width/2+2.5&&Math.abs(dx*Math.sin(f.angle)+dz*Math.cos(f.angle))<f.length/2+2.5;
  });
}

export function createSportsGround(mats:Materials){
  const b=new Builder();
  const material=(name:string,color:number)=>new T.MeshStandardMaterial({name,color,roughness:.88});
  const red=material('sports red court',0x98564c),green=material('sports green court',0x486d58),paint=material('sports court lines',0xe7e7d8);
  // Existing campus paving uses a -1 depth bias. Keep these shallow overlays
  // ordered above it even at grazing angles without changing global road depth.
  for(const [index,mat] of [red,green,paint].entries()){
    mat.polygonOffset=true;mat.polygonOffsetFactor=-(index+2);mat.polygonOffsetUnits=-(index+2);
  }
  const metal=material('sports green fence and supports',0x376459),roof=material('sports podium pale roof',0xd1cebc),step=material('sports podium grey steps',0xaaa99d);
  step.map=mats.textures.get('stone-grain.webp')??null;
  const glass=material('sports podium rear glazing',0x6f8581),board=material('sports backboards',0xcdd8cd),rim=material('sports orange hoops',0xbe6541);
  const surf=(points:number[][],mat:T.Material,y=.055)=>b.add(new T.ShapeGeometry(planShape({points})).rotateX(-Math.PI/2),mat,0,y,0);
  const meshCanvas=document.createElement('canvas');meshCanvas.width=meshCanvas.height=64;
  const ctx=meshCanvas.getContext('2d')!;ctx.strokeStyle='#446f5e';ctx.lineWidth=2.4;ctx.beginPath();
  ctx.moveTo(0,32);ctx.lineTo(32,0);ctx.lineTo(64,32);ctx.lineTo(32,64);ctx.closePath();ctx.stroke();
  const meshTexture=new T.CanvasTexture(meshCanvas);meshTexture.colorSpace=T.SRGBColorSpace;meshTexture.wrapS=meshTexture.wrapT=T.RepeatWrapping;
  const meshMat=new T.MeshStandardMaterial({name:'sports diamond wire mesh',map:meshTexture,alphaTest:.3,side:T.DoubleSide,roughness:.85});
  const net=(a:T.Vector3,c:T.Vector3,height:number,cell=.18)=>{
    const dx=c.x-a.x,dz=c.z-a.z,w=Math.hypot(dx,dz),geo=new T.PlaneGeometry(w,height),uv=geo.getAttribute('uv');
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/cell,uv.getY(i)*height/cell);
    b.add(geo,meshMat,(a.x+c.x)/2,a.y+height/2,(a.z+c.z)/2,new T.Euler(0,Math.atan2(-dz,dx),0));
  };
  for(const court of sportsCourts){
    const f=frame(court.points),p=f.point;
    surf(court.points,red);
    const box=(w:number,h:number,d:number,u:number,y:number,v:number,mat:T.Material,solid=false)=>{const q=p(u,y,v);b.box(w,h,d,q.x,q.y,q.z,mat,solid,f.angle);};
    const line=(u:number,v:number,w:number,d:number)=>box(w,.006,d,u,.07,v,paint);
    const rect=(w:number,l:number)=>{for(const s of [-1,1]){line(s*w/2,0,.06,l);line(0,s*l/2,w,.06);}};
    const arc=(u:number,v:number,r:number,start=0,end=Math.PI*2)=>{
      const pts=Array.from({length:65},(_,i)=>p(u+Math.cos(start+(end-start)*i/64)*r,.074,v+Math.sin(start+(end-start)*i/64)*r));b.line(pts,.035,paint,4);
    };
    if(court.kind==='tennis'){
      // Map footprints include a narrow run-off strip; the north feature with
      // ambiguous map markings is deliberately not classified as a fifth court.
      const w=Math.min(10.97,f.width-1.4),l=Math.min(23.77,f.length-2.2);
      box(w,.008,l,0,.062,0,green);rect(w,l);
      for(const s of [-1,1]){line(s*w*.375,0,.055,l);line(0,s*l*.269,w*.75,.055);line(0,s*(l/2+.1),.055,.2);}
      line(0,0,.055,l*.538);
      net(p(-w/2-.65,.07,0),p(w/2+.65,.07,0),.91,.1);
      for(const s of [-1,1]){const q=p(s*(w/2+.65),.58,0);b.box(.09,1.12,.09,q.x,q.y,q.z,metal,true,f.angle);}
      box(w+1.3,.045,.05,0,1.0,0,paint);
      const q=p(0,.51,0);b.solids.push({x:q.x,y:q.y,z:q.z,w:w+1.3,h:.96,d:.07,angle:f.angle});
    }else{
      const half=court.kind==='half',w=half?f.length-1.1:Math.min(15,f.width-1.1),l=half?(f.width-1.2)*2:Math.min(28,f.length-1.4);
      // The small northern half court has its hoop to the east in the plan.
      const cp=(u:number,y:number,v:number)=>half?p(v,y,-u):p(u,y,v);
      const cb=(ww:number,h:number,dd:number,u:number,y:number,v:number,mat:T.Material,solid=false)=>{const q=cp(u,y,v);b.box(ww,h,dd,q.x,q.y,q.z,mat,solid,f.angle+(half?Math.PI/2:0));};
      const cl=(u:number,v:number,ww:number,dd:number)=>cb(ww,.006,dd,u,.071,v,paint);
      const ca=(u:number,v:number,r:number,start:number,end:number)=>b.line(Array.from({length:49},(_,i)=>cp(u+Math.cos(start+(end-start)*i/48)*r,.075,v+Math.sin(start+(end-start)*i/48)*r)),.035,paint,4);
      const mid=half?-l/4:0,ends=half?[1]:[-1,1];
      cb(w,.008,half?l/2:l,0,.062,0,green);
      for(const s of [-1,1])cl(s*w/2,0,.06,half?l/2:l);
      for(const s of [-1,1])cl(0,s*(half?l/4:l/2),w,.06);
      cl(0,mid,w,.06);if(!half)arc(0,0,Math.min(1.8,w*.13));
      for(const s of ends){
        const end=s*(half?l/4:l/2),free=end-s*Math.min(5.8,(half?l/2:l)*.35),basket=end-s*1.2;
        cl(0,free,4.8,.06);for(const side of [-1,1])cl(side*2.4,(free+end)/2,.06,Math.abs(end-free));
        ca(0,free,1.8,s>0?Math.PI:0,s>0?Math.PI*2:Math.PI);
        const radius=Math.min(6.25,w/2-.5);ca(0,basket,radius,s>0?Math.PI:0,s>0?Math.PI*2:Math.PI);
        cb(.16,3.4,.16,0,1.75,end+s*.35,metal,true);cb(.14,.12,1.55,0,3.45,end-s*.35,metal);
        cb(1.8,1.05,.08,0,3.45,basket+s*.32,board);cb(.62,.045,.025,0,3.25,basket+s*.265,paint);
        const q=cp(0,3.05,basket);b.add(new T.TorusGeometry(.225,.025,6,24).rotateX(Math.PI/2),rim,q.x,q.y,q.z);
        for(let n=0;n<8;n++){const a=n*Math.PI/4;b.cylinder(cp(Math.cos(a)*.21,3.04,basket+Math.sin(a)*.21),cp(Math.cos(a)*.14,2.68,basket+Math.sin(a)*.14),.009,.009,paint,4);}
      }
    }
  }
  // Gate positions come from the labelled plan entrances. Use the local fence
  // tangent to leave a real gap through both segments adjacent to a gate.
  const perimeter=sportsFence.map(p=>[...p]);
  const gates=sportsGates.map(g=>{
    let index=0;perimeter.forEach((p,i)=>{if(Math.hypot(p[0]-g.x,p[1]-g.z)<Math.hypot(perimeter[index][0]-g.x,perimeter[index][1]-g.z))index=i;});
    perimeter[index]=[g.x,g.z];const prev=perimeter[(index+perimeter.length-1)%perimeter.length],next=perimeter[(index+1)%perimeter.length];
    const length=Math.hypot(next[0]-prev[0],next[1]-prev[1]);return{...g,tx:(next[0]-prev[0])/length,tz:(next[1]-prev[1])/length};
  });
  const fence=(a:Point,c:Point)=>{
    const length=Math.hypot(c[0]-a[0],c[1]-a[1]);if(length<.1)return;
    const angle=Math.atan2(-(c[1]-a[1]),c[0]-a[0]);
    net(new T.Vector3(a[0],.08,a[1]),new T.Vector3(c[0],.08,c[1]),4.1);
    b.solids.push({x:(a[0]+c[0])/2,y:2.12,z:(a[1]+c[1])/2,w:length,h:4.24,d:.09,angle});
    for(const y of [.16,2.15,4.18])b.box(length,.055,.055,(a[0]+c[0])/2,y,(a[1]+c[1])/2,metal,false,angle);
    const count=Math.ceil(length/3.4);for(let j=0;j<=count;j++){const t=j/count;b.box(.085,4.3,.085,a[0]+(c[0]-a[0])*t,2.15,a[1]+(c[1]-a[1])*t,metal);}
  };
  for(let i=0;i<perimeter.length;i++){
    const a=perimeter[i],c=perimeter[(i+1)%perimeter.length],dx=c[0]-a[0],dz=c[1]-a[1],cuts=[0,1],ll=dx*dx+dz*dz;
    for(const gate of gates){const ux=a[0]-gate.x,uz=a[1]-gate.z,bb=2*(ux*dx+uz*dz),cc=ux*ux+uz*uz-(gate.width/2)**2,disc=bb*bb-4*ll*cc;
      if(disc>=0)for(const t of [(-bb-Math.sqrt(disc))/(2*ll),(-bb+Math.sqrt(disc))/(2*ll)])if(t>0&&t<1)cuts.push(t);
    }
    cuts.sort((a,c)=>a-c);
    for(let j=1;j<cuts.length;j++){const t=(cuts[j-1]+cuts[j])/2;if(gates.some(g=>Math.hypot(a[0]+dx*t-g.x,a[1]+dz*t-g.z)<g.width/2))continue;
      fence([a[0]+dx*cuts[j-1],a[1]+dz*cuts[j-1]],[a[0]+dx*cuts[j],a[1]+dz*cuts[j]]);
    }
  }
  // Open-front west podium: shallow steps, thin cantilever canopy and glazed
  // rear wall. No invisible solid box fills the space beneath its roof.
  const stand=frame(sportsStand),sp=stand.point;
  const sb=(w:number,h:number,d:number,u:number,y:number,v:number,mat:T.Material,solid=false)=>{const q=sp(u,y,v);b.box(w,h,d,q.x,q.y,q.z,mat,solid,stand.angle);};
  for(let i=0;i<5;i++){const w=stand.width-i*.7,h=(i+1)*.18;sb(w,h,stand.length,-i*.35,h/2,0,step,true);}
  sb(stand.width-3.5,.18,stand.length,-1.75,.99,0,step,true);
  sb(.18,3.2,stand.length-1,-stand.width/2+.25,2.68,0,glass,true);
  for(const v of [-stand.length/2+.65,0,stand.length/2-.65]){sb(.18,3.65,.18,1.8,2.92,v,metal,true);sb(.1,3.3,.1,-stand.width/2+.4,2.72,v,metal);}
  for(const y of [1.2,2.65,4.25])sb(.12,.08,stand.length-1,-stand.width/2+.4,y,0,metal);
  sb(stand.width+1.4,.24,stand.length+1.8,.5,4.88,0,roof,true);
  // Low field-side seating, as seen through the west fence in scene_gl-3-17.
  for(const v of [-7,-4,0,4,7]){sb(.9,.1,1.6,-.5,1.52,v,roof);for(const dz of [-.5,.5])sb(.1,.42,.1,-.5,1.26,v+dz,metal);}
  const group=b.finish('Suzhe sports courts fences and roofed podium',40);
  for(const child of group.children)if(child instanceof T.Mesh&&(child.material===red||child.material===green||child.material===paint||child.material===meshMat))child.castShadow=false;
  group.userData={source:'NJU 2024 campus plan; official VR scene_gl-3-17; BV1iL411h7G2 20:00',heightConfidence:'estimated from imagery',courts:sportsCourts,gates,stand:{...stand,point:undefined}};
  return{group,solids:b.solids,gates,courts:sportsCourts,stand:{x:stand.x,z:stand.z,angle:stand.angle,width:stand.width,length:stand.length}};
}
