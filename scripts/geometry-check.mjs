import assert from 'node:assert/strict';
import * as T from 'three';
import {Builder,rng} from '../src/world/geometry.ts';
// Independent Three.js primitive path, also used by the original Builder.
const random=rng(2030),mat=new T.MeshStandardMaterial(),builder=new Builder(),expected=[];
for(let i=0;i<240;i++){
 const [w,h,d]=[.04+random()*45,.02+random()*60,.03+random()*40],x=-500+random()*650,y=random()*40,z=-240+random()*980,angle=(random()-.5)*Math.PI*2,scale=2.4;
 builder.box(w,h,d,x,y,z,mat,true,angle,scale);
 const g=new T.BoxGeometry(w,h,d),uv=g.getAttribute('uv');for(let face=0;face<6;face++){const u=(face<2?d:w)/scale,v=(face===2||face===3?d:h)/scale;for(let j=0;j<4;j++){const k=face*4+j;uv.setXY(k,uv.getX(k)*u,uv.getY(k)*v);}}
 g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,angle,0)),new T.Vector3(1,1,1)));expected.push(g.toNonIndexed());
}
const indexed=builder.finish('reference agreement').children[0].geometry;
assert.equal(indexed.getAttribute('position').count,240*24);
assert.equal(indexed.index.count,240*36);
const merged=indexed.toNonIndexed();
for(const name of ['position','normal','uv']){let offset=0,max=0;const actual=merged.getAttribute(name).array;for(const g of expected){for(const v of g.getAttribute(name).array){max=Math.max(max,Math.abs(actual[offset++]-v));}}assert.equal(offset,actual.length);assert.ok(max<(name==='position'?.00013:.000015),`${name} ${max}`);}
assert.equal(builder.solids.length,240);
const chunked=new Builder(),flat=new Builder();
for(let x=-250;x<=250;x+=50)for(let z=-200;z<=600;z+=50){for(const b of[chunked,flat])b.box(7,8,11,x,4,z,mat,true,.23);}
const cg=chunked.finish('chunked',120),fg=flat.finish('flat');
const counts=g=>g.children.reduce((n,m)=>n+m.geometry.getAttribute('position').count,0);
assert.equal(counts(cg),counts(fg));assert.deepEqual(chunked.solids,flat.solids);assert.ok(cg.children.length>10);
// Every original primitive is in exactly one bounded chunk, independent of visibility.
const bounds=new T.Box3().setFromObject(cg),oldBounds=new T.Box3().setFromObject(fg);assert.deepEqual(bounds.min.toArray(),oldBounds.min.toArray());assert.deepEqual(bounds.max.toArray(),oldBounds.max.toArray());
console.log(JSON.stringify({boxes:240,attributes:'match Three.js reference',spatialCells:cg.children.length,vertices:counts(cg),collision:'unchanged'}));

// Preserve exact triangle order and seams for indexed primitives mixed with
// non-indexed surfaces, including a merged buffer that exceeds 16-bit indices.
const mixed=new Builder(),sources=[];
for(let i=0;i<2900;i++){
 const g=i%3===0?new T.BoxGeometry().toNonIndexed():new T.BoxGeometry();
 g.translate(i%100,Math.floor(i/100),0);
 sources.push(g.index?g.toNonIndexed():g.clone());mixed.add(g,mat);
}
const tube=new T.TubeGeometry(new T.LineCurve3(new T.Vector3(0,0,0),new T.Vector3(5,4,3)),16,.1,6);
sources.push(tube.toNonIndexed());mixed.add(tube,mat);
const result=mixed.finish('mixed wide indices').children[0].geometry;
assert.ok(result.index.array instanceof Uint32Array,'merge must promote indices past 65535');
const expanded=result.toNonIndexed();
for(const name of ['position','normal','uv']){
 const actual=expanded.getAttribute(name).array;let offset=0;
 for(const source of sources){const expected=source.getAttribute(name).array;assert.deepEqual(actual.subarray(offset,offset+expected.length),expected);offset+=expected.length;}
 assert.equal(offset,actual.length);
}
assert.ok(result.index.array.some(i=>i>65535));
assert.equal(mixed.finish('consumed').children.length,0,'merged input buffers released');
const indexedMesh=new T.Mesh(result,mat),expandedMesh=new T.Mesh(expanded,mat);
for(const x of [.1,45.1,98.1]){
 const ray=new T.Raycaster(new T.Vector3(x,8.1,4),new T.Vector3(0,0,-1));
 const hits=m=>ray.intersectObject(m).map(h=>({face:h.faceIndex,point:h.point.toArray(),uv:h.uv.toArray(),normal:h.normal.toArray()}));
 assert.ok(hits(indexedMesh).length);assert.deepEqual(hits(indexedMesh),hits(expandedMesh));
}
console.log(JSON.stringify({mixedPrimitives:sources.length,indexType:result.index.array.constructor.name,expandedAttributes:'exact',raycast:'exact'}));
