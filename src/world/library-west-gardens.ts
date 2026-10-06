import * as T from 'three';
import { Builder, rng } from './geometry.ts';
import { terrainSurface } from './courtyard-terrain.ts';
import { avenueEdge, trimAvenueCurb } from './zhongda-avenue.ts';
import { createPlanarCutout } from './planar-cutout.ts';
import { insidePolygon } from './campus-map.ts';
import { createModelTrees } from './model-trees.ts';
import type { MapPolygon } from './campus-map.ts';
import type { Materials } from './materials.ts';
import type { TreeSpot } from './vegetation.ts';

// VR gl-2-22 l shows two wooded lawns beside the physics entrance avenue.
// The plan supplies road edges, not a record of every planted surface.
// Widths, low rail details, tree positions and heights remain approximate.
const walkEdge = (z: number) => avenueEdge(-1,z)-7.6;
function joinWalk(a: number[], b: number[]) {
  let lo=0,hi=1;
  const delta=(t:number)=>a[0]+(b[0]-a[0])*t-walkEdge(a[1]+(b[1]-a[1])*t);
  for(let i=0;i<40;i++){const m=(lo+hi)/2;if(delta(m)*delta(lo)>0)lo=m;else hi=m;}
  const z=a[1]+(b[1]-a[1])*(lo+hi)/2;return [walkEdge(z),z];
}

export function libraryWestGardenLayout() {
  const northStart=joinWalk([-108.887,253.753],[-92.224,258.225]);
  const northEnd=joinWalk([-92.866,285.149],[-137.645,286.079]);
  const southStart=joinWalk([-137.807,288.726],[-93.038,287.812]);
  const southEnd=joinWalk([-94.489,334.556],[-121.804,335.581]);
  const eastEdges=[
    [northStart,[walkEdge(258.225),258.225],[walkEdge(285.149),285.149],northEnd],
    [southStart,[walkEdge(334.556),334.556],southEnd],
  ];
  const outlines: MapPolygon[] = [
    {points:[[-136.282,245.844],[-124.916,248.653],[-124.02,255.085],[-122.434,257.373],[-118.817,259.286],[-112.722,258.157],[-108.887,253.753],...eastEdges[0],[-137.645,286.079]]},
    {points:[...eastEdges[1],[-121.804,335.581],[-138.659,330.925],[-137.807,288.726]]},
  ];
  return {outlines,eastEdges};
}
export type LibraryGardenLayout = ReturnType<typeof libraryWestGardenLayout>;

export async function createLibraryWestGardens(layout: LibraryGardenLayout, mats: Materials, replacements: MapPolygon[] = []) {
  const group=new T.Group();group.name='library west gardens';
  const cuts=replacements.map(createPlanarCutout),cutout={intersects:(ring:number[][])=>cuts.some(c=>c.intersects(ring)),subtract:(ring:number[][])=>cuts.reduce((parts,c)=>parts.flatMap(p=>c.subtract(p)),[ring])};
  const keep=(p:{x:number;z:number})=>!replacements.some(polygon=>insidePolygon(p.x,p.z,polygon));
  const b=new Builder(),white=new T.MeshStandardMaterial({name:'library lawn white low rails',color:0xe0e1d5,roughness:.76});
  for(const polygon of layout.outlines)b.add(terrainSurface(polygon,.026,cutout),mats.grass);
  // Existing plan curbs already follow the outer road edges. Add only the
  // missing edge against v0.44's western pedestrian walk, on the lawn side.
  for(const edge of layout.eastEdges)for(let i=1;i<edge.length;i++){
    for(const [a,c] of trimAvenueCurb(edge[i-1],edge[i],replacements))b.box(.14,.12,Math.hypot(c[0]-a[0],c[1]-a[1]),(a[0]+c[0])/2-.07,.07,(a[1]+c[1])/2,mats.stone,false,Math.atan2(c[0]-a[0],c[1]-a[1]));
  }
  const rails=[];
  // Thin low protection appears beside the avenue; leave both ends back
  // from the cross street so neither entrance nor corner turning is blocked.
  for(const [start,end]of [[260.5,282.7],[290.4,331.6]]){
    for(const [[ax,az],[bx,bz]] of trimAvenueCurb([walkEdge(start)-.36,start],[walkEdge(end)-.36,end],replacements)) {
    const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
    for(const y of[.16,.57])b.box(.038,.038,length,(ax+bx)/2,y,(az+bz)/2,white,false,angle);
    for(let i=0,n=Math.ceil(length/.85);i<=n;i++)b.box(.038,.63,.038,ax+dx*i/n,.315,az+dz*i/n,white);
    const solid={x:(ax+bx)/2,y:.315,z:(az+bz)/2,w:.08,h:.63,d:length,angle};b.solids.push(solid);rails.push(solid);
    }
  }
  const props=b.finish('library garden surfaces and low rails');group.add(props);
  // A separate seeded batch keeps every pre-existing tree's transform and
  // visual variant unchanged, and reuses the shared models and LOD machinery.
  const rand=rng(4706),spots:TreeSpot[]=[];
  for(const zs of[[264.6,271.8,279.0],[295.2,303.1,311.7,320.0,328.0]])for(const z of zs)for(const x of[-131.5,-120.5,-109.5]){
    spots.push({x:x+(rand()-.5)*2.2,z:z+(rand()-.5)*1.3,height:13.5+rand()*4.5,baseY:.026,whitewash:true});
  }
  const trees=await createModelTrees(spots,'far',mats.leaves,keep);group.add(trees.group);
  // Low clipped planting is visible along the cross street. Shared leaf
  // cards retain a broken, leafy silhouette rather than a solid green wall.
  const hedgeMatrices:T.Matrix4[]=[],dummy=new T.Object3D();
  for(const [z,sign]of [[284.75,-1],[289.65,1]])for(let x=-135;x<=-104;x+=.48)for(let k=0;k<12;k++){
    const edgeZ=z+(x+135)*-.0208;
    dummy.position.set(x+(rand()-.5)*.48,.16+rand()*.47,edgeZ+sign*rand()*.66);
    dummy.rotation.set(rand()*Math.PI,rand()*Math.PI*2,rand()*Math.PI);dummy.scale.setScalar(.36+rand()*.18);dummy.updateMatrix();if(keep(dummy.position))hedgeMatrices.push(dummy.matrix.clone());
  }
  const hedge=new T.InstancedMesh(new T.PlaneGeometry(1,1),mats.leaves,hedgeMatrices.length);hedge.name='library cross-street clipped planting';
  hedgeMatrices.forEach((matrix,i)=>hedge.setMatrixAt(i,matrix));hedge.castShadow=hedge.receiveShadow=true;hedge.computeBoundingSphere();group.add(hedge);
  const solids=[...b.solids,...trees.solids];
  group.userData={...layout,trees:spots.filter(keep),rails,solids,source:'official VR gl-2-22 l/f/r/b, user campus plan, walk video frames 02:00–03:00',approximate:true};
  return {group,solids,updateVisibility:trees.updateVisibility};
}
