import * as T from 'three';
import {Builder} from './geometry.ts';
import {terrainSurface} from './courtyard-terrain.ts';
import {createModelTrees} from './model-trees.ts';
import type {MapPolygon} from './campus-map.ts';
import type {Materials} from './materials.ts';
import type {TreeSpot} from './vegetation.ts';

// Official gl-4-10 b: a rectangular, pale-edged lawn in grey brick paving.
// gl-4-09 f/l/r: two beds flanking the east door and whitewashed trees.
// Metre dimensions and tree registration are approximate, not a survey.
export function tianCourtyardLayout() {
  const north=(u:number,v:number)=>[-304.437-u*.996957+v*.077943,-73.594-u*.077943-v*.996957];
  const east=(u:number,v:number)=>[-284.672+u*.142591+v*.989782,-57.0425-u*.989782+v*.142591];
  const rect=(point:typeof north,u:number,v:number,w:number,d:number):MapPolygon=>({points:[[u,v],[u+w,v],[u+w,v+d],[u,v+d]].map(([x,z])=>point(x,z))});
  const outlines=[rect(north,-20,.18,40,23),rect(east,-13.5,.18,23,6.1)];
  const beds:MapPolygon[]=[rect(north,-7,8,14,8),
    {points:[[-13,.8],[-9.9,.8],[-9.9,4.1],[-10.8,5.2],[-13,5.2]].map(([u,v])=>east(u,v))},
    {points:[[-5.6,.9],[7.5,.9],[7.5,5.1],[-4.7,5.1],[-5.6,4.1]].map(([u,v])=>east(u,v))},
  ];
  const trees:TreeSpot[]=[[-11.4,3,11.5],[1.3,3.7,12.2]].map(([u,v,height])=>{const[x,z]=east(u,v);return{x,z,height,baseY:.052,whitewash:true};});
  return {outlines,beds,trees};
}

function courtyardPaving(mats:Materials) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#777c70';ctx.fillRect(0,0,256,256);
  // Alternate horizontal/vertical pairs, as visible around the north lawn.
  for(let row=0;row<4;row++)for(let col=0;col<4;col++)for(let k=0;k<2;k++){
    const horizontal=(row+col)%2===0,x=col*64+(horizontal?0:k*32),y=row*64+(horizontal?k*32:0);
    const shade=149+(row*3+col*5+k*2)%14;ctx.fillStyle=`rgb(${shade},${shade+1},${shade-8})`;
    ctx.fillRect(x+1.5,y+1.5,horizontal?61:29,horizontal?29:61);
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
  return new T.MeshStandardMaterial({name:'tian courtyard grey brick paving',map,bumpMap:mats.textures.get('stone-grain.webp'),bumpScale:.01,roughness:.96});
}

export async function createTianCourtyard(layout:ReturnType<typeof tianCourtyardLayout>,mats:Materials) {
  const group=new T.Group();group.name='tian courtyard';
  const b=new Builder(),paving=courtyardPaving(mats),edge=mats.stone.clone();edge.name='tian courtyard pale lawn edging';edge.color.set(0xc5c8bc);
  for(const[index,outline]of layout.outlines.entries()){
    const holes=(index===0?layout.beds.slice(0,1):layout.beds.slice(1)).map(bed=>bed.points);
    const floor=terrainSurface({...outline,holes},.036),uv=floor.getAttribute('uv'),position=floor.getAttribute('position');
    for(let i=0;i<position.count;i++)uv.setXY(i,(position.getX(i)+304)/2.4,(position.getZ(i)+73)/2.4);
    b.add(floor,paving);
  }
  for(const bed of layout.beds){
    b.add(terrainSurface(bed,.052),mats.grass);
    for(let i=0;i<bed.points.length;i++){
      const a=bed.points[i],c=bed.points[(i+1)%bed.points.length];
      b.box(.11,.11,Math.hypot(c[0]-a[0],c[1]-a[1]),(a[0]+c[0])/2,.073,(a[1]+c[1])/2,edge,false,Math.atan2(c[0]-a[0],c[1]-a[1]));
    }
  }
  const surfaces=b.finish('tian courtyard surfaces');surfaces.children.forEach(o=>o.castShadow=false);group.add(surfaces);
  const trees=await createModelTrees(layout.trees,'far',mats.leaves);group.add(trees.group);
  group.userData={...layout,source:'official VR gl-4-10 b and gl-4-09 f/l/r',approximate:true,sculptures:'not modelled; detailed geometry unverified',surfaceMeshes:surfaces.children.length};
  return {group,solids:trees.solids,updateVisibility:trees.updateVisibility};
}
