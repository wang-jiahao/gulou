import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { northBoundaryRuns } from '../src/world/north-boundary-layout.ts';
import { publicStreets, streetLocation } from '../src/world/street-layout.ts';

const map = JSON.parse(await readFile('public/data/campus-layout.json', 'utf8'));
const runs = northBoundaryRuns.map(r => r.points);
const edges = ps => ps.map((a, i) => [a, ps[(i + 1) % ps.length]]);
const cross = (a, b, c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const intersects = (a, b, c, d) => cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0;
const distance = (p,a,b) => {
 const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));
 return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);
};
const segments=runs.flatMap(ps=>ps.slice(1).map((b,i)=>[ps[i],b]));
let minimumBuildingClearance=Infinity,buildingCount=0;
for(const f of map.features.filter(f=>f.tags.building)) {
 buildingCount++;
 for(const [a,b] of segments)for(const [c,d] of edges(f.points)) {
  assert.ok(!intersects(a,b,c,d),`${f.id}: fence crosses building`);
  const gap=Math.min(distance(c,a,b),distance(d,a,b),distance(a,c,d),distance(b,c,d));
  minimumBuildingClearance=Math.min(gap,minimumBuildingClearance);
  assert.ok(gap>.35,`${f.id}: fence thickness reaches building (${gap})`);
 }
}
for(let i=0;i<segments.length;i++)for(let j=i+2;j<segments.length;j++)assert.ok(!intersects(...segments[i],...segments[j]),'perimeter must not self-intersect');
const roads=[];
// Xiaofenqiao centreline from registered plan pixels [2935,2550], [3072,3212], [3209,3890].
// Seven-metre combined road corridor is approximate; existing street geometry is unchanged.
const xiaofen={name:'小粉桥公共通路（地图近似）',x:0,z:0,width:7,sidewalk:0,length:350,angle:0,profile:[[116.036,366.426],[128.784,537.709],[142.696,706.619]]};
for(const road of [...publicStreets,xiaofen]) {
 let minimum=Infinity;
 for(const [a,b] of segments)for(let t=0;t<=1;t+=.025) {
  const x=a[0]+t*(b[0]-a[0]),z=a[1]+t*(b[1]-a[1]);
  // Xiaofenqiao begins south of Hankou; do not extrapolate it north through campus.
  const separation=road===xiaofen?Math.min(...road.profile.slice(1).map((b,i)=>distance([x,z],road.profile[i],b))):Math.abs(streetLocation(road,x,z).lateral);
  const gap=separation-road.width/2-road.sidewalk;
  minimum=Math.min(minimum,gap);
 }
 assert.ok(minimum>.35,`${road.name}: perimeter must leave pavement clear (${minimum})`);
 roads.push({name:road.name,minimumClearance:minimum});
}
const gateWidths=[Math.hypot(...runs[0].at(-1).map((x,i)=>x-runs[1][0][i])),Math.hypot(...runs[1].at(-1).map((x,i)=>x-runs[2][0][i]))];
assert.deepEqual(gateWidths.map(x=>Math.round(x*100)/100),[12,12]);
// No additional western segment may extend into Jinyin Street or Nanxiu Village.
assert.equal(runs.length,4);assert.deepEqual(runs[3],[[-106.20,343.85],[-115,346.7],[-138.7,347.4]]);
const report={status:'passed',northComplete:false,buildingCount,segments:segments.length,minimumBuildingClearance,roads,gateWidths};
await mkdir('docs/validation/phase43',{recursive:true});
await writeFile('docs/validation/phase43/layout.json',JSON.stringify(report,null,2));
console.log(report);
