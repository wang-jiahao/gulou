import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { rng, type Solid } from './geometry.ts';
import type { TreeSpot } from './vegetation.ts';

export async function createModelTrees(spots: TreeSpot[], lod: 'near' | 'far', foliage: T.Material) {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${import.meta.env.BASE_URL}assets/vegetation/tree-${lod}.glb`);
  gltf.scene.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(gltf.scene), h = box.max.y - box.min.y, rand = rng(lod === 'near' ? 318 : 981);
  const solids: Solid[] = [], dummy = new T.Object3D(), group = new T.Group();
  group.name = `broadleaf trees ${lod} — CC0 model, approximate species`;
  const cells = new Map<string, { trees: TreeSpot[]; group: T.Group; center: T.Vector2 }>();
  for (const tree of spots) {
    const gx = Math.floor(tree.x / 90), gz = Math.floor(tree.z / 90), key = lod === 'near' ? 'near' : `${gx}:${gz}`;
    if (!cells.has(key)) { const cell = { trees: [], group: new T.Group(), center: new T.Vector2((gx + .5) * 90, (gz + .5) * 90) }; cells.set(key, cell); group.add(cell.group); }
    cells.get(key)!.trees.push(tree);
    solids.push({ x: tree.x, y: tree.height * .22, z: tree.z, w: .8, h: tree.height * .44, d: .8 });
  }
  const sources: { geometry: T.BufferGeometry; material: T.Material }[] = [];
  gltf.scene.traverse(node => {
    if (!(node instanceof T.Mesh)) return;
    let geometry = node.geometry.clone();
    for (const name of ['position', 'normal']) {
      const a = geometry.getAttribute(name); if (!a) continue;
      const values = new Float32Array(a.count * 3);
      for (let i = 0; i < a.count; i++) values.set([a.getX(i), a.getY(i), a.getZ(i)], i * 3);
      geometry.setAttribute(name, new T.Float32BufferAttribute(values, 3));
    }
    geometry.applyMatrix4(node.matrixWorld);
    const material = node.material as T.MeshStandardMaterial; material.roughness = .9;
    if (material.map) material.map.anisotropy = 8;
    if (lod === 'far' && material.name.includes('trunk')) {
      // Preserve a rounded trunk instead of the single-point base in the reduced scan.
      const curve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(.1, .9, .18), new T.Vector3(-.03, 2.1, .61), new T.Vector3(.12, 3.6, 1.4)]);
      geometry.dispose(); geometry = new T.TubeGeometry(curve, 16, 1, 7, false);
      const p = geometry.getAttribute('position');
      for (let row = 0; row <= 16; row++) {
        const t = row / 16, center = curve.getPointAt(t), radius = .18 - .09 * t;
        for (let col = 0; col <= 7; col++) { const i = row * 8 + col, point = new T.Vector3().fromBufferAttribute(p, i).sub(center).multiplyScalar(radius).add(center); p.setXYZ(i, point.x, point.y, point.z); }
      }
      geometry.computeVertexNormals();
    }
    sources.push({ geometry, material });
  });
  const leafGeo = new T.PlaneGeometry(1, 1.6);
  for (const cell of cells.values()) {
    const transforms = cell.trees.map(tree => {
      const scale = tree.height / h;
      dummy.position.set(tree.x, -box.min.y * scale, tree.z); dummy.rotation.set(0, rand() * Math.PI * 2, 0); dummy.scale.set(scale * (.9 + rand() * .3), scale, scale * (.9 + rand() * .3)); dummy.updateMatrix(); return dummy.matrix.clone();
    });
    for (const { geometry, material } of sources) {
      const mesh = new T.InstancedMesh(geometry, material, cell.trees.length);
      transforms.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, new T.Color().setRGB(.88 + rand() * .12, .9 + rand() * .1, .8 + rand() * .18)); });
      mesh.castShadow = lod === 'near'; mesh.receiveShadow = true; mesh.computeBoundingSphere(); cell.group.add(mesh);
    }
    const sprays = lod === 'near' ? 1100 : 400, leaves = new T.InstancedMesh(leafGeo, foliage, cell.trees.length * sprays);
    let index = 0;
    cell.trees.forEach(spot => {
      for (let i = 0; i < sprays; i++) {
        let x: number, y: number, z: number;
        do { x = rand() * 2 - 1; y = rand() * 2 - 1; z = rand() * 2 - 1; } while (x * x + y * y + z * z > 1);
        dummy.position.set(spot.x + x * spot.height * .31, spot.height * (.75 + y * .25), spot.z + z * spot.height * .32);
        dummy.rotation.set(rand() * 3, rand() * 6.28, rand() * 3); dummy.scale.setScalar(.8 + rand() * .7); dummy.updateMatrix(); leaves.setMatrixAt(index, dummy.matrix); leaves.setColorAt(index, new T.Color().setHSL(.16, .16, .68 + rand() * .25)); index++;
      }
    });
    leaves.castShadow = lod === 'near' || (cell.center.x > -160 && cell.center.x < 25 && cell.center.y < 390); leaves.receiveShadow = true; leaves.computeBoundingSphere(); cell.group.add(leaves);
  }
  const updateVisibility = (position: T.Vector3, quality: string, flying: boolean) => {
    if (lod === 'near') return;
    const range = flying ? 800 : quality === 'high' ? 480 : quality === 'low' ? 210 : 330;
    for (const cell of cells.values()) cell.group.visible = Math.hypot(cell.center.x - position.x, cell.center.y - position.z) < range;
  };
  return { group, solids, updateVisibility };
}
