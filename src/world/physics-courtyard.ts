import * as T from 'three';
import {Builder,rng} from './geometry.ts';
import {planShape,type MapPolygon} from './campus-map.ts';
import {collisionMesh} from './collision-mesh.ts';
import {terrainSurface} from './courtyard-terrain.ts';
import {createModelTrees} from './model-trees.ts';
import type {Materials} from './materials.ts';
import type {TreeSpot} from './vegetation.ts';

// Official VR gl-2-15-f: asphalt approach, low clipped hedges, stone kerbs,
// mature trees with whitewashed trunks. Registered to plan-70 edge 14;
// widths, species and individual planting positions are approximate.
export function physicsCourtyardLayout() {
  const cx=-146.144,cz=286.5065,nx=.9994122445074881,nz=.03428068739836871;
  const point=(u:number,v:number)=>[cx+u*nz+v*nx,cz-u*nx+v*nz];
  const polygon=(uv:number[][]):MapPolygon=>({points:uv.map(([u,v])=>point(u,v))});
  const outline=polygon([[-23,.2],[23,.2],[23,49.5],[9,49.5],[9,53],[-9,53],[-9,49.5],[-23,49.5]]);
  // Keep the mapped transverse walk (v6–9), Zhongda Road (v52+) and
  // the eastern ring path outside planting beds and hedge colliders.
  const beds=[-1,1].map(side=>({id:side<0?'south':'north',side,top:.18,polygon:polygon([[side*8,12],[side*22,12],[side*22,48],[side*8,48]])}));
  const trees:TreeSpot[]=[];
  for(const side of[-1,1])for(const[v,u,height]of [[16,15,16],[26,18,17],[36,14.5,15],[44,18,16]]){
    const[x,z]=point(side*u,v);trees.push({x,z,height,baseY:.18,whitewash:true});
  }
  return{point,frame:{cx,cz,nx,nz},outline,beds,trees};
}

function asphaltMaterial() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d')!,random=rng(7015);
  ctx.fillStyle='#737674';ctx.fillRect(0,0,128,128);
  for(let i=0;i<5500;i++){const c=95+Math.floor(random()*45);ctx.fillStyle=`rgb(${c},${c+2},${c+1})`;ctx.fillRect(random()*128,random()*128,1,1);}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
  return new T.MeshStandardMaterial({name:'physics courtyard asphalt',map,roughness:.99});
}

export function createPhysicsCourtyardGround(layout:ReturnType<typeof physicsCourtyardLayout>,mats:Materials) {
  const group=new T.Group();group.name='physics courtyard';
  const b=new Builder(),fixedMeshes=[],cameraSolids:T.Object3D[]=[];
  const stone=mats.stone.clone();stone.name='physics courtyard stone kerbs';stone.color.set(0xa8aca4);
  const hedge=new T.MeshStandardMaterial({name:'physics courtyard low hedges',color:0x42672e,roughness:.98});
  const floor=terrainSurface({...layout.outline,holes:layout.beds.map(b=>b.polygon.points)},.043);
  const p=floor.getAttribute('position'),uv=floor.getAttribute('uv');
  for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/2,p.getZ(i)/2);
  const floorProxy=new T.Mesh(floor);fixedMeshes.push(collisionMesh(floorProxy,true));cameraSolids.push(floorProxy);b.add(floor,asphaltMaterial());
  for(const bed of layout.beds){
    const body=new T.ExtrudeGeometry(planShape(bed.polygon),{depth:bed.top,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2);
    const proxy=new T.Mesh(body);fixedMeshes.push(collisionMesh(proxy));cameraSolids.push(proxy);b.add(body,stone);
    b.add(terrainSurface(bed.polygon,bed.top+.012),mats.grass);
    for(let i=0;i<bed.polygon.points.length;i++){
      const a=bed.polygon.points[i],c=bed.polygon.points[(i+1)%bed.polygon.points.length];
      b.box(.18,.07,Math.hypot(c[0]-a[0],c[1]-a[1]),(a[0]+c[0])/2,bed.top+.01,(a[1]+c[1])/2,stone,true,Math.atan2(c[0]-a[0],c[1]-a[1]));
    }
  }
  const random=rng(27015),yaw=Math.atan2(layout.frame.nx,layout.frame.nz);
  function hedgeRun(au:number,av:number,bu:number,bv:number){
    const length=Math.hypot(bu-au,bv-av),[x,z]=layout.point((au+bu)/2,(av+bv)/2);
    b.box(.7,.60,length,x,.50,z,hedge,true,yaw+Math.atan2(bu-au,bv-av));
    const count=Math.ceil(length/.65);
    for(let i=0;i<=count;i++){
      const t=i/count,[x,z]=layout.point(au+(bu-au)*t,av+(bv-av)*t);
      b.add(new T.IcosahedronGeometry(1,1).scale(.54,.42+random()*.08,.54),hedge,x,.64,z);
    }
  }
  for(const side of[-1,1]){
    hedgeRun(side*8.8,12.8,side*8.8,47.2);
    hedgeRun(side*8.8,12.8,side*21.2,12.8);
    hedgeRun(side*8.8,47.2,side*21.2,47.2);
  }
  const surfaces=b.finish('physics court asphalt beds and hedges');
  surfaces.children.forEach(o=>{o.castShadow=o.name!=='physics courtyard asphalt';});group.add(surfaces);
  group.userData={source:'official VR gl-2-15-f and campus plan-70',approximate:true,trees:layout.trees.length,transverseWalk:'v6–9 left open',surfaceMeshes:surfaces.children.length};
  return{group,solids:b.solids,fixedMeshes,cameraSolids};
}

export async function createPhysicsCourtyardTrees(layout:ReturnType<typeof physicsCourtyardLayout>,mats:Materials) {
  return createModelTrees(layout.trees,'far',mats.leaves);
}
