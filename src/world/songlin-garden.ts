import * as T from 'three';
import {Builder} from './geometry.ts';
import {collisionMesh} from './collision-mesh.ts';
import type {Materials} from './materials.ts';

export const songlinGarden = {x:-70,z:420,radius:2.55,path:{minX:-83.5,maxX:-70,minZ:420.125,maxZ:421.475}};
export const songlinPathOpening = {...songlinGarden.path,minZ:419.925,maxZ:421.675};

/** Stone furniture and a short garden path seen in gl-1-03. The compact layout
 * fits checked model clearance; these coordinates and dimensions are estimates. */
export function createSonglinGarden(mats:Materials){
  const {x,z,radius,path}=songlinGarden,b=new Builder();
  const paving=mats.path.clone();paving.polygonOffset=true;paving.polygonOffsetFactor=-2;paving.polygonOffsetUnits=-2;
  // The apron covers the path's short overlap without coplanar flicker.
  const gravel=new T.MeshStandardMaterial({name:'paving',color:0xb3b09b,map:mats.textures.get('stone-grain.webp'),roughness:.96,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const stone=new T.MeshStandardMaterial({name:'garden-carved-stone',color:0xbfc0b5,map:mats.textures.get('stone-grain.webp'),roughness:.92});
  const pad=new T.CircleGeometry(radius,48).rotateX(-Math.PI/2),uv=pad.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*8,uv.getY(i)*8);
  const support=new T.Mesh(pad.clone());support.position.set(x,.04,z);
  b.add(pad,gravel,x,.04,z);b.box(path.maxX-path.minX,.04,path.maxZ-path.minZ,(path.minX+path.maxX)/2,.02,(path.minZ+path.maxZ)/2,paving,true);
  b.box(1.40,.11,1.40,x,.815,z,stone);b.box(1.28,.07,1.28,x,.725,z,stone);
  for(const dx of[-.43,.43])for(const dz of[-.43,.43]){
    b.cylinder(new T.Vector3(x+dx,.04,z+dz),new T.Vector3(x+dx,.71,z+dz),.14,.105,stone,12);
    b.box(.30,.065,.30,x+dx,.0775,z+dz,stone);
  }
  b.solids.push({x,y:.455,z,w:1.40,h:.83,d:1.40});
  const seats=Array.from({length:4},(_,i)=>{
    const a=i*Math.PI/2,sx=x+Math.sin(a)*1.35,sz=z+Math.cos(a)*1.35;
    const profile=[[.22,0],[.26,.035],[.23,.10],[.21,.32],[.26,.44],[.28,.49],[.26,.52]].map(([r,y])=>new T.Vector2(r,y));
    b.add(new T.LatheGeometry(profile,20),stone,sx,.04,sz);
    b.add(new T.CircleGeometry(.26,20).rotateX(-Math.PI/2),stone,sx,.56,sz);
    b.solids.push({x:sx,y:.30,z:sz,w:.56,h:.52,d:.56});
    return {id:`songlin-${i}`,x:sx,z:sz,y:.04,height:.56,yaw:a,exit:{x:x+Math.sin(a)*2.55,z:z+Math.cos(a)*2.55}};
  });
  const group=b.finish('Songlin stone table and seats');group.userData.layout={...songlinGarden,seats};group.userData.source='official VR gl-1-03; compact approximate layout fitted west of plan-86';
  for(const mesh of group.children)if(mesh instanceof T.Mesh&&(mesh.material as T.Material).name==='paving')mesh.castShadow=false;
  const nearby=(position:{x:number;y:number;z:number})=>position.y>-.2&&position.y<.3?seats.filter(s=>Math.hypot(s.x-position.x,s.z-position.z)<1.15).sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z))[0]:undefined;
  return{group,solids:b.solids,fixedMeshes:[collisionMesh(support,true)],seats,nearby,arrival:{name:'松林休憩点',x:-73,z:420.8,yaw:-Math.PI/2}};
}
