import * as T from 'three';
import type {CampusBicycle} from './bicycle.ts';

/** Parked vehicles keep their exact part geometry and pose. Only their draw
 * submissions are shared; the original independent vehicle is used while riding.
 * Small spatial cells retain local frustum/shadow culling across the campus. */
export function batchParkedBicycles(parent:T.Group,bicycles:CampusBicycle[]){
  const root=new T.Group();root.name='spatially batched parked bicycles';parent.add(root);
  const cells=new Map<string,T.Group>(),parked=new Map<CampusBicycle,string>();
  const parts=new Map<CampusBicycle,T.Mesh[]>(),inverse=new T.Matrix4(),position=new T.Vector3();
  for(const bike of bicycles){
    const meshes:T.Mesh[]=[];bike.group.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o);});parts.set(bike,meshes);
  }
  const cellFor=(bike:CampusBicycle)=>{
    root.updateWorldMatrix(true,false);inverse.copy(root.matrixWorld).invert();
    bike.group.getWorldPosition(position).applyMatrix4(inverse);
    return `${Math.floor(position.x/16)},${Math.floor(position.z/16)}`;
  };
  const rebuild=(key:string)=>{
    const old=cells.get(key);
    if(old){root.remove(old);old.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();});cells.delete(key);}
    const buckets=new Map<string,{source:T.Mesh;matrices:T.Matrix4[]}>();
    root.updateWorldMatrix(true,false);inverse.copy(root.matrixWorld).invert();
    for(const[bike,cell]of parked){
      if(cell!==key)continue;
      bike.group.updateWorldMatrix(true,true);
      for(const part of parts.get(bike)!){
        const materials=Array.isArray(part.material)?part.material:[part.material];
        const id=[part.geometry.uuid,...materials.map(m=>m.uuid),part.castShadow,part.receiveShadow,part.layers.mask,part.renderOrder].join(':');
        let bucket=buckets.get(id);
        if(!bucket){bucket={source:part,matrices:[]};buckets.set(id,bucket);}
        bucket.matrices.push(new T.Matrix4().multiplyMatrices(inverse,part.matrixWorld));
      }
    }
    if(!buckets.size)return;
    const cell=new T.Group();cell.name=`parked bicycle cell ${key}`;
    for(const{source,matrices}of buckets.values()){
      const mesh=new T.InstancedMesh(source.geometry,source.material,matrices.length);
      mesh.name=`parked bicycle part: ${source.parent?.name||source.name}`;
      mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;
      mesh.layers.mask=source.layers.mask;mesh.renderOrder=source.renderOrder;
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();
      cell.add(mesh);
    }
    root.add(cell);cells.set(key,cell);
  };
  for(const bike of bicycles){
    bike.setParked=(value:boolean)=>{
      const previous=parked.get(bike),next=value?cellFor(bike):undefined;
      bike.group.visible=!value;
      if(next===undefined)parked.delete(bike);else parked.set(bike,next);
      if(previous!==undefined&&previous!==next)rebuild(previous);
      if(next!==undefined)rebuild(next);
    };
    parked.set(bike,cellFor(bike));bike.group.visible=false;
  }
  for(const key of new Set(parked.values()))rebuild(key);
  return root;
}
