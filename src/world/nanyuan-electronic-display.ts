import * as T from 'three';
import {Builder} from './geometry.ts';
import {createNanyuanDisplayArtwork,nanyuanWelcomeText,nanyuanPosterThemes} from './nanyuan-display-artwork.ts';

/** Geometry from the user's south-electronic-display-user.png, 2023 welcome
 * screen; displayed wording updated at the user's request for the 2026 intake.
 * The later north-gate screenshot locates its wall at the property
 * centre frontage; dimensions, obscured ends and poster composition remain
 * approximate. Calling without a placement still returns the local study. */
// Original independent-study dimensions, reused unchanged when placed. The
// photograph supplies aspect/proportion, not a surveyed 14.4m physical width.
export const electronicDisplayStudy = {
  width: 14.4,
  height: 3.55,
  depth: .48,
  screenWidth: 14.06,
  screenHeight: 1.62,
  screenY: 2.19,
  posterY: .78,
  posterHeight: 1.02,
  location: 'unverified',
  welcomeText: nanyuanWelcomeText,
} as const;

export type ElectronicDisplayPlacement={x:number;z:number;angle:number};

export function createNanyuanElectronicDisplay(placement?:ElectronicDisplayPlacement){
  const b=new Builder(),p=electronicDisplayStudy;
  const metal=new T.MeshStandardMaterial({name:'electronic-display-dark-frame',color:0x3a4143,roughness:.64,metalness:.34});
  const trim=new T.MeshStandardMaterial({name:'electronic-display-silver-trim',color:0x8a9292,roughness:.47,metalness:.58});
  const backing=new T.MeshStandardMaterial({name:'electronic-display-backing',color:0x797d7b,roughness:.91});
  const recess=new T.MeshStandardMaterial({name:'electronic-display-upper-recess',color:0x252c2e,roughness:.94});
  b.box(p.width,3.27,p.depth,0,1.635,0,backing,true);
  b.box(p.width+.24,.14,.8,0,3.48,0,metal,true);
  b.box(p.width+.12,.10,.63,0,.05,0,metal);
  b.box(p.width,.36,.05,0,3.22,.265,recess);
  for(const y of[3.05,3.37])b.box(p.width,.055,.065,0,y,.305,trim);
  for(let i=0;i<=12;i++)b.box(.05,.34,.065,-p.width/2+i*p.width/12,3.22,.305,trim);
  for(const side of[-1,1])b.box(.12,2.93,.10,side*(p.width/2-.06),1.535,.28,metal);
  b.box(p.width,.095,.10,0,1.30,.28,metal);
  b.box(p.width,.06,.09,0,.22,.28,trim);
  b.add(new T.PlaneGeometry(p.screenWidth,p.screenHeight),createNanyuanDisplayArtwork('screen'),0,p.screenY,.296);
  b.add(new T.PlaneGeometry(p.screenWidth,p.posterHeight),createNanyuanDisplayArtwork('posters'),0,p.posterY,.297);
  const group=b.finish(placement?'Nanyuan property frontage electronic display':'Nanyuan electronic display — unplaced reference study');
  // Bake world placement into each direct mesh child: world.ts uses a
  // nonrecursive camera raycast, and physics consumes world-space solids.
  if(placement){
    const {x,z,angle}=placement,cos=Math.cos(angle),sin=Math.sin(angle);
    const transform=new T.Matrix4().compose(new T.Vector3(x,0,z),new T.Quaternion().setFromEuler(new T.Euler(0,angle,0)),new T.Vector3(1,1,1));
    for(const child of group.children){const mesh=child as T.Mesh;mesh.geometry.applyMatrix4(transform);mesh.geometry.computeBoundingSphere();}
    for(const solid of b.solids){const localX=solid.x,localZ=solid.z;solid.x=x+localX*cos+localZ*sin;solid.z=z-localX*sin+localZ*cos;solid.angle=(solid.angle??0)+angle;}
  }
  group.userData={
    source:'User south-electronic-display-user.png and screen-posters.png 2026-10-10; original images kept local',
    placement:placement?'property centre south frontage; fitted from user north-gate screenshot':'unverified; not in the campus world',
    ...(placement?{transform:placement}:{}),dimensions:'approximate',
    posterCount:nanyuanPosterThemes.length,posterContent:'Original readable campus activity themes, not a transcription or current event notices; no QR codes',posterThemes:nanyuanPosterThemes.map(p=>p.title),
    screenText:electronicDisplayStudy.welcomeText,referenceYear:2023,
    referenceScreenText:'热烈欢迎南京大学2023级新生',
    screenContent:'User-corrected welcome wording, without 热烈 and with 2026 intake; hand-drawn deer mascots at both ends; geometry retained',
  };
  return{group,solids:b.solids,cameraSolids:group.children,layout:p};
}
