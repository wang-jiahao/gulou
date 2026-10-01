import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {readFile,writeFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder} from 'meshoptimizer';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const data=JSON.parse(await readFile('assets/source-models/character/human-data.json','utf8'));
const v=data.vertices.map(p=>new T.Vector3(...p));
const joint=name=>new T.Vector3(...data.joints[name]);
const root=new T.Group();root.name='GulouStudent';
const definitions=[
 ['Hips','pelvis',null],['Spine','spine-4','Hips'],['Spine1','spine-3','Spine'],['Spine2','spine-1','Spine1'],['Neck','neck','Spine2'],['Head','head','Neck'],
 ...['Left','Right'].flatMap(side=>{const s=side==='Left'?'l':'r';return [[side+'Arm',s+'-shoulder','Spine2'],[side+'ForeArm',s+'-elbow',side+'Arm'],[side+'Hand',s+'-hand',side+'ForeArm'],[side+'UpLeg',s+'-upper-leg','Hips'],[side+'Leg',s+'-knee',side+'UpLeg'],[side+'Foot',s+'-ankle',side+'Leg']];}),
];
const bones={},positions={},indices={};
definitions.forEach(([name,j,p],i)=>{const bone=new T.Bone();bone.name='mixamorig'+name;positions[name]=joint(j);bone.position.copy(positions[name]);if(p){bone.position.sub(positions[p]);bones[p].add(bone);}else root.add(bone);bones[name]=bone;indices[name]=i;});
root.updateMatrixWorld(true);const skeleton=new T.Skeleton(definitions.map(([name])=>bones[name]));
const mat=(name,color,roughness=.86)=>new T.MeshStandardMaterial({name,color,roughness});
const skin=mat('student-skin',0xc49a7f,.62),shirt=mat('student-cotton',0x30465d,.94),pants=mat('student-denim',0x707469,.94),hair=mat('student-hair',0x241d19,.76),shoe=mat('student-shoes',0xc7c9c2),sole=mat('student-sole',0xdddcd1),bag=mat('student-backpack',0x292f32);
const hipY=positions.Hips.y,neckY=positions.Neck.y;
const segments=definitions.filter(d=>d[2]).map(([name,,parent])=>({name:parent,tip:name,a:positions[parent],b:positions[name]}));
const segmentDistance=(point,segment)=>{const d=segment.b.clone().sub(segment.a);const t=T.MathUtils.clamp(point.clone().sub(segment.a).dot(d)/d.lengthSq(),0,1);return point.distanceTo(segment.a.clone().addScaledVector(d,t));};
function region(p){
  if(p.y>neckY+.095||(p.y>neckY-.025&&Math.abs(p.x)<.07))return 'skin';
  const side=p.x>0?'Left':'Right';
  if(Math.abs(p.x)>.32&&p.y>hipY+.02&&(p.distanceTo(positions[side+'Hand'])<.145||Math.abs(p.x)>.42))return 'skin';
  if(Math.abs(p.x)>.16&&p.y>hipY+.1){
    const wrist=positions[side+'Hand'],direction=wrist.clone().sub(positions[side+'ForeArm']).normalize();
    if(p.clone().sub(wrist).dot(direction)>-.025)return 'skin';
    return 'shirt';
  }
  return p.y<hipY+.075?'pants':'shirt';
}
function weights(point,force){
  if(force)return [[indices[force],1]];
  const side=point.x>0?'Left':'Right';
  if(point.y>neckY+.015)return [[indices.Head,1]];
  const armDistance=Math.min(...segments.filter(s=>[side+'Arm',side+'ForeArm'].includes(s.name)).map(s=>segmentDistance(point,s)));
  const torsoDistance=Math.hypot(point.x,point.z-.025);
  if(Math.abs(point.x)>.32&&point.y>hipY+.02&&(point.distanceTo(positions[side+'Hand'])<.15||Math.abs(point.x)>.42))return [[indices[side+'Hand'],1]];
  const limb=point.y<hipY+.1&&armDistance>.11?'leg':armDistance<torsoDistance*.8&&point.y>hipY+.07?'arm':'body';
  if(limb==='arm'){
    const wrist=positions[side+'Hand'];if(point.distanceTo(wrist)<.09||Math.abs(point.x)>Math.abs(wrist.x))return [[indices[side+'Hand'],1]];
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
function meshFromFaces(faces,filter,expand=0){
  const pos=[],uv=[],ids=[],lookup=new Map();
  for(const face of faces){
    const center=face.reduce((s,[i])=>s.add(v[i]),new T.Vector3()).multiplyScalar(1/face.length);if(!filter(center))continue;
    const faceIds=[];
    for(const [vi,ui] of face){const key=vi+':'+ui;let index=lookup.get(key);if(index===undefined){index=pos.length/3;lookup.set(key,index);pos.push(...v[vi].toArray());uv.push(...data.uvs[ui]);}faceIds.push(index);}
    for(let i=1;i<faceIds.length-1;i++)ids.push(faceIds[0],faceIds[i],faceIds[i+1]);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();
  if(expand){const a=g.getAttribute('position'),n=g.getAttribute('normal');for(let i=0;i<a.count;i++){const y=a.getY(i),wrinkle=Math.sin(y*89+a.getX(i)*28)*Math.sin(y*43)*.0018;const e=expand+wrinkle;a.setXYZ(i,a.getX(i)+n.getX(i)*e,y+n.getY(i)*e,a.getZ(i)+n.getZ(i)*e);}g.computeVertexNormals();}
  return g;
}
const skinGeometry=meshFromFaces(data.groups.body,p=>region(p)==='skin'),skinColors=[];
const mouth=joint('mouth'),skinPos=skinGeometry.getAttribute('position');
for(let i=0;i<skinPos.count;i++){
 const p=new T.Vector3().fromBufferAttribute(skinPos,i),color=new T.Color(0xffffff);
 const lip=Math.exp(-(((p.y-mouth.y)/.007)**2)-((p.x-mouth.x)/.025)**2)*Math.max(0,Math.min(1,(p.z-mouth.z+.02)*20));
 color.lerp(new T.Color(0x9b6f65),lip*.5);skinColors.push(...color.toArray());
}skinGeometry.setAttribute('color',new T.Float32BufferAttribute(skinColors,3));skin.vertexColors=true;makeSkinned(skinGeometry,skin,'face neck hands');
// An independent sewn silhouette avoids the jagged cut faces and body-shaped
// chest of the earlier painted-body garment.
const torsoRings=[[hipY+.035,.193,.12,.018],[hipY+.055,.201,.126,.018],[hipY+.13,.194,.126,.014],[hipY+.27,.207,.142,.015],[neckY-.13,.225,.139,.012],[neckY-.075,.222,.117,.010],[neckY-.038,.193,.098,.012],[neckY-.012,.075,.064,.016]];
function ringMesh(rings){const p=[],u=[],idx=[],n=48;for(let r=0;r<rings.length;r++){const[y,rx,rz,z]=rings[r];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;const fold=1+Math.sin(a*8+y*24)*.012;p.push(Math.cos(a)*rx*fold,y,z+Math.sin(a)*rz*fold);u.push(i/n,r/(rings.length-1));if(r<rings.length-1&&i<n){const k=r*(n+1)+i;idx.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(u,2));g.setIndex(idx);g.computeVertexNormals();return g;}
makeSkinned(ringMesh(torsoRings),shirt,'tailored navy jacket','Spine2');
const trim=mat('jacket-trim',0x263747,.86),tee=mat('student-tee',0xd8d7cb,.94),zip=mat('zipper',0x919b9c,.42);zip.metalness=.5;
makeSkinned(new T.TorusGeometry(.061,.01,10,48).rotateX(Math.PI/2).translate(0,neckY-.015,.015),tee,'clean inner collar','Neck');
const zipCurve=new T.CatmullRomCurve3(torsoRings.slice(1,-1).map(([y,,rz,z])=>new T.Vector3(0,y,z+rz+.003)));makeSkinned(new T.TubeGeometry(zipCurve,24,.0025,5,false),zip,'jacket zipper','Spine2');
for(const side of ['Left','Right']){
 const shoulder=positions[side+'Arm'],elbow=positions[side+'ForeArm'],wrist=positions[side+'Hand'];
 const direction=wrist.clone().sub(elbow).normalize(),end=wrist.clone().addScaledVector(direction,-.065);
 const curve=new T.CatmullRomCurve3([shoulder.clone().lerp(new T.Vector3(0,shoulder.y,.015),.08),shoulder.clone().lerp(elbow,.48),elbow,end]);
 const sleeve=new T.TubeGeometry(curve,24,1,24,false),position=sleeve.getAttribute('position');
 for(let r=0;r<=24;r++){const t=r/24,c=curve.getPointAt(t),radius=.077*(1-t)+.041*t+.0015*Math.sin(t*40);for(let j=0;j<=24;j++){const i=r*25+j,p=new T.Vector3().fromBufferAttribute(position,i).sub(c).multiplyScalar(radius).add(c);position.setXYZ(i,p.x,p.y,p.z);}}
 sleeve.computeVertexNormals();makeSkinned(sleeve,shirt,side+' fitted sleeve');
 const cuff=new T.TorusGeometry(.041,.006,8,36).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),direction));cuff.translate(...end.toArray());makeSkinned(cuff,trim,side+' sleeve cuff',side+'ForeArm');
 const s=side==='Left'?1:-1;const pocket=new T.CatmullRomCurve3([new T.Vector3(s*.08,hipY+.21,.143),new T.Vector3(s*.105,hipY+.15,.137),new T.Vector3(s*.135,hipY+.095,.119)]);makeSkinned(new T.TubeGeometry(pocket,10,.005,5,false),trim,side+' jacket pocket','Spine2');
}
makeSkinned(meshFromFaces(data.groups.body,p=>region(p)==='pants'&&p.y>.085,.017),pants,'dark blue trousers');
const topY=1.75,hairCenter=new T.Vector3(0,topY-.092,positions.Head.z+.012);
const scalpPoint=(theta,phi)=>new T.Vector3(Math.sin(theta)*Math.cos(phi)*.084,Math.cos(theta)*.103,Math.sin(theta)*Math.sin(phi)*.107).add(hairCenter);
const hp=[],hu=[],hi=[];for(let row=0;row<=16;row++)for(let col=0;col<=48;col++){const phi=col/48*Math.PI*2,end=1.45+.43*(1-Math.max(0,Math.sin(phi)))+.025*Math.sin(phi*3),theta=row/16*end;hp.push(...scalpPoint(theta,phi).toArray());hu.push(col/48,row/16);if(row<16&&col<48){const k=row*49+col;if(row>0)hi.push(k,k+1,k+49);hi.push(k+1,k+50,k+49);}}
const scalp=new T.BufferGeometry();scalp.setAttribute('position',new T.Float32BufferAttribute(hp,3));scalp.setAttribute('uv',new T.Float32BufferAttribute(hu,2));scalp.setIndex(hi);scalp.computeVertexNormals();makeSkinned(scalp,hair,'soft side-part hair','Head');
for(let i=0;i<34;i++){const phi=i/34*Math.PI*2,points=[];for(let k=0;k<6;k++){const t=k/5;points.push(scalpPoint(.25+t*1.08,phi+t*.16).add(new T.Vector3(0,.0015,0)));}makeSkinned(new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.0014,3,false),hair,'hair strand','Head');}
for(const side of ['Left','Right']){
  const s=side==='Left'?'l':'r',eye=joint(s+'-eye');
  const sphere=new T.SphereGeometry(.012,16,12).translate(...eye.toArray());makeSkinned(sphere,mat('eye-white',0xc4c5b8,.32),side+' eye','Head');
  makeSkinned(new T.SphereGeometry(.0053,12,8).scale(1,1,.35).translate(eye.x,eye.y,eye.z+.0112),mat('iris',0x342c20,.35),side+' iris','Head');
  const brow=new T.CatmullRomCurve3([new T.Vector3(eye.x-.012,eye.y+.017,eye.z+.006),new T.Vector3(eye.x,eye.y+.022,eye.z+.009),new T.Vector3(eye.x+.014,eye.y+.017,eye.z+.004)]);makeSkinned(new T.TubeGeometry(brow,10,.0018,4,false),hair,side+' eyebrow','Head');
  const ankle=positions[side+'Foot'];
  const sp=[],su=[],si=[],rings=[[.025,.047,.126,.064],[.04,.055,.145,.062],[.075,.056,.142,.06],[.10,.052,.135,.054],[.128,.043,.098,.025],[.15,.037,.063,-.005]];
  rings.forEach(([y,rx,rz,z],r)=>{for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;sp.push(ankle.x+Math.cos(a)*rx,y,ankle.z+z+Math.sin(a)*rz);su.push(i/32,r/(rings.length-1));if(r&&i<32){const n=r*33+i;si.push(n,n+1,n-33,n+1,n-32,n-33);}}});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(sp,3));g.setAttribute('uv',new T.Float32BufferAttribute(su,2));g.setIndex(si);g.computeVertexNormals();makeSkinned(g,shoe,side+' canvas sneaker',side+'Foot');
  const bottom=new RoundedBoxGeometry(.111,.032,.28,3,.013);bottom.translate(ankle.x,.022,ankle.z+.07);makeSkinned(bottom,sole,side+' rubber sole',side+'Foot');
  for(let i=0;i<4;i++)makeSkinned(new T.BoxGeometry(.057,.003,.005).translate(ankle.x,.139,ankle.z+.03+i*.014),sole,side+' lace '+i,side+'Foot');
}
const bagPosition=new T.Vector3(0,positions.Spine2.y-.12,-.15);
makeSkinned(new RoundedBoxGeometry(.26,.34,.13,3,.035).translate(...bagPosition.toArray()),bag,'canvas backpack','Spine2');
makeSkinned(new RoundedBoxGeometry(.205,.14,.05,3,.016).translate(0,bagPosition.y-.065,-.23),bag,'backpack pocket','Spine2');
for(const s of [-1,1]){
  const curve=new T.CatmullRomCurve3([new T.Vector3(s*.11,bagPosition.y-.12,-.1),new T.Vector3(s*.115,bagPosition.y+.22,-.045),new T.Vector3(s*.12,bagPosition.y+.22,.1),new T.Vector3(s*.13,bagPosition.y-.12,.105)]);
  makeSkinned(new T.TubeGeometry(curve,16,.012,5,false),bag,'backpack strap','Spine2');
}
const batches=new Map();for(const child of [...root.children])if(child instanceof T.SkinnedMesh){const list=batches.get(child.material)??[];list.push(child);batches.set(child.material,list);}
for(const [material,meshes] of batches){if(meshes.length<2)continue;const geometry=mergeGeometries(meshes.map(mesh=>mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()));if(!geometry)throw new Error('Unable to merge character material');meshes.forEach(mesh=>root.remove(mesh));const mesh=new T.SkinnedMesh(geometry,material);mesh.name=material.name;root.add(mesh);mesh.bind(skeleton);}
root.updateMatrixWorld(true);
root.userData={source:'MakeHuman base mesh and helpers; CC0 1.0. Clothing, rigging and backpack by this project.',proportion:'1.75 m authoring height'};
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}async readAsDataURL(blob){this.result=`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onloadend?.();}};
const binary=await new GLTFExporter().parseAsync(root,{binary:true});
await writeFile('public/assets/characters/student-natural.glb',Buffer.from(binary));
await MeshoptEncoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const doc=await io.read('public/assets/characters/student-natural.glb');await doc.transform(dedup(),weld(),prune({keepAttributes:true}),meshopt({encoder:MeshoptEncoder,level:'medium'}));await io.write('public/assets/characters/student-natural.glb',doc);
console.log('Natural proportion clothed student exported.');
