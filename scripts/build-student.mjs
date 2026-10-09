import * as T from 'three';
import {bakeStudentSkin} from './character-skin.mjs';
import {clipGarmentHeight,garmentBoundaryBand} from './character-tailoring.mjs';
import {loadCharacterSource} from './character-source.mjs';
import {subdivideCharacterSurface,recomputeCharacterNormals} from './character-surface.mjs';
import {buildStudentHair} from './character-hair.mjs';
import {attachStudentHairFlow} from './character-hair-texture.mjs';
import {buildStudentEyes} from './character-eyes.mjs';
import {createStudentWeights} from './character-weights.mjs';
import {buildStudentShoes} from './character-shoes.mjs';
import {relaxGarment,fitNeckOpening,fitLowerGarment,finishSleeve} from './character-outfit.mjs';
import {buildReferenceOutfit,addReferenceTrouserDetails,attachReferenceFabric} from './character-reference-outfit.mjs';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder} from 'meshoptimizer';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const supportedArgs=new Set(['--female','--preview']);
for(const arg of process.argv.slice(2))if(!supportedArgs.has(arg))throw new Error(`Unknown character build option: ${arg}`);
const gender=process.argv.includes('--female')?'female':'male';
const female=gender==='female';
// Both outputs use the reference outfit; preview changes only the path.
const preview=process.argv.includes('--preview');
const data=await loadCharacterSource(gender);
// CC0 facial target adds a restrained relaxed expression to the independent
// adult shape. Data deltas are in original source units, before normalization.
for(const line of (await readFile('assets/source-models/character/mouth-corner-puller.target','utf8')).split('\n')){
 if(!line.trim()||line.startsWith('#'))continue;
 const [id,...delta]=line.trim().split(/\s+/).map(Number);
 if(!Number.isInteger(id)||!data.vertices[id]||delta.length!==3||!delta.every(Number.isFinite))throw new Error('Invalid facial target');
 if(data.vertices[id][1]<1.45)throw new Error('Facial target unexpectedly changes body');
 for(let axis=0;axis<3;axis++)data.vertices[id][axis]+=delta[axis]*data.normalization.scale*(female?.30:.22);
}
const sourceHip=data.joints.pelvis[1],sourceNeck=data.joints.neck[1];
const morph=p=>new T.Vector3(...p);
const v=data.vertices.map(morph);
// Reference portrait: relaxed almond eyes, narrower nose/lips and tapered jaw.
// Localized facial edits leave source eye centres and all animation joints fixed.
const faceGaussian=(value,centre,width)=>Math.exp(-(((value-centre)/width)**2));
for(const p of v){
 if(p.y<1.48||p.z<.02)continue;
 const front=T.MathUtils.smoothstep(p.z,.02,.085);
 const nose=faceGaussian(p.y,1.594,.022)*faceGaussian(p.x,0,.026)*front;
 p.x*=1-(female?.12:.16)*nose;
 const mouthY=female?1.5605:1.5555,mouth=faceGaussian(p.y,mouthY,.021)*faceGaussian(p.x,0,.036)*front;
 p.x*=1-.10*mouth;p.y=T.MathUtils.lerp(p.y,mouthY+(p.y-mouthY)*.76,mouth*.75);
 const jaw=faceGaussian(p.y,1.529,.023)*T.MathUtils.smoothstep(Math.abs(p.x),.02,.055)*front;
 p.x*=1-(female?.08:.06)*jaw;
 // Lower the upper lid a little at the centre without moving the tear ducts.
 for(const side of ['l','r']){const eye=data.joints[side+'-eye'];const upper=faceGaussian(p.x,eye[0],.013)*faceGaussian(p.y,eye[1]+.009,.005)*T.MathUtils.smoothstep(p.z,eye[2]+.005,eye[2]+.013);p.y-=.0013*upper;}
}
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
const skin=mat('student-skin',0xffffff,.59),shirt=mat('student-cotton',female?0xcfc5ae:0x354c61,.9),pants=mat('student-denim',female?0x63788a:0x536371,.93),hair=mat('student-hair',female?0x30231f:0x242322,.86),shoe=mat('student-shoes',0xd4d6d0),sole=mat('student-sole',0xc6c9c2),bag=mat('student-backpack',female?0x9b7b58:0x555d54);

const hipY=positions.Hips.y,neckY=positions.Neck.y;
pants.color.set(female?0x8b9fac:0x545557);bag.color.set(female?0xd6d1c3:0x292c2b);
const segments=definitions.filter(d=>d[2]).map(([name,,parent])=>({name:parent,tip:name,a:positions[parent],b:positions[name]}));
const segmentDistance=(point,segment)=>{const d=segment.b.clone().sub(segment.a);const t=T.MathUtils.clamp(point.clone().sub(segment.a).dot(d)/d.lengthSq(),0,1);return point.distanceTo(segment.a.clone().addScaledVector(d,t));};
const weights=createStudentWeights({positions,indices,definitions,hipY,neckY});
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
const smoothBody=(faces,filter)=>subdivideCharacterSurface(v,data.uvs,faces,filter);
const skinGeometry=smoothBody(data.groups.body,p=>{
  if(p.y>neckY-.070)return true;
  const side=p.x>0?'Left':'Right',wrist=positions[side+'Hand'],axis=wrist.clone().sub(positions[side+'ForeArm']).normalize();
  return Math.abs(p.x)>.32&&p.clone().sub(wrist).dot(axis)>-.06;
});
const skinPos=skinGeometry.getAttribute('position');
// Only the head/neck and hands are exposed. Continue the neck inside the
// garment instead of retaining anatomical shoulder patches through the cloth.
for(let i=0;i<skinPos.count;i++){
 const p=new T.Vector3().fromBufferAttribute(skinPos,i);
 if(Math.abs(p.x)>.25||p.y>neckY+.025)continue;
 const q=T.MathUtils.smoothstep(neckY+.025-p.y,0,.040),angle=Math.atan2(p.z-.014,p.x);
 const r=Math.hypot(p.x,p.z-.014),limit=1/Math.hypot(Math.cos(angle)/.067,Math.sin(angle)/.073);
 const nr=T.MathUtils.lerp(r,Math.min(r,limit),q);
 // Hidden lower neck tapers inside the independent white inner layer.
 const under=T.MathUtils.smoothstep(neckY-.018-p.y,0,.030);
 skinPos.setXYZ(i,Math.cos(angle)*nr*(1-.32*under),p.y,.014+Math.sin(angle)*nr*(1-.45*under));
}
recomputeCharacterNormals(skinGeometry);
for(let i=0;i<skinPos.count;i++){
 const point=new T.Vector3().fromBufferAttribute(skinPos,i);
 if(Math.abs(point.x)>.32){
  const side=point.x>0?'Left':'Right';
  for(const [id,weight]of weights(point))if(weight>0&&!definitions[id][0].startsWith(side+'Finger')&&definitions[id][0]!==side+'Hand'&&definitions[id][0]!==side+'ForeArm')throw new Error('Hand/wrist skin must stay in the same forearm, hand and finger family');
 }
}
const skinAtlas=await bakeStudentSkin(skinGeometry,gender);
skin.roughness=1;makeSkinned(skinGeometry,skin,'soft face neck and hands');
// The continuous garment proxy preserves crotch and hip topology during motion.
const trouserGeometry=smoothBody(data.groups['helper-tights'],p=>p.y<hipY+.035&&p.y>.105&&Math.abs(p.x)<.28),trouserPositions=trouserGeometry.getAttribute('position');
for(let i=0;i<trouserPositions.count;i++){
 const y=trouserPositions.getY(i);if(y>hipY-.10)continue;const side=trouserPositions.getX(i)>0?'Left':'Right',hip=positions[side+'UpLeg'],knee=positions[side+'Leg'],ankle=positions[side+'Foot'];
 const a=y>knee.y?hip:knee,c=y>knee.y?knee:ankle,t=T.MathUtils.clamp((a.y-y)/(a.y-c.y),0,1),center=a.clone().lerp(c,t),angle=Math.atan2(trouserPositions.getZ(i)-center.z,trouserPositions.getX(i)-center.x);
 const taper=T.MathUtils.clamp((hipY-.13-y)/(hipY-.24),0,1),rx=(female?.087:.090)*(1-taper)+(female?.072:.074)*taper,rz=.089*(1-taper)+.073*taper,fold=1+Math.sin(y*54+angle*2)*.012;
 const blend=T.MathUtils.smoothstep(hipY-y,.10,.30);trouserPositions.setXYZ(i,T.MathUtils.lerp(trouserPositions.getX(i),center.x+Math.cos(angle)*rx*fold,blend),y,T.MathUtils.lerp(trouserPositions.getZ(i),center.z+Math.sin(angle)*rz*fold,blend));
}
recomputeCharacterNormals(trouserGeometry);makeSkinned(trouserGeometry,pants,'straight leg trousers','trousers');
addReferenceTrouserDetails({female,geometry:trouserGeometry,hipY,positions,makeSkinned,pants});

// A continuous tailored jacket shell from the anatomical garment topology.
// Shoulder, sleeve and torso vertices share the same surface and skinning.
const fit=female?.94:1;
const tee=mat('student-tee',female?0x879b8e:0xd5d2c5,.94),trim=mat('jacket-trim',female?0xafa38d:0x304251,.92);
let jacketGeometry=smoothBody(data.groups['helper-tights'],()=>true);
const jp=jacketGeometry.getAttribute('position');
for(let i=0;i<jp.count;i++){
 const p=new T.Vector3().fromBufferAttribute(jp,i),side=p.x>0?'Left':'Right';
 const armSegments=segments.filter(s=>[side+'Arm',side+'ForeArm'].includes(s.name));
 const dist=Math.min(...armSegments.map(s=>segmentDistance(p,s)));
 if(Math.abs(p.x)>.19*fit&&dist<.105){
  const seg=armSegments.reduce((a,b)=>segmentDistance(p,a)<segmentDistance(p,b)?a:b),d=seg.b.clone().sub(seg.a);
  const c=seg.a.clone().addScaledVector(d,T.MathUtils.clamp(p.clone().sub(seg.a).dot(d)/d.lengthSq(),0,1));
  const radial=p.clone().sub(c),amount=T.MathUtils.lerp(.022,.011,T.MathUtils.smoothstep(Math.abs(p.x),.2,.46));
  p.addScaledVector(radial.normalize(),amount);
 }else{
  const t=T.MathUtils.clamp((p.y-hipY)/(.42),0,1),angle=Math.atan2(p.z-.016,p.x);
  const waist=Math.exp(-(((t-.32)/.22)**2)),chest=T.MathUtils.smoothstep(t,.35,.75);
  const rx=female?.183+.006*chest-.004*waist:.191+.012*chest-.014*waist;
  const rz=female?.124+.011*chest-.010*waist:.134+.008*chest-.010*waist;
  const target=new T.Vector3(Math.cos(angle)*rx,p.y,.016+Math.sin(angle)*rz);
  const blend=1-T.MathUtils.smoothstep(p.y,neckY-.15,neckY-.005);
  p.lerp(target,blend*.96);
  p.z+=Math.sign(p.z-.016)*.009*(1-blend);
 }
 jp.setXYZ(i,p.x,p.y,p.z);
}
relaxGarment(jacketGeometry,p=>p.y>hipY-.05&&p.y<neckY+.02);
recomputeCharacterNormals(jacketGeometry);
const hemY=hipY-.015,collarY=neckY-.015;
fitNeckOpening(jacketGeometry,skinGeometry,collarY,female?.009:.008);
recomputeCharacterNormals(jacketGeometry);
jacketGeometry=clipGarmentHeight(jacketGeometry,hemY,collarY);
fitLowerGarment(jacketGeometry,trouserGeometry,hemY);
recomputeCharacterNormals(jacketGeometry);
const cuffs={},sleeveLinings={};
for(const side of ['Left','Right']){
 const result=finishSleeve(jacketGeometry,positions[side+'Hand'],positions[side+'Hand'].clone().sub(positions[side+'ForeArm']));
 jacketGeometry=result.geometry;cuffs[side]=result.cuff;sleeveLinings[side]=result.lining;
}
recomputeCharacterNormals(jacketGeometry);
const clothing=buildReferenceOutfit({female,geometry:jacketGeometry,hipY,neckY,hemY,collarY,makeSkinned,shirt,tee,trim});
const rib=clothing.rib;
const jacketSurface=new T.Mesh(jacketGeometry,new T.MeshBasicMaterial({side:T.DoubleSide})),jacketRay=new T.Raycaster();
function onJacket(points){return points.map(p=>{jacketRay.set(new T.Vector3(p.x,p.y,.5),new T.Vector3(0,0,-1));const h=jacketRay.intersectObject(jacketSurface,false)[0];if(h)p.z=h.point.z+.002;return p;});}
const tube=(points,radius,material,name,force)=>makeSkinned(new T.TubeGeometry(new T.CatmullRomCurve3(onJacket(points)),24,radius,8,false),material,name,force);
// Round collar and raised seam details sit on the actual shirt, with no triangular cut-outs.
for(const side of ['Left','Right']){
 const sign=side==='Left'?1:-1;
 if(!female)tube([new T.Vector3(sign*.107,hipY+.13,.151),new T.Vector3(sign*.148,hipY+.205,.120)],.0025,trim,side+' welt pocket','torso');
 makeSkinned(cuffs[side],rib,side+' fitted ribbed cuff',side+'ForeArm');
 makeSkinned(sleeveLinings[side],shirt,side+' inner sleeve lining',side+'ForeArm');
}
const {surface,surfaceRay}=buildStudentHair({female,skinGeometry,makeSkinned,hair});
for(const side of ['Left','Right']){
  const s=side==='Left'?'l':'r',eye=joint(s+'-eye');
  buildStudentEyes({female,centre:eye,side,makeSkinned});
  const browPosition=[],browIndex=[],sign=side==='Left'?1:-1;
  for(let i=0;i<=24;i++){
    const t=i/24,x=sign*(Math.abs(eye.x)-.012+t*.030),y=eye.y+.007+(female?.0030:.0023)*Math.sin(Math.PI*t)-.0015*t;
    const width=(female?.0015:.0019)*Math.sin(Math.PI*t)**.45*(1-.45*t);
    for(const edge of [-1,1]){
      const yy=y+width*edge;surfaceRay.set(new T.Vector3(x,yy,.5),new T.Vector3(0,0,-1));
      const hit=surfaceRay.intersectObject(surface,false)[0];
      browPosition.push(x,yy,(hit?hit.point.z:eye.z+.019)+.00035);
    }
    if(i<24){const k=i*2;if(sign>0)browIndex.push(k,k+2,k+1,k+1,k+2,k+3);else browIndex.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const browGeometry=new T.BufferGeometry();browGeometry.setAttribute('position',new T.Float32BufferAttribute(browPosition,3));browGeometry.setAttribute('uv',new T.Float32BufferAttribute(Array.from({length:50},(_,i)=>[Math.floor(i/2)/24,i%2]).flat(),2));browGeometry.setIndex(browIndex);browGeometry.computeVertexNormals();
  makeSkinned(browGeometry,mat('student-eyebrow',female?0x392821:0x302923,.95),side+' surface eyebrow','Head');
}
buildStudentShoes({female,positions,makeSkinned,shoe,sole});
const bagPosition=new T.Vector3(0,positions.Spine2.y-.12,-.15);
makeSkinned(new RoundedBoxGeometry(.245,.32,.115,4,.045).translate(...bagPosition.toArray()),bag,'canvas backpack','Spine2');
makeSkinned(new RoundedBoxGeometry(.19,.12,.045,4,.022).translate(0,bagPosition.y-.065,-.23),bag,'backpack pocket','Spine2');
// Flat canvas shoulder straps follow the actual jacket on both edges. Sharing
// its skin field keeps the shoulder contact when the arms leave the T pose.
for(const sign of [-1,1]){
 const verts=[],uv=[],idx=[],steps=40;
 for(let j=0;j<=steps;j++){
  const t=j/steps,a=T.MathUtils.lerp(2.95,-.80,t),d=new T.Vector3(0,Math.sin(a),Math.cos(a));
  for(const [edge,layer]of [[-1,0],[1,0],[1,1],[-1,1]]){
   const x=sign*(.130+.012*T.MathUtils.smoothstep(t,.50,1))+edge*.012;
   const center=new T.Vector3(x,neckY-.19,.016);
   jacketRay.set(center.clone().addScaledVector(d,.45),d.clone().negate());
   const hit=jacketRay.intersectObject(jacketSurface,false)[0];
   if(!hit)throw Error('Backpack strap has no jacket support');
   const p=hit.point.clone().addScaledVector(d,.003+layer*.003);
   verts.push(...p.toArray());uv.push((edge+1)/2,t*6);
  }
  if(j<steps)for(let edge=0;edge<4;edge++){
   const a=j*4+edge,b=j*4+(edge+1)%4,c=a+4,e=b+4;idx.push(a,b,c,b,e,c);
  }
 }
 idx.push(0,2,1,0,3,2,steps*4,steps*4+1,steps*4+2,steps*4,steps*4+2,steps*4+3);
 const strap=new T.BufferGeometry();strap.setAttribute('position',new T.Float32BufferAttribute(verts,3));strap.setAttribute('uv',new T.Float32BufferAttribute(uv,2));strap.setIndex(idx);strap.computeVertexNormals();
 makeSkinned(strap,bag,'fitted canvas backpack strap','jacket');
}
const batches=new Map();for(const child of [...root.children])if(child instanceof T.SkinnedMesh){const list=batches.get(child.material)??[];list.push(child);batches.set(child.material,list);}
for(const [material,meshes] of batches){if(meshes.length<2)continue;const geometry=mergeGeometries(meshes.map(mesh=>mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()));if(!geometry)throw new Error('Unable to merge character material');meshes.forEach(mesh=>root.remove(mesh));const mesh=new T.SkinnedMesh(geometry,material);mesh.name=material.name;root.add(mesh);mesh.bind(skeleton);}
root.updateMatrixWorld(true);
root.userData={gender,design:'user-reference young-adult campus pair, October 2026',source:'MakeHuman base mesh and helpers; CC0 1.0. Clothing, rigging and backpack by this project.',proportion:'1.75 m authoring height'};
root.userData.fashion={design:female?'sage V neck knit':'navy open collar jacket',...clothing.report};
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}async readAsDataURL(blob){this.result=`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onloadend?.();}};
const output=preview?`docs/validation/v0.112/reference/student-${gender}.glb`:`public/assets/characters/student-${gender}.glb`;
if(preview){
 await mkdir('docs/validation/v0.112/reference',{recursive:true});
 try{await copyFile(output,output.replace('.glb',`-previous-${Date.now()}.glb`),constants.COPYFILE_EXCL);}catch(error){if(error.code!=='ENOENT')throw error;}
}
const binary=await new GLTFExporter().parseAsync(root,{binary:true});
await writeFile(output,Buffer.from(binary));
await MeshoptEncoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const doc=await io.read(output);
const skinMaterial=doc.getRoot().listMaterials().find(m=>m.getName()==='student-skin');
skinMaterial.setBaseColorTexture(doc.createTexture('original skin pigment').setImage(skinAtlas.albedo).setMimeType('image/png'));
skinMaterial.setMetallicRoughnessTexture(doc.createTexture('original skin roughness').setImage(skinAtlas.roughness).setMimeType('image/png'));
await attachStudentHairFlow(doc);
await attachReferenceFabric(doc,{female});
await doc.transform(dedup(),weld(),prune({keepAttributes:true}),meshopt({encoder:MeshoptEncoder,level:'medium'}));await io.write(output,doc);

if(!female&&!preview)await copyFile(output,'public/assets/characters/student-natural.glb');
console.log(gender,'student exported:',output);
