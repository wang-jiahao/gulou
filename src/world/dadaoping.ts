import * as T from 'three';
import {Builder} from './geometry.ts';
import {nationalFlag} from './hankou-gate.ts';
import type {Materials} from './materials.ts';

/** The plan places the square north of the Southwest Building. VR gl-2-07/47
 * and the user video at 29:00 show a bare pole, square pedestal and guy wires. */
export function createDadaoping(mats:Materials){
  const b=new Builder(),x=-246,z=112;
  const paving=new T.MeshStandardMaterial({name:'dadaoping-stone',color:0x9c9e91,map:mats.textures.get('stone-grain.webp'),roughness:.93});
  const bronze=new T.MeshStandardMaterial({color:0x746551,metalness:.65,roughness:.5});
  b.box(25,.06,23,-241,.035,111,paving);
  // A central walk and cross path retain open approaches on every side.
  for(const side of[-1,1]){
    b.box(8.7,.035,8.7,-241+side*6.6,.08,111,mats.grass);
    for(const dz of[-1,1])b.box(8.8,.10,.16,-241+side*6.6,.12,111+dz*4.4,mats.stone);
  }
  b.box(2.9,.16,2.9,x,.10,z,mats.stone,true);
  b.box(1.15,.84,1.15,x,.60,z,bronze,true);
  b.box(1.25,.10,1.25,x,1.07,z,mats.stone);
  b.cylinder(new T.Vector3(x,1.08,z),new T.Vector3(x,14,z),.12,.07,bronze,14);
  b.add(new T.SphereGeometry(.13,12,8),bronze,x,14,z);
  b.solids.push({x,y:7.5,z,w:.26,h:13,d:.26});
  for(const[dx,dz]of[[-3.8,-3],[3.8,-3],[0,4]])b.cylinder(new T.Vector3(x,11.8,z),new T.Vector3(x+dx,.18,z+dz),.009,.009,mats.metal,4);
  const group=b.finish('大纛坪 · flagpole and stone square');
  group.userData.reference='official gl-2-07/47; local walk 29:00; dimensions estimated';
  const clock={value:0},flag=nationalFlag(clock);flag.scale.setScalar(1.35);flag.position.set(x+.14,12.90,z);group.add(flag);
  const rope=new T.Mesh(new T.CylinderGeometry(.009,.009,12.5,5),mats.wood);rope.position.set(x+.16,7.45,z-.12);group.add(rope);
  let progress=1,target=1;
  const nearby=(p:{x:number;y:number;z:number})=>p.y<.7&&Math.hypot(p.x-x,p.z-z)<3.7;
  const toggle=()=>{target=target===1?0:1;return target===1;};
  const update=(dt:number,active:boolean)=>{if(!active)return;clock.value+=dt;progress=T.MathUtils.clamp(progress+Math.sign(target-progress)*Math.min(Math.abs(target-progress),dt/12),0,1);flag.position.y=2.10+progress*10.8;};
  const snapshot=()=>({progress,target,height:flag.position.y,state:progress===target?(target?'raised':'lowered'):(target?'raising':'lowering')});
  return{group,solids:b.solids,nearby,toggle,update,snapshot};
}
