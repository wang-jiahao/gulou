import * as T from 'three';
import {Builder, type Solid} from './geometry.ts';

export type CampusBicycle = ReturnType<typeof createBicycle> & { id:string; solid:Solid; home:T.Vector3; angle:number; };
const tyre=new T.MeshStandardMaterial({name:'bicycle-tyre',color:0x262b28,roughness:.93});
const rim=new T.MeshStandardMaterial({name:'bicycle-rim',color:0xa9b3b0,roughness:.42,metalness:.8});
const paints=[0x435d72,0x965b48,0x718675].map(color=>new T.MeshStandardMaterial({color,roughness:.6,metalness:.35}));
export function createBicycle(color=0){
  const b=new Builder(),frame=paints[color%paints.length],v=(y:number,z:number)=>new T.Vector3(0,y,z);
  const rear=v(.34,.58),front=v(.34,-.58),crank=v(.32,.12),saddle=v(.86,.25),steer=v(.80,-.39);
  for(const[a,c]of[[rear,saddle],[saddle,steer],[steer,crank],[crank,rear],[crank,saddle],[steer,front]])b.cylinder(a,c,.018,.018,frame,7);
  b.cylinder(steer,v(1.03,-.43),.015,.015,rim,7);
  b.cylinder(new T.Vector3(-.23,1.03,-.43),new T.Vector3(.23,1.03,-.43),.019,.019,tyre,7);
  b.box(.23,.055,.28,0,.91,.25,tyre);
  const group=b.finish('rideable campus bicycle'),wheels:T.Group[]=[];
  for(const z of[-.58,.58]){
    const wheel=new Builder();wheel.add(new T.TorusGeometry(.31,.028,6,24).rotateY(Math.PI/2),tyre);
    wheel.add(new T.TorusGeometry(.27,.012,4,24).rotateY(Math.PI/2),rim);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;wheel.cylinder(new T.Vector3(),new T.Vector3(0,Math.sin(a)*.26,Math.cos(a)*.26),.003,.003,rim,3);}
    const mesh=wheel.finish('wheel');mesh.position.set(0,.34,z);group.add(mesh);wheels.push(mesh);
  }
  const pedalBuilder=new Builder();pedalBuilder.cylinder(new T.Vector3(-.18,0,-.14),new T.Vector3(.18,0,.14),.014,.014,rim,6);
  for(const side of[-1,1])pedalBuilder.box(.14,.035,.08,side*.22,0,side*.14,tyre);
  const pedals=pedalBuilder.finish('pedals');pedals.position.copy(crank);group.add(pedals);
  const update=(distance:number,phase:number)=>{wheels.forEach(w=>w.rotation.x-=distance/.31);pedals.rotation.x=phase;};
  return{group,wheels,update};
}
