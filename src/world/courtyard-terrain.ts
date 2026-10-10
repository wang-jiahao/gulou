import * as T from 'three';
import { Builder } from './geometry.ts';
import { planShape, type MapPolygon } from './campus-map.ts';
import type { Materials } from './materials.ts';
import type { PlanarCutout } from './planar-cutout.ts';

// The walk at 17:10–17:25 shows the entire garden above the auditorium approach.
// Seven 18 cm risers are a visual estimate, not a surveyed elevation. Side and
// rear grades are fitted transitions where the references do not fix a section.
export const terraceHeight = 1.26;
// The long stair beside the new teaching building is visible in official
// scene_gl-3-16. Eighteen 16 cm risers are a photo-based estimate, not a survey.
export const eastTerraceHeight = 2.88;
const clamp = (n: number) => T.MathUtils.clamp(n, 0, 1);
export function terrainHeight(x: number, z: number) {
  const north=terraceHeight * clamp((43 - Math.abs(x)) / 4) * clamp((z + 30) / 8) * clamp((85.85 - z) / 3.85);
  const east=eastTerraceHeight*clamp((x-27)/6)*clamp((72-x)/4)*clamp((z-10)/8)*clamp((85.4-z)/7.2);
  return Math.max(north,east);
}

/** Clip planar triangles at every grade break before lifting them. This keeps
 * long traced road polygons from interpolating straight across the terrace. */
export function terrainSurface(polygon: MapPolygon, offset: number, cutout?: PlanarCutout) {
  const source = new T.ShapeGeometry(planShape(polygon));
  const p = source.getAttribute('position'), index = source.getIndex()!;
  const output: number[] = [], uv: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    let polygons = [Array.from({ length: 3 }, (_, j) => [p.getX(index.getX(i + j)), -p.getY(index.getX(i + j))])];
    if (cutout) polygons = cutout.subtract(polygons[0]);
    for (const [axis, value] of [[0,-43],[0,-39],[0,27],[0,29],[0,31],[0,33],[0,39],[0,43],[0,68],[0,72],[1,-30],[1,-22],[1,10],[1,14],[1,18],[1,78.2],[1,82],[1,85.4],[1,85.85]]) {
      const split: number[][][] = [];
      for (const ring of polygons) {
        if (ring.every(q => q[axis] <= value) || ring.every(q => q[axis] >= value)) { split.push(ring); continue; }
        for (const side of [-1, 1]) {
          const clipped: number[][] = [];
          for (let j = 0; j < ring.length; j++) {
            const a = ring[j], b = ring[(j + 1) % ring.length];
            const ain = side * (a[axis] - value) >= 0, bin = side * (b[axis] - value) >= 0;
            if (ain) clipped.push(a);
            if (ain !== bin) { const t = (value - a[axis]) / (b[axis] - a[axis]); clipped.push([a[0] + t*(b[0]-a[0]), a[1] + t*(b[1]-a[1])]); }
          }
          if (clipped.length >= 3) split.push(clipped);
        }
      }
      polygons = split;
    }
    // At the southwest terrace corner both grade axes vary. Coarse, separately
    // triangulated grass and road surfaces can cross by centimetres. Refine
    // this shared grade patch before lifting, retaining the same height field.
    const refined: number[][][] = [];
    for (const polygon of polygons) {
      if (!polygon.every(([x,z]) => x >= -43-1e-6 && x <= -39+1e-6 && z >= 82-1e-6 && z <= 85.85+1e-6)) { refined.push(polygon); continue; }
      let fragments = [polygon];
      for (const [axis,start,end] of [[0,-43,-39],[1,82,85.85]]) for (let value=start+.4; value<end-1e-6; value+=.4) {
        const next: number[][][] = [];
        for (const ring of fragments) {
          if (ring.every(p=>p[axis]<=value) || ring.every(p=>p[axis]>=value)) { next.push(ring); continue; }
          for (const side of [-1,1]) {
            const clipped: number[][] = [];
            for (let j=0;j<ring.length;j++) {
              const a=ring[j],b=ring[(j+1)%ring.length],ain=side*(a[axis]-value)>=0,bin=side*(b[axis]-value)>=0;
              if (ain) clipped.push(a);
              if (ain!==bin) { const t=(value-a[axis])/(b[axis]-a[axis]);clipped.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]); }
            }
            if (clipped.length>=3) next.push(clipped);
          }
        }
        fragments=next;
      }
      refined.push(...fragments);
    }
    for (const ring of refined) for (let j = 1; j < ring.length - 1; j++) for (const [x,z] of [ring[0],ring[j],ring[j+1]]) {
      output.push(x, terrainHeight(x,z) + offset, z); uv.push(x/3.6,-z/3.6);
    }
  }
  source.dispose();
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(output,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.computeVertexNormals(); return g;
}

/** A visual curb follows the same local grade as the road, including its width. */
export function terrainCurb(a:number[],b:number[]) {
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=-dz/length*.08,nz=dx/length*.08;
  const vertices:number[]=[];
  const count=Math.ceil(length/.4);
  for(let i=0;i<count;i++) {
    const t=i/count,u=(i+1)/count,x=a[0]+dx*t,z=a[1]+dz*t,xx=a[0]+dx*u,zz=a[1]+dz*u;
    const ring=[[x+nx,z+nz],[xx+nx,zz+nz],[xx-nx,zz-nz],[x-nx,z-nz]];
    const p=ring.flatMap(([px,pz])=>[[px,terrainHeight(px,pz)+.01,pz],[px,terrainHeight(px,pz)+.13,pz]]);
    for(const face of [[1,3,5,7],[0,6,4,2],[0,2,3,1],[2,4,5,3],[4,6,7,5],[6,0,1,7]])for(const j of [0,1,2,0,2,3])vertices.push(...p[face[j]]);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}

export function createEastTeachingSteps(mats:Materials){
  const b=new Builder(),x=36,run=.4,risers=18;
  for(let i=0;i<risers;i++){
    const top=(i+1)*.16+.035,z=85.4-(i+.5)*run;
    b.box(4.3,top,run,x,top/2,z,mats.stone,true);
    b.box(4.3,.025,.075,x,top+.008,z+.16,mats.path);
    for(const side of[-1,1]){
      b.box(.42,top+.48,run,x+side*2.38,(top+.48)/2,z,mats.brick,true);
      b.box(.52,.07,run,x+side*2.38,top+.515,z,mats.stone);
    }
  }
  b.box(4.3,.12,2.4,x,eastTerraceHeight-.025,77,mats.path,true);
  // A shallow U-shaped wheel channel, not a round handrail. Its slope stays
  // above the tread nosings along the full flight, as in scene_gl-3-16-l.
  const channelRun=7.2,channelRise=2.88,channelLength=Math.hypot(channelRun,channelRise),tilt=Math.atan2(channelRise,channelRun);
  b.add(new T.BoxGeometry(.24,.025,channelLength),mats.metal,x,1.64,81.8,new T.Euler(tilt,0,0));
  for(const side of[-1,1])b.add(new T.BoxGeometry(.025,.06,channelLength),mats.metal,x+side*.13,1.67,81.8,new T.Euler(tilt,0,0));
  const group=b.finish('east terrace descent to new teaching building');group.userData={source:'official VR scene_gl-3-16-l',height:eastTerraceHeight,risers,estimated:true};
  return{group,solids:b.solids};
}

export function createCourtyardSteps(mats: Materials) {
  const b = new Builder();
  for (let i = 0; i < 7; i++) {
    const top = (i+1)*.18 + .035, z = 85.85 - (i+.5)*.55;
    b.box(6.4,top,.55,0,top/2,z,mats.stone,true);
    // Narrow stone nosing makes each individual tread legible at eye level.
    b.box(6.4,.035,.08,0,top+.008,z+.235,mats.path);
  }
  for (const side of [-1,1]) {
    for (let i=0;i<7;i++) {
      const top=(i+1)*.18+.48,z=85.85-(i+.5)*.55;
      b.box(.42,top,.55,side*3.42,top/2,z,mats.stone,true);
      b.box(.50,.07,.55,side*3.42,top+.035,z,mats.path);
    }
    b.box(.5,.5,2,side*3.42,terraceHeight+.27,81,mats.stone,true);
  }
  return { group:b.finish('North garden south stair and stone cheeks'), solids:b.solids };
}
