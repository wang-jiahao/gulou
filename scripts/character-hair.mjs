import * as T from 'three';
import {recomputeCharacterNormals} from './character-surface.mjs';

/** One continuous crown-to-hem shell, with uninterrupted longitudinal UVs.
 * Broad shallow flow belongs to the shell. There is no cap-to-lock seam. */
export function buildStudentHair({female,skinGeometry,makeSkinned,hair}) {
 const surface=new T.Mesh(skinGeometry,new T.MeshBasicMaterial({side:T.DoubleSide})),surfaceRay=new T.Raycaster();surface.updateMatrixWorld(true);
 const positions=skinGeometry.getAttribute('position');let top=-Infinity;
 for(let i=0;i<positions.count;i++)if(Math.abs(positions.getX(i))<.14)top=Math.max(top,positions.getY(i));
 let back=Infinity,front=-Infinity;
 for(let i=0;i<positions.count;i++)if(positions.getY(i)>top-.095&&Math.abs(positions.getX(i))<.12){back=Math.min(back,positions.getZ(i));front=Math.max(front,positions.getZ(i));}
 const centre=new T.Vector3(0,top-.108,(back+front)/2),rows=female?78:54,cols=female?168:144;
 const headIndices=[],skinIndices=skinGeometry.getIndex();
 for(let i=0;i<skinIndices.count;i+=3){const a=skinIndices.getX(i),b=skinIndices.getX(i+1),c=skinIndices.getX(i+2);if(Math.max(positions.getY(a),positions.getY(b),positions.getY(c))>top-.27)headIndices.push(a,b,c);}
 const fitGeometry=skinGeometry.clone();fitGeometry.setIndex(headIndices);const fitSurface=new T.Mesh(fitGeometry,surface.material);fitSurface.updateMatrixWorld(true);
 const p=[],uv=[],colors=[],indices=[],outer=[],inner=[],smooth=T.MathUtils.smoothstep,gauss=(x,w)=>Math.exp(-((x/w)**2)),angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 const scalpCache=new Map();
 function scalp(theta,phi,lift=0){
  const key=`${theta}:${phi}`;let sample=scalpCache.get(key);
  if(!sample){const d=new T.Vector3(.093*Math.sin(theta)*Math.cos(phi),.108*Math.cos(theta),.117*Math.sin(theta)*Math.sin(phi)).normalize();surfaceRay.set(centre.clone().addScaledVector(d,.38),d.clone().negate());const hit=surfaceRay.intersectObject(fitSurface,false).find(h=>h.point.y>top-.225);if(!hit)throw Error(`Hair scalp miss ${theta}/${phi}`);sample={point:hit.point.clone(),normal:d};scalpCache.set(key,sample);}
  return sample.point.clone().addScaledVector(sample.normal,lift);
 }
 const add=(q,u,v,shade)=>{const i=p.length/3;p.push(...q.toArray());uv.push(u,v);colors.push(shade,shade,shade);return i;};
 const femaleCurves=new Map();
 function femaleColumn(phi){
  if(femaleCurves.has(phi))return femaleCurves.get(phi);
  const s=Math.sin(phi),c=Math.cos(phi),frontMask=smooth(s,.32,.86),long=1-smooth(s,.68,.88),side=Math.sign(c)||1;
  const fringeEdge=.037*Math.sin(phi*7+.7)+.026*Math.sin(phi*13+1.9)+.013*Math.sin(phi*19);
  const shortEnd=1.82-.63*frontMask+.19*smooth(-s,.05,.90)+fringeEdge*frontMask;
  const shortPoints=Array.from({length:9},(_,i)=>scalp(shortEnd*i/8,phi,.005+.008*Math.sin(Math.PI*i/8)));
  const points=[scalp(0,phi,.008),scalp(.46,phi,.012),scalp(.91,phi,.013),scalp(1.35,phi,.012),scalp(1.75,phi,.010)];
  const end=.463+.024*Math.sin(phi*3+.6)+.065*(.5+.5*Math.cos(phi*9+.8*Math.sin(phi*3)))**1.8;
  for(let j=1;j<=7;j++){
   const f=j/7,angle=phi+.085*Math.sin(phi*2+.4)*f+.035*Math.sin(f*3.2+phi)*f;
   const breadth=.111+.010*Math.sin(Math.PI*f)+.009*f,wave=.027*Math.sin(f*(7.8+1.2*Math.sin(phi*2))+phi*2.4)*Math.sin(Math.PI*f)**.65;
   let x=breadth*Math.cos(angle)+Math.cos(angle)*wave;
   const zz=centre.z+(.126+.026*f)*Math.sin(angle)+.022*Math.sin(f*7.3+phi*1.5)*Math.sin(Math.PI*f)-.012*f;
   if(s>.35)x=side*Math.max(Math.abs(x),.094+.006*Math.sin(f*8+phi));
   points.push(new T.Vector3(x,top-(.185+(end-.185)*f),zz));
  }
  const result={short:new T.CatmullRomCurve3(shortPoints,false,'centripetal'),long:new T.CatmullRomCurve3(points,false,'centripetal'),amount:long};femaleCurves.set(phi,result);return result;
 }
 function sample(t,phi){
  const sine=Math.sin(phi),forehead=smooth(sine,.20,.86),rear=smooth(-sine,.05,.90),partDelta=angleDelta(phi,female?1.67:1.61),part=gauss(partDelta,female?.12:.18)*forehead;
  let q,shade;
  if(female){
   const column=femaleColumn(phi);q=column.short.getPoint(t).lerp(column.long.getPoint(t),column.amount);
   const flow=phi+.080*Math.sin(t*3.8+phi*2)*Math.sin(t*Math.PI),broad=Math.cos(flow*12+.5*Math.sin(phi*3));
   const relief=(.0018+.0030*smooth(t,.3,.7))*(.60*broad+.40*Math.cos(flow*19+1.3))*Math.sin(Math.PI*t)**.7;
   const radial=new T.Vector3(Math.cos(phi),.20*(1-t),Math.sin(phi)).normalize();q.addScaledVector(radial,relief-.0022*part*Math.sin(t*Math.PI));
   if(q.y>top-.225){const dir=q.clone().sub(centre),distance=dir.length();dir.normalize();surfaceRay.set(centre.clone().addScaledVector(dir,.38),dir.clone().negate());const hit=surfaceRay.intersectObject(fitSurface,false).find(h=>h.point.y>top-.25);if(hit){const minimum=hit.point.distanceTo(centre)+.004;if(distance<minimum)q.copy(centre).addScaledVector(dir,minimum);}}
   shade=.965+.014*Math.sin(phi*4+.5*t)+.009*broad;
  }else{
   const end=1.70-.29*forehead+.30*rear-.27*part+.055*Math.sin(phi*9+.8)+(.024+.033*forehead)*Math.sin(phi*17+.2);
   const sweep=.30*Math.sin(t*Math.PI)*Math.cos(phi)+.065*Math.sin(phi*2+.4)*t;
   const angle=phi+sweep,theta=t*end,base=scalp(theta,angle),d=base.clone().sub(centre).normalize(),crown=Math.sin(t*Math.PI);
   const bank=.5+.5*Math.cos(phi*11+.75*Math.sin(t*3.3)+.3*Math.sin(phi*3));
   const lift=.004+.015*crown+.006*(1-t)+.0085*bank*crown+.006*Math.cos(phi+.6)*crown-.015*part*crown;
   q=base.addScaledVector(d,lift);shade=.958+.016*Math.sin(phi*3+.5*t)+.010*bank;
  }
  return{q,shade};
 }
 // Seam copies coincide. Shared normals are computed after connecting the
 // entire shell. U is periodic; V flows crown-to-tip without a cap boundary.
 const pole=sample(0,0);outer.push([add(pole.q,.5,0,.97)]);inner.push([add(pole.q.clone().add(new T.Vector3(0,-.003,0)),.5,0,.88)]);
 for(let r=1;r<=rows;r++){
  const out=[],ins=[],t=r/rows;
  for(let c=0;c<=cols;c++){
   const phi=c===cols?0:c/cols*Math.PI*2,s=sample(t,phi),radial=new T.Vector3(s.q.x,Math.max(0,s.q.y-centre.y)*.25,s.q.z-centre.z).normalize();
   const thickness=(female?.0032:.004)*(1-.78*smooth(t,.93,1));
   out.push(add(s.q,c/cols,t,s.shade));ins.push(add(s.q.clone().addScaledVector(radial,-thickness),c/cols,t,s.shade*.90));
  }
  outer.push(out);inner.push(ins);
 }
 function sheet(grid,reverse){const tri=(a,b,c)=>indices.push(...(reverse?[a,c,b]:[a,b,c]));for(let c=0;c<cols;c++)tri(grid[0][0],grid[1][c+1],grid[1][c]);for(let r=1;r<rows;r++)for(let c=0;c<cols;c++){const a=grid[r][c],b=grid[r][c+1],d=grid[r+1][c],e=grid[r+1][c+1];tri(a,b,d);tri(b,e,d);}}
 sheet(outer,false);sheet(inner,true);
 for(let c=0;c<cols;c++){const a=outer[rows][c],b=inner[rows][c],d=outer[rows][c+1],e=inner[rows][c+1];indices.push(a,d,b,d,e,b);}
 // Few enclosed edge wisps have deeply buried roots, not a planted ring.
 const wisps=[];
 function wisp(points,{width=.0018,depth=.00065,phase=0,rings=25}={}){
  const curve=new T.CatmullRomCurve3(points,false,'centripetal'),grid=[],sides=8;
  for(let r=0;r<=rings;r++){
   const t=r/rings,q=curve.getPoint(t),tangent=curve.getTangent(t).normalize(),radial=new T.Vector3(q.x,.06,q.z-centre.z).normalize(),across=radial.clone().cross(tangent).normalize(),normal=tangent.clone().cross(across).normalize(),taper=(.36+.64*smooth(t,0,.25))*(1-.90*smooth(t,.65,1)),ring=[];
   for(let s=0;s<=sides;s++){const a=(s===sides?0:s/sides*Math.PI*2);ring.push(add(q.clone().addScaledVector(across,Math.cos(a)*width*taper).addScaledVector(normal,Math.sin(a)*depth*taper),phase+s/sides*.025,t,.965));}grid.push(ring);
  }
  for(let r=0;r<rings;r++)for(let s=0;s<sides;s++){const a=grid[r][s],b=grid[r+1][s],d=grid[r][s+1],e=grid[r+1][s+1];indices.push(a,d,b,d,e,b);}
  const first=add(points[0],phase,0,.94),last=add(points.at(-1),phase,1,.965);for(let s=0;s<sides;s++){indices.push(first,grid[0][s+1],grid[0][s],last,grid[rings][s],grid[rings][s+1]);}wisps.push({root:points[0].toArray(),tip:points.at(-1).toArray(),width});
 }
 if(female){
  const fringe=[[-.047,.106,.0037,-.003],[-.031,.113,.0023,.002],[-.014,.102,.0032,.004],[.004,.109,.0024,-.002],[.026,.116,.0038,-.004],[.046,.103,.0027,.001]];
  for(const [j,[x,length,width,bend]]of fringe.entries()){
   const phi=1.63-Math.asin(x/.13),tip=scalp(1.43,phi,.003);tip.x=x+bend;tip.y=top-length;tip.z=Math.max(tip.z,front+.002+.0008*(j%3));
   const root=scalp(.68+.045*(j%3),phi+.025*Math.sin(j),-.010),buried=scalp(1.01+.025*Math.sin(j*1.4),phi,-.003),emerge=scalp(1.23+.024*Math.sin(j*2),phi,.003+.0007*(j%2));emerge.x+=bend*.5;
   wisp([root,buried,emerge,tip],{width,depth:.00030+.00003*(j%2),phase:j*.153,rings:24});
  }
 }else{
  for(const [j,phi]of[-.12,.36,2.85,3.45].entries())wisp([scalp(.37,phi,-.006),scalp(.62,phi,.025),scalp(.87,phi+.07,.025),scalp(1.09,phi+.11,.009)],{width:.0020,depth:.0007,phase:j*.23,rings:24});
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);recomputeCharacterNormals(geometry);geometry.computeBoundingBox();
 geometry.userData.hairDesign={variant:female?'continuous crown-to-wave shell with fine airy fringe':'continuous fluffy parted shell',rows,cols,continuousShell:true,separateCap:false,closedVolume:true,rootToTipUV:true,headBound:true,wisps,fit:{top,centre:centre.toArray()}};
 const material=hair.clone();material.name='student-sculpted-hair';material.vertexColors=true;material.roughness=.68;
 makeSkinned(geometry,material,female?'continuous long wavy hair':'continuous fluffy parted hair','Head');
 return {surface,surfaceRay};
}
