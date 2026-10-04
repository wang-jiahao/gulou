import * as T from 'three';
import {Builder, rng} from './geometry.ts';
import type {Materials} from './materials.ts';

// Centre fitted to the three surrounding map lawn arcs; dimensions are estimates.
export const nanyuanFountain = {x:-85.233,z:456.743,pavingRadius:14.3,outerRadius:16.2,openingWidth:3.3};

/** Dry plaza visible in official VR gl-1-24 down and gl-1-02 front.
 * The temporary anniversary board and unobserved water effects are not inferred. */
export function createNanyuanFountain(mats:Materials){
  const b=new Builder(),{x,z,pavingRadius,outerRadius,openingWidth}=nanyuanFountain,random=rng(6501);
  const stone=mats.textures.get('stone-grain.webp');
  const material=(name:string,color:number,map=stone)=>new T.MeshStandardMaterial({name,color,map,roughness:.96});
  const paving=material('fountain-grey-paving',0x868983),band=material('fountain-light-inlay',0xbfc0b5);
  const joint=material('fountain-paving-joints',0x676b66),curb=material('fountain-sandstone-edge',0xb5aa8a);
  const hedge=material('fountain-clipped-hedge',0x84966a,mats.textures.get('lawn.webp'));
  const tips=material('fountain-leaf-tips',0xa1ad77,mats.textures.get('lawn.webp'));
  const nozzle=new T.MeshStandardMaterial({name:'fountain-recessed-nozzles',color:0x303c3c,metalness:.6,roughness:.63});
  const arc=(inner:number,outer:number,start:number,end:number,height:number,mat:T.Material,base:number)=>{
    const shape=new T.Shape(),steps=Math.max(3,Math.ceil((end-start)*32));
    shape.moveTo(Math.cos(start)*outer,-Math.sin(start)*outer);
    for(let i=1;i<=steps;i++){const a=start+(end-start)*i/steps;shape.lineTo(Math.cos(a)*outer,-Math.sin(a)*outer);}
    for(let i=steps;i>=0;i--){const a=start+(end-start)*i/steps;shape.lineTo(Math.cos(a)*inner,-Math.sin(a)*inner);}
    shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
    const pos=geo.getAttribute('position'),uv=geo.getAttribute('uv');
    for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/1.4,(pos.getZ(i)+pos.getY(i))/1.4);
    b.add(geo,mat,x,base,z);
  };
  const disc=new T.CircleGeometry(pavingRadius,128).rotateX(-Math.PI/2),uv=disc.getAttribute('uv');
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*20,uv.getY(i)*20);
  b.add(disc,paving,x,.046,z);
  // Four pale rings have radial interruptions rather than continuous white paint.
  for(const r of [3.5,5.3,7.1,8.9])for(let sector=0;sector<8;sector++){
    const a=sector*Math.PI/4;
    arc(r-.43,r,a+.019,a+Math.PI/4-.019,.004,band,.049);
  }
  for(let row=1;row<=16;row++)arc(row*.85-.017,row*.85,0,Math.PI*2,.002,joint,.048);
  for(let row=1;row<=16;row++){
    const radius=(row-.5)*.85,count=Math.max(8,Math.round(radius*2*Math.PI/.95));
    for(let i=0;i<count;i++){
      const a=(i+(row%2)*.5)*2*Math.PI/count;
      b.box(.022,.002,.82,x+Math.cos(a)*radius,.050,z+Math.sin(a)*radius,joint,false,Math.PI/2-a);
    }
  }
  // Flush circular nozzle fittings; there is no raised pool or invented water animation.
  for(const [dx,dz]of [[-.48,-.28],[.48,-.28],[0,.55]]){
    b.cylinder(new T.Vector3(x+dx,.05,z+dz),new T.Vector3(x+dx,.058,z+dz),.23,.23,band,24);
    b.cylinder(new T.Vector3(x+dx,.058,z+dz),new T.Vector3(x+dx,.061,z+dz),.072,.072,nozzle,16);
  }
  const gap=Math.asin(openingWidth/2/pavingRadius),mid=(pavingRadius+outerRadius)/2;
  for(let quadrant=0;quadrant<4;quadrant++){
    const start=quadrant*Math.PI/2+gap,end=(quadrant+1)*Math.PI/2-gap;
    arc(pavingRadius,outerRadius,start,end,.22,curb,.025);
    arc(pavingRadius+.10,outerRadius-.10,start+.006,end-.006,.66,hedge,.245);
    // Short tangent boxes keep the four openings clear in physics as well as appearance.
    const segments=14,step=(end-start)/segments;
    for(let i=0;i<segments;i++){
      const a=start+step*(i+.5),radial=outerRadius-pavingRadius;
      b.solids.push({x:x+Math.cos(a)*mid,y:.455,z:z+Math.sin(a)*mid,w:2*mid*Math.tan(step/2)+.035,h:.91,d:radial,angle:Math.PI/2-a});
    }
    for(let row=0;row<3;row++)for(let i=0;i<34;i++){
      const a=start+.035+(end-start-.07)*i/33,r=pavingRadius+.28+row*.62;
      const leaf=new T.SphereGeometry(1,7,4).scale(.35+random()*.15,.12+random()*.10,.35+random()*.13);
      b.add(leaf,(row+i)%4===0?tips:hedge,x+Math.cos(a)*r,.86+random()*.025,z+Math.sin(a)*r);
    }
    const angle=quadrant*Math.PI/2;
    b.box(outerRadius-pavingRadius+.15,.012,openingWidth,x+Math.cos(angle)*(mid-.035),.044,z+Math.sin(angle)*(mid-.035),paving,false,-angle);
  }
  // A rectangular planted island sits north of the nozzle circle in the down view.
  b.box(12,.22,3.6,x,.135,z-6.4,curb);
  b.box(11.8,.75,3.4,x,.62,z-6.4,hedge);
  b.solids.push({x,y:.51,z:z-6.4,w:12,h:1.02,d:3.6});
  for(let i=0;i<44;i++){
    const leaf=new T.SphereGeometry(1,8,5).scale(.65+random()*.35,.4+random()*.9,.5+random()*.3);
    b.add(leaf,i%4===0?tips:hedge,x-5.3+random()*10.6,1.01,z-7.5+random()*2.2);
  }
  const group=b.finish('Nanyuan dry fountain plaza');
  group.userData={layout:nanyuanFountain,source:'Official VR gl-1-24 down / gl-1-02 front; map-fitted approximate dimensions',nozzles:3,openings:4,waterObserved:false};
  for(const mesh of group.children)if(mesh instanceof T.Mesh&&[paving,band,joint,nozzle].includes(mesh.material as T.MeshStandardMaterial))mesh.castShadow=false;
  return{group,solids:b.solids};
}
