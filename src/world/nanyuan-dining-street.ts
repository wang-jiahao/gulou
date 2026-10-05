import * as T from 'three';
import {Builder} from './geometry.ts';
import {terrainSurface} from './courtyard-terrain.ts';
import {collisionMesh} from './collision-mesh.ts';
import {diningForecourtLayout} from './nanyuan-dining-forecourt.ts';
import type {Materials} from './materials.ts';

// gl-1-10 b: a narrow brick margin, low grey curb and rectangular road drain.
// The existing mapped lane stays in place. Widths, elevations and drain
// positions are fitted to the photograph, not surveyed measurements.
export function diningStreetLayout() {
  const {point}=diningForecourtLayout();
  const strip=(inner:number,outer:number)=>({points:[[-21,inner],[28,inner],[28,outer],[-21,outer]].map(([s,t])=>point(s,t))});
  return {point,strip,outline:strip(12.4,20.25),drains:[-6,18],curbTop:.085,roadTop:.035};
}

export function createDiningStreet(layout:ReturnType<typeof diningStreetLayout>,mats:Materials,asphalt:T.Material) {
  const group=new T.Group();group.name='nanyuan dining east street';
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#73796e';ctx.fillRect(0,0,256,256);
  for(let row=0;row<8;row++)for(let col=-1;col<5;col++){
    const v=137+(row*5+col*7)%12;ctx.fillStyle=`rgb(${v},${v+3},${v-8})`;
    ctx.fillRect(col*64+(row%2)*32+1,row*32+1,62,30);
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
  const brick=new T.MeshStandardMaterial({name:'dining street narrow brick margin',map,roughness:.97});
  const curb=mats.stone.clone();curb.name='dining street low grey curb';curb.color.set(0x90938a);
  const iron=new T.MeshStandardMaterial({name:'dining street weathered drain iron',color:0x555e50,roughness:.88,metalness:.25});
  const recess=new T.MeshStandardMaterial({name:'dining street shallow drain recess',color:0x20291f,roughness:1});
  const surfaces=new Builder(),detail=new Builder(),angle=Math.atan2(.999888581908653,-.014927282696553662);
  const surface=(a:number,b:number,y:number,material:T.Material,slope=0)=>{
    const g=terrainSurface(layout.strip(a,b),y),pos=g.getAttribute('position'),uv=g.getAttribute('uv');
    if(material===brick)for(let i=0;i<pos.count;i++){
      const dx=pos.getX(i)+53.77,dz=pos.getZ(i)-581.1945;
      const s=dx*(-.014927282696553662)-dz*.999888581908653,t=dx*.999888581908653+dz*(-.014927282696553662);
      pos.setY(i,y+(t-a)*slope);uv.setXY(i,s/1.6,t/1.6);
    }
    g.computeVertexNormals();surfaces.add(g,material);
  };
  // Match the mapped lane's material, elevation and world UVs at every join.
  surface(14.05,20.25,layout.roadTop,asphalt);
  surface(12.4,13.5,layout.roadTop,brick,(layout.curbTop-layout.roadTop)/1.1);
  surface(13.7,14.05,layout.roadTop,curb);
  const box=(builder:Builder,s:number,t:number,y:number,w:number,h:number,d:number,material:T.Material)=>{
    const[x,z]=layout.point(s,t);builder.box(w,h,d,x,y,z,material,false,angle);
  };
  // A five-centimetre lip, not a stair or a raised pedestrian platform.
  box(surfaces,3.5,13.6,.06,49,.05,.2,curb);
  for(let s=-20.5;s<28;s+=1)box(detail,s,13.6,.086,.012,.002,.2,iron);
  for(const s of layout.drains){
    box(detail,s,14.12,.038,.72,.006,.43,recess);
    for(const edge of [-1,1]){
      box(detail,s+edge*.37,14.12,.043,.035,.01,.48,iron);
      box(detail,s,14.12+edge*.225,.043,.74,.01,.03,iron);
    }
    for(let j=-4;j<=4;j++)box(detail,s+j*.075,14.12,.043,.025,.01,.42,iron);
  }
  const support=surfaces.finish('dining street continuous ground'),details=detail.finish('dining street curb joints and grates');
  for(const mesh of [...support.children,...details.children])mesh.castShadow=false;
  group.add(support,details);
  const fixedMeshes=support.children.map(o=>collisionMesh(o as T.Mesh,false));
  const cameraSolids=[...support.children];
  group.userData={source:'official VR gl-1-10 b; existing mapped east lane',approximate:true,outline:layout.outline,drains:layout.drains,curbTop:layout.curbTop,roadTop:layout.roadTop,fixedMeshCount:fixedMeshes.length,surfaceMeshes:support.children.length+details.children.length};
  return {group,fixedMeshes,cameraSolids};
}
