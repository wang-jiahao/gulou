import * as T from 'three';
import {Builder,rng} from './geometry.ts';
import type {Materials} from './materials.ts';

export type YifuIvySurface={
 x:number;z:number;nx:number;nz:number;angle:number;len:number;doorU:number;
 openings:{u:number;y:number;w:number;h:number}[];
};

/** South courtyard wing in official VR gl-4-13-l/f. Growth and dimensions are
 * approximate; the openings come from the rendered facade, not a second grid. */
export function createYifuHallIvy(e:YifuIvySurface,mats:Materials){
 const rand=rng(3413),b=new Builder(),obj=new T.Object3D(),cards:T.Matrix4[]=[],colors:T.Color[]=[];
 const stems=new T.MeshStandardMaterial({name:'yifu-hall-climbing-stems',color:0x665244,roughness:1});
 const lo=Math.max(-e.len/2+.3,e.doorU-5),hi=e.len/2-.3;
 const clear=(u:number,y:number,pad:number)=>u>lo+pad&&u<hi-pad&&y>.8+pad&&y<9.5-pad&&
  !(Math.abs(u-e.doorU)<3.3+pad&&y<4.85+pad)&&
  !e.openings.some(o=>Math.abs(u-o.u)<o.w/2+pad&&Math.abs(y-o.y)<o.h/2+pad);
 const point=(u:number,y:number,v:number)=>new T.Vector3(e.x+u*Math.cos(e.angle)+v*e.nx,y,e.z-u*Math.sin(e.angle)+v*e.nz);
 // Fine, mostly horizontal tendrils remain visible above and beside the stair.
 // Straight tapered segments avoid high-segment spline tubes for every twig.
 let segments=0;
 for(let strand=0;strand<42;strand++){
  const vertical=strand%3===0,startU=lo+rand()*(hi-lo),startY=1+rand()*7.8;
  const reach=2+rand()*5.5,phase=rand()*Math.PI*2;
  let previous:{u:number;y:number}|undefined;
  for(let k=0;k<=18;k++){
   const t=k/18,u=startU+(vertical?Math.sin(t*5+phase)*.38:t*reach),y=startY+(vertical?t*reach:Math.sin(t*4+phase)*.42+t*.7);
   if(previous&&clear(u,y,.055)&&clear(previous.u,previous.y,.055)&&clear((u+previous.u)/2,(y+previous.y)/2,.055)){
    b.cylinder(point(previous.u,previous.y,.28),point(u,y,.28),.014*(1-t*.5),.012*(1-t*.5),stems,4);segments++;
   }
   previous={u,y};
  }
 }
 // Layered, scalloped growth is concentrated toward the main entrance. Keep
 // the stair surround mostly bare and reserve room for leaf rotation/wind.
 for(let layer=0;layer<2;layer++){
 const spacing=layer===0?.115:.17;
 for(let u=e.doorU+3.4;u<hi;u+=spacing)for(let y=1.35;y<8.8;y+=spacing){
  const ju=u+(rand()-.5)*spacing,jy=y+(rand()-.5)*spacing;
  const patch=.53+.22*Math.sin(ju*.73+Math.sin(jy*1.1))+.17*Math.sin(ju*1.9-jy*.82);
  const top=7.7+.65*Math.sin(ju*.47),bottom=1.65+.8*Math.sin(ju*.38+1);
  if(jy>top||jy<bottom||patch<(layer===0?.2:.48)||rand()>patch+.4||!clear(ju,jy,.33))continue;
  obj.position.copy(point(ju,jy,.30+patch*.48+layer*.18+rand()*.08));
  obj.rotation.set((rand()-.5)*.7,e.angle+(rand()-.5)*.8,(rand()-.5)*2);
  const size=.30+rand()*.12;obj.scale.set(size,size,size);obj.updateMatrix();cards.push(obj.matrix.clone());
  const shade=.85+rand()*.27;colors.push(new T.Color().setRGB(shade*.94,shade,shade*.85));
 }
 }
 const group=b.finish('Yifu Hall south courtyard climbers'),geometry=new T.PlaneGeometry(1,1);
 const position=geometry.getAttribute('position');[0,.09,-.035,.035].forEach((z,i)=>position.setZ(i,z));geometry.computeVertexNormals();
 const leaves=new T.InstancedMesh(geometry,mats.ivy,cards.length);
 cards.forEach((matrix,i)=>{leaves.setMatrixAt(i,matrix);leaves.setColorAt(i,colors[i]);});
 leaves.name='Yifu Hall layered ivy';leaves.castShadow=leaves.receiveShadow=true;
 leaves.customDepthMaterial=mats.ivy.userData.windDepth;
 leaves.computeBoundingSphere();group.add(leaves);
 group.userData={source:'NJU official VR gl-4-13-l/f; approximate growth, unchanged collision',leaves:cards.length,stemSegments:segments};
 return group;
}
