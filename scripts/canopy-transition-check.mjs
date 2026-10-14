import * as T from 'three';
import assert from 'node:assert/strict';
import {createCanopyCover,canopyAttributeSizes} from '../src/world/canopy-cover.ts';
import {createCanopyBatch} from '../src/world/canopy-batch.ts';

let samples=0;
for(const frames of [5,9]){
 const assets={map:new T.Texture(),center:new T.Vector3(),extent:9,height:12,frames};
 const cover=createCanopyCover([{}],{value:1},[new T.Matrix4().makeScale(1,1.3,1)],assets);
 for(const e of [0,14.5,22.49,22.5,22.51,30.5,59.49,59.5,59.51,67.49,67.5,67.51,75.49,75.5,75.51,89.99,90])for(let az=-180;az<=180;az+=5){
  const a=T.MathUtils.degToRad(az),h=T.MathUtils.degToRad(e),p=new T.Vector3(Math.sin(a)*Math.cos(h),Math.sin(h),Math.cos(a)*Math.cos(h)).multiplyScalar(30);
  cover.update(p);samples++;
  for(const name in canopyAttributeSizes)assert([...cover.mesh.geometry.getAttribute(name).array].every(Number.isFinite));
  assert([...cover.mesh.instanceMatrix.array].every(Number.isFinite));
  const geometry=cover.mesh.geometry,blend=geometry.getAttribute('instanceCrownBlend'),view=geometry.getAttribute('instanceView');
  assert(blend.getZ(0)>=0&&blend.getZ(0)<=1&&blend.getW(0)>=0&&blend.getW(0)<=1);
  assert(view.getX(0)>=0&&view.getX(0)<frames);
  if(frames===5)assert.equal(blend.getZ(0),0);
  if(e===67.5)assert(Math.abs(blend.getW(0)-.5)<1e-6);
  if(e===90){assert.equal(view.getX(0),frames-1);assert.equal(blend.getW(0),0);}
  const v=cover.mesh.instanceMatrix.version;cover.update(p);assert.equal(cover.mesh.instanceMatrix.version,v);
 }
 // Attribute widths must survive batching, and a moved source must retain its transform.
 const root=new T.Group(),other=createCanopyCover([{},{}],{value:1},[new T.Matrix4(),new T.Matrix4().makeTranslation(12,0,0)],assets);
 cover.fade.value=other.fade.value=1;root.add(cover.mesh,other.mesh);other.mesh.position.x=7;
 const batch=createCanopyBatch(root);assert(batch);batch.sync();
 for(const name in canopyAttributeSizes){const attr=batch.mesh.geometry.getAttribute(name);assert.equal(attr.itemSize,canopyAttributeSizes[name]);assert.equal(attr.count,3);assert.deepEqual([...attr.array],[...cover.mesh.geometry.getAttribute(name).array,...other.mesh.geometry.getAttribute(name).array]);}
 const matrix=new T.Matrix4(),expected=new T.Matrix4();other.mesh.getMatrixAt(0,expected);expected.premultiply(other.mesh.matrix);batch.mesh.getMatrixAt(1,matrix);assert.deepEqual(matrix.elements,expected.elements);
 cover.mesh.visible=other.mesh.visible=true;const v=batch.mesh.instanceMatrix.version;batch.sync();assert.equal(batch.mesh.instanceMatrix.version,v);
}
console.log(JSON.stringify({passed:true,samples,checks:'5/9-view elevations, finite projections, top view, stationary caching, batch attribute widths and source transforms'}));
