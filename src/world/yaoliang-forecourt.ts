import * as T from 'three';
import {Builder} from './geometry.ts';
import {terrainSurface} from './courtyard-terrain.ts';
import {collisionMesh} from './collision-mesh.ts';
import {createModelTrees} from './model-trees.ts';
import type {Materials} from './materials.ts';
import type {TreeSpot} from './vegetation.ts';

// Official gl110 f/l: whitewashed mature trees in square soil openings,
// grey rectangular paving and a low curb. Tree count, positions and metre
// dimensions are fitted estimates; the exact species is not established.
export function yaoliangForecourtLayout() {
  const frame={x:-27.2055,z:589.6005,nx:-.9998348152668304,nz:.01817531788837474};
  const {x,z,nx,nz}=frame,point=(u:number,v:number)=>[x+u*nz+v*nx,z-u*nx+v*nz];
  // Meet the existing dining lane's east edge exactly, despite the two
  // building frontages having slightly different bearings.
  const edgeV=(u:number)=>{
    const [px,pz]=point(u,0),dx=.999888581908653,dz=-.014927282696553662;
    return (20.25-(px+53.77)*dx-(pz-581.1945)*dz)/(nx*dx+nz*dz);
  };
  const beds=[{u:-10.9,v:4.1,size:1.8,height:16.8},{u:1.4,v:4.1,size:1.8,height:18},{u:10.8,v:4.1,size:1.8,height:17.2}];
  const ring=(u:number,v:number,w:number,d:number)=>[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b])=>point(u+a,v+b));
  const outline={points:[point(-14,.35),point(14,.35),point(14,edgeV(14)),point(-14,edgeV(-14))]};
  const paving={points:[point(-14,.35),point(14,.35),point(14,edgeV(14)-.2),point(-14,edgeV(-14)-.2)],holes:beds.map(b=>ring(b.u,b.v,b.size,b.size))};
  const curb={points:[point(-14,edgeV(-14)-.2),point(14,edgeV(14)-.2),point(14,edgeV(14)),point(-14,edgeV(-14))]};
  const trees:TreeSpot[]=beds.map(b=>{const[px,pz]=point(b.u,b.v);return{x:px,z:pz,height:b.height,baseY:.065,kind:'broad',whitewash:true};});
  return {frame,point,edgeV,ring,beds,outline,paving,curb,trees,walkTop:.085,soilTop:.065};
}

export async function createYaoliangForecourt(layout:ReturnType<typeof yaoliangForecourtLayout>,mats:Materials) {
  const group=new T.Group();group.name='yaoliang hall street forecourt';
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#777e75';ctx.fillRect(0,0,256,256);
  for(let row=0;row<8;row++)for(let col=-1;col<5;col++){
    const value=151+((row*7+col*13+17)%17);ctx.fillStyle=`rgb(${value},${value+3},${value-5})`;
    ctx.fillRect(col*64+(row%2)*32+1,row*32+1,62,30);
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
  const brick=new T.MeshStandardMaterial({name:'yaoliang grey rectangular paving',map,roughness:.96});
  const stone=mats.stone.clone();stone.name='yaoliang low stone curb';stone.color.set(0x929a8e);
  const soil=new T.MeshStandardMaterial({name:'yaoliang open tree soil',color:0x666c48,roughness:1});
  const iron=new T.MeshStandardMaterial({name:'yaoliang paving panel joints',color:0x667063,roughness:.88,metalness:.15});
  const paving=new Builder(),details=new Builder();
  const surface=terrainSurface(layout.paving,layout.walkTop),uv=surface.getAttribute('uv'),pos=surface.getAttribute('position');
  const {x,z,nx,nz}=layout.frame;
  for(let i=0;i<pos.count;i++){
    const dx=pos.getX(i)-x,dz=pos.getZ(i)-z;
    uv.setXY(i,(dx*nz-dz*nx)/2,(dx*nx+dz*nz)/2);
  }
  paving.add(surface,brick);
  for(const bed of layout.beds)paving.add(terrainSurface({points:layout.ring(bed.u,bed.v,bed.size,bed.size)},layout.soilTop),soil);
  const curbShape=new T.Shape();layout.curb.points.forEach(([px,pz],i)=>i?curbShape.lineTo(px,-pz):curbShape.moveTo(px,-pz));curbShape.closePath();
  paving.add(new T.ExtrudeGeometry(curbShape,{depth:.05,bevelEnabled:false,steps:1}).rotateX(-Math.PI/2).translate(0,.035,0),stone);
  const yaw=Math.atan2(nx,nz);
  const box=(u:number,v:number,w:number,d:number,material:T.Material,lift=0)=>{const[px,pz]=layout.point(u,v);details.box(w,.004,d,px,layout.walkTop+.003+lift,pz,material,false,yaw);};
  for(let u=-13.5;u<14;u++)box(u,layout.edgeV(u)-.1,.012,.19,iron);
  // Flush square service covers are visible in the paving. Their embossed
  // lettering is not legible here, so no university emblem is invented.
  for(const u of [-4.6,6]){
    box(u,3.5,.72,.72,iron);box(u,3.5,.68,.68,stone,.004);
    for(const side of[-1,1])box(u+side*.23,3.5,.08,.022,iron,.008);
  }
  const ground=paving.finish('yaoliang paving soil and curb');group.add(ground,details.finish('yaoliang flush paving details'));
  const cameraSolids=[...ground.children],fixedMeshes=ground.children.map(o=>collisionMesh(o as T.Mesh));
  const trees=await createModelTrees(layout.trees,'far',mats.leaves);group.add(trees.group);
  const proxyMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  for(const s of trees.solids){const proxy=new T.Mesh(new T.BoxGeometry(s.w,s.h,s.d),proxyMaterial);proxy.position.set(s.x,s.y,s.z);proxy.updateMatrixWorld();cameraSolids.push(proxy);}
  group.userData={source:'official VR gl110 f/l',approximate:true,frame:layout.frame,beds:layout.beds,trees:layout.trees,walkTop:layout.walkTop,soilTop:layout.soilTop,outline:layout.outline,solidCount:trees.solids.length,fixedMeshCount:fixedMeshes.length};
  return {group,solids:trees.solids,fixedMeshes,cameraSolids,updateVisibility:trees.updateVisibility};
}
