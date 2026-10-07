import * as T from 'three';
import {Builder} from './geometry.ts';

// Official VR gl-2-15-f shows scooters with leg covers and a blue bicycle
// left of the entrance. Occluded count, spacing and dimensions are approximate.
export const physicsParkingSpots=[
  {u:-7.4,v:4,yaw:-.10,kind:'scooter',cover:true},
  {u:-9.15,v:4.3,yaw:.14,kind:'scooter',cover:true},
  {u:-11.1,v:3.8,yaw:-.18,kind:'scooter',cover:false},
  {u:-13,v:4.1,yaw:.10,kind:'scooter',cover:false},
  {u:-15,v:4.3,yaw:-.08,kind:'scooter',cover:true},
  {u:-17.25,v:4,yaw:.26,kind:'bicycle',cover:false},
] as const;

export function createPhysicsParking(point:(u:number,v:number)=>number[],frontYaw:number) {
  const b=new Builder(),cameraSolids:T.Object3D[]=[];
  const material=(name:string,color:number,roughness=.8,metalness=0)=>new T.MeshStandardMaterial({name:`physics parked ${name}`,color,roughness,metalness});
  const rubber=material('rubber',0x222728),metal=material('metal',0x939c9d,.42,.55);
  const ivory=material('ivory',0xd9dcd4),graphite=material('graphite',0x42494a);
  const blue=material('blue frame',0x258cad,.58,.22),fabric=material('leg covers',0xc3c3b6,.98);
  fabric.side=T.DoubleSide;
  const lens=material('lenses',0xe3e4d8,.25);
  const cameraMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
  for(const [index,spot] of physicsParkingSpots.entries()){
    const [x,z]=point(spot.u,spot.v),yaw=frontYaw+spot.yaw;
    const rotation=new T.Euler(0,yaw,0),quaternion=new T.Quaternion().setFromEuler(rotation);
    const at=(a:number,y:number,c:number)=>new T.Vector3(a,y,c).applyQuaternion(quaternion).add(new T.Vector3(x,.043,z));
    function add(g:T.BufferGeometry,m:T.Material,a=0,y=0,c=0){const p=at(a,y,c);b.add(g,m,p.x,p.y,p.z,rotation);}
    function ellipsoid(a:number,y:number,c:number,sx:number,sy:number,sz:number,m:T.Material){add(new T.SphereGeometry(1,12,6).scale(sx,sy,sz),m,a,y,c);}
    function rod(a:number[],c:number[],r:number,m=metal){b.cylinder(at(a[0],a[1],a[2]),at(c[0],c[1],c[2]),r,r,m,6);}
    function wheel(c:number,r:number,t:number){
      add(new T.TorusGeometry(r,t,6,20).rotateY(Math.PI/2),rubber,0,r+t,c);
      rod([-.07,r+t,c],[.07,r+t,c],spot.kind==='bicycle'?.046:.105);
      for(let i=0;i<8;i++){
        const theta=i*Math.PI/4;
        rod([0,r+t,c],[0,r+t+Math.sin(theta)*(r-.01),c+Math.cos(theta)*(r-.01)],.008);
      }
    }
    if(spot.kind==='scooter'){
      const paint=index%3===2?graphite:ivory;
      wheel(-.60,.20,.055);wheel(.60,.20,.055);
      add(new T.BoxGeometry(.39,.12,.85),graphite,0,.30,-.09);
      ellipsoid(0,.51,-.34,.24,.29,.41,paint);
      ellipsoid(0,.85,-.31,.26,.085,.37,rubber);
      ellipsoid(0,.71,.45,.255,.40,.12,paint);
      rod([0,.28,.60],[0,1.05,.46],.038,graphite);
      rod([-.33,1.05,.46],[.33,1.05,.46],.029,graphite);
      ellipsoid(0,1.02,.53,.16,.085,.075,paint);
      ellipsoid(0,1.02,.59,.10,.055,.018,lens);
      ellipsoid(0,.41,.60,.12,.065,.25,paint);
      for(const s of[-1,1]){
        rod([s*.26,1.05,.46],[s*.36,1.30,.48],.013);
        ellipsoid(s*.36,1.32,.49,.074,.05,.023,graphite);
        ellipsoid(s*.36,1.32,.466,.058,.037,.007,lens);
      }
      rod([-.19,.31,-.24],[-.28,.025,-.37],.016,graphite);
      // A draped, tapered cover; no readable brand, plate or invented parking lines.
      if(spot.cover){
        const g=new T.PlaneGeometry(1,1,12,8),p=g.getAttribute('position');
        for(let i=0;i<p.count;i++){
          const u=p.getX(i)*2,t=p.getY(i)+.5;
          p.setXYZ(i,u*(.27+.15*t),.31+t*.73,.57+.10*Math.sin(Math.PI*t)+.025*Math.cos(u*Math.PI*5)-.13*u*u);
        }
        g.computeVertexNormals();add(g,fabric);
      }
    }else{
      wheel(-.64,.305,.026);wheel(.64,.305,.026);
      const rear=[0,.331,-.64],crank=[0,.30,-.08],saddle=[0,.87,-.25],head=[0,.88,.44],front=[0,.331,.64];
      for(const [a,c]of[[rear,crank],[crank,saddle],[saddle,rear],[saddle,head],[head,crank],[head,front]])rod(a,c,.022,blue);
      rod(saddle,[0,.99,-.27],.018);ellipsoid(0,1,-.27,.15,.043,.17,rubber);
      rod(head,[0,1.08,.40],.021);rod([-.26,1.08,.40],[.26,1.08,.40],.021);
      rod([-.13,.3,-.08],[.13,.3,-.08],.015);rod([-.13,.3,-.08],[-.13,.18,-.14],.014);
      add(new T.BoxGeometry(.14,.045,.09),rubber,-.16,.18,-.14);
      rod([-.06,.3,-.1],[-.24,.025,-.32],.015,graphite);
    }
    // Simple fixed player and camera envelopes, independent of render meshes.
    // These cover the body, covers and wheels without per-triangle physics.
    const w=spot.kind==='scooter'?.84:.58,d=spot.kind==='scooter'?1.74:1.94,h=1.18;
    b.solids.push({x,y:.043+h/2,z,w,h,d,angle:yaw});
    const proxy=new T.Mesh(new T.BoxGeometry(w,h,d),cameraMaterial);
    proxy.position.set(x,.043+h/2,z);proxy.rotation.y=yaw;proxy.updateMatrixWorld(true);cameraSolids.push(proxy);
  }
  const group=b.finish('physics entrance parked vehicles');
  group.userData={source:'official VR gl-2-15-f',approximate:true,scooters:5,bicycles:1,rideable:false};
  return{group,solids:b.solids,cameraSolids};
}
