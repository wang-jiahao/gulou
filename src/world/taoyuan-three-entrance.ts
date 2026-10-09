import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {DoorRecord} from './building-entrances.ts';

type Frontage={x:number;z:number;angle:number;nx:number;nz:number};

/** User's entry/context photographs: blank grey panel, small brass 3/陶园,
 * solid balcony boxes, red rails and a left-hand canopy on round columns.
 * Keep the mapped envelope and six-storey estimate; hidden dimensions are approximate. */
export function buildTaoyuanThreeEntrance(b:Builder,meshes:CollisionMesh[],camera:T.Object3D[],plaques:T.Group,doors:DoorRecord[],e:Frontage,name:string){
  const entryU=-6,point=(u:number,y:number,v:number)=>new T.Vector3(e.x+u*Math.cos(e.angle)+v*e.nx,y,e.z-u*Math.sin(e.angle)+v*e.nz);
  const material=(name:string,color:number,roughness=.85)=>new T.MeshStandardMaterial({name:`taoyuan-three-${name}`,color,roughness});
  const grey=material('grey-surround',0x858c8e),pale=material('blank-panel',0xc4c5c0),dark=material('seams-and-plinth',0x505a5c);
  const red=material('red-rails',0x824940),glass=material('recessed-glass',0x455c61,.32),metal=material('metal-rails',0x788783,.55);
  const blockers:{name:string;u:number;y:number;v:number;w:number;h:number;d:number}[]=[],panes:{u:number;y:number;v:number;w:number;h:number}[]=[];
  const box=(u:number,y:number,v:number,w:number,h:number,d:number,m:T.Material)=>{const p=point(u,y,v);b.box(w,h,d,p.x,y,p.z,m,false,e.angle);};
  const solid=(name:string,u:number,y:number,v:number,w:number,h:number,d:number)=>{
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.position.copy(point(u,y,v));mesh.rotation.y=e.angle;mesh.name=name;
    meshes.push(collisionMesh(mesh));camera.push(mesh);blockers.push({name,u,y,v,w,h,d});
  };
  // All opaque finishes are shallow and remain on the existing mapped shell.
  box(.05,9.75,.10,15.55,19.5,.18,grey);
  box(.15,12.65,.23,7.85,13.55,.10,pale);
  box(.05,.39,.23,15.55,.78,.10,dark);
  for(let floor=1;floor<6;floor++){
    const y=3.25*floor;
    box(.05,y,.20,15.55,.035,.025,dark);
    if(y>6)box(.15,y,.29,7.85,.025,.015,dark);
    // Recessed balcony glazing sits behind the projecting solid parapet and
    // its short red open-rail section. It never extends onto the blank panel.
    const base=y+.10;
    box(5.85,base,.84,3.25,.18,1.36,pale);
    solid('balcony-slab',5.85,base,.84,3.25,.18,1.36);
    box(6.64,base+.64,1.45,1.66,1.10,.17,pale);
    solid('balcony-parapet',6.64,base+.64,1.45,1.66,1.10,.17);
    box(7.39,base+.64,.84,.17,1.10,1.2,pale);
    solid('balcony-return',7.39,base+.64,.84,.17,1.10,1.2);
    box(5.55,base+1.32,.23,2.28,2.28,.04,glass);panes.push({u:5.55,y:base+1.32,v:.23,w:2.28,h:2.28});
    for(const u of [4.42,5.55,6.68])box(u,base+1.32,.28,.065,2.36,.08,red);
    for(const yy of [base+.18,base+1.31,base+2.49])box(5.55,yy,.28,2.34,.06,.08,red);
    for(const yy of [.34,.70,1.06])box(5.02,base+yy,1.47,1.54,.045,.055,red);
    for(const u of [4.27,4.77,5.27,5.77])box(u,base+.63,1.47,.04,1.10,.055,red);
  }
  // The shell has no interior: keep the glazed doorway closed and move the
  // approach/door record to the photographed left side of the blank panel.
  box(entryU,1.79,.58,2.65,2.62,.12,dark);
  box(entryU,1.87,.66,2.43,2.28,.035,glass);panes.push({u:entryU,y:1.87,v:.66,w:2.43,h:2.28});
  solid('closed-left-door',entryU,1.79,.68,2.65,2.62,.08);
  for(const u of [-7.2,-6,-4.8])box(u,1.87,.70,.065,2.35,.075,metal);
  for(const y of [.73,1.55,3.01])box(entryU,y,.70,2.47,.06,.075,metal);
  for(const u of [-6.12,-5.88])box(u,1.65,.76,.04,.4,.055,metal);
  const dp=point(entryU,.48,.68);doors.push({name,x:dp.x,y:.48,z:dp.z,yaw:e.angle,width:2.65});
  box(entryU,3.45,1.57,3.68,.24,3.0,dark);solid('flat-canopy',entryU,3.45,1.57,3.68,.24,3.0);
  for(const u of [-7.53,-4.47]){
    const bottom=point(u,0,2.77),top=point(u,3.33,2.77);
    b.cylinder(bottom,top,.085,.085,metal,12);
    const mesh=new T.Mesh(new T.CylinderGeometry(.085,.085,3.33,12),new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.position.copy(point(u,1.665,2.77));mesh.name='round-canopy-column';meshes.push(collisionMesh(mesh));camera.push(mesh);
    blockers.push({name:mesh.name,u,y:1.665,v:2.77,w:.17,h:3.33,d:.17});
  }
  box(entryU,.24,1.69,2.65,.48,2.02,grey);solid('entry-landing',entryU,.24,1.69,2.65,.48,2.02);
  for(let step=0;step<3;step++){
    const h=.16*(3-step),v=2.95+.5*step;
    box(entryU,h/2,v,2.65,h,.5,grey);solid('entry-step',entryU,h/2,v,2.65,h,.5);
  }
  // A continuous wedge connects the right end of the landing to street level.
  const a=-4.675,c=-.7,v0=1.13,v1=2.25,verts=[point(a,0,v0),point(c,0,v0),point(c,0,v1),point(a,0,v1),point(a,.48,v0),point(a,.48,v1)];
  const ramp=new T.BufferGeometry();ramp.setAttribute('position',new T.Float32BufferAttribute(verts.flatMap(p=>p.toArray()),3));
  ramp.setIndex([4,5,2,4,2,1,0,1,2,0,2,3,0,4,1,3,2,5,0,3,5,0,5,4]);ramp.computeVertexNormals();b.add(ramp.clone(),grey);
  const rampMesh=new T.Mesh(ramp,new T.MeshBasicMaterial({side:T.DoubleSide}));rampMesh.name='entry-ramp';meshes.push(collisionMesh(rampMesh));camera.push(rampMesh);
  for(const v of [v0,v1]){
    b.line([point(a,1.4,v),point(c,.92,v)],.035,metal,6);
    for(let i=0;i<=6;i++){const u=a+(c-a)*i/6,y=.48*(1-i/6);b.cylinder(point(u,y,v),point(u,y+.92,v),.025,.025,metal,6);}
    // Thin railing proxy follows the actual slope, without filling the ramp.
    const rail=new T.Mesh(new T.BoxGeometry(Math.hypot(c-a,.48),.94,.06),new T.MeshBasicMaterial({side:T.DoubleSide}));
    rail.position.copy(point((a+c)/2,.71,v));rail.rotation.set(0,e.angle,-Math.atan2(.48,c-a));meshes.push(collisionMesh(rail));camera.push(rail);
  }
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=256;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#8d754d';ctx.fillRect(0,0,192,256);ctx.strokeStyle='#c4a56a';ctx.lineWidth=8;ctx.strokeRect(4,4,184,248);
  ctx.fillStyle='#ecd296';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 164px sans-serif';ctx.fillText('3',96,96);
  ctx.font='42px "Songti SC",serif';ctx.fillText('陶园',96,218);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const sign=new T.Mesh(new T.PlaneGeometry(.64,.85),new T.MeshStandardMaterial({map:texture,roughness:.6}));sign.position.copy(point(.3,8.95,.31));sign.rotation.y=e.angle;sign.name='陶园三舍 · 3 / 陶园';plaques.add(sign);
  return {frontage:[e.x,e.z,e.nx,e.nz],entryU,panes,blockers,number:'3',source:'user taoyuan-3-entry/context photographs; mapped envelope and six-storey estimate retained; dimensions approximate'};
}
