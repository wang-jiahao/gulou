import * as T from 'three';
import type {TreeSpot} from './vegetation.ts';

type CrownAssets={map:T.Texture;center:T.Vector3;extent:number;height:number;frames:number};
let assets:Promise<CrownAssets>|undefined;
export function loadCanopyCoverAssets(){
 return assets??=(async()=>{const[map,response]=await Promise.all([new T.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}assets/vegetation/canopy-impostor.webp`),fetch(`${import.meta.env.BASE_URL}assets/vegetation/canopy-impostor.json`)]);if(!response.ok)throw new Error('远景树冠资料加载失败');const data=await response.json();map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;return{map,center:new T.Vector3(...data.center as [number,number,number]),extent:data.extent,height:data.size[1],frames:data.frames??5};})();
}
/** Nine views baked from the same CC0 near tree, at three elevations, including its supplemental
 * leaves. A camera-facing crown preserves the source silhouette at flight range.
 * It is ready with the sector and fades in before sparse leaf LODs take over. */
export function createCanopyCover(trees:TreeSpot[],light:{value:number},transforms:T.Matrix4[],assets:CrownAssets){
 // Multisample coverage keeps leaf edges soft without blending a ghost crown
 // over the model behind it. Write depth so overlapping crowns occlude correctly.
 // Apply distance fade after the texture cutout, preserving gradual coverage.
 const fade={value:0},material=new T.MeshBasicMaterial({name:'continuous distant canopy',map:assets.map,color:new T.Color(1.1,1.1,1.1),alphaTest:.28,transparent:false,alphaToCoverage:true,depthWrite:true,side:T.DoubleSide,forceSinglePass:true,toneMapped:false});
 material.onBeforeCompile=shader=>{
  shader.uniforms.uCrownFade=fade;shader.uniforms.uFoliageLight=light;
  shader.vertexShader='attribute float instanceView;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv.x=(vMapUv.x*.998+.001+instanceView)/'+assets.frames.toFixed(1)+';');
  shader.fragmentShader='uniform float uCrownFade;\nuniform float uFoliageLight;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\ndiffuseColor.a*=uCrownFade;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb*=.18+.82*uFoliageLight;');
 };
 material.customProgramCacheKey=()=> 'gulou-crown-impostor-v4';
 const geometry=new T.PlaneGeometry(1,1),views=new T.InstancedBufferAttribute(new Float32Array(trees.length),1);geometry.setAttribute('instanceView',views);
 const mesh=new T.InstancedMesh(geometry,material,trees.length),dummy=new T.Object3D(),delta=new T.Vector3(),lastCamera=new T.Vector3(NaN,NaN,NaN);
 const info=transforms.map(matrix=>{const position=assets.center.clone().applyMatrix4(matrix),scale=new T.Vector3().setFromMatrixScale(matrix);return{position,width:assets.extent*(scale.x+scale.z)/2,height:assets.extent*scale.y,yaw:Math.atan2(matrix.elements[8],matrix.elements[10])};});
 const update=(camera:T.Vector3)=>{
  // Tree transforms are fixed; only the exact camera position changes these buffers.
  if(lastCamera.equals(camera))return;
  info.forEach((tree,i)=>{delta.copy(camera).sub(tree.position);const elevation=Math.atan2(delta.y,Math.hypot(delta.x,delta.z)),top=elevation>Math.PI*3/8;let frame=assets.frames-1;
   if(!top){const a=Math.atan2(delta.x,delta.z)-tree.yaw;frame=((Math.round(a/(Math.PI/2))%4)+4)%4+(elevation>Math.PI/8&&assets.frames>5?4:0);}
   dummy.position.copy(tree.position);dummy.up.set(0,top?0:1,top?1:0);dummy.lookAt(camera);dummy.scale.set(tree.width,tree.height,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);views.setX(i,frame);
  });mesh.instanceMatrix.needsUpdate=true;views.needsUpdate=true;lastCamera.copy(camera);
 };
 update(new T.Vector3(0,10,100));mesh.computeBoundingSphere();mesh.name='complete crown coverage across LOD transitions';mesh.castShadow=false;
 return{mesh,fade,update};
}
