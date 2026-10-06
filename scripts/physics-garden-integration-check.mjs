import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const result=await build({stdin:{contents:`
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createModelTrees} from './model-trees.ts';
import {libraryWestGardenLayout,createLibraryWestGardens} from './library-west-gardens.ts';
import {physicsCourtyardLayout} from './physics-courtyard.ts';
import {createPlanarCutout} from './planar-cutout.ts';
import {insidePolygon} from './campus-map.ts';
import {trimAvenueCurb,zhongdaAvenueLayout} from './zhongda-avenue.ts';
// CPU fixture supplies tiny tree assets; production generation, RNG, canopy,
// instance filtering and collider code execute unchanged.
GLTFLoader.prototype.loadAsync=async()=>{const scene=new T.Group();for(const name of ['trunk','leaves']){const g=new T.BoxGeometry(1,10,1);g.translate(0,5,0);scene.add(new T.Mesh(g,new T.MeshStandardMaterial({name})));}return {scene};};
T.TextureLoader.prototype.loadAsync=async()=>new T.Texture();
export {T,createModelTrees,libraryWestGardenLayout,createLibraryWestGardens,physicsCourtyardLayout,createPlanarCutout,insidePolygon,trimAvenueCurb,zhongdaAvenueLayout};
`,resolveDir:resolve('src/world'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env.BASE_URL':'"/"'}});
globalThis.fetch=async()=>({ok:true,json:async()=>JSON.parse(await readFile('public/assets/vegetation/canopy-impostor.json','utf8'))});
const {T,createModelTrees,libraryWestGardenLayout,createLibraryWestGardens,physicsCourtyardLayout,createPlanarCutout,insidePolygon,trimAvenueCurb,zhongdaAvenueLayout}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const leaves=new T.MeshStandardMaterial({name:'fixture leaf sprays'});leaves.userData.foliageLight={value:1};
const mats={stone:new T.MeshStandardMaterial({name:'stone'}),grass:new T.MeshStandardMaterial({name:'grass'}),leaves};
function instances(group){const rows=[];group.traverse(m=>{if(!m.isInstancedMesh)return;for(let i=0;i<m.count;i++){rows.push([m.material.name,m.geometry.attributes.position.count,...m.instanceMatrix.array.slice(i*16,i*16+16),...(m.instanceColor?.array.slice(i*3,i*3+3)??[])].join(','));}});return rows.sort();}
function subset(before,after){const counts=new Map();for(const row of before)counts.set(row,(counts.get(row)??0)+1);for(const row of after){assert.ok(counts.get(row)>0,'retained instance matrix and colour must match the original');counts.set(row,counts.get(row)-1);}}
let preservedInstances=0;
// Remove an entire first/last cell and part of a middle cell. Both LOD modes
// must consume removed trees' random sprays before processing later cells.
const spots=[{x:-90,z:1,height:15},{x:2,z:2,height:16,whitewash:true},{x:8,z:5,height:14},{x:12,z:8,height:17,whitewash:true,baseY:.18},{x:75,z:4,height:18}];
for(const lod of ['near','far']){
 const before=await createModelTrees(spots,lod,leaves),all=await createModelTrees(spots,lod,leaves,()=>true);
 assert.deepEqual(instances(all.group),instances(before.group),'default path unchanged');
 for(const keep of [t=>t.x===2||t.x===12,()=>false]){
  const after=await createModelTrees(spots,lod,leaves,keep),rows=instances(after.group);subset(instances(before.group),rows);preservedInstances+=rows.length;
  assert.deepEqual(after.solids,before.solids.filter(keep));assert.deepEqual(after.group.userData.trees,spots.filter(keep));
  after.updateVisibility(new T.Vector3(200,20,200),'high',false);
  if(!spots.some(keep))assert.equal(after.group.children.length,0,'empty cells removed');
 }
}
const layout=physicsCourtyardLayout(),garden=libraryWestGardenLayout(),before=await createLibraryWestGardens(garden,mats),after=await createLibraryWestGardens(garden,mats,[layout.outline]);
const keep=t=>!insidePolygon(t.x,t.z,layout.outline);
assert.deepEqual(after.group.userData.trees,before.group.userData.trees.filter(keep));
subset(instances(before.group.getObjectByName('broadleaf trees far — CC0 model, approximate species')),instances(after.group.getObjectByName('broadleaf trees far — CC0 model, approximate species')));
const hedgeBefore=before.group.getObjectByName('library cross-street clipped planting'),hedgeAfter=after.group.getObjectByName('library cross-street clipped planting');
subset(instances(hedgeBefore),instances(hedgeAfter));
const matrix=new T.Matrix4(),position=new T.Vector3();
for(let i=0;i<hedgeAfter.count;i++){hedgeAfter.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);assert.ok(keep(position),'old hedge outside replacement courtyard');}
const area=ring=>Math.abs(ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);
const cut=createPlanarCutout(layout.outline);let overlap=0;
after.group.traverse(m=>{if(!m.isMesh||m.material!==mats.grass)return;const p=m.geometry.attributes.position,idx=m.geometry.index;for(let i=0;i<idx.count;i+=3){const tri=[0,1,2].map(j=>[p.getX(idx.getX(i+j)),p.getZ(idx.getX(i+j))]);overlap+=Math.max(0,area(tri)-cut.subtract(tri).reduce((n,r)=>n+area(r),0));}});
assert.ok(overlap<.002,`old lawn overlaps new paving ${overlap}m²`);
const uv=p=>[(p[0]-layout.frame.cx)*layout.frame.nz-(p[1]-layout.frame.cz)*layout.frame.nx,(p[0]-layout.frame.cx)*layout.frame.nx+(p[1]-layout.frame.cz)*layout.frame.nz];
const central=p=>{const[u,v]=uv(p);return Math.abs(u)<7&&v>12&&v<49;};
after.group.getObjectByName('library garden surfaces and low rails').traverse(m=>{if(!m.isMesh||m.material===mats.grass)return;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(!central([p.getX(i),p.getZ(i)]),'old stone/rail inside central approach');});
for(const s of after.solids)assert.ok(!central([s.x,s.z]),'old collider inside central approach');
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8'));let curbSpans=0,removedCrossingSamples=0;
assert.ok(map.roads.length>0,'map contains roads');
for(const road of map.roads)for(const ring of [road.points,...(road.holes??[])])for(let i=0;i<ring.length;i++){
 const a=ring[i],b=ring[(i+1)%ring.length];
 for(let t=0;t<=1;t+=.02)if(central([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]))removedCrossingSamples++;
 for(const [start,end]of trimAvenueCurb(a,b,[...zhongdaAvenueLayout().outlines,layout.outline])){curbSpans++;for(let t=0;t<=1;t+=.02)assert.ok(!central([start[0]+t*(end[0]-start[0]),start[1]+t*(end[1]-start[1])]),'old road curb crosses the approach');}
}
assert.ok(removedCrossingSamples>0,'fixture detects the previous crossing curbs');
const report={passed:true,preservedInstances,oldTrees:before.group.userData.trees.length,retainedTrees:after.group.userData.trees.length,oldHedgeLeaves:hedgeBefore.count,retainedHedgeLeaves:hedgeAfter.count,lawnOverlap:overlap,curbSpans,removedCrossingSamples,scope:'Production garden geometry/colliders and production tree instance generation with synthetic GLB/texture assets; both near/far modes, empty and partially removed cells. Not a full-scene GPU or performance measurement.'};
await writeFile(`docs/validation/v0.93/physics-garden-integration-${Date.now()}.json`,JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify(report));
