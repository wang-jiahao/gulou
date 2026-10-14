import * as T from 'three';
import type {TreeSpot} from './vegetation.ts';

type CrownAssets={map:T.Texture;center:T.Vector3;extent:number;height:number;frames:number};
export const canopyCoverFades = new WeakMap<T.Object3D,{value:number}>();
export const canopyAttributeSizes = {instanceView:1,instanceNextView:1,instanceViewMix:1,instanceCrownProjection:4,instanceCrownBlend:4} as const;
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
  shader.vertexShader='attribute float instanceView;\nattribute float instanceNextView;\nattribute float instanceViewMix;\nattribute vec4 instanceCrownProjection;\nattribute vec4 instanceCrownBlend;\nvarying vec2 vSideCrownUv;\nvarying vec2 vTopCrownUv;\nflat varying vec4 vCrownViews;\nflat varying float vCrownElevationMix;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
   vec2 crownLocal=(vMapUv-.5)*instanceCrownBlend.xy;
   vSideCrownUv=vec2(dot(instanceCrownProjection.xy,crownLocal),dot(instanceCrownProjection.zw,crownLocal))+.5;
   vTopCrownUv=crownLocal+.5;
   vCrownViews=vec4(instanceView,instanceNextView,instanceViewMix,instanceCrownBlend.w);
   vCrownElevationMix=instanceCrownBlend.z;`);
  shader.fragmentShader='uniform float uCrownFade;\nuniform float uFoliageLight;\nvarying vec2 vSideCrownUv;\nvarying vec2 vTopCrownUv;\nflat varying vec4 vCrownViews;\nflat varying float vCrownElevationMix;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('void main() {',`vec4 crownFrame(vec2 uv,float frame){
   if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return vec4(0.);
   return texture2D(map,vec2((uv.x*.998+.001+frame)/${assets.frames.toFixed(1)},uv.y));
  }
  vec4 crownMix(vec4 a,vec4 b,float t){float alpha=mix(a.a,b.a,t);return vec4(mix(a.rgb*a.a,b.rgb*b.a,t)/max(alpha,.00001),alpha);}
  void main() {`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\ndiffuseColor.a*=uCrownFade;');
  // Blend covered colors before alpha testing, so transparent atlas padding
  // cannot darken the leaf edge. Outside a transition only one view is sampled.
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec4 crownSample=crownFrame(vSideCrownUv,vCrownViews.x);
   if(vCrownViews.z>0.0)crownSample=crownMix(crownSample,crownFrame(vSideCrownUv,vCrownViews.y),vCrownViews.z);
   if(vCrownElevationMix>0.0){
    vec4 upperCrown=crownFrame(vSideCrownUv,vCrownViews.x+4.0);
    if(vCrownViews.z>0.0)upperCrown=crownMix(upperCrown,crownFrame(vSideCrownUv,vCrownViews.y+4.0),vCrownViews.z);
    crownSample=crownMix(crownSample,upperCrown,vCrownElevationMix);
   }
   if(vCrownViews.w>0.0)crownSample=crownMix(crownSample,crownFrame(vTopCrownUv,${(assets.frames-1).toFixed(1)}),vCrownViews.w);
   diffuseColor*=crownSample;
   diffuseColor.rgb*=.18+.82*uFoliageLight;`);
 };
 material.customProgramCacheKey=()=> 'gulou-crown-impostor-v6';
 const geometry=new T.PlaneGeometry(1,1),views=new T.InstancedBufferAttribute(new Float32Array(trees.length),1),nextViews=new T.InstancedBufferAttribute(new Float32Array(trees.length),1),mixes=new T.InstancedBufferAttribute(new Float32Array(trees.length),1);
 geometry.setAttribute('instanceView',views);geometry.setAttribute('instanceNextView',nextViews);geometry.setAttribute('instanceViewMix',mixes);
 const projections=new T.InstancedBufferAttribute(new Float32Array(trees.length*4),4),blends=new T.InstancedBufferAttribute(new Float32Array(trees.length*4),4);
 geometry.setAttribute('instanceCrownProjection',projections);geometry.setAttribute('instanceCrownBlend',blends);
 const mesh=new T.InstancedMesh(geometry,material,trees.length),dummy=new T.Object3D(),delta=new T.Vector3(),lastCamera=new T.Vector3(NaN,NaN,NaN);
 const sideBasis=new T.Matrix4(),topBasis=new T.Matrix4(),sideRight=new T.Vector3(),topRight=new T.Vector3(),topUp=new T.Vector3(),origin=new T.Vector3(),upY=new T.Vector3(0,1,0),upZ=new T.Vector3(0,0,1);
 const info=transforms.map(matrix=>{const position=assets.center.clone().applyMatrix4(matrix),scale=new T.Vector3().setFromMatrixScale(matrix);return{position,width:assets.extent*(scale.x+scale.z)/2,height:assets.extent*scale.y,yaw:Math.atan2(matrix.elements[8],matrix.elements[10])};});
 const update=(camera:T.Vector3)=>{
  // Tree transforms are fixed; only the exact camera position changes these buffers.
  if(lastCamera.equals(camera))return;
  info.forEach((tree,i)=>{
   delta.copy(camera).sub(tree.position);const elevation=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));
   const topMix=T.MathUtils.smoothstep(elevation,T.MathUtils.degToRad(59.5),T.MathUtils.degToRad(75.5)),top=topMix===1;
   const elevationMix=assets.frames>5?T.MathUtils.smoothstep(elevation,T.MathUtils.degToRad(14.5),T.MathUtils.degToRad(30.5)):0;
   let frame=assets.frames-1,nextFrame=frame,mix=0;
   if(!top){
    const az=(Math.atan2(delta.x,delta.z)-tree.yaw)/(Math.PI/2),layer=elevationMix===1?4:0;
    frame=((Math.round(az)%4)+4)%4+layer;nextFrame=frame;
    // Ease across the nearest-view boundary over 16 degrees. Wrap within the
    // current four-view elevation row, including the last-to-first boundary.
    const lower=Math.floor(az),t=T.MathUtils.smoothstep(az-lower,.5-8/90,.5+8/90);
    if(t>0&&t<1){frame=((lower%4)+4)%4+layer;nextFrame=((lower+1)%4+4)%4+layer;mix=t;}
   }
   let width=tree.width,height=tree.height;
   projections.setXYZW(i,1,0,0,1);
   if(topMix>0&&topMix<1){
    // Never interpolate the billboard's up vector: that flips by 180 degrees
    // at some azimuths. Project independent side/top samples onto their union.
    sideBasis.lookAt(delta,origin,upY);topBasis.lookAt(delta,origin,upZ);
    sideRight.setFromMatrixColumn(sideBasis,0);topRight.setFromMatrixColumn(topBasis,0);topUp.setFromMatrixColumn(topBasis,1);
    const c=sideRight.dot(topRight),s=sideRight.dot(topUp);
    width=Math.max(tree.width,Math.abs(c)*tree.width+Math.abs(s)*tree.height);
    height=Math.max(tree.height,Math.abs(s)*tree.width+Math.abs(c)*tree.height);
    projections.setXYZW(i,c,s*tree.height/tree.width,-s*tree.width/tree.height,c);
   }
   blends.setXYZW(i,width/tree.width,height/tree.height,elevationMix<1?elevationMix:0,top?0:topMix);
   dummy.position.copy(tree.position);dummy.up.copy(topMix>0?upZ:upY);dummy.lookAt(camera);dummy.scale.set(width,height,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   views.setX(i,frame);nextViews.setX(i,nextFrame);mixes.setX(i,mix);
  });mesh.instanceMatrix.needsUpdate=true;views.needsUpdate=true;nextViews.needsUpdate=true;mixes.needsUpdate=true;projections.needsUpdate=true;blends.needsUpdate=true;lastCamera.copy(camera);
 };
 update(new T.Vector3(0,10,100));mesh.computeBoundingSphere();mesh.name='complete crown coverage across LOD transitions';mesh.castShadow=false;
 canopyCoverFades.set(mesh,fade);
 return{mesh,fade,update};
}
