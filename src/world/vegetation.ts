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

export function createIvy(mats: Materials, quality = 'medium') {
  const rand = rng(1902), obj = new T.Object3D(), matrices: T.Matrix4[] = [], colors: T.Color[] = [], stems = new Builder();
  const stemMaterial = new T.MeshStandardMaterial({ color: 0x4e4734, roughness: 1 });
  const field = (x: number, y: number) => .5 + .22 * Math.sin(x * 1.3 + Math.sin(y * .53) * 2) + .17 * Math.sin(y * .82 - x * .45) + .11 * Math.sin(x * 3.1 + y * 2.4);
  const grid = quality === 'low' ? .18 : .115;
  const leaf = (x: number, y: number, z: number, angle: number, mass: number) => {
    obj.position.set(x + Math.sin(angle) * mass, y, z + Math.cos(angle) * mass);
    obj.rotation.set((rand() - .5) * .45, angle + (rand() - .5) * .55, (rand() - .5) * 2.3);
    const size = .21 + rand() * .10; obj.scale.set(size * (.85 + rand() * .25), size, size); obj.updateMatrix(); matrices.push(obj.matrix.clone());
    const shade = .67 + rand() * .32; colors.push(new T.Color().setRGB(shade * (.86 + rand() * .13), shade, shade * (.76 + rand() * .16)));
  };
  const surface = (width: number, bottom: number, top: number, origin: T.Vector3, angle: number, hole: (u: number, y: number) => boolean, coverage: number) => {
    const tangent = new T.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    for (let u = -width / 2; u < width / 2; u += grid) for (let y = bottom; y < top; y += grid) {
      const ju = u + (rand() - .5) * grid * 1.3, jy = y + (rand() - .5) * grid;
      if (hole(ju, jy)) continue;
      const growth = field(ju, jy), density = coverage * (.4 + growth * .8);
      if (rand() > density) continue;
      const p = origin.clone().addScaledVector(tangent, ju); const thickness = .025 + Math.max(0, growth - .35) * .22;
      leaf(p.x, jy, p.z, angle, thickness);
      if (quality !== 'low' && growth > .68 && rand() < .45) leaf(p.x + tangent.x * .07, jy - .06, p.z + tangent.z * .07, angle, thickness + .09);
    }
    for (let u = -width / 2 + .5; u < width / 2; u += 2.7) {
      const points: T.Vector3[] = [];
      for (let y = bottom; y < top; y += .45) {
        const along = u + Math.sin(y * .5 + u) * .18;
        if (hole(along, y)) { if (points.length > 2) stems.line(points, .014, stemMaterial, 4); points.length = 0; continue; }
        const p = origin.clone().addScaledVector(tangent, along); p.y = y; points.push(p);
      }
      if (points.length > 2) stems.line(points, .014, stemMaterial, 4);
    }
  };
  for (const side of [-1, 1]) surface(61.8, 1.35, 8.65, new T.Vector3(0, 0, side * 11.075), side === 1 ? 0 : Math.PI, (u, y) => {
    const x = u * side;
    if (side === 1 && Math.abs(x) < 4.8) return true;
    const windowX = Array.from({ length: 16 }, (_, i) => -28 + i * 3.7).some(cx => Math.abs(x - cx) < .8 + .06 * Math.sin(y * 5));
    return windowX && ((y > 1.68 && y < 4.4) || (y > 5.18 && y < 8.02));
  }, .9);
  surface(8.8, 1.5, 23.8, new T.Vector3(0, 0, 12.2), 0, (x, y) =>
    (Math.abs(x) < 1.55 && y < 5) || (Math.abs(x) < .87 && [7, 11.5, 16.1].some(level => Math.abs(y - level) < 1.33)) || (y > 21 && y < 23 && [-2.65, 0, 2.65].some(cx => Math.abs(x - cx) < .8)), 1.15);
  for (const side of [-1, 1]) surface(10.1, 2, 23.8, new T.Vector3(side * 4.58, 0, 7), side * Math.PI / 2, (u, y) =>
    (Math.abs(u) < .76 && [4.25, 8.55, 12.9, 17.1].some(level => Math.abs(y - level) < 1.33)) || (y > 21 && y < 23 && [-3.2, 0, 3.2].some(cx => Math.abs(u - cx) < .8)), 1.1);
  const geometry = new T.PlaneGeometry(1, 1); const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) position.setZ(i, [0, .09, -.035, .035][i]); geometry.computeVertexNormals();
  const mesh = new T.InstancedMesh(geometry, mats.ivy, matrices.length);
  matrices.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, colors[i]); }); mesh.receiveShadow = mesh.castShadow = true; mesh.name = 'clustered ivy leaves'; mesh.computeBoundingSphere();
  const group = stems.finish('climbing ivy stems and irregular leaf masses'); group.add(mesh); group.userData.leaves = matrices.length; return group;
}

/** Upright evergreen clusters, approximating the juniper-like forms in the courtyard photographs. */
export function createJunipers(spots: TreeSpot[], mats: Materials, quality = 'medium') {
  const b = new Builder(), rand = rng(9182), matrices: T.Matrix4[] = [], colors: T.Color[] = [], obj = new T.Object3D();
  for (const tree of spots) {
    const h = tree.height;
    b.cylinder(new T.Vector3(tree.x, 0, tree.z), new T.Vector3(tree.x, h * .75, tree.z), .3, .06, mats.coniferBark, 9);
    b.solids.push({ x: tree.x, y: h * .25, z: tree.z, w: .65, h: h * .5, d: .65 });
    for (let shoot = 0; shoot < 7; shoot++) {
      const a = shoot * 2.4, reach = shoot ? h * (.07 + rand() * .1) : 0, top = h * (shoot ? .69 + rand() * .29 : 1);
      const sx = tree.x + Math.cos(a) * reach, sz = tree.z + Math.sin(a) * reach;
      b.cylinder(new T.Vector3(tree.x, h * .16, tree.z), new T.Vector3(sx, top * .91, sz), .105, .015, mats.coniferBark, 6);
      for (let layer = 0; layer < 17; layer++) {
        const t = layer / 16, y = h * .22 + t * (top - h * .22), radius = (h * .105 * Math.pow(1 - t, .65) + .14) * (.76 + rand() * .3);
        const count = quality === 'low' ? 20 : 35;
        for (let k = 0; k < count; k++) {
          const phi = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius;
          obj.position.set(sx + Math.cos(phi) * r, y + (rand() - .5) * .9, sz + Math.sin(phi) * r);
          obj.rotation.set((rand() - .5) * 1.7, rand() * Math.PI * 2, (rand() - .5) * 2.8);
          const size = .5 + rand() * .35; obj.scale.set(size, size * 1.4, size); obj.updateMatrix(); matrices.push(obj.matrix.clone());
          colors.push(new T.Color().setRGB(.69 + rand() * .23, .81 + rand() * .18, .57 + rand() * .23));
        }
      }
    }
  }
  const group = b.finish('courtyard upright evergreen trunks'), leaves = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mats.conifer, matrices.length);
  matrices.forEach((m, i) => { leaves.setMatrixAt(i, m); leaves.setColorAt(i, colors[i]); }); leaves.castShadow = leaves.receiveShadow = true; leaves.computeBoundingSphere(); group.add(leaves);
  return { group, solids: b.solids };
}

export function createGroundPlants(mats: Materials) {
  const r = rng(2026), obj = new T.Object3D(), group = new T.Group(), solids: Solid[] = [];
  const shrubs: T.Matrix4[] = [], grass: T.Matrix4[] = [];
  for (const side of [-1, 1]) {
    for (let z = 24; z < 70; z += 1.8) for (let i = 0; i < 15; i++) {
      obj.position.set(side * (37.5 + r()), .28 + r() * .28, z + r()); obj.rotation.set(r() * 2, r() * 6, r()); obj.scale.setScalar(.65 + r() * .55); obj.updateMatrix(); shrubs.push(obj.matrix.clone());
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
