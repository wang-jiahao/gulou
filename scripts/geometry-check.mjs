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
const merged=builder.finish('reference agreement').children[0].geometry;
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
