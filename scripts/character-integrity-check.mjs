import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import * as T from 'three';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
async function inspect(path,checkWaist=false){
 const doc=await io.read(path),root=doc.getRoot();let triangles=0,vertices=0;
 const waistMeshes=[];
 const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 for(const mesh of root.listMeshes())for(const primitive of mesh.listPrimitives()){
  const position=primitive.getAttribute('POSITION'),weights=primitive.getAttribute('WEIGHTS_0'),joints=primitive.getAttribute('JOINTS_0');
  const materialName=primitive.getMaterial()?.getName();
  if(checkWaist&&['student-denim','student-cotton','student-tee'].includes(materialName)){
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(position.getArray(),3));
   if(primitive.getIndices())geometry.setIndex(new T.BufferAttribute(primitive.getIndices().getArray(),1));
   const visible=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));visible.name=materialName;waistMeshes.push(visible);
  }
  assert.ok(weights&&joints,`${path}: retained skinning`);
  triangles+=(primitive.getIndices()?.getCount()??position.getCount())/3;vertices+=position.getCount();
  for(const semantic of primitive.listSemantics())assert.ok(primitive.getAttribute(semantic).getArray().every(Number.isFinite),`${path}: finite ${semantic}`);
  for(let i=0;i<position.getCount();i++){
   const p=position.getElement(i,[]),w=weights.getElement(i,[]),j=joints.getElement(i,[]);
   assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<.002,`${path}: normalized skin weights`);
   assert.ok(w.every(x=>x>=0&&x<=1),`${path}: bounded skin weights`);
   assert.ok(j.every(x=>Number.isInteger(x)&&x>=0&&x<root.listSkins()[0].listJoints().length),`${path}: valid joint indices`);
   if(checkWaist&&primitive.getMaterial()?.getName()==='student-denim'&&p[1]>.934353-.034){
    const hipIndex=root.listSkins()[0].listJoints().findIndex(n=>n.getName()==='mixamorigHips');
    assert.ok(w.every((weight,k)=>weight<.0001||j[k]===hipIndex),`${path}: waistband follows pelvis instead of swinging thighs`);
   }
   p.forEach((v,k)=>{bounds.min[k]=Math.min(bounds.min[k],v);bounds.max[k]=Math.max(bounds.max[k],v);});
  }
 }
 if(checkWaist){
  for(const x of[-.12,-.06,0,.06,.12])for(const y of[.914,.934,.954]){
   const hits=new T.Raycaster(new T.Vector3(x,y,.5),new T.Vector3(0,0,-1)).intersectObjects(waistMeshes,false);
   assert.ok(hits.length&&hits[0].object.name!=='student-denim',`${path}: shirt covers waistband at ${x},${y}`);
  }
 }
 return {triangles,vertices,materials:root.listMaterials().length,bytes:(await readFile(path)).length,bounds,joints:root.listSkins()[0].listJoints().map(n=>({name:n.getName(),translation:n.getTranslation(),rotation:n.getRotation(),scale:n.getScale()}))};
}
const report={scope:'GLB geometry/skinning and size guardrails; normal UI pose/visual QA separate',characters:{}};
for(const kind of ['male','female']){
 const before=await inspect(`docs/validation/v0.107/student-${kind}-before.glb`),after=await inspect(`public/assets/characters/student-${kind}.glb`,true);
 assert.deepEqual(after.joints,before.joints,`${kind}: animation rig unchanged`);
 assert.ok(after.triangles<before.triangles*1.1,`${kind}: triangle increase under 10%`);
 assert.ok(after.materials<=before.materials+2,`${kind}: no material explosion`);
 assert.ok(after.bytes<before.bytes*1.2,`${kind}: asset size increase under 20%`);
 assert.ok(Math.abs(after.bounds.min[1]-before.bounds.min[1])<.002,`${kind}: unchanged feet origin`);
 assert.ok(Math.abs(after.bounds.max[1]-before.bounds.max[1])<.04,`${kind}: consistent authoring height`);
 const summary=x=>({triangles:x.triangles,vertices:x.vertices,materials:x.materials,bytes:x.bytes});
 report.characters[kind]={before:summary(before),after:summary(after),joints:after.joints.length};
}
assert.deepEqual(await readFile('public/assets/characters/student-natural.glb'),await readFile('public/assets/characters/student-male.glb'),'legacy male alias matches');
await writeFile(`docs/validation/v0.107/character-integrity-${Date.now()}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
