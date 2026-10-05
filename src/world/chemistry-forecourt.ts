import * as T from 'three';
import {Builder,rng} from './geometry.ts';
import {createBicycle,type CampusBicycle} from './bicycle.ts';
import {createModelTrees} from './model-trees.ts';
import type {Materials} from './materials.ts';
import type {TreeSpot} from './vegetation.ts';

// Official gl-3-18 f/l/r: low grey shelters flank the open entrance,
// a whitewashed tree stands in front of the west row, and a low stone bed
// with hedging lies farther west. Counts and metre dimensions are fitted.
export function chemistryForecourtLayout(){
  const frame={x:-277.691,z:-166.712,nx:-.08673425952618402,nz:.9962314832529859};
  const {x,z,nx,nz}=frame,point=(u:number,v:number)=>[x+u*nz+v*nx,z-u*nx+v*nz];
  const shelters=[{id:'west',u:-28.4,v:2.3,w:32,d:3.6,bays:8},{id:'east',u:18.6,v:2.8,w:12.4,d:2.6,bays:3}];
  const posts=shelters.flatMap(s=>Array.from({length:s.bays+1},(_,i)=>s.u-s.w/2+.3+i*(s.w-.6)/s.bays).flatMap(u=>[s.v-s.d/2+.2,s.v+s.d/2-.2].map(v=>({u,v}))));
  // Bikes face the lane, with space between adjacent bays to walk under
  // the roof. The observed parking contains other vehicle types as well.
  const parking=shelters.flatMap(s=>Array.from({length:s.bays},(_,i)=>s.u-s.w/2+.3+(i+.5)*(s.w-.6)/s.bays).flatMap(u=>{
    // Keep the exit behind the large west tree open on either side of its
    // trunk. The real parking is irregular; these bay positions are fitted.
    const spacing=s.id==='west'&&Math.abs(u+22.5)<1?1.05:.72;
    return[-spacing,spacing].map(offset=>({u:u+offset,v:s.id==='east'?2.8:2.2,side:s.id}));
  }));
  const bed={u:-49.1,v:-1.8,w:6.6,d:9.2,top:.36};
  const planting=[{u:-22.5,v:5.4,height:16,baseY:0},{u:16.6,v:.95,height:8.2,baseY:0},{u:22.8,v:.95,height:9.2,baseY:0},{u:bed.u,v:-2.2,height:13,baseY:.36}];
  const trees:TreeSpot[]=planting.map(t=>{const[x,z]=point(t.u,t.v);return{x,z,height:t.height,baseY:t.baseY,kind:'broad',whitewash:true};});
  return{frame,point,shelters,posts,parking,bed,planting,trees,roofBottom:2.72,roofTop:2.88};
}

export async function createChemistryForecourt(mats:Materials){
  const layout=chemistryForecourtLayout(),{point,frame}=layout,yaw=Math.atan2(frame.nx,frame.nz);
  const b=new Builder(),group=new T.Group();group.name='chemistry sheltered bicycle forecourt';
  const roof=new T.MeshStandardMaterial({name:'chemistry shelter grey roof',color:0x929893,roughness:.82,metalness:.12});
  const metal=new T.MeshStandardMaterial({name:'chemistry shelter slim silver structure',color:0xacb3b0,roughness:.48,metalness:.5});
  const stone=mats.stone.clone();stone.name='chemistry west low stone bed';stone.color.set(0x999c8d);
  const shrubs=new T.MeshStandardMaterial({name:'chemistry west dense hedge',color:0x6d843b,roughness:.97});
  const box=(u:number,v:number,y:number,w:number,h:number,d:number,material:T.Material,solid=false)=>{const[x,z]=point(u,v);b.box(w,h,d,x,y,z,material,solid,yaw);};
  for(const s of layout.shelters){
    box(s.u,s.v,(layout.roofTop+layout.roofBottom)/2,s.w,.16,s.d,roof,true);
    for(const v of[s.v-s.d/2,s.v+s.d/2])box(s.u,v,2.66,s.w,.14,.12,metal,true);
    for(let i=0;i<=s.bays;i++){
      const u=s.u-s.w/2+.3+i*(s.w-.6)/s.bays;
      box(u,s.v,2.60,.10,.12,s.d-.2,metal,true);
    }
  }
  for(const p of layout.posts)box(p.u,p.v,1.31,.115,2.62,.115,metal,true);
  const bed=layout.bed;
  box(bed.u,bed.v,.18,bed.w,.36,bed.d,stone,true);
  box(bed.u,bed.v,.66,bed.w-.18,.60,bed.d-.18,shrubs,true);
  const random=rng(7718);
  for(let u=-bed.w/2+.35;u<bed.w/2;u+=.65)for(let v=-bed.d/2+.35;v<bed.d/2;v+=.65){
    const[x,z]=point(bed.u+u,bed.v+v),geo=new T.IcosahedronGeometry(.5,1);geo.scale(.8,.55+random()*.24,.8);
    b.add(geo,shrubs,x,.88+random()*.06,z);
  }
  const structure=b.finish('chemistry shelter roofs posts and west planting bed',40);group.add(structure);
  const cameraSolids=[...structure.children],trees=await createModelTrees(layout.trees,'far',mats.leaves);group.add(trees.group);
  for(const s of trees.solids){const proxy=new T.Mesh(new T.BoxGeometry(s.w,s.h,s.d),mats.stone);proxy.position.set(s.x,s.y,s.z);proxy.updateMatrixWorld();cameraSolids.push(proxy);}
  const solids=[...b.solids,...trees.solids],bicycles:CampusBicycle[]=[];
  for(const[slot,p]of layout.parking.entries()){
    const[x,z]=point(p.u,p.v),home=new T.Vector3(x,.025,z),angle=yaw+Math.PI,bike=createBicycle(slot);
    bike.group.position.copy(home);bike.group.rotation.y=angle;
    const solid={x,y:.545,z,w:.5,h:1.04,d:1.85,angle};solids.push(solid);
    bicycles.push({...bike,id:`chemistry-${p.side}-bike-${slot}`,solid,home,angle});group.add(bike.group);cameraSolids.push(...bike.group.children);
  }
  group.userData={source:'official VR gl-3-18 f/l/r',approximate:true,frame,shelters:layout.shelters,posts:layout.posts,parking:layout.parking,planting:layout.planting,bed,roofBottom:layout.roofBottom,roofTop:layout.roofTop,solidCount:solids.length};
  return{group,solids,cameraSolids,bicycles,updateVisibility:trees.updateVisibility};
}
