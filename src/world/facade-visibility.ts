import * as T from 'three';

/** Blend a distance transition without changing the settled facade or its range.
 * Original opaque materials return after 0.4s, avoiding permanent overdraw. */
export function createFacadeVisibility(group:T.Group){
 const meshes=group.children.filter((child):child is T.Mesh=>child instanceof T.Mesh).map(mesh=>{
  const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const faded=originals.map(original=>{
   const material=original.clone();material.transparent=true;material.depthWrite=false;
   material.onBeforeCompile=original.onBeforeCompile;material.customProgramCacheKey=original.customProgramCacheKey;
   return material;
  });
  return{mesh,original:mesh.material,originals,faded,transition:Array.isArray(mesh.material)?faded:faded[0]};
 });
 let opacity:number|undefined,blending=false;
 return(visible:boolean,dt=Infinity)=>{
  const target=Number(visible);
  // Initial placement and explicit still-scene updates have no preceding frame.
  if(opacity===undefined||!Number.isFinite(dt))opacity=target;
  else opacity+=Math.sign(target-opacity)*Math.min(Math.abs(target-opacity),Math.max(0,dt)/.4);
  if(Math.abs(target-opacity)<1e-6)opacity=target;
  const transition=opacity>0&&opacity<1;
  if(transition!==blending){blending=transition;for(const entry of meshes)entry.mesh.material=transition?entry.transition:entry.original;}
  if(transition)for(const entry of meshes)entry.faded.forEach((material,i)=>{material.opacity=entry.originals[i].opacity*opacity!;});
  group.visible=opacity>0;
 };
}
