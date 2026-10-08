import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

type Frontage={x:number;z:number;angle:number;nx:number;nz:number};

/** User photograph: six storeys, a three-pane stairwell, red doors and a
 * modest grey tiled canopy. Retain the mapped envelope and route-facing side;
 * hidden dimensions are approximate, and unreadable plaques remain unlettered. */
export function buildNanyuanEightEntrance(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],plaques:T.Group,doors:DoorRecord[],e:Frontage,name:string,wall:T.Material,frame:T.Material){
  const width=3.8,point=(u:number,v:number)=>({x:e.x+u*Math.cos(e.angle)+v*e.nx,z:e.z-u*Math.sin(e.angle)+v*e.nz});
  const material=(name:string,color:number,roughness=.85)=>new T.MeshStandardMaterial({name,color,roughness});
  const stone=material('nanyuan-eight-grey-portal',0x929b9f),red=material('nanyuan-eight-red-doors',0x72352d);
  const glass=material('nanyuan-eight-stair-glass',0x56747e,.3),tile=material('nanyuan-eight-canopy-tile',0x555d60);
  const bronze=material('nanyuan-eight-bronze-plaque',0x85724b,.62),soil=material('nanyuan-eight-planter-soil',0x4e5543);
  const blockers:{name:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[];
  const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>{const p=point(u,v);b.box(w,h,d,p.x,y,p.z,m,false,e.angle);};
  const proxy=(u:number,y:number,v:number,w:number,h:number,d:number)=>{const p=point(u,v),mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.position.set(p.x,y,p.z);mesh.rotation.y=e.angle;return mesh;};
  const solid=(name:string,u:number,y:number,v:number,w:number,h:number,d:number)=>{
    const mesh=proxy(u,y,v,w,h,d);mesh.name=name;meshes.push(collisionMesh(mesh));camera.push(mesh);blockers.push({name,u,y,v,w,h,d});
  };
  // Preserve the original closed-door collider and record exactly. The solid
  // building shell has no interior, so the photographed open leaves stay closed.
  const door=proxy(0,1.4,1.50,width,2.7,.06),dp=point(0,1.50);
  meshes.push(collisionMesh(door));camera.push(door);
  doors.push({name,x:dp.x,y:0,z:dp.z,yaw:e.angle,width});

  box(0,9.75,.235,6,19.5,.10,wall);
  const panes:{u:number;y:number;v:number;w:number;h:number}[]=[];
  for(let floor=1;floor<6;floor++){
    const y=3.25*(floor+.60),v=floor===1?1.51:.34,h=1.85;
    for(const [u,w] of [[-1.24,.46],[0,1.02],[1.24,.46]]){
      box(u,y,v,w,h,.035,glass);panes.push({u,y,v,w,h});
      for(const side of [-1,1]){
        box(u+side*w/2,y,v+.035,.065,h+.08,.09,frame);
        box(u,y+side*h/2,v+.035,w+.09,.065,.09,frame);
      }
      box(u,y+h*.19,v+.04,w,.055,.09,frame);
      if(u===0)box(u,y-h*.15,v+.04,.055,h*.65,.09,frame);
    }
    box(0,y-h/2-.13,v-.02,3.4,.16,.28,floor===1?stone:wall);
  }
  for(const side of [-1,1]){
    box(side*2.45,3.35,.87,1.05,6.7,1.34,stone);
    solid('portal-pier',side*2.45,3.35,.87,1.05,6.7,1.34);
    box(side*2.45,3.65,1.56,.43,3.45,.08,bronze);
    box(side*2.45,1.7,1.61,1.14,.14,.22,stone);
    box(side*3.28,.29,1.28,1.35,.58,1.85,stone);
    box(side*3.28,.585,1.28,1.13,.025,1.63,soil);
    solid('side-planter',side*3.28,.29,1.28,1.35,.58,1.85);
  }
  box(0,6.46,.87,5.95,.48,1.34,stone);
  solid('portal-lintel',0,6.46,.87,5.95,.48,1.34);
  box(0,3.11,.87,3.85,.33,1.34,stone);
  solid('door-lintel',0,3.11,.87,3.85,.33,1.34);
  box(0,.065,1.25,4.6,.13,2.5,stone);
  solid('landing',0,.065,1.25,4.6,.13,2.5);
  box(0,1.4,1.47,width-.12,2.6,.055,red);
  for(const side of [-1,1]){
    const u=side*.92;
    box(u,1.80,1.51,1.55,1.48,.025,glass);
    for(const offset of [-.77,0,.77])box(u+offset,1.8,1.54,.055,1.55,.065,red);
    for(const y of [1.05,1.55,2.02,2.55])box(u,y,1.54,1.58,.055,.065,red);
    box(side*.12,1.16,1.58,.045,.43,.065,bronze);
  }

  // Low curved eave with narrow repeated tile ribs; no invented ornate ridge.
  const canopyY=(u:number,v:number)=>7.09+.17*((v-.25)/1.9)**2+.20*(Math.abs(u)/3.18)**6;
  const positions:number[]=[],indices:number[]=[],steps=24,rows=6;
  for(let i=0;i<=steps;i++)for(let j=0;j<=rows;j++){
    const u=-3.18+6.36*i/steps,v=.25+1.9*j/rows,p=point(u,v);positions.push(p.x,canopyY(u,v),p.z);
  }
  for(let i=0;i<steps;i++)for(let j=0;j<rows;j++){
    const a=i*(rows+1)+j,c=a+rows+1;indices.push(a,a+1,c,c,a+1,c+1);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  tile.side=T.DoubleSide;b.add(g,tile);
  for(let i=0;i<=steps;i++){
    const u=-3.18+6.36*i/steps,points:T.Vector3[]=[];
    for(let j=0;j<=rows;j++){const v=.25+1.9*j/rows,p=point(u,v);points.push(new T.Vector3(p.x,canopyY(u,v)+.035,p.z));}
    b.line(points,.045,tile,6);
  }
  box(0,6.91,1.1,6.12,.14,1.9,stone);
  solid('tiled-canopy',0,7.18,1.2,6.36,.62,2.0);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#615337';ctx.fillRect(0,0,256,96);
  ctx.strokeStyle='#ac995e';ctx.lineWidth=5;ctx.strokeRect(4,4,248,88);
  ctx.fillStyle='#f1eee3';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 78px sans-serif';ctx.fillText('8',128,51);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const sign=new T.Mesh(new T.PlaneGeometry(1.35,.48),new T.MeshStandardMaterial({map:texture,roughness:.8}));
  const sp=point(0,1.56);sign.position.set(sp.x,6.52,sp.z);sign.rotation.y=e.angle;sign.name='南园八舍 · 8';plaques.add(sign);
  return {frontage:[e.x,e.z,e.nx,e.nz],width,panes,blockers,number:'8',source:'user nanyuan-8 photograph; dimensions approximate'};
}
