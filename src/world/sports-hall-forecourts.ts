import * as T from 'three';
import {Builder,rng,type Solid} from './geometry.ts';
import type {CampusMap} from './campus-map.ts';
import type {Materials} from './materials.ts';
import {createModelTrees} from './model-trees.ts';
import type {TreeSpot} from './vegetation.ts';

/** Official VR gl-3-03 f/l/r: placements and dimensions are image estimates. */
export async function createSportsHallForecourts(map:CampusMap,mats:Materials){
  const b=new Builder(),group=new T.Group();group.name='sports hall forecourts';
  const white=new T.MeshStandardMaterial({name:'sports low white rail',color:0xe4e7de,roughness:.68,metalness:.18});
  const timber=new T.MeshStandardMaterial({name:'sports ochre bench slats',color:0xb29739,roughness:.82});
  const frame=new T.MeshStandardMaterial({name:'sports notice frames',color:0x9b9e90,roughness:.46,metalness:.55});
  const paper=new T.MeshStandardMaterial({name:'unreadable sports notices',map:noticeTexture(),roughness:.88});
  const cards:T.Matrix4[]=[],colors:T.Color[]=[],dummy=new T.Object3D(),rand=rng(3903),tall:TreeSpot[]=[];
  const fixtures:{id:string;kind:string;u:number;v:number;solid:Solid}[]=[],tallLocations:{id:string;u:number;v:number}[]=[];
  for(const [id,index]of [['plan-6',2],['plan-13',5]] as const){
    const f=map.features.find(f=>f.id===id)!,[x,z]=f.points[index],[xx,zz]=f.points[(index+1)%f.points.length],length=Math.hypot(xx-x,zz-z);
    const nx=-(zz-z)/length,nz=(xx-x)/length,yaw=Math.atan2(nx,nz),swim=id==='plan-13';
    const point=(u:number,y:number,v:number)=>new T.Vector3((x+xx)/2+u*nz+v*nx,y,(z+zz)/2-u*nx+v*nz);
    const box=(w:number,h:number,d:number,u:number,y:number,v:number,mat:T.Material)=>{const p=point(u,y,v);b.box(w,h,d,p.x,p.y,p.z,mat,false,yaw);};
    const solid=(kind:string,u:number,v:number,w:number,h:number,d:number)=>{const p=point(u,h/2,v),s={x:p.x,y:p.y,z:p.z,w,h,d,angle:yaw};b.solids.push(s);fixtures.push({id,kind,u,v,solid:s});};
    function tree(u:number,v:number,h:number,r:number){
      const center=point(u,h*.67,v),base=point(u,0,v),fork=point(u,h*.39,v),depth=Math.min(r,v-.65);
      b.cylinder(base,fork,.16,.11,mats.bark,9);solid('round tree',u,v,.34,h*.44,.34);
      // Interlocking sprays form a pruned crown, with visible branches rather
      // than a smooth opaque ball. One shared instanced batch casts shadows.
      for(let branch=0;branch<10;branch++){
        const a=branch*2.399,tip=point(u+Math.cos(a)*r*.68,center.y+(rand()-.5)*h*.26,v+Math.sin(a)*depth*.68);
        b.cylinder(fork,tip,.07,.018,mats.bark,6);
      }
      for(let leaf=0;leaf<900;leaf++){
        const a=rand()*Math.PI*2,cy=rand()*2-1,rad=Math.cbrt(rand()),disk=Math.sqrt(1-cy*cy)*rad;
        dummy.position.copy(point(u+Math.cos(a)*disk*r,center.y+cy*rad*h*.30,v+Math.sin(a)*disk*depth));
        dummy.rotation.set(rand()*Math.PI,rand()*Math.PI*2,rand()*Math.PI);
        dummy.scale.setScalar(.48+rand()*.35);dummy.updateMatrix();cards.push(dummy.matrix.clone());
        const shade=.67+rand()*.32;colors.push(new T.Color().setRGB(shade*.90,shade,shade*.82));
      }
    }
    for(const [u,v,h,r]of swim?[[-17,1.7,6.3,2.55],[-8.7,1.9,6.1,2.7],[8.2,1.9,5.4,2.45],[17,1.7,6.5,2.6]]:[[-7,1.9,4.8,1.75],[7.8,1.8,4.5,1.6]])tree(u,v,h,r);
    if(swim){
      for(const [a,c]of [[-22,-5.4],[5.4,22]]){
        const v=3.45,w=c-a,u=(a+c)/2;
        for(const y of [.17,.65])box(w,.055,.055,u,y,v,white);
        for(let i=0,n=Math.ceil(w/.45);i<=n;i++)box(.045,.68,.055,a+w*i/n,.34,v,white);
        solid('low rail',u,v,w,.69,.10);
      }
      for(const u of[-5.6,5.6]){
        const v=2.35,w=2.15;
        for(const side of[-1,1])box(.07,2.18,.08,u+side*(w/2+.07),1.09,v,frame);
        box(w+.22,.08,.5,u,2.18,v,frame);box(w,1.24,.09,u,1.43,v,frame);
        // A single atlas describes colored sheets without inventing text.
        const plane=new T.PlaneGeometry(w-.12,1.10),p=point(u,1.43,v+.053);b.add(plane,paper,p.x,p.y,p.z,new T.Euler(0,yaw,0));
        solid('notice board',u,v,w+.22,2.22,.5);
      }
    }else{
      for(const u of[-17,-12,-8.9]){
        const v=2.75,w=2.2;
        for(let k=0;k<5;k++)box(w,.065,.095,u,.51,v-.24+k*.12,timber);
        for(let k=0;k<3;k++)box(w,.105,.06,u,.79+k*.13,v-.29,timber);
        for(const side of[-1,1]){box(.075,.53,.5,u+side*.85,.265,v,mats.metal);box(.06,.72,.06,u+side*.85,.73,v-.29,mats.metal);}
        solid('bench',u,v,w,1.1,.59);
      }
      const p=point(3.75,0,.7);box(.8,1.92,.12,3.75,1.04,.7,frame);
      b.add(new T.PlaneGeometry(.7,1.72),paper,p.x+nx*.067,1.04,p.z+nz*.067,new T.Euler(0,yaw,0));solid('notice board',3.75,.7,.8,2,.14);
      for(const [u,v,h]of[[-19.7,2.9,16.5],[-13.9,2.6,15.5],[5.8,2.6,17]]){const p=point(u,0,v);tall.push({x:p.x,z:p.z,height:h,whitewash:true});tallLocations.push({id,u,v});}
    }
  }
  const props=b.finish('sports forecourt furniture and trunks',40);group.add(props);
  const leaves=new T.InstancedMesh(new T.PlaneGeometry(1,1),mats.leaves,cards.length);leaves.name='pruned broadleaf crowns';
  cards.forEach((m,i)=>{leaves.setMatrixAt(i,m);leaves.setColorAt(i,colors[i]);});leaves.castShadow=leaves.receiveShadow=true;leaves.computeBoundingSphere();group.add(leaves);
  const trees=await createModelTrees(tall,'near',mats.leaves);group.add(trees.group);
  trees.solids.forEach((solid,i)=>fixtures.push({...tallLocations[i],kind:'tall tree',solid}));
  const solids=[...b.solids,...trees.solids];
  group.userData={source:'official VR scene_gl-3-03 f/l/r',approximate:true,fixtures,solids,leafSprays:cards.length};
  return{group,solids,cameraSolids:[...props.children],updateVisibility:trees.updateVisibility};
}

function noticeTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d')!;
  g.fillStyle='#d5d9cd';g.fillRect(0,0,512,256);
  const colors=['#5c8c99','#c69a98','#e1d2a1','#80959d','#ac747a','#9ca991'];
  for(let i=0;i<6;i++){
    const x=10+i%3*167,y=8+Math.floor(i/3)*122;
    g.fillStyle='#efeee3';g.fillRect(x,y,156,112);g.fillStyle=colors[i];g.fillRect(x+5,y+5,146,25);
    g.fillStyle='#bbc2bd';for(let line=0;line<5;line++)g.fillRect(x+9,y+40+line*12,116-(line%3)*14,3);
  }
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;
}
