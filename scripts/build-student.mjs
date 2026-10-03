import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder} from 'meshoptimizer';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const gender=process.argv.includes('--female')?'female':'male';
const female=gender==='female';
const data=JSON.parse(await readFile('assets/source-models/character/human-data.json','utf8'));
const sourceHip=data.joints.pelvis[1],sourceNeck=data.joints.neck[1];
function morph(p){
  let [x,y,z]=p;
  const head=y>sourceNeck, upper=y>sourceHip+.15;
  x*=female?(head?.96:upper?.92:1):1;
  if(head){
    // A softer jaw and less projected nose/lips keep the neutral face youthful.
    const jaw=Math.exp(-1*((y-1.536)/.04)**2);
    x*=1-jaw*(female?.055:.025);
    const nose=Math.exp(-1*((x/.025)**2)-((y-1.601)/.026)**2)*T.MathUtils.smoothstep(z,.112,.154);
    z-=nose*(female?.009:.006); x*=1-nose*.12;
    const lips=Math.exp(-1*((x/.032)**2)-((y-1.558)/.012)**2)*T.MathUtils.smoothstep(z,.12,.15);
    z-=lips*.004;
    y+=.0018*Math.exp(-1*((Math.abs(x)-.027)/.010)**2-((y-1.557)/.012)**2)*T.MathUtils.smoothstep(z,.11,.15);
  }
  return new T.Vector3(x,y,z);
}
const v=data.vertices.map(morph);
const joint=name=>morph(data.joints[name]);
const root=new T.Group();root.name='GulouStudent-'+gender;
const definitions=[
 ['Hips','pelvis',null],['Spine','spine-4','Hips'],['Spine1','spine-3','Spine'],['Spine2','spine-1','Spine1'],['Neck','neck','Spine2'],['Head','head','Neck'],
 ...['Left','Right'].flatMap(side=>{const s=side==='Left'?'l':'r';return [[side+'Arm',s+'-shoulder','Spine2'],[side+'ForeArm',s+'-elbow',side+'Arm'],[side+'Hand',s+'-hand',side+'ForeArm'],[side+'UpLeg',s+'-upper-leg','Hips'],[side+'Leg',s+'-knee',side+'UpLeg'],[side+'Foot',s+'-ankle',side+'Leg']];}),
];
for(const side of ['Left','Right'])for(let digit=1;digit<=5;digit++)for(let part=1;part<=4;part++)definitions.push([`${side}Finger${digit}${part}`,`${side==='Left'?'l':'r'}-finger-${digit}-${part}`,part===1?side+'Hand':`${side}Finger${digit}${part-1}`]);
const bones={},positions={},indices={};
definitions.forEach(([name,j,p],i)=>{const bone=new T.Bone();bone.name='mixamorig'+name;positions[name]=joint(j);bone.position.copy(positions[name]);if(p){bone.position.sub(positions[p]);bones[p].add(bone);}else root.add(bone);bones[name]=bone;indices[name]=i;});
root.updateMatrixWorld(true);const skeleton=new T.Skeleton(definitions.map(([name])=>bones[name]));
const mat=(name,color,roughness=.86)=>new T.MeshStandardMaterial({name,color,roughness});
const skin=mat('student-skin',0xffffff,.7),shirt=mat('student-cotton',female?0xc4b9a2:0x354c61,.9),pants=mat('student-denim',female?0x63788a:0x536371,.93),hair=mat('student-hair',female?0x30231f:0x242322,.72),shoe=mat('student-shoes',0xd4d6d0),sole=mat('student-sole',0xc6c9c2),bag=mat('student-backpack',female?0x9b7b58:0x555d54);

const hipY=positions.Hips.y,neckY=positions.Neck.y;
const segments=definitions.filter(d=>d[2]).map(([name,,parent])=>({name:parent,tip:name,a:positions[parent],b:positions[name]}));
const segmentDistance=(point,segment)=>{const d=segment.b.clone().sub(segment.a);const t=T.MathUtils.clamp(point.clone().sub(segment.a).dot(d)/d.lengthSq(),0,1);return point.distanceTo(segment.a.clone().addScaledVector(d,t));};
function handWeights(point,side){
 const nearest=segments.filter(s=>s.name.startsWith(side+'Finger')).map(s=>({s,d:segmentDistance(point,s)})).sort((a,b)=>a.d-b.d)[0];
 if(nearest&&nearest.d<.022)return [[indices[nearest.s.name],1]];
 return [[indices[side+'Hand'],1]];
}
function weights(point,force){
  if(force==='torso'&&point.y<hipY+.10)return [[indices.Hips,1]];
  if(force&&force!=='torso')return [[indices[force],1]];
  const side=point.x>0?'Left':'Right';
  if(point.y>neckY+.015)return [[indices.Head,1]];
  const armDistance=Math.min(...segments.filter(s=>[side+'Arm',side+'ForeArm'].includes(s.name)).map(s=>segmentDistance(point,s)));
  const torsoDistance=Math.hypot(point.x,point.z-.025);
  if(Math.abs(point.x)>.32&&point.y>hipY+.02&&(point.distanceTo(positions[side+'Hand'])<.15||Math.abs(point.x)>.42))return handWeights(point,side);
  const limb=force==='torso'?'body':point.y<hipY+.1&&armDistance>.11?'leg':armDistance<torsoDistance*.8&&point.y>hipY+.07?'arm':'body';
  if(limb==='arm'&&point.distanceTo(positions[side+'Arm'])<.15){const w=T.MathUtils.smoothstep((side==='Left'?1:-1)*(point.x-positions[side+'Arm'].x),-.055,.07);return [[indices[side+'Arm'],w],[indices.Spine2,1-w]];}
  if(limb==='arm'){
    const wrist=positions[side+'Hand'];if(point.distanceTo(wrist)<.09||Math.abs(point.x)>Math.abs(wrist.x))return handWeights(point,side);
  }
  const candidates=segments.filter(s=>limb==='arm'?[side+'Arm',side+'ForeArm'].includes(s.name):limb==='leg'?[side+'UpLeg',side+'Leg',side+'Foot'].includes(s.name):['Hips','Spine','Spine1','Spine2','Neck'].includes(s.name));
  const nearest=candidates.map(s=>({i:indices[s.name],distance:segmentDistance(point,s)})).sort((a,b)=>a.distance-b.distance).slice(0,2);
  const a=nearest.map(n=>1/Math.pow(n.distance+.014,3)),sum=a.reduce((x,y)=>x+y,0);return nearest.map((n,i)=>[n.i,a[i]/sum]);
}
function makeSkinned(geometry,material,name,force){
  const position=geometry.getAttribute('position'),ids=[],ws=[];
  for(let i=0;i<position.count;i++){
    const point=new T.Vector3().fromBufferAttribute(position,i),w=weights(point,force);for(let j=0;j<4;j++){ids.push(w[j]?.[0]??0);ws.push(w[j]?.[1]??0);}
  }
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(ids,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(ws,4));
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name=name;root.add(mesh);mesh.bind(skeleton);mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
// One Catmull-Clark pass smooths the existing CC0 facial and hand topology.
// Positions are shared independently of UV seams, so a cheek cannot acquire a seam in its lighting.
function smoothBody(faces,filter){
  const selected=faces.filter(face=>filter(face.reduce((p,[i])=>p.add(v[i]),new T.Vector3()).multiplyScalar(1/face.length)));
  const edges=new Map(),adj=new Map(),centers=[];
  const key=(a,b)=>a<b?a+':'+b:b+':'+a;
  selected.forEach((face,fi)=>{
    centers.push(face.reduce((p,[i])=>p.add(v[i]),new T.Vector3()).multiplyScalar(1/face.length));
    face.forEach(([a],j)=>{const b=face[(j+1)%face.length][0],k=key(a,b);if(!edges.has(k))edges.set(k,{a,b,faces:[]});edges.get(k).faces.push(fi);if(!adj.has(a))adj.set(a,{faces:[],edges:new Set()});adj.get(a).faces.push(fi);adj.get(a).edges.add(k);const prev=face[(j+face.length-1)%face.length][0];adj.get(a).edges.add(key(prev,a));});
  });
  const points=[],ids=new Map(),add=(key,p)=>{ids.set(key,points.length);points.push(p);};
  for(const [i,a]of adj){
    const boundary=[...a.edges].map(k=>edges.get(k)).filter(e=>e.faces.length===1).map(e=>v[e.a===i?e.b:e.a]);
    let p;
    if(boundary.length===2)p=v[i].clone().multiplyScalar(.75).addScaledVector(boundary[0],.125).addScaledVector(boundary[1],.125);
    else {const n=a.faces.length,F=a.faces.reduce((p,fi)=>p.add(centers[fi]),new T.Vector3()).divideScalar(n),R=[...a.edges].reduce((p,k)=>{const e=edges.get(k);return p.add(v[e.a]).add(v[e.b]);},new T.Vector3()).divideScalar(a.edges.size*2);p=v[i].clone().multiplyScalar(n-3).add(F).addScaledVector(R,2).divideScalar(n);}
    add('v'+i,p);
  }
  for(const[k,e]of edges){const p=v[e.a].clone().add(v[e.b]);if(e.faces.length===2)p.add(centers[e.faces[0]]).add(centers[e.faces[1]]).multiplyScalar(.25);else p.multiplyScalar(.5);add('e'+k,p);}
  centers.forEach((p,i)=>add('f'+i,p));const indices=[];
  selected.forEach((face,fi)=>face.forEach(([a],j)=>{const b=face[(j+1)%face.length][0],c=face[(j+face.length-1)%face.length][0],q=[ids.get('v'+a),ids.get('e'+key(a,b)),ids.get('f'+fi),ids.get('e'+key(c,a))];indices.push(q[0],q[1],q[2],q[0],q[2],q[3]);}));
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));g.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap(p=>[p.x*2,p.y]),2));g.setIndex(indices);g.computeVertexNormals();return g;
}
const skinGeometry=smoothBody(data.groups.body,p=>{
  if(p.y>neckY-.004)return true;
  const side=p.x>0?'Left':'Right',wrist=positions[side+'Hand'],axis=wrist.clone().sub(positions[side+'ForeArm']).normalize();
  return p.y>hipY&&Math.abs(p.x)>.32&&p.clone().sub(wrist).dot(axis)>-.06;
});
const skinColors=[],skinPos=skinGeometry.getAttribute('position');
for(let i=0;i<skinPos.count;i++){
 const p=new T.Vector3().fromBufferAttribute(skinPos,i),color=new T.Color(female?0xd4ac97:0xc9a38b);
 const front=T.MathUtils.smoothstep(p.z,.10,.145);
 const lip=Math.exp(-1*((p.y-1.557)/.0055)**2-((p.x/.027)**4))*front;
 color.lerp(new T.Color(female?0xb77978:0xad7e70),lip*.8);
 const cheek=Math.exp(-1*((Math.abs(p.x)-.052)/.023)**2-((p.y-1.59)/.022)**2)*front;
 color.lerp(new T.Color(female?0xcd9286:0xc2927e),cheek*.2);
 const lowerEye=Math.exp(-1*((Math.abs(p.x)-.032)/.019)**2-((p.y-1.614)/.005)**2)*front;
 color.lerp(new T.Color(0xae8976),lowerEye*.14);skinColors.push(...color.toArray());
}
skinGeometry.setAttribute('color',new T.Float32BufferAttribute(skinColors,3));skin.vertexColors=true;makeSkinned(skinGeometry,skin,'soft face neck and hands');
// Layered campus clothing: a cream tee/navy overshirt or sage tee/ecru cardigan.
const fit=female?.94:1;
const torsoRings=[[hipY+.015,.191*fit,.116,.016],[hipY+.04,.194*fit,.119,.016],[hipY+.14,.186*fit,.121,.014],[hipY+.28,.207*fit,.131,.016],[neckY-.11,.227*fit,.116,.013],[neckY-.064,.208*fit,.094,.013],[neckY-.013,.072,.058,.014]];
function ringMesh(rings,gap=0){const p=[],u=[],idx=[],n=64;for(let r=0;r<rings.length;r++){const[y,rx,rz,z]=rings[r];for(let i=0;i<=n;i++){const a=Math.PI/2+gap+i/n*(Math.PI*2-gap*2),fold=1+Math.sin(a*7+y*19)*.006;p.push(Math.cos(a)*rx*fold,y,z+Math.sin(a)*rz*fold);u.push(i/n,r/(rings.length-1));if(r<rings.length-1&&i<n){const k=r*(n+1)+i;idx.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(u,2));g.setIndex(idx);g.computeVertexNormals();return g;}
const tee=mat('student-tee',female?0x879b8e:0xd5d2c5,.94),trim=mat('jacket-trim',female?0xafa38d:0x304251,.92);
makeSkinned(ringMesh(torsoRings.map(([y,x,z,c])=>[y+.005,x-.011,z-.011,c])),tee,'cotton crew-neck tee','torso');
makeSkinned(ringMesh(torsoRings,female?.43:.34),shirt,'open front overshirt','torso');
makeSkinned(new T.TorusGeometry(.060,.006,10,48).rotateX(Math.PI/2).translate(0,neckY-.002,.014),tee,'ribbed crew collar','Neck');
const tube=(points,radius,material,name,force)=>makeSkinned(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,radius,8,false),material,name,force);
for(const side of ['Left','Right']){
 const sign=side==='Left'?1:-1,shoulder=positions[side+'Arm'],elbow=positions[side+'ForeArm'],wrist=positions[side+'Hand'],direction=wrist.clone().sub(elbow).normalize();
 const end=wrist.clone().addScaledVector(direction,-.025),start=shoulder.clone().add(new T.Vector3(-sign*.07,-.010,0));
 const curve=new T.CatmullRomCurve3([start,start.clone().lerp(elbow,.5),elbow,elbow.clone().lerp(end,.7),end]);
 const g=new T.TubeGeometry(curve,28,1,24,false),p=g.getAttribute('position');
 for(let row=0;row<=28;row++){const t=row/28,c=curve.getPointAt(t),radius=(T.MathUtils.lerp(.078*fit,.04,t)+Math.sin(t*Math.PI)*.003)*Math.max(.001,T.MathUtils.smoothstep(t,0,.06));for(let col=0;col<=24;col++){const i=row*25+col,q=new T.Vector3().fromBufferAttribute(p,i).sub(c).multiplyScalar(radius).add(c);p.setXYZ(i,q.x,q.y,q.z);}}
 g.computeVertexNormals();makeSkinned(g,shirt,side+' tailored sleeve');
 const cuff=new T.CylinderGeometry(.041,.043,.033,24,1,true).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction));cuff.translate(...end.clone().addScaledVector(direction,-.012).toArray());makeSkinned(cuff,trim,side+' cuff');
 const gap=female?.43:.34;
 const placket=torsoRings.map(([y,rx,rz,c])=>new T.Vector3(sign*Math.sin(gap)*rx,y,c+Math.cos(gap)*rz+.002));tube(placket,.004,trim,side+' placket','torso');
 if(!female){const points=[new T.Vector3(sign*.053,neckY-.012,.068),new T.Vector3(sign*.096,neckY-.076,.112),new T.Vector3(sign*.078,neckY-.114,.132),new T.Vector3(sign*.036,neckY-.056,.103)];const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));geo.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();const collar=shirt.clone();collar.side=T.DoubleSide;makeSkinned(geo,collar,side+' folded collar','Spine2');}
}
const button=mat('shirt-button',female?0xb19b75:0xada48f,.55);
for(let i=0;i<4;i++)makeSkinned(new T.SphereGeometry(.005,10,6).scale(1,1,.45).translate(-.066*fit,hipY+.09+i*.078,.136),button,'button','Spine2');
// The continuous garment proxy preserves crotch and hip topology during motion.
const trouserGeometry=smoothBody(data.groups['helper-tights'],p=>p.y<hipY+.035&&p.y>.105),trouserPositions=trouserGeometry.getAttribute('position');
for(let i=0;i<trouserPositions.count;i++){
 const y=trouserPositions.getY(i);if(y>hipY-.10)continue;const side=trouserPositions.getX(i)>0?'Left':'Right',hip=positions[side+'UpLeg'],knee=positions[side+'Leg'],ankle=positions[side+'Foot'];
 const a=y>knee.y?hip:knee,c=y>knee.y?knee:ankle,t=T.MathUtils.clamp((a.y-y)/(a.y-c.y),0,1),center=a.clone().lerp(c,t),angle=Math.atan2(trouserPositions.getZ(i)-center.z,trouserPositions.getX(i)-center.x);
 const taper=T.MathUtils.clamp((hipY-.13-y)/(hipY-.24),0,1),rx=.085*(1-taper)+.058*taper,rz=.089*(1-taper)+.062*taper,fold=1+Math.sin(y*54+angle*2)*.012;
 const blend=T.MathUtils.smoothstep(hipY-y,.10,.30);trouserPositions.setXYZ(i,T.MathUtils.lerp(trouserPositions.getX(i),center.x+Math.cos(angle)*rx*fold,blend),y,T.MathUtils.lerp(trouserPositions.getZ(i),center.z+Math.sin(angle)*rz*fold,blend));
}
trouserGeometry.computeVertexNormals();makeSkinned(trouserGeometry,pants,'tailored trousers');
const hairCenter=new T.Vector3(0,1.655,.063);
const scalpPoint=(theta,phi)=>{const front=Math.max(0,Math.sin(phi)),back=Math.max(0,-Math.sin(phi));return new T.Vector3(Math.sin(theta)*Math.cos(phi)*.094,Math.cos(theta)*.112,Math.sin(theta)*Math.sin(phi)*(.124+back*.005)).add(hairCenter).add(new T.Vector3(0,front*.008*Math.cos(phi),0));};
const hp=[],hu=[],hi=[];for(let row=0;row<=24;row++)for(let col=0;col<=72;col++){const phi=col/72*Math.PI*2,front=Math.max(0,Math.sin(phi)),back=Math.max(0,-Math.sin(phi));const end=1.98-front*(.58+.21*Math.cos(phi))+back*.18+(female?.12:0)+.04*Math.sin(phi*5);const theta=row/24*end;hp.push(...scalpPoint(theta,phi).toArray());hu.push(col/72,row/24);if(row<24&&col<72){const k=row*73+col;if(row>0)hi.push(k,k+1,k+73);hi.push(k+1,k+74,k+73);}}
const scalp=new T.BufferGeometry();scalp.setAttribute('position',new T.Float32BufferAttribute(hp,3));scalp.setAttribute('uv',new T.Float32BufferAttribute(hu,2));scalp.setIndex(hi);scalp.computeVertexNormals();makeSkinned(scalp,hair,'fitted hair foundation','Head');
function lock(points,width,depth,name){const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,24,1,10,false),p=g.getAttribute('position');for(let r=0;r<=24;r++){const t=r/24,c=curve.getPointAt(t),radius=Math.max(.08,Math.sin(Math.PI*(.15+.82*t)));for(let j=0;j<=10;j++){const i=r*11+j,q=new T.Vector3().fromBufferAttribute(p,i).sub(c);q.multiply(new T.Vector3(width,depth,width)).multiplyScalar(radius).add(c);p.setXYZ(i,q.x,q.y,q.z);}}g.computeVertexNormals();makeSkinned(g,hair,name,'Head');}
// Fine surface-following locks keep a natural part without detached arches.
for(let i=0;i<40;i++){
 const phi=i/40*Math.PI*2,front=Math.max(0,Math.sin(phi)),back=Math.max(0,-Math.sin(phi)),end=1.98-front*(.58+.21*Math.cos(phi))+back*.18+(female?.12:0)+.04*Math.sin(phi*5);
 const points=[];for(let j=0;j<7;j++){const t=j/6,theta=.18+t*(end-.2);const p=scalpPoint(theta,phi+.06*Math.sin(t*Math.PI));p.addScaledVector(p.clone().sub(hairCenter).normalize(),.0014);points.push(p);}
 lock(points,.0022,.0016,'fine hair flow');
}
if(female){
 for(const side of [-1,1])for(let i=0;i<10;i++){const t=i/9;lock([new T.Vector3(side*.05,1.744,.027-t*.09),new T.Vector3(side*.094,1.64,.056-t*.145),new T.Vector3(side*(.098+.012*Math.sin(t*Math.PI)),1.53,.07-t*.16),new T.Vector3(side*.08,1.475+t*.035,.066-t*.13)],.018,.015,'shoulder-length bob');}
 // A continuous nape mass fills the space between the individual side locks.
 for(let i=0;i<9;i++){const x=(i-4)*.019;lock([new T.Vector3(x*.7,1.70,-.045),new T.Vector3(x,1.60,-.072),new T.Vector3(x,1.51,-.062),new T.Vector3(x*.84,1.46,-.022)],.021,.019,'bob nape');}
}
for(const side of ['Left','Right']){
  const s=side==='Left'?'l':'r',eye=joint(s+'-eye');
  const white=mat('eye-white',0xd0c7b7,.4),iris=mat('iris',female?0x534137:0x4a4034,.45),pupil=mat('pupil',0x161819,.25);
  makeSkinned(new T.SphereGeometry(.0118,24,16).translate(...eye.toArray()),white,side+' eye','Head');
  makeSkinned(new T.SphereGeometry(.0054,20,12).scale(1,1,.20).translate(eye.x,eye.y,eye.z+.0116),iris,side+' iris','Head');
  makeSkinned(new T.SphereGeometry(.0026,16,10).scale(1,1,.18).translate(eye.x,eye.y,eye.z+.0126),pupil,side+' pupil','Head');
  makeSkinned(new T.SphereGeometry(.00085,8,6).translate(eye.x-.0015,eye.y+.002,eye.z+.013),mat('eye-catchlight',0xe4ddd1,.1),side+' eye catchlight','Head');
  const browPoints=[new T.Vector3(eye.x-.016,eye.y+.018,eye.z+.028),new T.Vector3(eye.x-.005,eye.y+.021,eye.z+.032),new T.Vector3(eye.x+.006,eye.y+.020,eye.z+.033),new T.Vector3(eye.x+.015,eye.y+.017,eye.z+.029)];
  const curve=new T.CatmullRomCurve3(browPoints),bg=new T.TubeGeometry(curve,16,1,8,false),bp=bg.getAttribute('position');for(let r=0;r<=16;r++){const t=r/16,c=curve.getPointAt(t),radius=(female?.00115:.0015)*(.3+.7*Math.sin(Math.PI*t));for(let j=0;j<=8;j++){const i=r*9+j,q=new T.Vector3().fromBufferAttribute(bp,i).sub(c).multiplyScalar(radius).add(c);bp.setXYZ(i,q.x,q.y,q.z);}}bg.computeVertexNormals();makeSkinned(bg,hair,side+' tapered eyebrow','Head');
  const ankle=positions[side+'Foot'];
  const sp=[],su=[],si=[],rings=[[.025,.047,.126,.064],[.04,.055,.145,.062],[.075,.056,.142,.06],[.10,.052,.135,.054],[.128,.043,.098,.025],[.15,.037,.063,-.005]];
  rings.forEach(([y,rx,rz,z],r)=>{for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;sp.push(ankle.x+Math.cos(a)*rx,y,ankle.z+z+Math.sin(a)*rz);su.push(i/32,r/(rings.length-1));if(r&&i<32){const n=r*33+i;si.push(n,n+1,n-33,n+1,n-32,n-33);}}});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(sp,3));g.setAttribute('uv',new T.Float32BufferAttribute(su,2));g.setIndex(si);g.computeVertexNormals();makeSkinned(g,shoe,side+' canvas sneaker',side+'Foot');
  const bottom=new RoundedBoxGeometry(.111,.032,.28,3,.013);bottom.translate(ankle.x,.022,ankle.z+.07);makeSkinned(bottom,sole,side+' rubber sole',side+'Foot');
  for(let i=0;i<4;i++)makeSkinned(new T.BoxGeometry(.057,.003,.005).translate(ankle.x,.139,ankle.z+.03+i*.014),sole,side+' lace '+i,side+'Foot');
}
const bagPosition=new T.Vector3(0,positions.Spine2.y-.12,-.15);
makeSkinned(new RoundedBoxGeometry(.245,.32,.115,4,.045).translate(...bagPosition.toArray()),bag,'canvas backpack','Spine2');
makeSkinned(new RoundedBoxGeometry(.19,.12,.045,4,.022).translate(0,bagPosition.y-.065,-.23),bag,'backpack pocket','Spine2');
for(const s of [-1,1]){
  const curve=new T.CatmullRomCurve3([new T.Vector3(s*.10,bagPosition.y-.10,-.12),new T.Vector3(s*.13,1.43,-.06),new T.Vector3(s*.135,1.42,.079),new T.Vector3(s*.145,1.24,.126),new T.Vector3(s*.16,1.13,.089)]);
  makeSkinned(new T.TubeGeometry(curve,24,.008,8,false),bag,'backpack strap','Spine2');
}
const batches=new Map();for(const child of [...root.children])if(child instanceof T.SkinnedMesh){const list=batches.get(child.material)??[];list.push(child);batches.set(child.material,list);}
for(const [material,meshes] of batches){if(meshes.length<2)continue;const geometry=mergeGeometries(meshes.map(mesh=>mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()));if(!geometry)throw new Error('Unable to merge character material');meshes.forEach(mesh=>root.remove(mesh));const mesh=new T.SkinnedMesh(geometry,material);mesh.name=material.name;root.add(mesh);mesh.bind(skeleton);}
root.updateMatrixWorld(true);
root.userData={gender,source:'MakeHuman base mesh and helpers; CC0 1.0. Clothing, rigging and backpack by this project.',proportion:'1.75 m authoring height'};
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}async readAsDataURL(blob){this.result=`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onloadend?.();}};
const output=`public/assets/characters/student-${gender}.glb`;
const binary=await new GLTFExporter().parseAsync(root,{binary:true});
await writeFile(output,Buffer.from(binary));
await MeshoptEncoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const doc=await io.read(output);await doc.transform(dedup(),weld(),prune({keepAttributes:true}),meshopt({encoder:MeshoptEncoder,level:'medium'}));await io.write(output,doc);
if(!female)await copyFile(output,'public/assets/characters/student-natural.glb');
console.log(gender,'student exported:',output);
