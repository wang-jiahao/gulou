import * as T from 'three';
import { Builder } from './geometry.ts';
import { insidePolygon, type MapPolygon } from './campus-map.ts';
import { terrainSurface } from './courtyard-terrain.ts';
import type { Materials } from './materials.ts';

// Road edges follow the registered plan. VR gl-2-22 f/r/b/l establishes
// roadside tree strips with walks behind them, interrupted at junctions.
// Strip widths and the unmeasured entrance clearances are approximate.
const edges: Record<string, number[][]> = {
  '-1': [[-88.969,149.971],[-90.021,194.389],[-89.891,200.5],[-91.597,252.859],[-92.375,255.797],[-92.224,258.225],[-92.866,285.149],[-93.038,287.812],[-94.489,334.556],[-94.6,338]],
  '1': [[-79.876,149.713],[-80.967,194.109],[-80.97,199.29],[-82.174,220.172],[-81.794,222.947],[-82.689,238.333],[-82.639,241.366],[-83.094,257.332],[-83.27,260.025],[-84.166,285.105],[-84.339,287.768],[-85.513,334.51],[-85.6,338]],
};
export function avenueEdge(side: number, z: number) {
  const nodes = edges[side];
  const next = nodes.findIndex(p => p[1] >= z), i = next < 0 ? nodes.length-1 : Math.max(1,next);
  const a = nodes[i-1], b = nodes[i];
  return a[0] + (b[0]-a[0]) * (z-a[1]) / (b[1]-a[1]);
}
function strip(side: number, start: number, end: number, inner: number, outer: number): MapPolygon {
  const zs = [start, ...edges[side].map(p=>p[1]).filter(z=>z>start&&z<end), end];
  return { points: [...zs.map(z=>[avenueEdge(side,z)+side*inner,z]), ...zs.reverse().map(z=>[avenueEdge(side,z)+side*outer,z])] };
}

export function zhongdaAvenueLayout() {
  const outlines: MapPolygon[] = [], beds: MapPolygon[] = [], borders: MapPolygon[] = [], walks: MapPolygon[] = [];
  const intervals = [
    [[151.5,192.8],[202,252],[260.2,283.7],[289.3,332.8]],
    [[151.5,192.6],[201,218.7],[224.5,236.8],[242.9,254.7],[261.5,283.6],[289.3,332.8]],
  ];
  // Preserve the mature tree by the eastern gate approach; its open soil pit
  // leaves over 1.4 metres of paved passage on the outer side of the walk.
  const pit: MapPolygon = {points:[[-80.65,328.35],[-79.35,328.35],[-79.35,329.65],[-80.65,329.65]]};
  for (const [index,side] of [-1,1].entries()) {
    const outline = strip(side,150,338,0,7.6), sideBorders: MapPolygon[] = [];
    outlines.push(outline);
    for (const [start,end] of intervals[index]) {
      const border = strip(side,start,end,.02,4.25), bed = strip(side,start+.16,end-.16,.18,4.09);
      beds.push(bed); borders.push({...border,holes:[bed.points]}); sideBorders.push(border);
    }
    walks.push({...outline,holes:[...sideBorders.map(p=>p.points),...(side===1?[pit.points]:[])]});
  }
  const pitBorder: MapPolygon = {points:[[-80.77,328.23],[-79.23,328.23],[-79.23,329.77],[-80.77,329.77]],holes:[pit.points]};
  // This shallow surround sits on the paving; the open pit has no pavement.
  return {outlines,beds,borders,walks,pit,pitBorder,width:7.6,bedWidth:4.25,walkWidth:3.35};
}
export type AvenueLayout = ReturnType<typeof zhongdaAvenueLayout>;

export function avenueTreePosition(x: number, z: number, layout: AvenueLayout) {
  const side = x < (avenueEdge(-1,z)+avenueEdge(1,z))/2 ? -1 : 1;
  const beds = layout.beds.filter(p=>p.points[0][0]*side>avenueEdge(side,p.points[0][1])*side);
  const candidates=beds.map(p=>{
    const zs=p.points.map(q=>q[1]),target=Math.max(Math.min(z,Math.max(...zs)-1.2),Math.min(...zs)+1.2);
    return {z:target,distance:Math.abs(target-z)};
  }).sort((a,b)=>a.distance-b.distance);
  const target=candidates[0].z;
  return {x:x-(target-z)*.035,z:target};
}

/** Trim pre-existing low road curbs where the new walks replace them. */
export function trimAvenueCurb(a: number[], b: number[], outlines: MapPolygon[]) {
  const dx=b[0]-a[0], dz=b[1]-a[1], cuts=[0,1];
  for(const {points} of outlines) for(let i=0;i<points.length;i++) {
    const p=points[i],q=points[(i+1)%points.length],ex=q[0]-p[0],ez=q[1]-p[1],den=dx*ez-dz*ex;
    if(Math.abs(den)<1e-9)continue;
    const t=((p[0]-a[0])*ez-(p[1]-a[1])*ex)/den,u=((p[0]-a[0])*dz-(p[1]-a[1])*dx)/den;
    if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
  }
  cuts.sort((x,y)=>x-y);
  const point=(t:number)=>[a[0]+dx*t,a[1]+dz*t], spans:number[][][]=[];
  for(let i=1;i<cuts.length;i++) {
    const p=point((cuts[i-1]+cuts[i])/2);
    // Include the old curb centreline exactly on the road-side boundary.
    const replaced=outlines.some(o=>insidePolygon(p[0],p[1],o)) ||
      (p[1]>=150&&p[1]<=338&&[-1,1].some(side=>Math.abs(p[0]-avenueEdge(side,p[1]))<.11));
    if(!replaced&&cuts[i]-cuts[i-1]>1e-8)spans.push([point(cuts[i-1]),point(cuts[i])]);
  }
  return spans;
}

export function createZhongdaAvenue(layout: AvenueLayout, mats: Materials, asphalt: T.MeshStandardMaterial) {
  const b = new Builder(), walk = asphalt.clone();
  walk.name='zhongda outer asphalt walks'; walk.color.set(0x8b8c86);
  const soil = new T.MeshStandardMaterial({name:'zhongda tree-pit soil',color:0x72694f,roughness:1});
  for(const polygon of layout.walks)b.add(terrainSurface(polygon,.036),walk);
  for(const polygon of layout.beds)b.add(terrainSurface(polygon,.043),mats.grass);
  for(const border of layout.borders) {
    b.add(terrainSurface(border,.115),mats.stone);
    for(const ring of [border.points,...border.holes!])for(let i=0;i<ring.length;i++) {
      const [ax,az]=ring[i],[bx,bz]=ring[(i+1)%ring.length];
      b.box(.025,.079,Math.hypot(bx-ax,bz-az),(ax+bx)/2,.0755,(az+bz)/2,mats.stone,false,Math.atan2(bx-ax,bz-az));
    }
  }
  b.add(terrainSurface(layout.pit,.036),soil); b.add(terrainSurface(layout.pitBorder,.047),mats.stone);
  const group=b.finish('zhongda avenue walks and planted strips');
  for(const child of group.children)child.castShadow=false;
  group.userData={...layout,source:'official VR gl-2-22 f/r/b/l, registered campus plan and walk video',approximate:true};
  return group;
}
