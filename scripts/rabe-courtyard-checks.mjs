import assert from 'node:assert/strict';

const inside=([x,z],ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const[a,b]=ring[i],[c,d]=ring[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)yes=!yes;}return yes;};
const distance=(p,ring)=>Math.min(...ring.map((a,i)=>{const b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);}));

export async function checkRabeCourtyard(page,report,point,campusInside,boundaryDistance,previousCuboids){
 const garden=report.geometry.courtyard;
 assert.ok(garden,'courtyard exists');
 assert.equal(garden.beds.length,4);assert.equal(garden.trees.length,4);
 assert.equal(garden.surfaceMeshes,3,'surfaces merged by material');
 for(const p of garden.outline.points)assert.ok(campusInside(p)&&boundaryDistance(p)>.24,'paving stays within campus fence');
 const house=[report.building.bodyOutline,...report.building.boxes.filter(b=>b.kind!=='dormer-roof').map(b=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>point(b.u-report.building.porchU+u*b.w/2,b.v-2.16+v*b.d/2)))];
 let minBuildingClearance=Infinity,minFenceClearance=Infinity;
 for(const t of garden.trees){
  for(const p of [[t.x-.4,t.z-.4],[t.x+.4,t.z-.4],[t.x+.4,t.z+.4],[t.x-.4,t.z+.4]]){
   assert.ok(garden.beds.some(b=>inside(p,b.points)),'tree collider remains in planting bed');
   assert.ok(campusInside(p)&&boundaryDistance(p)>.24,'tree avoids fence');
   for(const h of house){assert.ok(!inside(p,h),'tree collider outside house');minBuildingClearance=Math.min(minBuildingClearance,distance(p,h));}
   minFenceClearance=Math.min(minFenceClearance,boundaryDistance(p));
  }
 }
 // The old randomly planted trees must not occupy the new paved routes.
 const oldTrees=previousCuboids.filter(c=>Math.abs(c.halfExtents.x-.4)<.001&&Math.abs(c.halfExtents.z-.4)<.001&&inside([c.position.x,c.position.z],garden.outline.points));
 assert.ok(oldTrees.every(t=>garden.beds.some(b=>inside([t.position.x,t.position.z],b.points))),'old random tree on courtyard paving');
 report.planting={trees:garden.trees.length,beds:garden.beds.length,oldTrees:oldTrees.length,minBuildingClearance,minFenceClearance,groundcover: garden.groundcoverCount};
 report.surfaces=await page.evaluate(()=>{
  const g=window.__GULOU__.game,c=g.world.root.getObjectByName('rabe courtyard'),surfaces=c.getObjectByName('rabe courtyard surfaces'),old=g.world.root.getObjectByName('registered campus roads lawns and playing fields');
  const inside=([x,z],ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const[a,b]=ring[i],[d,e]=ring[j];if((b>z)!==(e>z)&&x<(d-a)*(z-b)/(e-b)+a)yes=!yes;}return yes;};
  const ray=g.cameraRig.ray,origin=g.player.position.clone(),down=origin.clone().set(0,-1,0);let samples=0,bedSamples=0;const failures=[];
  c.updateMatrixWorld(true);old.updateMatrixWorld(true);
  for(let x=104.97;x<130.8;x+=.43)for(let z=679.93;z<702.65;z+=.47){
   if(!inside([x,z],c.userData.outline.points))continue;
   ray.set(origin.set(x,.2,z),down);ray.near=0;ray.far=.21;
   const previous=ray.intersectObject(old,true).filter(h=>h.object.material.name!=='campus-foundation');
   const hits=ray.intersectObject(surfaces,true),bed=c.userData.beds.some(b=>inside([x,z],b.points));
   const slabs=hits.filter(h=>h.object.material.name==='rabe courtyard grey stone slabs');
   const lawn=hits.filter(h=>Math.abs(h.point.y-.052)<.002);
   samples++;if(bed)bedSamples++;
   if(previous.length||!hits.length||(bed?slabs.length||!lawn.length:!slabs.length))failures.push({x,z,bed,old:previous.map(h=>h.object.material.name),hits:hits.map(h=>[h.object.material.name,h.point.y])});
  }
  return{samples,bedSamples,failureCount:failures.length,failures:failures.slice(0,6)};
 });
 assert.equal(report.surfaces.failureCount,0,'slab coverage and planting holes without old ground overlap: '+JSON.stringify(report.surfaces));
}
