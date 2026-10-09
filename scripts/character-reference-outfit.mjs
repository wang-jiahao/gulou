import * as T from 'three';
import sharp from 'sharp';
import {splitStudentClothing} from './character-clothing.mjs';
import {garmentBoundaryBand} from './character-tailoring.mjs';
import {recomputeCharacterNormals} from './character-surface.mjs';

// User reference: open navy collar jacket / sage V-neck knit. These are cut
// surfaces with an independent white undershirt, not painted openings.
export function buildReferenceOutfit({female,geometry,hipY,neckY,hemY,collarY,makeSkinned,shirt,tee,trim}) {
 const primary=new T.Color(female?0x899682:0x253549);
 shirt.color.copy(primary);tee.color.set(0xf0eee6);trim.color.copy(primary).multiplyScalar(.87);
 const rib=new T.MeshStandardMaterial({name:'student-rib-knit',color:primary,roughness:.95});
 const openingWidth=y=>.047+.017*T.MathUtils.smoothstep(y,hipY+.24,neckY-.02)+.012*(1-T.MathUtils.smoothstep(y,hemY,hemY+.14));
 const opening=([x,y,z])=>Math.min(z-.037,female?y-(neckY-.171+Math.abs(x)*1.67):openingWidth(y)-Math.abs(x));
 const keep=g=>splitStudentClothing(g,opening).primary;
 const shell=keep(geometry);makeSkinned(shell,shirt,female?'V neck knitted sweater':'open front navy jacket','jacket');
 // A closed inner shell makes the front cut opaque from both side angles.
 const lining=shell.clone(),lp=lining.getAttribute('position'),ln=lining.getAttribute('normal');
 for(let i=0;i<lp.count;i++)lp.setXYZ(i,lp.getX(i)-ln.getX(i)*.0022,lp.getY(i)-ln.getY(i)*.0022,lp.getZ(i)-ln.getZ(i)*.0022);
 lining.setIndex(Array.from({length:lp.count},(_,i)=>i-i%3+[0,2,1][i%3]));recomputeCharacterNormals(lining);
 makeSkinned(lining,shirt,'cloth opening inner lining','jacket');
 const under=splitStudentClothing(geometry,([x,y,z])=>Math.max(Math.abs(x)-.126,.033-z)).primary;
 const up=under.getAttribute('position');for(let i=0;i<up.count;i++)up.setZ(i,up.getZ(i)-.006);
 makeSkinned(under,tee,'white layered undershirt','jacket');
 makeSkinned(garmentBoundaryBand(geometry,collarY,.006,.002,.003),tee,'white crewneck binding','jacket');
 const hem=garmentBoundaryBand(geometry,hemY,-.028,.002,.002,p=>Math.abs(p.x)<.28);
 makeSkinned(keep(hem),rib,'split lower rib hem','torso');
 const surface=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster();
 const project=(x,y,extra=.003)=>{ray.set(new T.Vector3(x,y,.6),new T.Vector3(0,0,-1));const hit=ray.intersectObject(surface,false)[0];if(!hit)throw Error(`Reference trim has no garment support at ${x}, ${y}`);return new T.Vector3(x,y,hit.point.z+extra);};
 const ribbon=(rows,material,name,force='jacket')=>{
   const ps=[],uv=[],ids=[];
   for(let i=0;i<rows.length;i++){for(let k=0;k<2;k++){ps.push(...rows[i][k].toArray());uv.push(k,i/(rows.length-1));}if(i){const j=(i-1)*2;ids.push(j,j+1,j+2,j+1,j+3,j+2);}}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();
   // All front-facing strips share the same winding regardless of side.
   const normals=g.getAttribute('normal');if(normals.getZ(0)<0){for(let i=0;i<ids.length;i+=3)[ids[i+1],ids[i+2]]=[ids[i+2],ids[i+1]];g.setIndex(ids);g.computeVertexNormals();}
   makeSkinned(g,material,name,force);return g;
 };
 for(const sign of [-1,1]){
  if(female){
   const rows=[];for(let i=0;i<=36;i++){const t=i/36,x=sign*t*.087,y=neckY-.171+Math.abs(x)*1.67;rows.push([project(x,y),project(x+sign*.010,y-.009)]);}
   ribbon(rows,rib,'knitted V neckline');
  }else{
   const rows=[];for(let i=0;i<=50;i++){const y=T.MathUtils.lerp(hemY+.004,collarY-.029,i/50),x=sign*openingWidth(y);rows.push([project(x,y),project(x+sign*.008,y)]);}
   ribbon(rows,trim,'open zipper tape');
   // Downturned collar: curved shoulder base, raised fold and pointed tip.
   const rowsCollar=[];for(let i=0;i<=24;i++){
    const t=i/24,baseX=sign*T.MathUtils.lerp(.070,.141,t),baseY=collarY-.030-.030*t;
    const outerX=sign*T.MathUtils.lerp(.071,.155,t),outerY=collarY-.058-.052*Math.sin(Math.PI*t)-.015*t;
    rowsCollar.push([project(baseX,baseY,.010),project(outerX,outerY,.008+.010*Math.sin(Math.PI*t))]);
   }
   const collar=ribbon(rowsCollar,shirt,'downturned shirt collar','Spine2');
   const back=collar.clone();back.setIndex(Array.from(collar.index.array).reduce((a,v,i,src)=>{if(i%3===0)a.push(src[i],src[i+2],src[i+1]);return a;},[]));back.computeVertexNormals();makeSkinned(back,shirt,'collar underside','Spine2');
  }
 }
 return {rib,opening,report:{design:female?'sage V-neck knit, white layer, light straight denim':'navy open collar jacket, white tee, grey cargo trousers',outerTriangles:shell.getAttribute('position').count/3}};
}

export function addReferenceTrouserDetails({female,geometry,hipY,positions,makeSkinned,pants}) {
 const surface=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster();
 const ps=[],uv=[],ids=[];
 const addPatch=(sign,yTop,yBottom,angleCenter,halfAngle,bulge)=>{
  const start=ps.length/3,nx=10,ny=12;
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
   const u=i/nx,v=j/ny,y=T.MathUtils.lerp(yTop,yBottom,v),angle=angleCenter+(u-.5)*halfAngle*2;
   const side=sign>0?'Left':'Right',hip=positions[side+'UpLeg'],knee=positions[side+'Leg'];const centre=hip.clone().lerp(knee,T.MathUtils.clamp((hip.y-y)/(hip.y-knee.y),0,1));centre.y=y;
   const dir=new T.Vector3(sign*Math.cos(angle),0,Math.sin(angle));ray.set(centre.clone().addScaledVector(dir,.3),dir.clone().negate());const hit=ray.intersectObject(surface,false)[0];if(!hit)throw Error('Trouser pocket has no surface');
   const p=hit.point.clone().addScaledVector(dir,.002+bulge*Math.sin(Math.PI*u)*Math.sin(Math.PI*v));ps.push(...p.toArray());uv.push(u,v);
   if(i<nx&&j<ny){const a=start+j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;if(sign>0)ids.push(a,c,b,b,c,d);else ids.push(a,b,c,b,d,c);}
  }
 };
 for(const sign of [-1,1]){
  if(!female){addPatch(sign,hipY-.23,hipY-.40,.24,.68,.008);addPatch(sign,hipY-.22,hipY-.263,.24,.72,.012);}
 }
 if(ps.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();makeSkinned(g,pants,'gusset cargo pockets and folded flaps','trousers');}
}

// Monochrome original fabric relief, with no baked lighting or color tint.
export async function attachReferenceFabric(doc,{female}) {
 const size=256,data=new Uint8Array(size*size*3),denim=new Uint8Array(size*size*3);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*3,nx=Math.sin(x*Math.PI/4)*.17,ny=Math.sin(y*Math.PI/6+x*Math.PI/4)*.10;
  data.set([128+Math.round(nx*127),128+Math.round(ny*127),250],i);
  const f=Math.sin((x+y)*Math.PI/3)*.13;denim.set([128+Math.round(f*127),128+Math.round(f*127),252],i);
 }
 const image=async d=>sharp(Buffer.from(d),{raw:{width:size,height:size,channels:3}}).png().toBuffer();
 const knit=doc.createTexture('original fine knit normal').setImage(await image(data)).setMimeType('image/png');
 const twill=doc.createTexture('original diagonal twill normal').setImage(await image(denim)).setMimeType('image/png');
 for(const m of doc.getRoot().listMaterials()){
  if(['student-cotton','student-rib-knit'].includes(m.getName()))m.setNormalTexture(female?knit:twill).setNormalScale(female?.18:.055);
  if(m.getName()==='student-denim')m.setNormalTexture(twill).setNormalScale(.12);
  const info=m.getNormalTextureInfo();if(info)info.setWrapS(10497).setWrapT(10497);
 }
}
