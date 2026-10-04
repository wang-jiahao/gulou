import * as T from 'three';
import {Builder} from './geometry.ts';
import {planShape,type MapFeature} from './campus-map.ts';
import {pitchPoint,type Pitch} from './football-pitch.ts';

/** Eight lanes and the south jump apron visible in official VR scene_gl-3.
 * Radii/widths fit the registered plan; they are not a measured 400 m track. */
export function createRunningTrack(feature:MapFeature,pitch:Pitch){
  const b=new Builder(),north=-40.8,south=43.2,inner=33.6,laneWidth=1.2;
  const material=(name:string,color:number,depth:number)=>new T.MeshStandardMaterial({name,color,roughness:.97,polygonOffset:true,polygonOffsetFactor:-depth,polygonOffsetUnits:-depth});
  const apron=material('Suzhe red semicircle apron',0x97645c,2),rubber=material('Suzhe eight lane rubber track',0xa36760,2),paint=material('Suzhe running track paint',0xe0d8ca,3),sand=material('Suzhe long jump sand',0xc9b78a,3),edge=material('Suzhe sandpit flat edging',0xb7afa1,3);
  const p=(u:number,v:number)=>pitchPoint(pitch,u,.054-pitch.groundY,v);
  const box=(u:number,v:number,w:number,d:number,mat:T.Material,y=.056)=>{const q=p(u,v);b.box(w,.004,d,q.x,y,q.z,mat,false,pitch.angle);};
  // Cut out the actual turf footprint instead of the skewed schematic hole.
  // Overlapping shallow surfaces lose depth precision in aerial/oblique views.
  const turfHole=[[-1,-1],[-1,1],[1,1],[1,-1]].map(([u,v])=>{
    const q=p(u*(pitch.width/2+2),v*(pitch.length/2+2));return [q.x,q.z];
  });
  b.add(new T.ShapeGeometry(planShape({points:feature.points,holes:[turfHole]})).rotateX(-Math.PI/2),apron,0,.045,0);
  const arc=(radius:number,width:number,center:number,start:number,mat:T.Material)=>{
    const vertices:number[]=[],uv:number[]=[],indices:number[]=[],steps=128;
    for(let i=0;i<=steps;i++)for(const r of [radius-width/2,radius+width/2]){
      const a=start+i*Math.PI/steps,q=p(Math.cos(a)*r,center+Math.sin(a)*r);vertices.push(q.x,q.y,q.z);uv.push(i/steps,r);
    }
    for(let i=0;i<steps;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();b.add(geo,mat);
  };
  const band=(r:number,width:number,mat:T.Material)=>{
    arc(r,width,north,Math.PI,mat);arc(r,width,south,0,mat);
    for(const side of [-1,1])box(side*r,(north+south)/2,width,south-north,mat);
  };
  band(inner+4*laneWidth,8*laneWidth,rubber);
  for(let lane=0;lane<=8;lane++)band(inner+lane*laneWidth,.065,paint);
  // The west sprint straight continues into the broad red apron at both ends.
  for(let lane=0;lane<=8;lane++){
    const u=-inner-lane*laneWidth;
    box(u,(-68+north)/2,.065,north+68,paint);
    box(u,(south+71)/2,.065,71-south,paint);
  }
  box(-inner-4*laneWidth,43,8*laneWidth,.065,paint);
  // In the south-facing panorama the pit is image-left: geographically east.
  // Two horizontal runways share a pit; the takeoff boards are staggered.
  box(23.1,55.4,8.7,5.35,edge,.059);box(23.1,55.4,8.25,4.9,sand,.063);
  for(const v of [53.2,55.4,57.6])box(-3.4,v,45,.06,paint,.061);
  for(const [u,v] of [[14.6,54.3],[5.6,56.5]]){
    box(u,v,.22,2.14,paint,.065);
    box(u+.45,v,.1,2.14,edge,.065);
  }
  const group=b.finish('Suzhe running track and south long jump apron');
  for(const mesh of group.children)if(mesh instanceof T.Mesh)mesh.castShadow=false;
  group.userData={source:'NJU official VR scene_gl-3 north/south aerial; 2024 campus plan',lanes:8,dimensions:'approximate fit to registered campus plan, not surveyed track dimensions',north,south,inner,laneWidth};
  return group;
}
