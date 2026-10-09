import * as T from 'three';
import {Builder} from './geometry.ts';
import {createNanyuanElectronicDisplay} from './nanyuan-electronic-display.ts';

/** The user's 2026-10-09 screenshot identifies the continuous wall in front of
 * plan-89. These fitted points stay inside the mapped lawn edge, following the
 * fountain road instead of cutting across it. Hidden joins are approximate. */
export const nanyuanFrontageWall={
  curve:[[-75.6592,436.6],[-71.5,437.0],[-67.0,441.35],[-63.55,446.45],[-61.9,452.8]],
  south:[[-61.9,452.8],[-45.7,451.8]],
  building:'plan-89',
  height:2.24,
  depth:.62,
} as const;

type WallMaterials={masonry:T.Material;surround:T.Material;roof:T.Material};
type Point=readonly[number,number];

export function appendNanyuanFrontage(b:Builder,materials:WallMaterials){
  const segments:{a:Point;b:Point;x:number;z:number;width:number;angle:number}[]=[];
  const wall=(a:Point,end:Point)=>{
    const dx=end[0]-a[0],dz=end[1]-a[1],width=Math.hypot(dx,dz),x=(a[0]+end[0])/2,z=(a[1]+end[1])/2,angle=Math.atan2(-dz,dx);
    // Along the curve, local +Z faces the fountain road. Coping overlap closes
    // the small visible wedge at each fitted corner; the body stays on grass.
    b.box(width+.12,.70,.62,x,.35,z,materials.masonry,false,angle);
    b.box(width+.12,.10,.71,x,.745,z,materials.surround,false,angle);
    b.box(width+.12,1.30,.62,x,1.39,z,materials.masonry,false,angle);
    b.box(width+.12,.20,.68,x,1.99,z,materials.surround,false,angle);
    b.box(width+.20,.14,.83,x,2.17,z,materials.roof,true,angle);
    segments.push({a,b:end,x,z,width,angle});
    b.solids.push({x,y:1.045,z,w:width+.12,h:2.09,d:.62,angle});
  };
  for(let i=1;i<nanyuanFrontageWall.curve.length;i++)wall(nanyuanFrontageWall.curve[i-1],nanyuanFrontageWall.curve[i]);
  // Small masonry corner piers close the outside wedges where consecutive
  // straight sections turn, including the original east noticeboard's end.
  for(const [i,[x,z]] of nanyuanFrontageWall.curve.entries()){
    // The first join already has the original noticeboard coping: keep this
    // infill narrow so its outer corner cannot overhang the ring-road lane.
    const width=i===0?.50:.70,cap=i===0?.62:.84;
    b.box(width,2.09,width,x,1.045,z,materials.masonry,true);
    b.box(cap,.14,cap,x,2.17,z,materials.roof,true);
  }

  const [a,end]=nanyuanFrontageWall.south,dx=end[0]-a[0],dz=end[1]-a[1],length=Math.hypot(dx,dz),angle=Math.atan2(-dz,dx);
  const screenPlacement={x:(a[0]+end[0])/2,z:(a[1]+end[1])/2,angle};
  const display=createNanyuanElectronicDisplay(screenPlacement),half=display.layout.width/2;
  const at=(u:number):Point=>[screenPlacement.x+u*Math.cos(angle),screenPlacement.z-u*Math.sin(angle)];
  wall(a,at(-half));wall(at(half),end);
  // Move the display's already-transformed geometry into the same builder, so
  // all finished meshes remain direct children of the existing directory group.
  for(const child of display.group.children){const mesh=child as T.Mesh;if(Array.isArray(mesh.material))throw new Error('Electronic display material must be a single material');b.add(mesh.geometry,mesh.material);}
  b.solids.push(...display.solids);
  return{segments,screen:{...display.group.userData,...screenPlacement,width:display.layout.width,height:display.layout.height},southLength:length,
    source:'User 2026-10-09 property-centre screenshot and local screen photograph; mapped lawn boundary; fitted wall lengths and joins',
    preservedAccess:'Songlin path; fountain ring road; property centre east entrance; road past both wall ends'};
}
