import * as T from 'three';
import { Builder } from './geometry.ts';

export const photoSpot = { name: 'I ❤️ NJU · 北大楼与紫峰合影', x: -29.5, z: 55, yaw: -.61, pitch: -.29, firstPerson: true, photoFov: 64 };
export function createCampusSign() {
  const b = new Builder(), white = new T.MeshStandardMaterial({ color: 0xe8e6db, roughness: .68, metalness: .05 });
  const red = new T.MeshStandardMaterial({ color: 0xae1420, roughness: .38, metalness: .13 });
  const extrude = (shape: T.Shape, mat: T.Material, x: number) => b.add(new T.ExtrudeGeometry(shape, { depth: .22, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 2, curveSegments: 18 }), mat, x, .16, -.11);
  b.box(5.55, .14, .65, 0, .07, 0, white);
  // Serif I and independently extruded N/J/U keep the installation readable from an angle.
  b.box(.18, 1.13, .22, -2.22, .72, 0, white);
  for (const y of [.21, 1.23]) b.box(.55, .14, .22, -2.22, y, 0, white);
  const heart = new T.Shape(); heart.moveTo(0, .02); heart.bezierCurveTo(-.27, .24, -.94, .72, -.75, 1.12); heart.bezierCurveTo(-.59, 1.52, -.1, 1.52, 0, 1.16); heart.bezierCurveTo(.1, 1.52, .59, 1.52, .75, 1.12); heart.bezierCurveTo(.94, .72, .27, .24, 0, .02); extrude(heart, red, -.95);
  const n = new T.Shape(); const np = [[-.34,0],[-.34,1.15],[-.17,1.15],[.19,.3],[.19,1.15],[.34,1.15],[.34,0],[.17,0],[-.19,.86],[-.19,0]];
  np.forEach(([x,y],i)=>i?n.lineTo(x,y):n.moveTo(x,y)); n.closePath(); extrude(n, white, .45);
  const j = new T.Shape(); j.moveTo(.32,1.15); j.lineTo(.32,.32); j.bezierCurveTo(.32,-.1,-.34,-.1,-.34,.26); j.lineTo(-.19,.26); j.bezierCurveTo(-.19,.08,.16,.08,.16,.32); j.lineTo(.16,1.15); j.closePath(); extrude(j, white, 1.29);
  const u = new T.Shape(); u.moveTo(-.35,1.15); u.lineTo(-.35,.32); u.bezierCurveTo(-.35,-.1,.35,-.1,.35,.32); u.lineTo(.35,1.15); u.lineTo(.19,1.15); u.lineTo(.19,.32); u.bezierCurveTo(.19,.09,-.19,.09,-.19,.32); u.lineTo(-.19,1.15); u.closePath(); extrude(u, white, 2.12);
  const group = b.finish('I love NJU · courtyard installation'); group.position.set(-24, 0, 46); group.rotation.y = -.61;
  return { group, solids: [{ x: -24, y: .07, z: 46, w: 5.55, h: .14, d: .65, angle: -.61 }, { x: -24, y: .72, z: 46, w: 5.15, h: 1.16, d: .25, angle: -.61 }] };
}
