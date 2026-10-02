import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { rng, type Solid } from './geometry.ts';
import type { TreeSpot } from './vegetation.ts';

type TreeLOD = 'near' | 'far' | 'distant';
type TreeAsset = { box: T.Box3; sources: { geometry: T.BufferGeometry; material: T.MeshStandardMaterial }[] };
const caches = new WeakMap<T.Material, { assets: Map<TreeLOD, Promise<TreeAsset>>; materials: Map<string, T.MeshStandardMaterial> }>();

function loadTree(lod: TreeLOD, foliage: T.Material): Promise<TreeAsset> {
  let cache = caches.get(foliage);
  if (!cache) { cache = { assets: new Map(), materials: new Map() }; caches.set(foliage, cache); }
  const existing = cache.assets.get(lod); if (existing) return existing;
  const materials = cache.materials;
  const result = (async () => {
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${import.meta.env.BASE_URL}assets/vegetation/tree-${lod}.glb`);
    gltf.scene.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(gltf.scene), sources: TreeAsset['sources'] = [];
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
      let material = node.material as T.MeshStandardMaterial;
      const shared = materials.get(material.name);
      if (shared) material = shared;
      else {
        material.roughness = .91;
        if (material.name.includes('leaves')) {
          // The atlas includes transparent leaf margins. Opaque triangles made
          // the canopy look like angular cardboard even close to the landmark.
          material.alphaTest = .38; material.alphaToCoverage = true; material.side = T.DoubleSide;
          material.alphaMap = foliage.userData.canopyAlpha;
          material.color.set(0xd6dcc9);
          material.onBeforeCompile = shader => {
            shader.uniforms.uFoliageLight = foliage.userData.foliageLight;
            shader.fragmentShader = 'uniform float uFoliageLight;\n' + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', '#include <lights_fragment_begin>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * .06 * uFoliageLight;');
          };
          material.customProgramCacheKey = () => 'gulou-canopy-translucency';
        }
        if (material.map) material.map.anisotropy = 8;
        materials.set(material.name, material);
      }
      if (lod !== 'near' && material.name.includes('trunk')) {
        const curve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(.1, .9, .18), new T.Vector3(-.03, 2.1, .61), new T.Vector3(.12, 3.6, 1.4)]);
        geometry.dispose(); geometry = new T.TubeGeometry(curve, 12, 1, 6, false);
        const p = geometry.getAttribute('position');
        for (let row = 0; row <= 12; row++) {
          const t = row / 12, center = curve.getPointAt(t), radius = .18 - .09 * t;
          for (let col = 0; col <= 6; col++) { const i = row * 7 + col, point = new T.Vector3().fromBufferAttribute(p, i).sub(center).multiplyScalar(radius).add(center); p.setXYZ(i, point.x, point.y, point.z); }
        }
        geometry.computeVertexNormals();
      }
      sources.push({ geometry, material });
    });
    return { box, sources };
  })();
  cache.assets.set(lod, result); return result;
}

export async function createModelTrees(spots: TreeSpot[], lod: 'near' | 'far', foliage: T.Material) {
  const names: TreeLOD[] = lod === 'near' ? ['near', 'far', 'distant'] : ['far', 'distant'];
  const assets = await Promise.all(names.map(name => loadTree(name, foliage)));
  const box = assets[0].box, h = box.max.y - box.min.y, rand = rng(lod === 'near' ? 318 : 981);
  const solids: Solid[] = [], dummy = new T.Object3D(), group = new T.Group();
  group.name = `broadleaf trees ${lod} — CC0 model, approximate species`;
  const cells = new Map<string, { trees: TreeSpot[]; group: T.Group; levels: T.Group[]; center: T.Vector3; active: number }>();
  for (const tree of spots) {
    const gx = Math.floor(tree.x / 60), gz = Math.floor(tree.z / 60), key = `${gx}:${gz}`;
    if (!cells.has(key)) {
      const cell = { trees: [] as TreeSpot[], group: new T.Group(), levels: names.map(() => new T.Group()), center: new T.Vector3((gx + .5) * 60, 10, (gz + .5) * 60), active: 0 };
      cells.set(key, cell); group.add(cell.group); cell.group.add(...cell.levels);
    }
    cells.get(key)!.trees.push(tree);
    solids.push({ x: tree.x, y: tree.height * .22, z: tree.z, w: .8, h: tree.height * .44, d: .8 });
  }
  const leafGeo = new T.PlaneGeometry(1, 1.6);
  for (const cell of cells.values()) {
    const transforms = cell.trees.map(tree => {
      const scale = tree.height / h;
      dummy.position.set(tree.x, -box.min.y * scale, tree.z); dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.set(scale * (.9 + rand() * .3), scale, scale * (.9 + rand() * .3)); dummy.updateMatrix(); return dummy.matrix.clone();
    });
    assets.forEach((asset, level) => {
      const layer = cell.levels[level]; layer.visible = level === 0;
      for (const { geometry, material } of asset.sources) {
        const mesh = new T.InstancedMesh(geometry, material, cell.trees.length);
        transforms.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, new T.Color().setRGB(.91, .96, .87)); });
        mesh.castShadow = names[level] === 'near'; mesh.receiveShadow = true; mesh.computeBoundingSphere(); layer.add(mesh);
      }
      const sprays = names[level] === 'near' ? 3200 : names[level] === 'far' ? 600 : 0;
      if (!sprays) return;
      const leaves = new T.InstancedMesh(leafGeo, foliage, cell.trees.length * sprays); let index = 0;
      cell.trees.forEach(spot => {
        for (let i = 0; i < sprays; i++) {
          let x: number, y: number, z: number;
          do { x = rand() * 2 - 1; y = rand() * 2 - 1; z = rand() * 2 - 1; } while (x * x + y * y + z * z > 1);
          dummy.position.set(spot.x + x * spot.height * .31, spot.height * (.75 + y * .25), spot.z + z * spot.height * .32);
          dummy.rotation.set(rand() * 3, rand() * 6.28, rand() * 3); dummy.scale.setScalar(.50 + rand() * .40); dummy.updateMatrix();
          const shade=.76+rand()*.22;
          leaves.setMatrixAt(index, dummy.matrix); leaves.setColorAt(index, new T.Color().setRGB(shade*.95,shade,shade*.9)); index++;
        }
      });
      leaves.castShadow = names[level] === 'near'; leaves.receiveShadow = true; leaves.computeBoundingSphere(); layer.add(leaves);
    });
  }
  const updateVisibility = (position: T.Vector3, quality: string, flying: boolean) => {
    const range = flying ? 850 : quality === 'high' ? 550 : quality === 'low' ? 300 : 420;
    const near = flying ? (quality === 'high' ? 90 : 55) : quality === 'high' ? 125 : quality === 'low' ? 55 : 90;
    const middle = flying ? (quality === 'high' ? 155 : quality === 'low' ? 80 : 105) : quality === 'high' ? 240 : quality === 'low' ? 120 : 180;
    for (const cell of cells.values()) {
      const distance = cell.center.distanceTo(position);
      cell.group.visible = distance < range;
      const limits = lod === 'near' ? [near, middle] : [middle];
      let next = cell.active;
      while (next < limits.length && distance > limits[next] + 8) next++;
      while (next > 0 && distance < limits[next - 1] - 8) next--;
      if (next !== cell.active) { cell.levels[cell.active].visible = false; cell.levels[next].visible = true; cell.active = next; }
    }
  };
  return { group, solids, updateVisibility };
}
