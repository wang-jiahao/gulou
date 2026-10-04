import * as T from 'three';
import {Builder} from './geometry.ts';
import type {Materials} from './materials.ts';

// Official VR gl-4-05 b/l/r: an open vehicle entrance, folded silver gate,
// pale tiled wall, convex mirror and a parking-sign pier. The plan locates the
// courtyard; all furniture positions and dimensions below are approximate.
export function createTangCourtyardAccess(mats:Materials) {
  const b=new Builder();
  const tile=document.createElement('canvas');tile.width=tile.height=128;
  const ctx=tile.getContext('2d')!;ctx.fillStyle='#d4d3c2';ctx.fillRect(0,0,128,128);
  ctx.strokeStyle='#9d9e90';ctx.lineWidth=1;
  for(let i=0;i<=128;i+=32){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,128);ctx.moveTo(0,i);ctx.lineTo(128,i);ctx.stroke();}
  const tileMap=new T.CanvasTexture(tile);tileMap.colorSpace=T.SRGBColorSpace;tileMap.wrapS=tileMap.wrapT=T.RepeatWrapping;tileMap.anisotropy=4;
  const pale=new T.MeshStandardMaterial({name:'tang yard pale square tiles',map:tileMap,roughness:.94});
  const silver=new T.MeshStandardMaterial({name:'tang folded gate silver',color:0xb6bcb7,metalness:.58,roughness:.42});
  const dark=new T.MeshStandardMaterial({name:'tang gate dark inset',color:0x304742,roughness:.6});
  const orange=new T.MeshStandardMaterial({name:'tang convex mirror rim',color:0xb97832,metalness:.15,roughness:.55});
  // The boundary stands inside the forecourt, west of the public street.
  // Its open span stays open: no invisible barrier across the driveway.
  b.box(.34,2.25,15.3,-386.3,1.125,-73.35,pale,true,0,1.3);
  b.box(.72,2.45,.78,-386.3,1.225,-51,pale,true,0,1.3);
  b.box(.40,.09,15.36,-386.3,2.295,-73.35,mats.stone);
  b.box(.79,.09,.85,-386.3,2.495,-51,mats.stone);

  const x=-387.0,z=-65.05;
  for(let i=0;i<7;i++){
    const zz=z-.55+i*.155;
    for(const side of[-1,1]){
      b.cylinder(new T.Vector3(x+side*.3,.35,zz),new T.Vector3(x+side*.3,1.94,zz),.025,.025,silver,6);
      b.cylinder(new T.Vector3(x+side*.3,.35,zz),new T.Vector3(x+side*.37,.14,zz+.09),.025,.025,silver,6);
      if(i<6){
        b.cylinder(new T.Vector3(x+side*.3,.55,zz),new T.Vector3(x+side*.3,1.64,zz+.155),.019,.019,silver,6);
        b.cylinder(new T.Vector3(x+side*.3,1.64,zz),new T.Vector3(x+side*.3,.55,zz+.155),.019,.019,silver,6);
      }
    }
    b.cylinder(new T.Vector3(x-.3,1.94,zz),new T.Vector3(x+.3,1.94,zz),.025,.025,silver,6);
    b.cylinder(new T.Vector3(x-.35,.12,zz),new T.Vector3(x+.35,.12,zz),.10,.10,mats.metal,8);
  }
  b.box(.66,1.56,.22,x,1.10,-64.42,silver);
  b.box(.54,.95,.023,x,1.00,-64.297,pale);
  b.box(.40,.16,.024,x,1.73,-64.292,dark);
  b.cylinder(new T.Vector3(x,1.19,-64.289),new T.Vector3(x,1.19,-64.273),.095,.095,dark,16);
  b.solids.push({x,y:1,z,w:.78,h:2,d:1.48});

  // Static metal dome, not a live reflection render target.
  const mirrorX=-386.78,mirrorZ=-65.85,mirrorY=2.59;
  b.cylinder(new T.Vector3(-386.45,1.9,mirrorZ),new T.Vector3(-386.45,mirrorY,mirrorZ),.028,.028,silver,8);
  b.cylinder(new T.Vector3(-386.45,mirrorY,mirrorZ),new T.Vector3(mirrorX,mirrorY,mirrorZ),.028,.028,silver,8);
  const reflective=new T.MeshStandardMaterial({name:'tang static convex mirror',color:0xb5c4ab,metalness:.82,roughness:.25});
  const dome=new T.SphereGeometry(.43,20,10,0,Math.PI*2,0,Math.PI/2);dome.scale(1,.20,1);
  b.add(dome,reflective,mirrorX,mirrorY,mirrorZ,new T.Euler(0,0,Math.PI/2));
  b.add(new T.TorusGeometry(.43,.025,6,28),orange,mirrorX+.004,mirrorY,mirrorZ,new T.Euler(0,Math.PI/2,0));

  const sign=document.createElement('canvas');sign.width=sign.height=128;
  const sc=sign.getContext('2d')!;sc.fillStyle='#24548c';sc.fillRect(0,0,128,128);sc.strokeStyle='#f1f2de';sc.lineWidth=4;sc.strokeRect(3,3,122,122);
  sc.fillStyle='#f1f2de';sc.font='bold 104px sans-serif';sc.textAlign='center';sc.textBaseline='middle';sc.fillText('P',64,69);
  const signMap=new T.CanvasTexture(sign);signMap.colorSpace=T.SRGBColorSpace;
  const signMat=new T.MeshStandardMaterial({name:'tang yard parking P',map:signMap,roughness:.8,side:T.DoubleSide});
  b.box(.06,.85,.85,-386.3,2.96,-51,mats.metal);
  for(const side of[-1,1])b.add(new T.PlaneGeometry(.82,.82),signMat,-386.3+side*.033,2.96,-51,new T.Euler(0,side*Math.PI/2,0));
  const group=b.finish('tang courtyard open street entrance');
  group.userData={approximate:true,source:'official VR gl-4-05 b/l/r; user campus plan',openZ:[-63.7,-51.5],staticMirror:true,foldedGate:true,solids:b.solids};
  return{group,solids:b.solids,cameraSolids:group.children as T.Mesh[]};
}
