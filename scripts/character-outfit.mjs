import * as T from 'three';
import {clipGarmentHeight,garmentBoundaryBand} from './character-tailoring.mjs';
import {splitStudentClothing} from './character-clothing.mjs';

// Remove the anatomical helper's little muscle hollows from the fabric shell.
// Position sharing is independent of UV splits; paired Taubin passes limit
// shrinkage and leave material/UV topology intact.
export function relaxGarment(geometry,filter,rounds=4){
 const attr=geometry.getAttribute('position'),groups=[],lookup=new Map(),ids=[];
 for(let i=0;i<attr.count;i++){
  const p=new T.Vector3().fromBufferAttribute(attr,i),key=p.toArray().map(n=>n.toFixed(6)).join(',');
  let id=lookup.get(key);if(id===undefined){id=groups.length;lookup.set(key,id);groups.push({p,members:[],adjacent:new Set(),active:filter(p)});}
  ids.push(id);groups[id].members.push(i);
 }
 const index=geometry.index,count=index?.count??attr.count;
 for(let i=0;i<count;i+=3){const v=[0,1,2].map(j=>ids[index?index.getX(i+j):i+j]);for(let a=0;a<3;a++)for(let b=0;b<3;b++)if(v[a]!==v[b])groups[v[a]].adjacent.add(v[b]);}
 for(let k=0;k<rounds;k++)for(const strength of [.45,-.46]){
  const next=groups.map(g=>{if(!g.active||!g.adjacent.size)return g.p.clone();const mean=new T.Vector3();for(const j of g.adjacent)mean.add(groups[j].p);mean.divideScalar(g.adjacent.size);return g.p.clone().lerp(mean,strength);});
  groups.forEach((g,i)=>g.p.copy(next[i]));
 }
 for(const g of groups)for(const i of g.members)attr.setXYZ(i,...g.p.toArray());
 return geometry;
}

export function fitNeckOpening(geometry,skin,collarY,margin=.009){
 const mesh=new T.Mesh(skin,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster(),center=new T.Vector3(0,collarY+.005,.014),radii=[];
 for(let i=0;i<96;i++){
  const angle=i/96*Math.PI*2,direction=new T.Vector3(Math.cos(angle),0,Math.sin(angle));
  ray.set(center.clone().addScaledVector(direction,.3),direction.clone().negate());
  const hit=ray.intersectObject(mesh,false)[0];if(!hit)throw new Error(`Missing neck section at ${i}`);
  radii.push(hit.point.distanceTo(center)+margin);
 }
 const p=geometry.getAttribute('position');
 for(let i=0;i<p.count;i++){
  const point=new T.Vector3().fromBufferAttribute(p,i),weight=T.MathUtils.smoothstep(point.y,collarY-.07,collarY);
  if(!weight||Math.abs(point.x)>.17)continue;
  const angle=(Math.atan2(point.z-center.z,point.x)+Math.PI*2)%(Math.PI*2),j=angle/(Math.PI*2)*96,low=Math.floor(j),radius=T.MathUtils.lerp(radii[low],radii[(low+1)%96],j-low);
  point.x=T.MathUtils.lerp(point.x,Math.cos(angle)*radius,weight);point.z=T.MathUtils.lerp(point.z,center.z+Math.sin(angle)*radius,weight);
  p.setXYZ(i,...point.toArray());
 }
 mesh.material.dispose();return geometry;
}


// Fit the jumper/jacket over the actual trousers, including the ribbing below
// the cut edge. Sample only the waist band, never a posed leg or an assumed hip.
export function fitLowerGarment(geometry,trousers,hemY){
 const mesh=new T.Mesh(trousers,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster();
 const count=128,radii=[],centerZ=.016,clearance=.009;
 for(let j=0;j<count;j++){
  const a=j/count*Math.PI*2,d=new T.Vector3(Math.cos(a),0,Math.sin(a));let outer=0;
  for(let step=0;step<=24;step++){
   const center=new T.Vector3(0,hemY-.036+step*.005,centerZ);
   ray.set(center.clone().addScaledVector(d,.5),d.clone().negate());
   const hit=ray.intersectObject(mesh,false)[0];
   if(hit)outer=Math.max(outer,hit.point.clone().sub(center).dot(d));
  }
  if(!(outer>0&&outer<.35))throw Error('Missing or invalid trouser waist profile');
  radii.push(outer+clearance);
 }
 // A relaxed hem bridges little anatomical dents rather than following them.
 const envelope=radii.map((r,i)=>Math.max(r,...[-2,-1,1,2].map(j=>radii[(i+j+count)%count])));
 const pos=geometry.getAttribute('position');let changed=0,maxDelta=0;
 for(let i=0;i<pos.count;i++){
  const p=new T.Vector3().fromBufferAttribute(pos,i),weight=1-T.MathUtils.smoothstep(p.y,hemY+.075,hemY+.18);
  if(!weight)continue;
  const a=(Math.atan2(p.z-centerZ,p.x)+Math.PI*2)%(Math.PI*2),j=a/(Math.PI*2)*count,k=Math.floor(j),r=Math.hypot(p.x,p.z-centerZ);
  const required=T.MathUtils.lerp(envelope[k],envelope[(k+1)%count],j-k);
  if(r>=required)continue;
  const next=T.MathUtils.lerp(r,required,weight);maxDelta=Math.max(maxDelta,next-r);changed++;
  pos.setXYZ(i,Math.cos(a)*next,p.y,centerZ+Math.sin(a)*next);
 }
 mesh.material.dispose();return {samples:count*25,changed,maxDelta,clearance};
}


// A sleeve ends perpendicular to its own forearm, not on a world-Y stair-step.
// Construct the thick cuff from that exact boundary so the two cannot separate.
export function finishSleeve(geometry,wrist,axis){
 const q=new T.Quaternion().setFromUnitVectors(axis.clone().normalize(),new T.Vector3(0,1,0));
 const toLocal=new T.Matrix4().makeRotationFromQuaternion(q).multiply(new T.Matrix4().makeTranslation(-wrist.x,-wrist.y,-wrist.z));
 const toWorld=toLocal.clone().invert(),local=geometry.clone().applyMatrix4(toLocal);local.computeBoundingBox();
 const cut=-.040,result=clipGarmentHeight(local,local.boundingBox.min.y-.01,cut);
 const cuff=garmentBoundaryBand(result,cut,.035,.001,.003);
 // The front-only outer shell must not reveal the background through an open
 // wrist. An inward-facing cloth lining meets the cuff's actual inner edge.
 // The oblique forearm slab also intersects the lower torso. Keep only the
 // sleeve tube before binding this lining rigidly to its own forearm.
 const band=clipGarmentHeight(local,-.180,cut);
 const {primary:lining,contrast:discarded}=splitStudentClothing(band,([x,,z])=>Math.hypot(x,z)-.12);
 band.dispose();discarded.dispose();
 const lp=lining.getAttribute('position'),ln=lining.getAttribute('normal');
 for(let i=0;i<lp.count;i++){
  const n=new T.Vector3().fromBufferAttribute(ln,i),p=new T.Vector3().fromBufferAttribute(lp,i).addScaledVector(n,-.002);
  lp.setXYZ(i,...p.toArray());ln.setXYZ(i,-n.x,-n.y,-n.z);
 }
 for(const attr of Object.values(lining.attributes))for(let i=0;i<attr.count;i+=3)for(let k=0;k<attr.itemSize;k++){
  const a=(i+1)*attr.itemSize+k,b=(i+2)*attr.itemSize+k,v=attr.array[a];attr.array[a]=attr.array[b];attr.array[b]=v;
 }
 local.dispose();return {geometry:result.applyMatrix4(toWorld),cuff:cuff.applyMatrix4(toWorld),lining:lining.applyMatrix4(toWorld)};
}
