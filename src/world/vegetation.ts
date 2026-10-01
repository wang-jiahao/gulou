import * as T from 'three';
import { Builder, rng, type Solid } from './geometry.ts';
import type { Materials } from './materials.ts';

export type TreeSpot = { x: number; z: number; height: number; kind?: 'cedar' | 'broad' };
export function createTrees(spots: TreeSpot[], mats: Materials, seed = 1917) {
  const rand = rng(seed), b = new Builder(), cards: T.Matrix4[] = [], colors: T.Color[] = [], obj = new T.Object3D();
  for (const tree of spots) {
    const { x, z, height: h } = tree, base = new T.Vector3(x, 0, z), top = new T.Vector3(x + (rand() - .5) * 1.5, h * .81, z + (rand() - .5) * 1.5);
    const bark=tree.kind==='cedar'?mats.coniferBark:mats.bark;
    b.cylinder(base, top, h * .036, .09, bark, 10);
    b.solids.push({ x, y: h * .32, z, w: h * .071, h: h * .64, d: h * .071 });
    for (let root = 0; root < 5; root++) { const a = root * 1.25; b.cylinder(new T.Vector3(x + Math.cos(a) * h * .09, .02, z + Math.sin(a) * h * .09), new T.Vector3(x, .75, z), .13, .25, bark, 6); }
    const cedar = tree.kind === 'cedar';
    if(cedar){
      for(let level=0;level<36;level++){
        const t=level/36,a=level*2.399+rand()*.55,radius=h*(.34*Math.pow(1-t,.7)+.015),by=h*(.22+t*.71);
        const axis=new T.Vector3(Math.cos(a),0,Math.sin(a)),lateral=new T.Vector3(-Math.sin(a),0,Math.cos(a));
        const center=new T.Vector3(x,by,z),tip=center.clone().addScaledVector(axis,radius);tip.y-=radius*.21;
        b.line([center,center.clone().addScaledVector(axis,radius*.4).add(new T.Vector3(0,.16,0)),tip],.065*(1-t)+.018,bark,6);
        for(let along=1;along<=8;along++)for(const side of [-1,1]){
          const f=along/8,anchor=center.clone().addScaledVector(axis,radius*f);anchor.y-=radius*.21*f*f;
          const reach=radius*.28*(1-f+.17),end=anchor.clone().addScaledVector(lateral,side*reach).add(new T.Vector3(0,-.16,0));b.cylinder(anchor,end,.018,.005,bark,5);
          for(let i=0;i<14;i++){
            obj.position.copy(anchor).lerp(end,rand()).addScaledVector(axis,(rand()-.5)*.42);obj.position.y+=(rand()-.5)*.16;
            obj.rotation.set(-Math.PI/2+(rand()-.5)*1.8,a+(rand()-.5),rand()*Math.PI);
            const s=.48+rand()*.37;obj.scale.set(s,s*1.45,s);obj.updateMatrix();cards.push(obj.matrix.clone());colors.push(new T.Color().setRGB(.75+rand()*.23,.83+rand()*.17,.72+rand()*.18));
          }
        }
      }
      continue;
    }
    const layers = cedar ? 10 : 13;
    for (let branch = 0; branch < layers; branch++) {
      const a = branch * 2.399 + rand() * .6, t = branch / layers;
      const radius = cedar ? h * .34 * (1 - t * .8) : h * (.22 + rand() * .17);
      const by = h * (cedar ? .26 + t * .68 : .42 + t * .45);
      const center = new T.Vector3(x + Math.cos(a) * radius * .78, by, z + Math.sin(a) * radius * .78);
      b.cylinder(new T.Vector3(x, by * .75, z), center, .17 * (1 - t * .5), .035, mats.bark, 6);
      const clumps = cedar ? 135 : 110;
      for (let leaf = 0; leaf < clumps; leaf++) {
        const phi = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius * .72;
        obj.position.set(center.x + Math.cos(phi) * r, center.y + (rand() - .5) * (cedar ? .9 : h * .25), center.z + Math.sin(phi) * r);
        obj.rotation.set(rand() * 2 - 1, rand() * Math.PI * 2, rand() * 1.4 - .7);
        const size = (cedar ? 1.4 : 1.65) * (.7 + rand() * .7); obj.scale.set(size, size, size); obj.updateMatrix(); cards.push(obj.matrix.clone());
        colors.push(new T.Color().setHSL(.15 + rand() * .08, .12 + rand() * .2, .64 + rand() * .26));
      }
    }
  }
  const group = b.finish('tree trunks'), leaves = new T.InstancedMesh(new T.PlaneGeometry(1, 1), spots.every(s => s.kind === 'cedar') ? mats.conifer : mats.leaves, cards.length);
  cards.forEach((m, i) => { leaves.setMatrixAt(i, m); leaves.setColorAt(i, colors[i]); }); leaves.castShadow = true; leaves.receiveShadow = true; leaves.name = 'tree foliage'; leaves.computeBoundingSphere(); group.add(leaves);
  return { group, solids: b.solids };
}

export function createIvy(mats: Materials) {
  const rand = rng(1902), obj = new T.Object3D(), matrices: T.Matrix4[] = [], colors: T.Color[] = [];
  const addLeaf = (x: number, y: number, z: number, angle: number) => { obj.position.set(x, y, z); obj.rotation.set((rand() - .5) * .4, angle + (rand() - .5) * .4, (rand() - .5) * 1.6); const s = .13 + rand() * .15; obj.scale.setScalar(s); obj.updateMatrix(); matrices.push(obj.matrix.clone()); colors.push(new T.Color().setHSL(.16 + rand() * .07, .18, .7 + rand() * .25)); };
  for (const side of [-1, 1]) for (let x = -30.9; x < 31; x += .13) for (let y = 1.35; y < 8.5; y += .13) {
    if (side === 1 && Math.abs(x) < 4.8) continue;
    const nearWindow = ((x + 28) % 3.7 + 3.7) % 3.7; const inWindowX = nearWindow < 1 || nearWindow > 2.7;
    const inWindowY = (y > 1.7 && y < 4.45) || (y > 5.2 && y < 8.1);
    if (inWindowX && inWindowY) continue;
    if (rand() > .7 + .25 * Math.sin(x * .6 + y * .7)) continue;
    addLeaf(x + rand() * .13, y, side * (11.055 + rand() * .065), side === 1 ? 0 : Math.PI);
  }
  for (let y = 1.5; y < 23.7; y += .12) for (let x = -4.4; x < 4.5; x += .12) {
    if ((Math.abs(x)<1.55&&y<4.95)||(Math.abs(x) < 1.1 && [7,11.5,16.1].some(level => Math.abs(y-level)<1.6)) || (y > 20.3 && y < 23.5)) continue;
    if (rand() < .87 + Math.sin(x*2+y)*.12) addLeaf(x+rand()*.07, y, 12.19 + rand() * .08, 0);
  }
  for (const s of [-1, 1]) for (let y = 2; y < 23.8; y += .14) for (let z = 2; z < 12; z += .14) {
    if ((Math.abs(z - 7)<1.0&&[4.25,8.55,12.9,17.1].some(level=>Math.abs(y-level)<1.5)) || y > 20.5) continue;
    if (rand() < .76) addLeaf(s * (4.56 + rand() * .06), y, z, s * Math.PI / 2);
  }
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mats.ivy, matrices.length);
  matrices.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, colors[i]); }); mesh.receiveShadow = true; mesh.castShadow = true; mesh.name = 'individual ivy leaves'; mesh.computeBoundingSphere(); return mesh;
}

export function createGroundPlants(mats: Materials) {
  const r = rng(2026), obj = new T.Object3D(), group = new T.Group(), solids: Solid[] = [];
  const shrubs: T.Matrix4[] = [], grass: T.Matrix4[] = [];
  for (const side of [-1, 1]) {
    for (let z = 24; z < 70; z += 1.8) for (let i = 0; i < 15; i++) {
      obj.position.set(side * (24 + r() * 2), .5 + r() * .7, z + r()); obj.rotation.set(r() * 2, r() * 6, r()); obj.scale.setScalar(.65 + r() * .55); obj.updateMatrix(); shrubs.push(obj.matrix.clone());
    }
    for (let x = 6; x < 31; x += 1.1) for (let i = 0; i < 11; i++) { obj.position.set(side * (x + r()), .4 + r() * .9, 13.7 + r() * 1.1); obj.rotation.set(r(), r() * 6, r()); obj.scale.setScalar(.7 + r() * .5); obj.updateMatrix(); shrubs.push(obj.matrix.clone()); }
  }
  for (let i = 0; i < 5000; i++) {
    const x = (r() - .5) * 46, z = 23 + r() * 45;
    if (Math.abs(x) < 3.5 || Math.abs(z - 45) < 2 || Math.abs(z - 65) < 2) continue;
    obj.position.set(x, .06, z); obj.rotation.set(0, r() * Math.PI, 0); obj.scale.set(.2 + r() * .2, .11 + r() * .08, 1); obj.updateMatrix(); grass.push(obj.matrix.clone());
  }
  for (const [mat, data, name] of [[mats.leaves, shrubs, 'shrubs'], [mats.grassTuft, grass, 'grass']] as const) {
    const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mat, data.length); data.forEach((m, i) => mesh.setMatrixAt(i, m)); mesh.receiveShadow = true; mesh.castShadow = name === 'shrubs'; mesh.name = name; mesh.computeBoundingSphere(); group.add(mesh);
  }
  return { group, solids };
}
