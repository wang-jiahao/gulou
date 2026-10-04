import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {createPlanarCutout} from '../src/world/planar-cutout.ts';
import {insidePolygon} from '../src/world/campus-map.ts';
import {terrainSurface} from '../src/world/courtyard-terrain.ts';
import {sportsHallPavingLayout} from '../src/world/sports-hall-paving.ts';

const area = ring => Math.abs(ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0))/2;
const square = (x,z,w) => [[x,z],[x+w,z],[x+w,z+w],[x,z+w]];
const near = (a,b,label) => assert.ok(Math.abs(a-b)<1e-7,`${label}: ${a} vs ${b}`);
let samples=0;
for(const reverse of [false,true])for(const [name,mask,removed] of [
  ['square',{points:square(2,2,4)},16],
  ['concave',{points:[[1,1],[8,1],[8,3],[3,3],[3,8],[1,8]]},24],
  ['hole',{points:square(1,1,8),holes:[square(3,3,4)]},48],
  ['collinear',{points:[[2,2],[4,2],[6,2],[6,6],[2,6],[2,2]]},16],
]){
  const polygon={points:reverse?[...mask.points].reverse():mask.points,holes:mask.holes?.map(r=>reverse?[...r].reverse():r)};
  const cutout=createPlanarCutout(polygon),source=reverse?square(0,0,10).reverse():square(0,0,10),original=structuredClone(source),result=cutout.subtract(source);
  near(result.reduce((s,r)=>s+area(r),0),100-removed,name+' area');
  assert.deepEqual(source,original,'input unchanged');
  // Dense off-grid samples catch filled concave corners, accidentally filled
  // holes, duplicate fragments and missing surface outside the mask.
  for(let x=.071;x<10;x+=.173)for(let z=.113;z<10;z+=.179){
    const count=result.filter(points=>insidePolygon(x,z,{points})).length;
    assert.equal(count,insidePolygon(x,z,polygon)?0:1,`${name} coverage at ${x},${z}`);samples++;
  }
  const far=square(12,12,2),edge=square(10,1,2);
  assert.strictEqual(cutout.subtract(far)[0],far,'unrelated topology retained');
  assert.strictEqual(cutout.subtract(edge)[0],edge,'boundary outside retained');
}
const mask=createPlanarCutout({points:square(0,0,4)});
assert.deepEqual(mask.subtract(square(1,1,1)),[],'fully covered removed');
assert.deepEqual(mask.subtract(square(0,0,4)),[],'coincident polygon removed');
near(mask.subtract(square(2,2,4)).reduce((s,r)=>s+area(r),0),12,'partially overlapping');
const tangent=[[4,0],[6,0],[6,4],[4,4]];
assert.strictEqual(mask.subtract(tangent)[0],tangent,'shared edge unchanged');
const triangle=[[3,6],[6,3],[6,6]];
assert.strictEqual(mask.subtract(triangle)[0],triangle,'overlapping bounds without intersection unchanged');

// Exercise the real concave sports outline, seven planting holes and terrain
// conversion. Every point inside gets one new surface, no old road/lawn.
const map=JSON.parse(await readFile('public/data/campus-layout.json','utf8')),layout=sportsHallPavingLayout(map),cutout=createPlanarCutout(layout.outline),material=new T.MeshBasicMaterial({side:T.DoubleSide});
const old=[...map.roads,...map.lawns].map(p=>new T.Mesh(terrainSurface(p,.022,cutout),material));
const replacement=[layout.surface,...layout.beds,...layout.pits].map(p=>new T.Mesh(terrainSurface(p,.036),material));
const ray=new T.Raycaster(),direction=new T.Vector3(0,-1,0);
let groundSamples=0;
for(let x=-155.781;x<-99;x+=.873)for(let z=-109.173;z<-51;z+=.911){
  if(!insidePolygon(x,z,layout.outline))continue;
  ray.set(new T.Vector3(x,1,z),direction);ray.far=2;
  assert.equal(ray.intersectObjects(old).length,0,'old surface cut away');
  assert.equal(ray.intersectObjects(replacement).length,1,`continuous replacement at ${x},${z}`);groundSamples++;
}
for(const o of [...old,...replacement])o.geometry.dispose();material.dispose();
console.log({status:'passed',coverageSamples:samples,groundSamples,checks:'winding, concavity, holes, area, tangency, topology retention, actual terrain coverage'});
