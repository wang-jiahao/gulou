import * as T from 'three';
import {Builder} from './geometry.ts';

// Official VR gl-4-05 r: three striped posts, two tapered parking cones,
// and a round utility cover in the north court. Positions and sizes are
// approximate; the photograph does not resolve any lettering on the cover.
export function createTangCourtyardGround() {
  const b=new Builder();
  const rubber=new T.MeshStandardMaterial({name:'tang parking rubber',color:0x303936,roughness:.95});
  const yellow=new T.MeshStandardMaterial({name:'tang parking yellow bands',color:0xc5c145,roughness:.75});
  const posts=[[-394.9,-65.1],[-392.8,-65.1],[-390.7,-65.1]];
  const cones=[[-399.8,-64.7],[-396.3,-64.7]];
  for(const [x,z]of posts){
    b.cylinder(new T.Vector3(x,.038,z),new T.Vector3(x,.085,z),.135,.125,rubber,12);
    for(let i=0;i<6;i++)b.cylinder(new T.Vector3(x,.085+i*.135,z),new T.Vector3(x,.085+(i+1)*.135,z),.087,.087,i%2?yellow:rubber,12);
    b.solids.push({x,y:.47,z,w:.20,h:.87,d:.20});
  }
  for(const [x,z]of cones){
    b.box(.62,.07,.62,x,.073,z,rubber);
    // A square tapered cone with continuous bands on all four faces.
    const levels=[0,.24,.37,.52,.66,.85],radius=(h:number)=>.32-.27*h/.85;
    for(let i=0;i<levels.length-1;i++){
      const lo=levels[i],hi=levels[i+1];
      const g=new T.CylinderGeometry(radius(hi),radius(lo),hi-lo,4,1);
      b.add(g,i%2?yellow:rubber,x,.108+(hi+lo)/2,z,new T.Euler(0,Math.PI/4,0));
    }
    b.solids.push({x,y:.50,z,w:.44,h:.93,d:.44});
  }
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#50534c';ctx.fillRect(0,0,256,256);
  ctx.strokeStyle='#262c29';ctx.lineWidth=5;
  for(const radius of[101,117]){ctx.beginPath();ctx.arc(128,128,radius,0,Math.PI*2);ctx.stroke();}
  ctx.save();ctx.beginPath();ctx.arc(128,128,95,0,Math.PI*2);ctx.clip();
  ctx.lineWidth=3;ctx.strokeStyle='#727569';
  for(let i=20;i<256;i+=14){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}
  ctx.restore();
  ctx.fillStyle='#1f2824';ctx.fillRect(79,117,16,9);ctx.fillRect(161,130,16,9);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const iron=new T.MeshStandardMaterial({name:'tang courtyard round utility cover',map,roughness:.98,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  b.add(new T.CircleGeometry(.40,32),iron,-394.7,.042,-63.9,new T.Euler(-Math.PI/2,0,0));
  const group=b.finish('tang courtyard ground details');
  group.children.forEach(o=>{if((o as T.Mesh).material===iron)o.castShadow=false;});
  group.userData={source:'official VR gl-4-05 r',approximate:true,posts,cones,cover:[-394.7,.042,-63.9],coverLetteringVerified:false};
  return {group,solids:b.solids,cameraSolids:group.children.filter(o=>(o as T.Mesh).material!==iron) as T.Mesh[]};
}
