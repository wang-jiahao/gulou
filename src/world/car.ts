import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Solid } from './geometry.ts';

export const carFit = { halfWidth: .96, halfLength: 2.12, halfHeight: .78, centerY: .84 };
export function createCampusCar(id: string, color = 0x496d64) {
  const group = new T.Group(); group.name = 'driveable campus car';
  const paint = new T.MeshStandardMaterial({ color, roughness: .36, metalness: .35 });
  const glass = new T.MeshStandardMaterial({ color: 0x263c43, roughness: .22, metalness: .4 });
  const trim = new T.MeshStandardMaterial({ color: 0x303c3a, roughness: .55 });
  const metal = new T.MeshStandardMaterial({ color: 0xbdc7c3, metalness: .65, roughness: .3 });
  const lamp = new T.MeshStandardMaterial({ color: 0xffefc9, emissive: 0xffe3a4, emissiveIntensity: .4 });
  const brake = new T.MeshStandardMaterial({ color: 0x9d3133, emissive: 0xed3535, emissiveIntensity: .15 });
  function box(w: number, h: number, d: number, x: number, y: number, z: number, material: T.Material, round = false) {
    const mesh = new T.Mesh(round ? new RoundedBoxGeometry(w,h,d,2,.08) : new T.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  box(1.82,.52,4,0,.64,0,paint,true);box(1.8,.18,3.8,0,.31,0,trim,true);
  box(1.67,.12,1.13,0,.94,-1.35,paint,true);
  const v=[[-.77,.89,-1.08],[.77,.89,-1.08],[.77,.89,1.1],[-.77,.89,1.1],[-.66,1.54,-.55],[.66,1.54,-.55],[.66,1.54,.6],[-.66,1.54,.6]];
  const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(v.flat(),3));geom.setIndex([0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7,4,5,6,4,6,7]);geom.computeVertexNormals();
  const cabin=new T.Mesh(geom,glass);cabin.castShadow=true;group.add(cabin);
  box(1.36,.08,1.22,0,1.57,.025,paint,true);
  for(const side of [-1,1]) {
    box(.055,.57,.075,side*.735,1.19,.1,paint);box(.15,.12,.26,side*.95,1.08,-.73,paint,true);
    box(.035,.04,.23,side*.917,.9,.4,metal);box(.5,.14,.045,side*.58,.74,-2.01,lamp);
    box(.5,.14,.045,side*.58,.76,2.01,brake);
  }
  box(.64,.17,.03,0,.46,-2.02,trim);box(.42,.13,.025,0,.52,2.025,metal);
  const wheels:T.Group[]=[];
  for(const x of [-.91,.91]) for(const z of [-1.25,1.25]) {
    const steering=new T.Group(),wheel=new T.Group();steering.position.set(x,.34,z);steering.add(wheel);group.add(steering);
    for(const [r,w,m] of [[.34,.22,trim],[.2,.235,metal]] as const){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,w,16).rotateZ(Math.PI/2),m);mesh.castShadow=true;wheel.add(mesh);}
    steering.userData.front=z<0;wheels.push(steering);
  }
  const cameraHull=new T.Mesh(new T.BoxGeometry(1.92,1.56,4.24));cameraHull.position.y=.84;cameraHull.visible=false;group.add(cameraHull);
  const solid:Solid={x:0,y:.84,z:0,w:1.92,h:1.56,d:4.24,angle:0};
  return {kind:'car' as const,id,group,cameraHull,solid,home:new T.Vector3(),angle:0,
    setParked(parked:boolean){cameraHull.layers.set(parked?0:31);},
    update(distance:number,_phase:number,steer:number){for(const w of wheels){w.rotation.y=w.userData.front?steer:0;w.children[0].rotation.x-=distance/.34;}brake.emissiveIntensity=Math.abs(distance)<.002?.8:.15;},
  };
}
export type CampusCar=ReturnType<typeof createCampusCar>;
