import * as T from 'three';
import {Builder,rng} from './geometry.ts';
import {terrainSurface} from './courtyard-terrain.ts';
import {insidePolygon,type CampusMap,type MapPolygon} from './campus-map.ts';
import type {Materials} from './materials.ts';

// gl-4-05 f/r/l: coarse grey forecourt, square slabs beside the portico,
// and dense planting beyond the glazed north-wing end. Dimensions and hidden
// planting extent are approximate; this does not close the public street.
export function tangCourtyardLayout(map:CampusMap) {
  const f=map.features.find(f=>f.id==='plan-22')!,a=f.points[23],c=f.points[24];
  const length=Math.hypot(c[0]-a[0],c[1]-a[1]),nx=-(c[1]-a[1])/length,nz=(c[0]-a[0])/length;
  const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2;
  const point=(u:number,v:number)=>[x+u*nz+v*nx,z-u*nx+v*nz];
  const outline:MapPolygon={points:[a,c,...f.points.slice(25,28),[-385.8,-81.3],[-384.8,-49.2]]};
  const slabs:MapPolygon={points:[[-4.2,.18],[15.3,.18],[15.3,6.4],[-4.2,6.4]].map(([u,v])=>point(u,v))};
  const beds:MapPolygon[]=[{points:[[-391.9,-66.8],[-387.2,-66.4],[-387.5,-80.6],[-390.1,-81]]}];
  return{outline,slabs,beds,frame:{x,z,nx,nz}};
}

function squareSlabs(mats:Materials) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#6e726b';ctx.fillRect(0,0,256,256);
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const shade=160+(row*7+col*11)%14;ctx.fillStyle=`rgb(${shade},${shade+2},${shade-7})`;
    ctx.fillRect(col*64+1.2,row*64+1.2,61.6,61.6);
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
  return new T.MeshStandardMaterial({name:'tang courtyard square paving',map,bumpMap:mats.textures.get('stone-grain.webp'),bumpScale:.012,roughness:.96});
}

export function createTangCourtyard(layout:ReturnType<typeof tangCourtyardLayout>,mats:Materials) {
  const group=new T.Group();group.name='tang courtyard';
  const b=new Builder(),slab=squareSlabs(mats);
  const asphalt=new T.MeshStandardMaterial({name:'tang courtyard coarse grey paving',color:0xa9aaa1,map:mats.textures.get('courtyard-asphalt.webp'),roughness:.97});
  const surface=(polygon:MapPolygon,y:number,material:T.Material,scale:number)=>{
    const geometry=terrainSurface(polygon,y),uv=geometry.getAttribute('uv'),pos=geometry.getAttribute('position'),f=layout.frame;
    for(let i=0;i<pos.count;i++){
      const dx=pos.getX(i)-f.x,dz=pos.getZ(i)-f.z;
      uv.setXY(i,(dx*f.nz-dz*f.nx)/scale,(dx*f.nx+dz*f.nz)/scale);
    }
    b.add(geometry,material);
  };
  surface({...layout.outline,holes:[layout.slabs.points,...layout.beds.map(b=>b.points)]},.036,asphalt,2.4);
  surface(layout.slabs,.038,slab,3.2);
  for(const bed of layout.beds){
    surface(bed,.052,mats.grass,2.4);
    for(let i=0;i<bed.points.length;i++){
      const a=bed.points[i],c=bed.points[(i+1)%bed.points.length];
      b.box(.10,.10,Math.hypot(c[0]-a[0],c[1]-a[1]),(a[0]+c[0])/2,.07,(a[1]+c[1])/2,mats.stone,false,Math.atan2(c[0]-a[0],c[1]-a[1]));
    }
  }
  const surfaces=b.finish('tang courtyard surfaces');surfaces.children.forEach(o=>o.castShadow=false);group.add(surfaces);
  // Shared leaf material and one static instanced draw call. No new lights,
  // per-frame leaf generation, or global vegetation resampling.
  const rand=rng(6405),matrices:T.Matrix4[]=[],dummy=new T.Object3D();
  for(let cluster=0;cluster<5;cluster++)for(let i=0;i<150;i++){
    const z=-68.2-cluster*2.6+(rand()-.5)*2.8,x=-389.3+(rand()-.5)*3.1;
    if(!insidePolygon(x,z,layout.beds[0]))continue;
    dummy.position.set(x,.45+rand()*2.7,z);dummy.rotation.set(rand()*Math.PI,rand()*Math.PI*2,rand()*Math.PI);
    dummy.scale.setScalar(.7+rand()*.55);dummy.updateMatrix();matrices.push(dummy.matrix.clone());
  }
  const shrubs=new T.InstancedMesh(new T.PlaneGeometry(1,1),mats.leaves,matrices.length);shrubs.name='tang courtyard evergreen shrubs';
  matrices.forEach((matrix,i)=>shrubs.setMatrixAt(i,matrix));shrubs.castShadow=shrubs.receiveShadow=true;shrubs.computeBoundingSphere();group.add(shrubs);
  group.userData={...layout,source:'official VR gl-4-05 f/r/l; user campus plan',approximate:true,surfaceMeshes:surfaces.children.length,shrubCards:matrices.length};
  return group;
}
