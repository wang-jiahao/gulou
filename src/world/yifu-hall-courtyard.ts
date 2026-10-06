import * as T from 'three';
import {Builder, rng} from './geometry.ts';
import {planShape, type MapPolygon} from './campus-map.ts';
import {collisionMesh} from './collision-mesh.ts';
import {terrainSurface} from './courtyard-terrain.ts';
import {createModelTrees} from './model-trees.ts';
import type {Materials} from './materials.ts';
import type {TreeSpot} from './vegetation.ts';

// Official gl-4-13 f/l/r: rectangular grey slabs, a raised south bed,
// low north edging and a red path. Registered to plan-34; dimensions and
// individual planting positions are approximate, not surveyed.
export function yifuHallCourtyardLayout() {
  const cx=-320.3375,cz=32.1665,length=Math.hypot(20.003,2.587),nx=20.003/length,nz=2.587/length;
  const point=(u:number,v:number)=>[cx+u*nz+v*nx,cz-u*nx+v*nz];
  const polygon=(uv:number[][]):MapPolygon=>({points:uv.map(([u,v])=>point(u,v))});
  // The south wing tapers into the court; a rectangular apron would enter it.
  const outline=polygon([[-9.85,.2],[9.85,.2],[10,4],[14,7.5],[15,24],[9.5,28],[8,35],[6,40],[-6.8,40]]);
  const northPath=polygon([[14+(23-7.5)/16.5,23],[29,23],[29,26],[12.25,26],[15,24]]);
  const beds=[
    {id:'south',top:.5,polygon:polygon([[-9.25,4],[-7,4],[-6.4,14],[-8.6,14]])},
    {id:'north',top:.16,polygon:polygon([[9.5,6.8],[13.2,8.5],[14,21],[9.5,24],[7,22],[7,8]])},
  ];
  // Leave v18–25 on the south wing free for the observed side stair,
  // registered approximately in yifu-hall-side-entrance.ts.
  const planting=[[-8.1,6.3,11,.5],[-7.6,11.8,12,.5],[10,10,12,.16],[11.4,18,14,.16],[12,21.6,9,.16]];
  const trees:TreeSpot[]=planting.map(([u,v,height,baseY])=>{const[x,z]=point(u,v);return{x,z,height,baseY,whitewash:true};});
  return{point,frame:{cx,cz,nx,nz},outline,northPath,outlines:[outline,northPath],beds,trees};
}

function pavingMaterial(mats:Materials) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#777970';ctx.fillRect(0,0,256,256);
  const random=rng(3413);
  // Four rows of large 2:1 slabs; a single small texture replaces per-slab
  // geometry, while the continuous UV frame keeps the joints aligned.
  for(let row=0;row<4;row++)for(let col=-1;col<3;col++){
    const x=col*128+(row%2)*64,y=row*64,shade=162+Math.floor(random()*14);
    ctx.fillStyle=`rgb(${shade},${shade},${shade-7})`;ctx.fillRect(x+1,y+1,126,62);
    for(let i=0;i<80;i++){const grain=shade-8+Math.floor(random()*17);ctx.fillStyle=`rgb(${grain},${grain},${grain-7})`;ctx.fillRect(x+2+random()*123,y+2+random()*59,1,1);}
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
  return new T.MeshStandardMaterial({name:'yifu hall grey stone paving',map,bumpMap:mats.textures.get('stone-grain.webp'),bumpScale:.008,roughness:.97});
}

// Keep ground construction independent of asynchronous tree assets so the
// same rendered geometry can be exercised by the CPU character-motor check.
export function createYifuHallCourtyardGround(layout:ReturnType<typeof yifuHallCourtyardLayout>,mats:Materials) {
  const group=new T.Group();group.name='yifu hall courtyard ground';
  const b=new Builder(),fixedMeshes=[],cameraSolids:T.Object3D[]=[];
  const stone=mats.stone.clone();stone.name='yifu hall planted bed stone';stone.color.set(0xacae9e);
  const red=new T.MeshStandardMaterial({name:'yifu hall north red garden path',color:0x9f7466,roughness:.95});
  const shrub=new T.MeshStandardMaterial({name:'yifu hall rounded shrubs',color:0x507a30,roughness:.97});
  const paving=pavingMaterial(mats),{cx,cz,nx,nz}=layout.frame;
  for(const[polygon,material]of [[{...layout.outline,holes:layout.beds.map(bed=>bed.polygon.points)},paving],[layout.northPath,red]] as const){
    const floor=terrainSurface(polygon,.043),p=floor.getAttribute('position'),uv=floor.getAttribute('uv');
    for(let i=0;i<p.count;i++){const x=p.getX(i)-cx,z=p.getZ(i)-cz;uv.setXY(i,(x*nz-z*nx)/2.4,(x*nx+z*nz)/2.4);}
    const proxy=new T.Mesh(floor);fixedMeshes.push(collisionMesh(proxy,true));cameraSolids.push(proxy);b.add(floor,material);
  }
  for(const bed of layout.beds){
    const body=new T.ExtrudeGeometry(planShape(bed.polygon),{depth:bed.top,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
    const proxy=new T.Mesh(body);fixedMeshes.push(collisionMesh(proxy));cameraSolids.push(proxy);b.add(body,stone);
    b.add(terrainSurface(bed.polygon,bed.top+.012),mats.grass);
    for(let i=0;i<bed.polygon.points.length;i++){
      const a=bed.polygon.points[i],c=bed.polygon.points[(i+1)%bed.polygon.points.length];
      b.box(.16,.055,Math.hypot(c[0]-a[0],c[1]-a[1]),(a[0]+c[0])/2,bed.top+.012,(a[1]+c[1])/2,stone,true,Math.atan2(c[0]-a[0],c[1]-a[1]));
    }
  }
  const random=rng(13413);
  for(let v=4.8;v<=13;v+=1.05){
    const[x,z]=layout.point(-7.95+(v-4.8)*.065,v);
    b.add(new T.IcosahedronGeometry(1,2).scale(.82,.72+random()*.3,.84),shrub,x,1.07,z);
  }
  for(const[u,v,r]of [[8.7,9.2,1.2],[8.3,14,1.3],[8.9,20.7,1.6],[11.8,22,1.15]]){
    const[x,z]=layout.point(u,v);b.add(new T.IcosahedronGeometry(1,2).scale(r,r*.84,r),shrub,x,.2+r*.72,z);
  }
  const surfaces=b.finish('yifu hall paving stone beds and shrubs');
  surfaces.children.forEach(o=>{o.castShadow=o.name!=='yifu hall grey stone paving'&&o.name!=='yifu hall north red garden path';});group.add(surfaces);
  group.userData={source:'official VR gl-4-13 f/l/r and user campus plan',approximate:true,bedHeights:layout.beds.map(b=>b.top),surfaceMeshes:surfaces.children.length,sideStair:'official VR south-wing stair; approximate registration and dimensions'};
  return{group,solids:b.solids,fixedMeshes,cameraSolids};
}

export async function createYifuHallCourtyardTrees(layout:ReturnType<typeof yifuHallCourtyardLayout>,mats:Materials) {
  return createModelTrees(layout.trees,'far',mats.leaves);
}
