import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import * as T from 'three';
import { subdivideCharacterSurface, recomputeCharacterNormals } from './character-surface.mjs';

// Two adjacent quads deliberately use separated texture islands. The shared
// geometric edge must remain continuous in both its position and lighting.
const vertices = [[0,0,0],[1,0,0],[2,0,0],[0,1,0],[1,1,0],[2,1,0]].map(p=>new T.Vector3(...p));
const uvs = [[0,0],[.4,0],[.4,1],[0,1],[.6,0],[1,0],[1,1],[.6,1]];
const faces = [[[0,0],[1,1],[4,2],[3,3]],[[1,4],[2,5],[5,6],[4,7]]];
const patch = subdivideCharacterSurface(vertices, uvs, faces, ()=>true);
assert.equal(patch.index.count, 48, 'two quads subdivide into sixteen triangles');
const pp=patch.getAttribute('position'), pt=patch.getAttribute('uv'), pn=patch.getAttribute('normal');
const seam=[];
for(let i=0;i<pp.count;i++) {
  assert.ok(Math.abs(pn.getZ(i)-1)<1e-6, 'flat patch preserves orientation');
  if(Math.abs(pp.getX(i)-1)<1e-6&&Math.abs(pp.getY(i)-.5)<1e-6) seam.push(i);
}
assert.equal(seam.length,2,'UV discontinuity duplicates the midpoint only as needed');
assert.deepEqual(seam.map(i=>Number(pt.getX(i).toFixed(5))).sort(),[.4,.6],'both source texture islands retained');
assert.ok(seam.every(i=>Math.abs(pt.getY(i)-.5)<1e-6),'edge texture interpolation retained');

// Bend the two UV islands into different planes. Recomputing by the split
// vertex index creates a lighting discontinuity; the geometric seam stays smooth.
for(let i=0;i<pp.count;i++)pp.setZ(i,Math.max(0,pp.getX(i)-1)*.5);
patch.computeVertexNormals();
assert.notEqual(patch.getAttribute('normal').getX(seam[0]),patch.getAttribute('normal').getX(seam[1]));
const textureBefore=[...pt.array];recomputeCharacterNormals(patch);
const deformedNormals=patch.getAttribute('normal');
assert.deepEqual(new T.Vector3().fromBufferAttribute(deformedNormals,seam[0]).toArray(),new T.Vector3().fromBufferAttribute(deformedNormals,seam[1]).toArray());
assert.deepEqual([...pt.array],textureBefore,'smoothing must not merge texture islands');
assert.ok(deformedNormals.getX(seam[0])<-.1&&deformedNormals.getZ(seam[0])>.8,'seam interpolates the bent planes');

const data=JSON.parse(await readFile('assets/source-models/character/human-data.json','utf8'));
const body=subdivideCharacterSurface(data.vertices.map(p=>new T.Vector3(...p)),data.uvs,data.groups.body,p=>p.y>data.joints.neck[1]-.004);
const p=body.getAttribute('position'),n=body.getAttribute('normal'),uv=body.getAttribute('uv'),groups=new Map();
const bounds=[Math.min(...data.uvs.map(p=>p[0])),Math.max(...data.uvs.map(p=>p[0])),Math.min(...data.uvs.map(p=>p[1])),Math.max(...data.uvs.map(p=>p[1]))];
for(let i=0;i<p.count;i++) {
  const point=[p.getX(i),p.getY(i),p.getZ(i)],normal=[n.getX(i),n.getY(i),n.getZ(i)],tex=[uv.getX(i),uv.getY(i)];
  assert.ok([...point,...normal,...tex].every(Number.isFinite),'finite surface attributes');
  assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-4,'unit smooth normal');
  assert.ok(tex[0]>=bounds[0]-1e-6&&tex[0]<=bounds[1]+1e-6&&tex[1]>=bounds[2]-1e-6&&tex[1]<=bounds[3]+1e-6,'UV remains within source atlas');
  const key=point.join(','),list=groups.get(key)??[];list.push({normal,tex});groups.set(key,list);
}
let seamCopies=0;
for(const group of groups.values())if(group.length>1){
  for(const item of group.slice(1))assert.deepEqual(item.normal,group[0].normal,'texture seams retain identical normals');
  seamCopies+=group.length-1;
}
assert.ok(seamCopies>0,'real head includes preserved texture seams');
assert.ok([...uv.array].every(x=>x>=-1e-6&&x<=1+1e-6),'head uses normalized UVs instead of world-position projection');
const result={passed:true,headVertices:p.count,triangles:body.index.count/3,uvSeamCopies:seamCopies,scope:'UV islands, subdivision and deformed seam normals only; no art or GPU acceptance'};
await writeFile('docs/validation/v0.110/surface-check.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
