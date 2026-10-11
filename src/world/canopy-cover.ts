import * as T from 'three';
import type {TreeSpot} from './vegetation.ts';

type CrownAssets={map:T.Texture;center:T.Vector3;extent:number;height:number;frames:number};
export const canopyCoverFades = new WeakMap<T.Object3D,{value:number}>();
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
  shader.vertexShader='attribute float instanceView;\nattribute float instanceNextView;\nattribute float instanceViewMix;\nvarying vec2 vNextCrownUv;\nvarying float vCrownMix;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
   vNextCrownUv=vec2((vMapUv.x*.998+.001+instanceNextView)/${assets.frames.toFixed(1)},vMapUv.y);
   vCrownMix=instanceViewMix;
   vMapUv.x=(vMapUv.x*.998+.001+instanceView)/${assets.frames.toFixed(1)};`);
  shader.fragmentShader='uniform float uCrownFade;\nuniform float uFoliageLight;\nvarying vec2 vNextCrownUv;\nvarying float vCrownMix;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\ndiffuseColor.a*=uCrownFade;');
  // Blend covered colors before alpha testing, so transparent atlas padding
  // cannot darken the leaf edge. Outside a transition only one view is sampled.
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec4 crownSample=texture2D(map,vMapUv);
   if(vCrownMix>0.0){vec4 otherCrown=texture2D(map,vNextCrownUv);float alpha=mix(crownSample.a,otherCrown.a,vCrownMix);crownSample=vec4(mix(crownSample.rgb*crownSample.a,otherCrown.rgb*otherCrown.a,vCrownMix)/max(alpha,0.00001),alpha);}
   diffuseColor*=crownSample;
   diffuseColor.rgb*=.18+.82*uFoliageLight;`);
 };
 material.customProgramCacheKey=()=> 'gulou-crown-impostor-v5';
 const geometry=new T.PlaneGeometry(1,1),views=new T.InstancedBufferAttribute(new Float32Array(trees.length),1),nextViews=new T.InstancedBufferAttribute(new Float32Array(trees.length),1),mixes=new T.InstancedBufferAttribute(new Float32Array(trees.length),1);
 geometry.setAttribute('instanceView',views);geometry.setAttribute('instanceNextView',nextViews);geometry.setAttribute('instanceViewMix',mixes);
 const mesh=new T.InstancedMesh(geometry,material,trees.length),dummy=new T.Object3D(),delta=new T.Vector3(),lastCamera=new T.Vector3(NaN,NaN,NaN);
 const info=transforms.map(matrix=>{const position=assets.center.clone().applyMatrix4(matrix),scale=new T.Vector3().setFromMatrixScale(matrix);return{position,width:assets.extent*(scale.x+scale.z)/2,height:assets.extent*scale.y,yaw:Math.atan2(matrix.elements[8],matrix.elements[10])};});
 const update=(camera:T.Vector3)=>{
  // Tree transforms are fixed; only the exact camera position changes these buffers.
  if(lastCamera.equals(camera))return;
  info.forEach((tree,i)=>{
   delta.copy(camera).sub(tree.position);const elevation=Math.atan2(delta.y,Math.hypot(delta.x,delta.z)),top=elevation>Math.PI*3/8;
   let frame=assets.frames-1,nextFrame=frame,mix=0;
   if(!top){
    const az=(Math.atan2(delta.x,delta.z)-tree.yaw)/(Math.PI/2),layer=elevation>Math.PI/8&&assets.frames>5?4:0;
    frame=((Math.round(az)%4)+4)%4+layer;nextFrame=frame;
    // Ease across the nearest-view boundary over 16 degrees. Wrap within the
    // current four-view elevation row, including the last-to-first boundary.
    const lower=Math.floor(az),t=T.MathUtils.smoothstep(az-lower,.5-8/90,.5+8/90);
    if(t>0&&t<1){frame=((lower%4)+4)%4+layer;nextFrame=((lower+1)%4+4)%4+layer;mix=t;}
   }
   dummy.position.copy(tree.position);dummy.up.set(0,top?0:1,top?1:0);dummy.lookAt(camera);dummy.scale.set(tree.width,tree.height,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   views.setX(i,frame);nextViews.setX(i,nextFrame);mixes.setX(i,mix);
  });mesh.instanceMatrix.needsUpdate=true;views.needsUpdate=true;nextViews.needsUpdate=true;mixes.needsUpdate=true;lastCamera.copy(camera);
 };
 update(new T.Vector3(0,10,100));mesh.computeBoundingSphere();mesh.name='complete crown coverage across LOD transitions';mesh.castShadow=false;
 canopyCoverFades.set(mesh,fade);
 return{mesh,fade,update};
}
