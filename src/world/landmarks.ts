import * as T from 'three';
import {auditoriumDetails} from './auditorium-details.ts';
import {Builder,curvedRoof,type Solid} from './geometry.ts';
import {architecturalPalette,detailedWindow,masonryFace,panelDoor} from './architecture.ts';

function place(group:T.Group,solids:Solid[],x:number,z:number,angle:number){
  group.position.set(x,0,z);group.rotation.y=angle;
  return solids.map(s=>({...s,x:x+s.x*Math.cos(angle)+s.z*Math.sin(angle),z:z-s.x*Math.sin(angle)+s.z*Math.cos(angle),angle:(s.angle??0)+angle}));
}

function artsPortal(b:Builder,p:ReturnType<typeof architecturalPalette>,front:number){
  // User arts-entry photo: cream pilasters, bronze lettering on stone and a tiled cap.
  // Proportions are photographic estimates; keep the unmodelled interior behind closed doors.
  const stone=p.stone.clone();stone.name='arts-limestone';stone.color.set(0xd6d2bf);
  // Recess the visible backing behind the door leaves and transom lattice.
  b.box(4.7,3.6,.16,0,1.8,front+.80,p.recess);
  b.solids.push({x:0,y:1.8,z:front+.65,w:4.7,h:3.6,d:1.35});
  panelDoor(b,p,0,1.45,front+1.23,2.7,2.2);
  for(const x of [-1.94,1.94]){
    b.box(.78,3.45,1.28,x,1.725,front+.79,stone);
    b.box(1.03,.35,1.46,x,.175,front+.85,stone);
    for(const y of [.55,3.30])b.box(.97,.16,1.39,x,y,front+.83,stone);
    b.box(.62,2.47,.075,x,1.93,front+1.46,stone);
  }
  b.box(3.15,.20,.23,0,2.57,front+1.27,p.redwood);
  b.box(3.15,.17,.23,0,3.31,front+1.27,p.redwood);
  for(const x of [-1.49,0,1.49])b.box(.12,.65,.23,x,2.94,front+1.27,p.redwood);
  for(const center of [-.75,.75]){
    b.box(1.36,.62,.08,center,2.94,front+1.13,p.glass);
    for(const slope of [-1,1])for(let intercept=-.96;intercept<=.96;intercept+=.18){
      const lo=Math.max(-.66,slope===1?-.29-intercept:intercept-.29);
      const hi=Math.min(.66,slope===1?.29-intercept:intercept+.29);
      if(hi<=lo)continue;
      b.cylinder(new T.Vector3(center+lo,2.94+slope*lo+intercept,front+1.20),new T.Vector3(center+hi,2.94+slope*hi+intercept,front+1.20),.018,.018,p.redwood,5);
    }
  }
  b.box(4.76,.55,1.48,0,3.82,front+.78,stone);
  b.box(4.95,.15,1.62,0,4.14,front+.80,stone);
  // Scale the roof's curled trim too, so its ornament suits this small canopy.
  const canopy=new Builder();curvedRoof(canopy,0,0,10,3.5,0,.9,p.roof,p.ribs,true,3.3);
  const roof=canopy.finish('arts entrance canopy');roof.scale.setScalar(.5);roof.position.set(0,4.10,front+.73);roof.updateMatrixWorld(true);
  roof.traverse(o=>{if(o instanceof T.Mesh)b.add(o.geometry.clone().applyMatrix4(o.matrixWorld),o.material as T.Material);});
}

/** Separate model for each courtyard wing; raised central roofs follow public photographs. */
export function buildWing(side:'east'|'west'){
  const b=new Builder(),p=architecturalPalette(),w=side==='east'?53.4:50.2,d=side==='east'?18.8:20.5;
  p.roof.side=T.DoubleSide;
  const centers=Array.from({length:14},(_,i)=>(i-6.5)*(w-5)/13);
  const rows=[{y:1.45,h:1.65,w:1.55},{y:4.45,h:2.35,w:1.65},{y:7.65,h:2.35,w:1.65}];
  b.box(w, .7,d,0,.35,0,p.stone,true);
  b.box(w-1.2,8.5,d-1.2,0,4.8,0,p.recess);
  b.solids.push({x:0,y:4.8,z:0,w,h:8.5,d});
  for(const front of [-1,1]){
    const angle=front===1?0:Math.PI;
    masonryFace(b,new T.Vector3(0,0,front*d/2),angle,w,.7,9.25,centers.map(x=>x*front),rows,p.brick);
    for(const x of centers)for(const r of rows){
      if(front===1&&Math.abs(x)<2.1&&r.y<2)continue;
      detailedWindow(b,p,x,r.y,front*(d/2+.03),r.w,r.h,angle,true,Math.round((x+60)*17+r.y));
    }
  }
  const endWindows=[-d*.3,0,d*.3];
  for(const side of [-1,1]){
    masonryFace(b,new T.Vector3(side*w/2,0,0),side*Math.PI/2,d,.7,9.25,endWindows.map(z=>-z*side),rows,p.brick);
    for(const z of endWindows)for(const r of rows)detailedWindow(b,p,side*(w/2+.03),r.y,z,r.w,r.h,side*Math.PI/2,true,70+Math.round(z));
  }
  for(const y of [.72,2.75,5.99,9.17])b.box(w+.3,.15,d+.3,0,y,0,p.stone);
  b.box(w+.75,.35,d+.9,0,9.5,0,p.wood);
  curvedRoof(b,0,0,w+2.7,d+2.6,9.7,4.5,p.roof,p.ribs,true);
  curvedRoof(b,0,0,14.5,d+2.8,9.76,7.3,p.roof,p.ribs,true,4.3);
  if(side==='east')artsPortal(b,p,d/2);
  else{
  b.solids.push({x:0,y:1.65,z:d/2+.5,w:4.1,h:3.3,d:1.4});
  b.box(4.1,3.3,.1,0,1.65,d/2+.65,p.recess);
  panelDoor(b,p,0,1.7,d/2+1.23,2.8,3.1);
  for(const x of [-1.65,1.65])b.box(.3,3.5,.5,x,1.75,d/2+1.21,p.stone);
  b.box(4.3,.25,1.8,0,3.58,d/2+.75,p.stone);
  // Preserve the West Building's separately referenced flat stone lintel.
  b.box(4.65,.22,1.35,0,3.80,d/2+.78,p.stone);
  b.box(4.18,.14,1.12,0,4.0,d/2+.78,p.stone);
  for(const x of [-1.5,1.5])for(const y of [.28,3.45])b.box(.52,.18,.72,x,y,d/2+1.20,p.stone);
  }
  for(let x=-w/2;x<w/2;x+=.34)for(const s of[-1,1])b.add(new T.CylinderGeometry(.07,.085,.11,7).rotateX(Math.PI/2),p.ribs,x,10.0+.5*Math.pow(Math.abs(x/(w/2)),8),s*(d/2+1.34));
  for(let step=0;step<3;step++)b.box(4.3,(3-step)*.14,.38,0,(3-step)*.07,d/2+1.62+step*.38,p.stone,true);
  if(side==='east'){
    b.box(16.4,9.2,6.5,0,4.6,-d/2-3.15,p.brick,true);
    curvedRoof(b,0,-d/2-2.8,18,8.2,9.4,2.5,p.roof,p.ribs,false);
  }
  for(const x of [-w/2+.3,w/2-.3])for(const s of [-1,1])b.cylinder(new T.Vector3(x,.25,s*(d/2+.2)),new T.Vector3(x,9.5,s*(d/2+.2)),.065,.065,p.pipe,7);
  const group=b.finish(side==='east'?'East Building':'West Building');
  const solids=place(group,b.solids,side==='east'?50.4:-50.9,side==='east'?48.1:45.9,side==='east'?-Math.PI/2:Math.PI/2);
  group.userData={status:'approximate',reference:`Commons ${side} facade; OSM ${side==='east'?'88778615; user arts-entry entrance photo':'88778613'}`};
  return {group,solids};
}

export function buildAuditorium(){
  const b=new Builder(),p=architecturalPalette();p.roof.side=T.DoubleSide;
  // Registered footprint retained; facade proportions follow the user's four
  // October 11 photographs. Heights and concealed elevations are approximate.
  const w=18.5,d=35.8,front=d/2+.3;
  p.redwood.color.set(0x612e35);p.brick.name="auditorium-brick";
  b.box(w,.96,d,0,.48,0,p.stone,true);
  b.box(12.5,8.3,d-1,0,5.11,0,p.brick,true);
  b.box(w,4.9,d-1.8,0,3.41,0,p.brick,true);
  for(const side of [-1,1])for(const z of [-11,0,11]){
    b.box(3.6,5.5,7.2,side*7.9,3.71,z,p.brick,true);
    const annex=new Builder();curvedRoof(annex,0,0,8,4.6,6.6,1.65,p.roof,p.ribs,false,2.6);
    const roof=annex.finish('annex roof');roof.rotation.y=Math.PI/2;roof.position.set(side*8,0,z);roof.updateMatrixWorld(true);
    roof.traverse(o=>{if(o instanceof T.Mesh)b.add(o.geometry.clone().applyMatrix4(o.matrixWorld),o.material as T.Material);});
  }
  // A continuous curved gable roof reaches the red front gable. The previous
  // hipped end descended through that gable and left its upper triangle bare.
  const roofY=(x:number)=>9.35+4.35*Math.pow(1-Math.min(1,Math.abs(x)/7.55),1.65)+.35*Math.pow(Math.abs(x)/7.55,8);
  const zs=[-d/2-.7,front-.55],vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let i=0;i<=60;i++){const x=-7.55+i*15.1/60;for(const z of zs){vertices.push(x,roofY(x),z);uvs.push(x/2,z/2);}}
  for(let i=0;i<60;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  const roof=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3)).setAttribute('uv',new T.Float32BufferAttribute(uvs,2)).setIndex(indices);roof.computeVertexNormals();b.add(roof,p.roof);
  for(let x=-7.5;x<=7.51;x+=.27)b.cylinder(new T.Vector3(x,roofY(x)+.045,zs[0]),new T.Vector3(x,roofY(x)+.045,zs[1]),.052,.052,p.ribs,5);
  for(const z of zs){const edge=Array.from({length:61},(_,i)=>{const x=-7.55+i*15.1/60;return new T.Vector3(x,roofY(x)+.04,z);});b.line(edge,.13,p.ribs,6);}
  b.cylinder(new T.Vector3(0,13.9,zs[0]),new T.Vector3(0,13.9,zs[1]),.17,.17,p.ribs,8);
  const gable=new T.Shape();gable.moveTo(-7.45,9.25);for(let i=0;i<=60;i++){const x=-7.45+i*14.9/60;gable.lineTo(x,roofY(x)-.10);}gable.lineTo(7.45,9.25);gable.closePath();
  b.add(new T.ExtrudeGeometry(gable,{depth:.16,bevelEnabled:false}),p.roof,0,0,front-.73);
  const redGable=new T.Shape([new T.Vector2(-3.5,10.03),new T.Vector2(0,13.35),new T.Vector2(3.5,10.03)]);
  b.add(new T.ExtrudeGeometry(redGable,{depth:.04,bevelEnabled:false}),p.redwood,0,0,front-.525);
  for(let x=-3.35;x<=3.35;x+=.19){const h=(1-Math.abs(x)/3.5)*3.32;b.box(.025,h,.035,x,10.03+h/2,front-.465,p.wood);}
  for(const side of [-1,1])b.cylinder(new T.Vector3(side*3.5,10.03,front-.445),new T.Vector3(0,13.35,front-.445),.10,.10,p.ribs,6);
  // The front eave spans horizontally between the two higher side gables.
  b.box(11.5,.28,.70,0,9.52,front-.23,p.ribs);
  for(let x=-5.72;x<=5.72;x+=.24)b.add(new T.CylinderGeometry(.09,.10,.22,7).rotateX(Math.PI/2),p.ribs,x,9.61,front+.15);
  const centers=[-3.52,0,3.52],doorY=3.36,doorH=4.8;
  masonryFace(b,new T.Vector3(0,0,front+.35),0,10.7,.96,9.4,centers,[{y:doorY,h:doorH,w:2.45},{y:8.14,h:1.65,w:1.7}],p.brick);
  b.box(10.7,8.44,.12,0,5.18,front-.3,p.recess);
  b.solids.push({x:0,y:5.18,z:front+.35,w:10.7,h:8.44,d:.7});
  b.box(11.5,.96,2.25,0,.48,front+.22,p.stone,true);
  for(const x of centers){
    // Recessed red leaves, three stacked carved panels and diamond transoms.
    b.box(2.39,doorH,.13,x,doorY,front+.23,p.redwood);
    for(const dx of [-1.25,0,1.25])b.box(.095,doorH+.08,.20,x+dx,doorY,front+.42,p.redwood);
    for(const y of [1.08,2.34,4.32,5.72])b.box(2.52,.11,.21,x,y,front+.43,p.redwood);
    for(const y of [1.69,3.27,5.04])for(const side of [-1,1]){
      const cx=x+side*.61,h=y===3.27?1.72:y===5.04?1.25:1.03,w=1.08;
      b.box(w,h,.035,cx,y,front+.31,p.recess);
      for(const slope of [-1,1])for(let intercept=-1.45;intercept<1.46;intercept+=.20){
        const lo=Math.max(-w/2,slope===1?-h/2-intercept:intercept-h/2),hi=Math.min(w/2,slope===1?h/2-intercept:intercept+h/2);
        if(hi>lo)b.cylinder(new T.Vector3(cx+lo,y+slope*lo+intercept,front+.36),new T.Vector3(cx+hi,y+slope*hi+intercept,front+.36),.021,.021,p.redwood,4);
      }
    }
    detailedWindow(b,p,x,8.14,front+.52,1.7,1.65,0,true,Math.round(x+8));
  }
  b.box(11,.25,1.4,0,6.02,front+.48,p.stone);
  curvedRoof(b,0,front+.12,11.4,3.1,6.14,.53,p.roof,p.ribs,true,4.9);
  // Preserve the six supported entrance levels, with stone cheeks at the ends.
  for(let i=0;i<6;i++){const h=(6-i)*.16;b.box(12.3,h,.42,0,h/2,front+1.25+i*.42,p.stone,true);}
  for(const side of [-1,1]){
    b.box(.65,1.52,2.45,side*6.27,.76,front+1.58,p.brick,true);
    b.box(.95,.16,2.68,side*6.27,1.55,front+1.60,p.stone,true);
    const x=side*7.65;
    b.box(4.6,8.18,4.25,x,5.05,front-.9,p.brick,true);
    for(const y of [.98,8.78,9.08])b.box(4.76,.17,4.35,x,y,front-.88,p.stone);
    const tri=new T.Shape();tri.moveTo(-2.42,0);tri.lineTo(0,2.53);tri.lineTo(2.42,0);tri.closePath();
    b.add(new T.ExtrudeGeometry(tri,{depth:.26,bevelEnabled:false}),p.stone,x,9.17,front+1.16);
    // Front-facing blank stone towers and circular carved reliefs, no windows.
    for(const direction of [-1,1]){
      b.cylinder(new T.Vector3(x+direction*2.5,9.20,front+1.49),new T.Vector3(x,11.81,front+1.49),.14,.14,p.ribs,7);
      b.cylinder(new T.Vector3(x+direction*2.08,9.35,front+1.435),new T.Vector3(x,11.51,front+1.435),.026,.026,p.wood,5);
    }
    b.box(4.78,.14,.31,x,9.24,front+1.40,p.stone);
    b.add(new T.CylinderGeometry(.60,.60,.045,48).rotateX(Math.PI/2),p.stone,x,10.07,front+1.44);
    b.add(new T.TorusGeometry(.61,.035,6,48),p.stone,x,10.07,front+1.47);
    for(const shape of auditoriumDetails.roundel){
      const make=(pts:number[][])=>pts.map(([u,v])=>new T.Vector2((u-.5)*1.13,(.5-v)*1.08));
      const sh=new T.Shape(make(shape.outline));for(const hole of shape.holes)sh.holes.push(new T.Path(make(hole)));
      b.add(new T.ShapeGeometry(sh),p.wood,x,10.07,front+1.472);
    }
    for(const dx of [-2.22,2.22])b.box(.36,.27,.43,x+dx,9.04,front+1.36,p.stone);
    // Side roof behind each gable, aligned to the same ridge and eave heights.
    const positions:number[]=[];
    for(const direction of [-1,1]){
      const ax=x+direction*2.52,y=9.17,z0=front-3.45,z1=front+1.41;
      positions.push(x,11.81,z0,ax,y,z0,ax,y,z1,x,11.81,z0,ax,y,z1,x,11.81,z1);
      for(let t=0;t<=1;t+=.055)b.cylinder(new T.Vector3(x+direction*2.52*t,11.81-2.64*t+.045,z0),new T.Vector3(x+direction*2.52*t,11.81-2.64*t+.045,z1),.048,.048,p.ribs,5);
    }
    const tg=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));tg.computeVertexNormals();b.add(tg,p.roof);
  }
  for(const [i,letter] of [auditoriumDetails.li,auditoriumDetails.tang].entries())for(const shape of letter){
    const make=(pts:number[][])=>pts.map(([u,v])=>new T.Vector2((u-.5)*.65,(.5-v)*.69));
    const sh=new T.Shape(make(shape.outline));for(const hole of shape.holes)sh.holes.push(new T.Path(make(hole)));
    b.add(new T.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:false}),p.brass,i===0?-1.76:1.76,8.33,front+.39);
  }
  for(const side of [-1,1])for(const z of [-12,-6,0,6,12]){detailedWindow(b,p,side*9.76,3.6,z,1.6,2.3,side*Math.PI/2,true,Math.round(z+30));b.box(.026,2.1,1.43,side*9.73,3.6,z,p.glass);}
  const group=b.finish('Great Auditorium');const solids=place(group,b.solids,-52.4,98.9,Math.PI/2);
  group.userData={status:'approximate',reference:'User four auditorium photographs 2026-10-11; OSM way 88778619',roofOrientation:'photo-aligned reconstruction, not survey'};
  return {group,solids};
}
