import * as T from 'three';
import {Builder,rng} from './geometry.ts';
import {terrainSurface} from './courtyard-terrain.ts';
import {createModelTrees} from './model-trees.ts';
import {insidePolygon,type MapPolygon} from './campus-map.ts';
import type {Materials} from './materials.ts';
import type {TreeSpot} from './vegetation.ts';

// Shared evidence in the user photograph and official gl-1-08: grey slabs,
// pale edged beds and whitewashed mature trees. The older VR's timber rails
// are absent in the user's view. Registration and planting dimensions are
// approximate; this layout preserves the existing door and campus boundary.
export function rabeCourtyardLayout() {
  const point=(u:number,v:number)=>[120.76816409153977+u*.9984206807902872+v*.05617957075538521,696.5404646090261-u*.05617957075538521+v*.9984206807902872];
  const rect=(x:number,z:number,w:number,d:number):MapPolygon=>({points:[[x,z],[x+w,z],[x+w,z+d],[x,z+d]]});
  const outline:MapPolygon={points:[[104.8,680.5],[130.65,679.75],[130.85,698.9],[127.9,700.05],[125.9,701.35],[105.8,702.65],[104.8,702.65]]};
  const beds:MapPolygon[]=[
    {points:[[2.1,-1.94],[8.65,-1.94],[8.65,2.22],[2.1,2.22]].map(([u,v])=>point(u,v))},
    rect(115.15,683.5,1.14,10.85),
    {points:[[105.25,683.25],[110.6,683.25],[111.15,683.8],[111.15,693.15],[110.6,693.7],[105.25,693.7]]},
    {points:[[105.25,696.5],[110.55,696.5],[111.1,697.05],[111.1,701.35],[105.25,701.7]]},
  ];
  const [tx,tz]=point(5.85,.12);
  const trees:TreeSpot[]=[{x:tx,z:tz,height:14.6},{x:115.75,z:687.6,height:12.8},{x:108,z:686.7,height:14.2},{x:108.1,z:698.8,height:12.4}].map(t=>({...t,baseY:.052,whitewash:true}));
  return {outline,beds,trees};
}
export type RabeCourtyardLayout=ReturnType<typeof rabeCourtyardLayout>;

function slabMaterial(mats:Materials) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d')!,rand=rng(51049);
  ctx.fillStyle='#747975';ctx.fillRect(0,0,512,512);
  for(let row=0;row<4;row++)for(let col=-1;col<2;col++){
    const x=col*256+(row%2)*128,y=row*128,shade=133+Math.floor(rand()*17);
    ctx.fillStyle=`rgb(${shade},${shade+3},${shade+2})`;ctx.fillRect(x+1.5,y+1.5,253,125);
    ctx.strokeStyle='rgba(218,222,210,.25)';ctx.strokeRect(x+3,y+3,249,121);
  }
  for(let i=0;i<22000;i++){ctx.fillStyle=rand()>.5?'rgba(231,233,222,.065)':'rgba(55,64,60,.065)';ctx.fillRect(rand()*512,rand()*512,1+rand()*5,1+rand()*2);}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
  return new T.MeshStandardMaterial({name:'rabe courtyard grey stone slabs',map,bumpMap:mats.textures.get('stone-grain.webp'),bumpScale:.013,roughness:.95});
}

export async function createRabeCourtyard(layout:RabeCourtyardLayout,mats:Materials) {
  const group=new T.Group();group.name='rabe courtyard';
  const b=new Builder(),paving=slabMaterial(mats),edge=mats.stone.clone();edge.name='rabe courtyard pale bed edges';edge.color.set(0xc5c8bc);
  const floor=terrainSurface({...layout.outline,holes:layout.beds.map(b=>b.points)},.036),uv=floor.getAttribute('uv'),position=floor.getAttribute('position');
  // One 2.4m tile contains eight 1.2 x .6m slabs, rather than tiny bricks.
  for(let i=0;i<position.count;i++)uv.setXY(i,(position.getX(i)-104.8)/2.4,(position.getZ(i)-680.5)/2.4);
  b.add(floor,paving);
  for(const bed of layout.beds){
    b.add(terrainSurface(bed,.052),mats.grass);
    for(let i=0;i<bed.points.length;i++){
      const a=bed.points[i],c=bed.points[(i+1)%bed.points.length],length=Math.hypot(c[0]-a[0],c[1]-a[1]);
      b.box(.10,.11,length,(a[0]+c[0])/2,.073,(a[1]+c[1])/2,edge,false,Math.atan2(c[0]-a[0],c[1]-a[1]));
    }
  }
  const surfaces=b.finish('rabe courtyard surfaces');surfaces.children.forEach(o=>o.castShadow=false);group.add(surfaces);
  const trees=await createModelTrees(layout.trees,'far',mats.leaves);group.add(trees.group);
  // Low groundcover uses one shared leaf-card draw call. Keep the narrow
  // strip next to the house grassy as it appears in the newer user photo.
  const rand=rng(51149),matrices:T.Matrix4[]=[],dummy=new T.Object3D();
  for(const index of [0,2,3]){
    const bed=layout.beds[index],xs=bed.points.map(p=>p[0]),zs=bed.points.map(p=>p[1]);
    for(let x=Math.min(...xs)+.2;x<Math.max(...xs);x+=.4)for(let z=Math.min(...zs)+.2;z<Math.max(...zs);z+=.4){
      if(!insidePolygon(x,z,bed))continue;
      for(let k=0;k<3;k++){
        dummy.position.set(x+(rand()-.5)*.25,.10+rand()*.18,z+(rand()-.5)*.25);dummy.rotation.set(rand()*Math.PI,rand()*Math.PI*2,rand()*Math.PI);dummy.scale.setScalar(.29+rand()*.14);dummy.updateMatrix();matrices.push(dummy.matrix.clone());
      }
    }
  }
  const groundcover=new T.InstancedMesh(new T.PlaneGeometry(1,1),mats.leaves,matrices.length);groundcover.name='rabe courtyard low groundcover';matrices.forEach((m,i)=>groundcover.setMatrixAt(i,m));groundcover.receiveShadow=true;groundcover.computeBoundingSphere();group.add(groundcover);
  group.userData={...layout,solids:trees.solids,groundcoverCount:matrices.length,surfaceMeshes:surfaces.children.length,source:'user rabe-user.png and official VR gl-1-08 f/r/l',approximate:true};
  return {group,solids:trees.solids,updateVisibility:trees.updateVisibility};
}
