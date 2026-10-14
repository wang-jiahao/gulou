import * as T from 'three';
import {canopyCoverFades,canopyAttributeSizes} from './canopy-cover.ts';

/** Combine the tiny camera-facing crowns; keep each cell's original visibility,
 * view selection and fade. The detailed tree LODs remain in their own cells. */
export function createCanopyBatch(root:T.Group){
 const sources:{mesh:T.InstancedMesh;fade:{value:number};offset:number;relative:T.Matrix4;identity:boolean;versions:number[];lastFade:number}[]=[];
 root.updateWorldMatrix(true,true);
 const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),identity=new T.Matrix4();
 let count=0;
 root.traverse(object=>{
  const fade=canopyCoverFades.get(object);
  if(!fade||!(object instanceof T.InstancedMesh))return;
  const relative=new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld);
  sources.push({mesh:object,fade,offset:count,relative,identity:relative.equals(identity),versions:[],lastFade:NaN});count+=object.count;
 });
 if(sources.length<2)return;
 const seed=sources[0].mesh.material as T.MeshBasicMaterial;
 // A different atlas or shader cannot share this draw.
 if(sources.some(({mesh})=>!(mesh.material instanceof T.MeshBasicMaterial)||mesh.material.map!==seed.map||mesh.material.customProgramCacheKey()!==seed.customProgramCacheKey()))return;
 const geometry=new T.PlaneGeometry(1,1),material=seed.clone();
 const keys=Object.keys(canopyAttributeSizes) as (keyof typeof canopyAttributeSizes)[];
 const attributes=Object.fromEntries(keys.map(key=>[key,new T.InstancedBufferAttribute(new Float32Array(count*canopyAttributeSizes[key]),canopyAttributeSizes[key])])) as Record<typeof keys[number],T.InstancedBufferAttribute>;
 for(const key of keys)geometry.setAttribute(key,attributes[key]);
 const fades=new T.InstancedBufferAttribute(new Float32Array(count),1);geometry.setAttribute('instanceFade',fades);
 material.onBeforeCompile=(shader,renderer)=>{
  seed.onBeforeCompile(shader,renderer);
  shader.vertexShader='attribute float instanceFade; flat varying float vBatchFade;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBatchFade=instanceFade;');
  shader.fragmentShader='flat varying float vBatchFade;\n'+shader.fragmentShader.replace('diffuseColor.a*=uCrownFade;','diffuseColor.a*=vBatchFade;');
 };
 material.customProgramCacheKey=()=>seed.customProgramCacheKey()+'-batch1';
 const mesh=new T.InstancedMesh(geometry,material,count),matrix=new T.Matrix4();
 mesh.name='batched complete crown coverage';mesh.castShadow=false;
 // A whole-campus sphere would not reduce these few hundred triangles.
 // Cell range/LOD visibility still reaches the shader through per-instance fade.
 mesh.frustumCulled=false;mesh.visible=false;root.add(mesh);
 const sync=()=>{
  let visible=false;
  for(const source of sources){
   const original=source.mesh;let shown=original.visible;
   for(let parent=original.parent;shown&&parent;parent=parent.parent)shown=parent.visible;
   const fade=shown?source.fade.value:0;visible ||= fade>0;
   if(fade!==source.lastFade){(fades.array as Float32Array).fill(fade,source.offset,source.offset+original.count);source.lastFade=fade;fades.needsUpdate=true;}
   // Preserve the source's stationary-camera cache instead of uploading all
   // instances again when neither the view nor the fade has changed.
   if(source.versions[0]!==original.instanceMatrix.version){
    if(source.identity)(mesh.instanceMatrix.array as Float32Array).set(original.instanceMatrix.array,source.offset*16);
    else for(let i=0;i<original.count;i++){original.getMatrixAt(i,matrix);matrix.premultiply(source.relative);mesh.setMatrixAt(source.offset+i,matrix);}
    source.versions[0]=original.instanceMatrix.version;mesh.instanceMatrix.needsUpdate=true;
   }
   keys.forEach((key,index)=>{const input=original.geometry.getAttribute(key) as T.InstancedBufferAttribute;if(source.versions[index+1]!==input.version){(attributes[key].array as Float32Array).set(input.array,source.offset*input.itemSize);source.versions[index+1]=input.version;attributes[key].needsUpdate=true;}});
   // updateVisibility sets this again on the next vegetation update.
   original.visible=false;
  }
  mesh.visible=visible;
 };
 return{mesh,sync};
}
