import * as T from 'three';
import {Builder,curvedRoof,type Solid} from './geometry.ts';
import {architecturalPalette,detailedWindow,masonryFace,panelDoor} from './architecture.ts';

function place(group:T.Group,solids:Solid[],x:number,z:number,angle:number){
  group.position.set(x,0,z);group.rotation.y=angle;
  return solids.map(s=>({...s,x:x+s.x*Math.cos(angle)+s.z*Math.sin(angle),z:z-s.x*Math.sin(angle)+s.z*Math.cos(angle),angle:(s.angle??0)+angle}));
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
  // Central stone portal and tiled canopy, visible in the historical facade photos.
  b.solids.push({x:0,y:1.65,z:d/2+.5,w:4.1,h:3.3,d:1.4});
  b.box(4.1,3.3,.1,0,1.65,d/2+.65,p.recess);
  panelDoor(b,p,0,1.7,d/2+1.23,2.8,3.1);
  for(const x of [-1.65,1.65])b.box(.3,3.5,.5,x,1.75,d/2+1.21,p.stone);
  b.box(4.3,.25,1.8,0,3.58,d/2+.75,p.stone);
  // VR shows a flat, carved stone lintel at the wing entrance, not a miniature
  // tiled roof over the door. Keep the broad upper roof as the main silhouette.
  b.box(4.65,.22,1.35,0,3.80,d/2+.78,p.stone);
  b.box(4.18,.14,1.12,0,4.0,d/2+.78,p.stone);
  for(const x of [-1.5,1.5])for(const y of [.28,3.45])b.box(.52,.18,.72,x,y,d/2+1.20,p.stone);
  for(let x=-w/2;x<w/2;x+=.34)for(const s of[-1,1])b.add(new T.CylinderGeometry(.07,.085,.11,7).rotateX(Math.PI/2),p.ribs,x,10.0+.5*Math.pow(Math.abs(x/(w/2)),8),s*(d/2+1.34));
  for(let step=0;step<3;step++)b.box(4.3,(3-step)*.14,.38,0,(3-step)*.07,d/2+1.62+step*.38,p.stone,true);
  if(side==='east'){
    b.box(16.4,9.2,6.5,0,4.6,-d/2-3.15,p.brick,true);
    curvedRoof(b,0,-d/2-2.8,18,8.2,9.4,2.5,p.roof,p.ribs,false);
  }
  for(const x of [-w/2+.3,w/2-.3])for(const s of [-1,1])b.cylinder(new T.Vector3(x,.25,s*(d/2+.2)),new T.Vector3(x,9.5,s*(d/2+.2)),.065,.065,p.pipe,7);
  const group=b.finish(side==='east'?'East Building':'West Building');
  const solids=place(group,b.solids,side==='east'?50.4:-50.9,side==='east'?48.1:45.9,side==='east'?-Math.PI/2:Math.PI/2);
  group.userData={status:'approximate',reference:`Commons ${side} facade; OSM ${side==='east'?'88778615':'88778613'}`};
  return {group,solids};
}

export function buildAuditorium(){
  const b=new Builder(),p=architecturalPalette();p.roof.side=T.DoubleSide;
  // The eastern entry front faces the courtyard. Width/depth follow the OSM footprint;
  // three doors, central gable and flanking annexes follow the public facade photograph.
  const w=18.5,d=35.8;
  b.box(w,.96,d,0,.48,0,p.stone,true);
  b.box(12.5,8.8,d-1,0,5.36,0,p.brick,true);
  b.box(w,4.9,d-1.8,0,3.41,0,p.brick,true);
  for(const side of [-1,1])for(const z of [-11,0,11]){
    b.box(3.6,5.5,7.2,side*7.9,3.71,z,p.brick,true);
    const annex=new Builder();curvedRoof(annex,0,0,8,4.6,6.6,1.65,p.roof,p.ribs,false,2.6);
    const roof=annex.finish('annex roof');roof.rotation.y=Math.PI/2;roof.position.set(side*8,0,z);roof.updateMatrixWorld(true);
    roof.traverse(o=>{if(o instanceof T.Mesh){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);b.add(g,o.material as T.Material);}});
  }
  const main=new Builder();curvedRoof(main,0,0,d+1.5,15.3,9.25,4.7,p.roof,p.ribs,true,12.4);
  const mainRoof=main.finish('auditorium main roof');mainRoof.rotation.y=Math.PI/2;mainRoof.updateMatrixWorld(true);
  mainRoof.traverse(o=>{if(o instanceof T.Mesh)b.add(o.geometry.clone().applyMatrix4(o.matrixWorld),o.material as T.Material);});
  const front=d/2+.3;
  masonryFace(b,new T.Vector3(0,0,front+.35),0,13.8,.96,7.76,[-4.3,0,4.3],[{y:2.95,h:3.9,w:2.8},{y:6.35,h:1.55,w:2.6}],p.brick);
  b.box(13.8,6.8,.1,0,4.36,front-.3,p.recess);
  b.solids.push({x:0,y:4.36,z:front+.35,w:13.8,h:6.8,d:.7});
  b.box(13.3,.96,2.25,0,.48,front+.22,p.stone,true);
  for(const x of [-4.3,0,4.3]){
    panelDoor(b,p,x,2.95,front+.49,2.8,3.9);
    for(const dx of [-1.6,1.6])b.box(.48,4.45,.8,x+dx,3.12,front+.3,p.brick);
    detailedWindow(b,p,x,6.35,front+.53,2.6,1.55,0,true,Math.round(x+8));
  }
  b.box(14.3,.25,1.3,0,5.38,front+.55,p.stone);
  curvedRoof(b,0,front+.15,15.5,4.3,5.75,1.02,p.roof,p.ribs,true,5.1);
  // Three stepped entrance treads lead to the porch; all treads have matching colliders.
  for(let i=0;i<6;i++){const h=(6-i)*.16;b.box(12.3,h,.42,0,h/2,front+1.25+i*.42,p.stone,true);}
  for(const side of [-1,1]){
    b.box(3.8,6.1,3.8,side*8.1,4.01,front-.95,p.brick,true);
    detailedWindow(b,p,side*8.1,3.5,front+1.2,1.55,1.9,0,true,44);
    const gable=new T.Shape();gable.moveTo(-2.2,0);gable.lineTo(0,1.65);gable.lineTo(2.2,0);gable.closePath();
    b.add(new T.ExtrudeGeometry(gable,{depth:.25,bevelEnabled:false}),p.stone,side*8.1,7.12,front+1.02);
    for(const sign of [-1,1])b.cylinder(new T.Vector3(side*8.1+sign*2.2,7.12,front+1.28),new T.Vector3(side*8.1,8.77,front+1.28),.13,.13,p.ribs,7);
    b.add(new T.TorusGeometry(.4,.055,6,24),p.stone,side*8.1,7.85,front+1.32);
  }
  const gable=new T.Shape();gable.moveTo(-6,0);gable.lineTo(0,3.7);gable.lineTo(6,0);gable.closePath();
  b.add(new T.ExtrudeGeometry(gable,{depth:.2,bevelEnabled:false}),p.redwood,0,9.8,front-1);
  for(let x=-5.4;x<=5.4;x+=.48){const h=(1-Math.abs(x)/6)*3.5;b.box(.045,h,.065,x,9.8+h/2,front-.77,p.wood);}
  for(const side of [-1,1])b.cylinder(new T.Vector3(side*6,9.8,front-.78),new T.Vector3(0,13.5,front-.78),.14,.14,p.ribs,7);
  for(const side of [-1,1])for(const z of [-12,-6,0,6,12]){detailedWindow(b,p,side*9.76,3.6,z,1.6,2.3,side*Math.PI/2,true,Math.round(z+30));b.box(.026,2.1,1.43,side*9.73,3.6,z,p.glass);}
  const group=b.finish('Great Auditorium');const solids=place(group,b.solids,-52.4,98.9,Math.PI/2);
  group.userData={status:'approximate',reference:'NJU official description + Commons 南京大學大礼堂 + OSM way 88778619',roofOrientation:'photo-aligned reconstruction, not survey'};
  return {group,solids};
}
