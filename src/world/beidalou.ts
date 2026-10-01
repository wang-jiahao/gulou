import * as T from 'three';
import { Builder, curvedRoof } from './geometry.ts';
import { architecturalPalette, detailedWindow, masonryFace, panelDoor } from './architecture.ts';

export function buildBeidalou() {
  const b = new Builder();
  const p=architecturalPalette(), {brick,stone,roof,wood,recess:dark,ribs:trim}=p;
  const red=new T.MeshStandardMaterial({name:'star',color:0x8e2922,roughness:.65,metalness:.18});
  roof.side = T.DoubleSide;

  // Approximate heights; overall footprint and orientation come from OSM way 88778620.
  b.box(62, 1.2, 22, 0, 0.6, 0, stone, true);
  b.box(60.8, 7.6, 20.8, 0, 5, 0, dark);
  b.solids.push({x:0,y:5,z:0,w:62,h:7.6,d:22});
  b.box(62.7, 0.24, 22.6, 0, 1.35, 0, stone);
  b.box(62.6, 0.18, 22.5, 0, 5.1, 0, stone);
  b.box(63.1, 0.38, 23, 0, 8.65, 0, wood);
  b.box(7.8, 23.8, 9.1, 0, 12.4, 7, dark);
  b.solids.push({x:0,y:12.4,z:7,w:9,h:23.8,d:10.3});
  b.box(9.7, 0.48, 10.8, 0, 1.35, 7, stone);
  b.box(9.65, 0.28, 10.9, 0, 23.95, 7, stone);
  b.box(10.1, 0.5, 11.3, 0, 24.4, 7, wood);

  const rows=[{y:3.05,h:2.6,w:1.7},{y:6.65,h:2.75,w:1.7}];
  const centers=Array.from({length:16},(_,i)=>-28+i*3.7);
  for(const side of [-1,1]) masonryFace(b,new T.Vector3(0,0,side*11),side===1?0:Math.PI,62,1.2,8.8,centers.filter(x=>side===-1||Math.abs(x)>=5).map(x=>x*side),rows,brick);
  for(const side of [-1,1]) masonryFace(b,new T.Vector3(side*31,0,0),side*Math.PI/2,22,1.2,8.8,[-7.5,-3.6,.3,4.2,8.1].map(z=>-z*side),rows,brick);
  const top={y:22,h:1.8,w:1.55,centers:[-2.65,0,2.65]};
  masonryFace(b,new T.Vector3(0,0,12.15),0,9,1.2,24.3,[0],[{y:3.13,h:3.15,w:2.5},...[7,11.5,16.1].map(y=>({y,h:2.6,w:1.6})),top],brick);
  masonryFace(b,new T.Vector3(0,0,1.85),Math.PI,9,1.2,24.3,[0],[top],brick);
  for(const side of [-1,1]) masonryFace(b,new T.Vector3(side*4.5,0,7),side*Math.PI/2,10.3,1.2,24.3,[0],[...[4.25,8.55,12.9,17.1].map(y=>({y,h:2.55,w:1.35})),{y:22,h:1.8,w:1.55,centers:[-3.2,0,3.2]}],brick);
  const window=(x:number,y:number,z:number,w=1.65,h=2.55,angle=0)=>detailedWindow(b,p,x,y,z,w,h,angle,false,Math.round((x+60)*19+y*37+z));
  for (const face of [-1, 1]) for (let x = -28; x <= 28; x += 3.7) {
    if (face === 1 && Math.abs(x) < 5) continue;
    for (const y of [3.05, 6.65]) window(x, y, face * 11.06, 1.7, y > 5 ? 2.75 : 2.6, face === 1 ? 0 : Math.PI);
  }
  for (const side of [-1, 1]) for (const z of [-7.5, -3.6, 0.3, 4.2, 8.1]) for (const y of [3.05, 6.65]) window(side * 31.06, y, z, 1.7, 2.65, side * Math.PI / 2);
  for (const y of [7,11.5,16.1]) {
    window(0, y, 12.22, 1.6, 2.6);
  }
  for(const y of [4.25,8.55,12.9,17.1]) for (const side of [-1,1]) window(side*4.56,y,7,1.35,2.55,side*Math.PI/2);
  for (const x of [-2.65, 0, 2.65]) window(x, 22, 12.24, 1.55, 1.8);
  for(const x of [-2.65,0,2.65]) window(x,22,1.8,1.55,1.8,Math.PI);
  for (const side of [-1, 1]) for (const z of [3.8, 7, 10.2]) window(side * 4.57, 22, z, 1.55, 1.8, side * Math.PI / 2);
  b.box(8.5,.18,.45,0,20.55,12.46,stone);
  for (let x = -4; x <= 4; x += 0.5) b.box(0.15, 0.78, 0.45, x, 21, 12.5, stone);
  b.box(8.6, 0.15, 0.7, 0, 21.45, 12.5, stone);

  // Entrance: a raised landing and individually collidable shallow steps.
  b.box(4.5, 1.6, 2.3, 0, 0.8, 13.5, stone, true);
  for (let i = 0; i < 10; i++) { const h = (10 - i) * 0.16; b.box(4.5, h, 0.42, 0, h / 2, 14.75 + i * 0.42, stone, true); }
  for (const side of [-1, 1]) {
    b.box(0.45, 1.8, 2.7, side * 2.6, 0.9, 13.4, stone, true);
    b.line([new T.Vector3(side * 2.58, 2.05, 14.5), new T.Vector3(side * 2.58, 1.2, 17), new T.Vector3(side * 2.58, 0.65, 18.8)], 0.16, stone, 6);
  }
  panelDoor(b,p,0,3.13,12.3,2.5,3.15);
  b.box(2.9, 0.4, 0.5, 0, 4.82, 12.43, stone);
  for (const sign of [-1, 1]) b.box(0.28, 3.3, 0.5, sign * 1.37, 3.05, 12.4, stone);

  curvedRoof(b, 0, 0, 65.5, 25.5, 9.15, 5.5, roof, trim);
  curvedRoof(b, 0, 7, 12.6, 12.6, 24.7, 3.15, roof, trim);
  // Cross-gable, red star and carved outlines are the tower's identifying silhouette.
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const faceZ = 3.25, shape = new T.Shape(); shape.moveTo(-2.75, 0); shape.lineTo(0, 2.3); shape.lineTo(2.75, 0); shape.closePath();
    b.add(new T.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false }), stone, Math.sin(angle) * faceZ, 26, 7 + Math.cos(angle) * faceZ, new T.Euler(0, angle, 0));
    const points = [-1, 0, 1].map(i => new T.Vector3(Math.sin(angle) * (faceZ + 0.3) + Math.cos(angle) * i * 2.95, 26.15 + (1 - Math.abs(i)) * 2.45, 7 + Math.cos(angle) * (faceZ + 0.3) - Math.sin(angle) * i * 2.95)); b.line(points, 0.18, trim, 6);
  }
  const star = new T.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.42 : 1.0; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!i) star.moveTo(x, y); else star.lineTo(x, y); } star.closePath();
  b.add(new T.ExtrudeGeometry(star, { depth: 0.15, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.03, bevelSegments: 1 }), red, 0, 26.9, 10.58);
  // Closely spaced eave brackets provide real relief at pedestrian distance.
  for (let x = -30.5; x <= 30.5; x += 0.78) for (const side of [-1, 1]) { b.box(0.16, 0.32, 1.05, x, 8.83, side * 11.5, wood); b.box(0.38, 0.15, 0.5, x, 8.65, side * 11.36, stone); }
  for(const x of [-30.45,30.45]) for(const side of [-1,1]) {
    const z=side*11.28;b.cylinder(new T.Vector3(x,.3,z),new T.Vector3(x,8.75,z),.07,.07,p.pipe,8);
    for(const y of [1.4,3.8,6.2,8.2]) b.box(.22,.055,.19,x,y,z,p.pipe);
    b.line([new T.Vector3(x,.5,z),new T.Vector3(x,.25,z),new T.Vector3(x,.16,z+side*.38)],.072,p.pipe,8);
  }
  const group = b.finish('Beidalou — independent architectural model');
  group.userData = { status: 'approximate', source: 'OSM way 88778620; Commons public photographs', footprint: [62, 22], solids: b.solids };
  return { group, solids: b.solids };
}
