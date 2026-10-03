import * as T from 'three';
import {Builder, type Solid} from './geometry.ts';

export type CampusBicycle = ReturnType<typeof createBicycle> & { id:string; solid:Solid; home:T.Vector3; angle:number; };
export const bicycleFit={seat:.91,seatZ:.25,barY:1.20,barZ:-.12,barHalfWidth:.24,crankY:.32,crankZ:.12,crankRadius:.17};
const tyre=new T.MeshStandardMaterial({name:'bicycle-tyre',color:0x262b28,roughness:.93});
const rim=new T.MeshStandardMaterial({name:'bicycle-rim',color:0xa9b3b0,roughness:.42,metalness:.8});
const paints=[0x435d72,0x965b48,0x718675].map(color=>new T.MeshStandardMaterial({color,roughness:.6,metalness:.35}));
export function createBicycle(color=0){
  const b=new Builder(),frame=paints[color%paints.length],v=(y:number,z:number)=>new T.Vector3(0,y,z);
  const rear=v(.34,.58),crank=v(.32,.12),saddle=v(.86,.25),steer=v(.80,-.39);
  for(const[a,c]of[[rear,saddle],[saddle,steer],[steer,crank],[crank,rear],[crank,saddle]])b.cylinder(a,c,.018,.018,frame,7);
  b.box(.23,.055,.28,0,bicycleFit.seat,bicycleFit.seatZ,tyre);
  const group=b.finish('rideable campus bicycle'),wheels:T.Group[]=[];
  const steering=new T.Group();steering.name='steered fork and swept-back handlebars';steering.position.z=-.39;group.add(steering);
  const front=new Builder();front.cylinder(v(.80,0),v(.34,-.19),.018,.018,frame,7);front.cylinder(v(.80,0),v(1.15,-.015),.016,.016,rim,7);
  front.line([new T.Vector3(-.24,1.20,.27),new T.Vector3(-.20,1.17,.04),new T.Vector3(0,1.15,-.015),new T.Vector3(.20,1.17,.04),new T.Vector3(.24,1.20,.27)],.017,rim,8);
  for(const side of[-1,1])front.cylinder(new T.Vector3(side*.17,1.20,.27),new T.Vector3(side*.32,1.20,.27),.025,.025,tyre,8);
  steering.add(front.finish('fork and handlebar'));
  for(const z of[-.58,.58]){
    const wheel=new Builder();wheel.add(new T.TorusGeometry(.31,.028,6,24).rotateY(Math.PI/2),tyre);
    wheel.add(new T.TorusGeometry(.27,.012,4,24).rotateY(Math.PI/2),rim);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;wheel.cylinder(new T.Vector3(),new T.Vector3(0,Math.sin(a)*.26,Math.cos(a)*.26),.003,.003,rim,3);}
    const mesh=wheel.finish('wheel');mesh.position.set(0,.34,z+(z<0?.39:0));(z<0?steering:group).add(mesh);wheels.push(mesh);
  }
  const pedalBuilder=new Builder();pedalBuilder.cylinder(new T.Vector3(-.18,0,-.17),new T.Vector3(.18,0,.17),.014,.014,rim,6);
  const pedals=pedalBuilder.finish('crank');pedals.position.copy(crank);group.add(pedals);
  const platforms:T.Mesh[]=[];
  for(const side of[-1,1]){const pedal=new T.Mesh(new T.BoxGeometry(.14,.035,.09),tyre);pedal.position.set(side*.22,0,side*.17);pedals.add(pedal);platforms.push(pedal);}
  const update=(distance:number,phase:number,turn=0)=>{wheels.forEach(w=>w.rotation.x-=distance/.31);pedals.rotation.x=phase;platforms.forEach(p=>p.rotation.x=-phase);steering.rotation.y=turn;};
  return{group,wheels,steering,update};
}
