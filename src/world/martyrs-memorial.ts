import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh,type CollisionMesh} from './collision-mesh.ts';
import type {Materials} from './materials.ts';

/** Official VR gl-2-02, the labelled campus plan and the user's 2026-10-07
 * front photo identify this monument. Plan registration and dimensions are
 * approximate; the inscription is transcribed, not an invented formal title. */
export const martyrsMemorial={name:'南京大学革命烈士纪念碑',x:-85.8,z:66.2,platformHeight:2.34,
  inscription:'革命烈士永垂不朽',source:'NJU official VR scene_gl-2-02; user martyrs-memorial.png; labelled campus plan'};

export function createMartyrsMemorial(mats:Materials){
  const b=new Builder(),fixedMeshes:CollisionMesh[]=[],cameraSolids:T.Object3D[]=[];
  const {x,z,platformHeight:h}=martyrsMemorial;
  const material=(name:string,color:number)=>new T.MeshStandardMaterial({name:`martyrs-${name}`,color,map:mats.textures.get('stone-grain.webp'),roughness:.93});
  const granite=material('warm-granite',0xbeb5a6),recess=material('inset-stone',0xa79c83),white=material('white-stone-rail',0xdbdfd2);
  const box=(w:number,height:number,d:number,u:number,y:number,v:number,mat:T.Material,solid=false)=>b.box(w,height,d,x+u,y,z+v,mat,solid);
  // The entire raised platform and the stairs fit inside the plan's memorial
  // enclosure, north of the east-west public campus walk at z≈80–86.
  box(13.5,h,5.5,0,h/2,.52,granite,true);
  box(13.6,.07,5.6,0,h+.025,.52,mats.path);
  // The source shows planted banks, rather than an exposed full-height front
  // wall. Fit their visible slope within the existing rectangular lawn. These
  // surfaces are walkable and share their render geometry with physics.
  function bank(points:number[][]){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(([u,y,v])=>[x+u,y,z+v]),3));
    g.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap(([u,,v])=>[u/3,v/3]),2));
    const normalY=(points[1][2]-points[0][2])*(points[2][0]-points[0][0])-(points[1][0]-points[0][0])*(points[2][2]-points[0][2]);
    g.setIndex(normalY>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);g.computeVertexNormals();
    const proxy=new T.Mesh(g.clone(),new T.MeshBasicMaterial({side:T.DoubleSide}));fixedMeshes.push(collisionMesh(proxy));cameraSolids.push(proxy);b.add(g,mats.grass);
  }
  for(const s of [-1,1]){
    bank([[s*2.30,h+.04,3.22],[s*6.82,h+.04,3.22],[s*10.8,.17,11.60],[s*2.30,.17,11.60]]);
    bank([[s*6.82,h+.04,-2.20],[s*10.8,.17,-3.8],[s*10.8,.17,11.60],[s*6.82,h+.04,3.22]]);
  }
  bank([[-6.82,h+.04,-2.20],[6.82,h+.04,-2.20],[10.8,.17,-3.8],[-10.8,.17,-3.8]]);
  const steps:{v:number;top:number;run:number}[]=[];
  let front=11.5,top=0;
  for(const [count,run] of [[5,.55],[8,.55]]){
    for(let i=0;i<count;i++){
      top+=.18;const v=front-run/2;steps.push({v,top,run});
      box(3.3,top,run,0,top/2,v,granite,true);
      box(3.3,.025,.065,0,top+.009,front-.035,white);
      front-=run;
    }
    if(count===5){box(3.3,top,1.10,0,top/2,front-.55,granite,true);front-=1.10;}
  }
  // Continuous sloping cheek walls beside both flights. The same triangle
  // meshes support camera and character collision, including their top edges.
  function cheek(u:number,v0:number,v1:number,y0:number,y1:number){
    const p=[u-.30,0,v0,u+.30,0,v0,u-.30,y0,v0,u+.30,y0,v0,u-.30,0,v1,u+.30,0,v1,u-.30,y1,v1,u+.30,y1,v1];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
    g.setIndex([0,1,3,0,3,2,4,6,7,4,7,5,0,4,5,0,5,1,2,3,7,2,7,6,0,2,6,0,6,4,1,5,7,1,7,3]);g.computeVertexNormals();
    g.translate(x,0,z);const proxy=new T.Mesh(g.clone(),new T.MeshBasicMaterial({side:T.DoubleSide}));
    fixedMeshes.push(collisionMesh(proxy));cameraSolids.push(proxy);b.add(g,white);
  }
  for(const side of [-1,1]){
    cheek(side*1.98,11.55,8.75,.42,1.32);cheek(side*1.98,8.75,7.65,1.32,1.32);cheek(side*1.98,7.65,3.20,1.32,2.78);
  }
  // Low stepped plinth and a flat-topped, slightly tapered upright tablet.
  box(2.7,.16,1.9,0,h+.08,0,white,true);box(2.4,.68,1.64,0,h+.50,0,granite,true);
  box(2.5,.10,1.74,0,h+.89,0,white);
  const shaft=new T.CylinderGeometry(1,1.09,3.55,4,1,false,Math.PI/4).scale(1.10,1,.51);
  b.add(shaft,granite,x,h+2.705,z);box(1.13,3.21,.02,0,h+2.72,.404,recess);
  b.solids.push({x,y:h+2.705,z,w:1.70,h:3.55,d:.79});
  // Gold lettering is a transparent local canvas, never the source photo.
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=1024;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#d6ba60';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 94px "Kaiti SC","STKaiti",serif';
  [...martyrsMemorial.inscription].forEach((c,i)=>ctx.fillText(c,128,75+i*124,190));
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const letters=new T.MeshStandardMaterial({name:'martyrs-inscription',map:texture,transparent:true,alphaTest:.25,roughness:.65,metalness:.12});
  b.add(new T.PlaneGeometry(.82,2.98),letters,x,h+2.72,z+.418);
  // White posts and vase-shaped balusters repeat along the terrace edges.
  function railing(a:[number,number],c:[number,number]){
    const dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),n=Math.ceil(length/2.1);
    for(const [y,height,width] of [[h+.20,.15,.20],[h+.88,.13,.22]])b.box(width,height,length,x+(a[0]+c[0])/2,y,z+(a[1]+c[1])/2,white,false,angle);
    b.solids.push({x:x+(a[0]+c[0])/2,y:h+.58,z:z+(a[1]+c[1])/2,w:.26,h:1.10,d:length,angle});
    for(let i=0;i<=n;i++){
      const u=a[0]+dx*i/n,v=a[1]+dz*i/n;box(.27,1.13,.27,u,h+.565,v,white);box(.34,.12,.34,u,h+1.16,v,white);
      b.add(new T.SphereGeometry(.15,8,6),white,x+u,h+1.26,z+v);
      if(i===n)continue;
      for(const t of [.25,.5,.75]){
        const uu=a[0]+dx*(i+t)/n,vv=a[1]+dz*(i+t)/n;
        b.cylinder(new T.Vector3(x+uu,h+.30,z+vv),new T.Vector3(x+uu,h+.51,z+vv),.10,.15,white,6);
        b.cylinder(new T.Vector3(x+uu,h+.51,z+vv),new T.Vector3(x+uu,h+.82,z+vv),.15,.075,white,6);
      }
    }
  }
  railing([-6.45,-1.84],[6.45,-1.84]);railing([-6.45,-1.84],[-6.45,2.93]);railing([6.45,-1.84],[6.45,2.93]);
  railing([-6.45,2.93],[-2.40,2.93]);railing([2.40,2.93],[6.45,2.93]);
  const group=b.finish('南京大学革命烈士纪念碑');cameraSolids.push(...group.children);
  group.userData={...martyrsMemorial,steps,estimatedDimensions:true,referenceInscriptionVerified:true};
  return {group,solids:b.solids,fixedMeshes,cameraSolids};
}
