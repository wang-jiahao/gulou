import * as T from 'three';
import {Builder, rng} from './geometry.ts';
import {terrainSurface} from './courtyard-terrain.ts';
import {collisionMesh} from './collision-mesh.ts';
import {createModelTrees} from './model-trees.ts';
import {createBicycle, type CampusBicycle} from './bicycle.ts';
import type {Materials} from './materials.ts';
import type {TreeSpot} from './vegetation.ts';

// gl-1-10 b shows raised grey tree beds, whitewashed mature trees, grey
// paving and bicycles along the east gallery. Tree occlusion and perspective
// prevent a surveyed plan: the three circular beds and metre sizes are fitted.
export function diningForecourtLayout() {
  const point=(s:number,t:number)=>[-53.77+s*(-.014927282696553662)+t*.999888581908653,581.1945-s*.999888581908653+t*(-.014927282696553662)];
  const beds=[{s:-16,t:9.4,radius:2.2,height:15},{s:8,t:9.4,radius:1.95,height:14.5},{s:24,t:9.4,radius:1.85,height:13.7}];
  const paving={points:[[-21,4.04],[28,4.04],[28,12.4],[-21,12.4]].map(([s,t])=>point(s,t))};
  const trees:TreeSpot[]=beds.map(({s,t,height})=>{const[x,z]=point(s,t);return{x,z,height,baseY:.605,kind:'broad',whitewash:true};});
  const parking=[-11,-9.5,-8,12,13.5,15].map(s=>({s,t:9.35}));
  return {point,beds,paving,trees,parking};
}

function texturedMaterial(name:string,draw:(ctx:CanvasRenderingContext2D)=>void) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  draw(canvas.getContext('2d')!);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
  return new T.MeshStandardMaterial({name,map,roughness:.95});
}

export async function createDiningForecourt(mats:Materials) {
  const layout=diningForecourtLayout(),group=new T.Group();group.name='nanyuan dining east forecourt';
  const paving=texturedMaterial('dining forecourt grey brick paving',ctx=>{
    ctx.fillStyle='#777e78';ctx.fillRect(0,0,256,256);
    for(let row=0;row<8;row++)for(let col=-1;col<5;col++){
      const shade=151+(row*7+col*3)%13;ctx.fillStyle=`rgb(${shade},${shade+2},${shade-4})`;
      ctx.fillRect(col*64+(row%2)*32+1,row*32+1,62,30);
    }
  });
  const wall=texturedMaterial('dining forecourt vertically streaked grey beds',ctx=>{
    ctx.fillStyle='#93978d';ctx.fillRect(0,0,256,256);
    for(let x=0;x<256;x+=4){ctx.fillStyle=`rgba(45,53,41,${.05+(x*13%17)/90})`;ctx.fillRect(x,0,1,256);}
    const weather=ctx.createLinearGradient(0,0,0,256);weather.addColorStop(0,'#404b3a00');weather.addColorStop(1,'#404b3a48');ctx.fillStyle=weather;ctx.fillRect(0,0,256,256);
  });
  const cap=mats.stone.clone();cap.name='dining forecourt dark thin coping';cap.color.set(0x666b62);
  // Solid shrubs need neither leaf cutouts nor wind. Cloning foliage would
  // JSON-copy its userData.windDepth Material into an unusable plain object.
  const plants=new T.MeshStandardMaterial({name:'dining forecourt low groundcover',color:0x667950,roughness:.95});
  const ground=new Builder(),beds=new Builder(),green=new Builder();
  const floor=terrainSurface(layout.paving,.035),uv=floor.getAttribute('uv'),pos=floor.getAttribute('position');
  for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+54)/1.7,(pos.getZ(i)-581)/1.7);
  ground.add(floor,paving);group.add(ground.finish('dining forecourt paving'));
  const random=rng(68113);
  for(const bed of layout.beds){
    const[x,z]=layout.point(bed.s,bed.t),r=bed.radius;
    beds.add(new T.CylinderGeometry(r,r,.6,32),wall,x,.3,z);
    const shape=new T.Shape(),hole=new T.Path();shape.absarc(0,0,r+.045,0,Math.PI*2,false);hole.absarc(0,0,r-.12,0,Math.PI*2,true);shape.holes.push(hole);
    const coping=new T.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false,curveSegments:16});
    beds.add(coping,cap,x,.6,z,new T.Euler(-Math.PI/2,0,0));
    green.add(new T.CircleGeometry(r-.12,32),mats.grass,x,.605,z,new T.Euler(-Math.PI/2,0,0));
    // Low, merged groundcover; no lights, per-frame growth or individual draw calls.
    for(let i=0;i<35;i++){
      const a=random()*Math.PI*2,d=.48+random()*(r-.9),size=.21+random()*.15;
      const shrub=new T.IcosahedronGeometry(1,0);shrub.scale(size,.13+random()*.08,size);
      green.add(shrub,plants,x+Math.cos(a)*d,.69,z+Math.sin(a)*d);
    }
  }
  const bedMeshes=beds.finish('dining forecourt solid raised beds');group.add(bedMeshes,green.finish('dining forecourt groundcover'));
  // Use the same curved geometry for people and cameras, retaining rounded
  // corners instead of invisible square blockers across the pedestrian strip.
  const cameraSolids=[...bedMeshes.children],fixedMeshes=bedMeshes.children.map(o=>collisionMesh(o as T.Mesh));
  const trees=await createModelTrees(layout.trees,'far',mats.leaves);group.add(trees.group);
  for(const solid of trees.solids){
    const proxy=new T.Mesh(new T.BoxGeometry(solid.w,solid.h,solid.d),mats.stone);proxy.position.set(solid.x,solid.y,solid.z);proxy.updateMatrixWorld();cameraSolids.push(proxy);
  }
  const solids=[...trees.solids],bicycles:CampusBicycle[]=[],angle=Math.atan2(.999888581908653,-.014927282696553662);
  for(const[slot,bay]of layout.parking.entries()){
    const[x,z]=layout.point(bay.s,bay.t),home=new T.Vector3(x,.04,z),bike=createBicycle(slot);
    bike.group.position.copy(home);bike.group.rotation.y=angle;
    const solid={x,y:.56,z,w:.5,h:1.04,d:1.85,angle};solids.push(solid);
    bicycles.push({...bike,id:`dining-east-bike-${slot}`,solid,home,angle});group.add(bike.group);cameraSolids.push(...bike.group.children);
  }
  group.userData={beds:layout.beds,trees:layout.trees,parking:layout.parking,source:'official VR gl-1-10 b',approximate:true,bedShape:'circular approximation; perspective and foliage obscure the exact outline/count',solidCount:solids.length,fixedMeshCount:fixedMeshes.length,surfaceMeshes:bedMeshes.children.length+3};
  return{group,solids,fixedMeshes,cameraSolids,bicycles,updateVisibility:trees.updateVisibility};
}
