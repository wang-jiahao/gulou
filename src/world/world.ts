import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Builder, rng, type Solid } from './geometry.ts';
import { createGroundPlants, createIvy, createTrees, type TreeSpot } from './vegetation.ts';
import type { Materials } from './materials.ts';
import { createModelTrees } from './model-trees.ts';
import { collisionMesh, type CollisionMesh } from './collision-mesh.ts';
import { buildOrdinaryBuildings } from './ordinary-buildings.ts';
import { planShape, insidePolygon, type CampusMap } from './campus-map.ts';
import { createPriorityDetails, createSkyline } from './priority-details.ts';
export { bounds } from './campus-map.ts';

export const maxFlightAltitude = 180;
export const spawn = new T.Vector3(0, .03, 68);
export const benchLocations = [new T.Vector3(-30, 0, 39), new T.Vector3(30, 0, 52),new T.Vector3(-12,0,115),new T.Vector3(75,0,47)];
export const campusPlaces=[
  {name:'北大楼',x:0,z:18,description:'中央塔楼、十字脊与爬藤，是许多南大学生和校友记忆中的校园风景。'},
  {name:'东大楼',x:37,z:48,description:'抬高的中央屋顶、灰砖与深色木窗，共同构成庭院东侧的建筑轮廓。'},
  {name:'西大楼',x:-37,z:46,description:'沿着庭院西侧慢慢走，可以看到起伏的瓦顶、分层的窗带和掩映其间的树木。'},
  {name:'教学楼／郑钢楼',x:-85,z:141,description:'沿两江路展开的教学楼，中部入口面向中大路。外轮廓来自校园平面图，立面按官方 VR 近似重建。'},
  {name:'中大路',x:-86,z:256,description:'从教学楼一带通向汉口路校门的校园道路，与北大楼前的金大路有横向错位。'},
  {name:'汉口路校门',x:-91,z:350,description:'连接北园、中大路与汉口路的校门。穿过汉口路后，可继续步入南园。'},
  {name:'广州路校门',x:-35,z:715,description:'南园南端的校园出入口，沿校园道路可以回到宿舍区与汉口路。'},
  {name:'大礼堂',x:-27,z:99,description:'大礼堂于 1920 年投入使用，是金陵大学旧址的组成部分。中式屋顶、三樘入口和两侧耳房，记录着校园公共生活的记忆。'},
];
export type CampusWorld = Awaited<ReturnType<typeof createWorld>>;

export async function createWorld(scene: T.Scene, mats: Materials) {
  const root = new T.Group(); root.name = 'core-campus'; scene.add(root);
  const solids: Solid[] = [], cameraSolids: T.Object3D[] = [], fixedMeshes: CollisionMesh[] = [], lampPositions:T.Vector3[]=[], vegetationUpdates: ((position: T.Vector3, quality: string, flying: boolean) => void)[] = [];
  const mapResponse = await fetch(`${import.meta.env.BASE_URL}data/campus-layout.json`);
  if (!mapResponse.ok) throw new Error('校园地图加载失败');
  const map: CampusMap = await mapResponse.json();
  const b = new Builder();
  // Surfaces and courtyards share the supplied plan, including polygon holes.
  const base = new T.MeshStandardMaterial({ color: 0xa5aa96, roughness: 1 });
  b.box(1800, .4, 1900, -130, -.2, 160, base);
  // Modest collider tiles avoid the contact tolerance of a kilometre-wide convex box.
  for (let x = -640; x < 192; x += 64) for (let z = -320; z < 768; z += 64) solids.push({ x: x + 32, y: -.2, z: z + 32, w: 64, h: .4, d: 64 });
  const asphalt = new T.MeshStandardMaterial({ name: 'paving', color: 0x9a9e9a, map: mats.textures.get('stone-grain.webp'), roughness: .95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const addSurface = (polygon: Parameters<typeof planShape>[0], material: T.Material, y: number) => {
    const geometry = new T.ShapeGeometry(planShape(polygon)).rotateX(-Math.PI / 2);
    const uv = geometry.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3.6, uv.getY(i) / 3.6);
    if (material === asphalt) { const proxy = new T.Mesh(geometry); proxy.position.y = y; proxy.updateMatrixWorld(); fixedMeshes.push(collisionMesh(proxy, false)); }
    b.add(geometry, material, 0, y, 0);
  };
  for (const road of map.roads) {
    addSurface(road, asphalt, .035);
    for (const ring of [road.points, ...(road.holes ?? [])]) for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], x = (ax + bx) / 2, z = (az + bz) / 2, length = Math.hypot(bx - ax, bz - az);
      if (length < 1 || x < -163 || x > 85 || z < -27 || z > 350) continue;
      b.box(.16, .12, length, x, .07, z, mats.stone, false, Math.atan2(bx - ax, bz - az));
    }
  }
  for (const lawn of map.lawns) addSurface(lawn, mats.grass, .022);
  for (const field of map.features.filter(f => f.tags.leisure === 'track')) {
    addSurface(field, new T.MeshStandardMaterial({ color: 0x9e6554, roughness: .96 }), .04);
    for (const hole of field.holes ?? []) addSurface({ points: hole }, mats.grass, .041);
  }
  // Entrance aprons attach the detailed models to the traced road network.
  b.box(12, .06, 5, 0, .025, 16.4, mats.path);
  b.box(8.5, .06, 6.5, -31, .025, 99, mats.path);
  const ground = b.finish('registered campus roads lawns and playing fields'); root.add(ground); solids.push(...b.solids);
  const priority = createPriorityDetails(map, mats); root.add(priority.group); solids.push(...priority.solids);
  cameraSolids.push(...priority.group.children);
  root.add(createSkyline());

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}assets/buildings/beidalou.glb`);
  gltf.scene.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    o.castShadow = o.receiveShadow = true;
    const m = o.material as T.MeshStandardMaterial;
    if (m.name === 'historic-brick') o.material = mats.brick;
    if (m.name === 'limestone') { m.map = mats.textures.get('stone-grain.webp')!; m.color.set(0xb7b5a6); m.roughness = .94; }
    if(m.name.startsWith('window-glass'))m.envMapIntensity=1.7;
    cameraSolids.push(o);
  });
  root.add(gltf.scene);
  gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o instanceof T.Mesh&&(o.material as T.Material).name==='roof')fixedMeshes.push(collisionMesh(o,true));});
  const collisionResponse = await fetch(`${import.meta.env.BASE_URL}data/beidalou-collision.json`);
  if (!collisionResponse.ok) throw new Error('建筑碰撞数据加载失败');
  const heroSolids: Solid[] = await collisionResponse.json(); solids.push(...heroSolids);
  // Keep all building collision ready before play, even on a slow connection while
  // optional facade models are still streaming.
  const landmarkCollision=await fetch(`${import.meta.env.BASE_URL}data/landmarks-collision.json`);if(!landmarkCollision.ok)throw new Error('扩展区域碰撞数据未加载');
  solids.push(...await landmarkCollision.json() as Solid[]);
  const ordinary=buildOrdinaryBuildings(map.features,mats);fixedMeshes.push(...ordinary.fixedMeshes);
  root.add(createIvy(mats));

  const nearTrees: TreeSpot[] = [
    { x: -16, z: 21, height: 14, kind: 'cedar' }, { x: 17, z: 19, height: 16, kind: 'cedar' },
    { x: -28, z: 30, height: 15 }, { x: 29, z: 31, height: 17 },
    { x: -29, z: 48, height: 17 }, { x: 31, z: 57, height: 16 },
    { x: -31, z: 68, height: 18 }, { x: 27, z: 76, height: 16 },
    { x: -13, z: 63, height: 19 }, { x: 15, z: 83, height: 18 },
    { x: -35, z: 6, height: 17 }, { x: 38, z: 3, height: 15 },
    { x: -19, z: -22, height: 17 }, { x: 23, z: -24, height: 18 },
  ];
  const trees = createTrees(nearTrees.filter(t => t.kind === 'cedar'), mats); root.add(trees.group); solids.push(...trees.solids);
  const broadleaf = await createModelTrees(nearTrees.filter(t => t.kind !== 'cedar'), 'near', mats.leaves); root.add(broadleaf.group); solids.push(...broadleaf.solids);
  const plants = createGroundPlants(mats); root.add(plants.group);
  let sectors = 1;

  async function expand(afterSector: () => void = () => {}) {
    // Yield between optional sectors so input and the first rendered frame can run.
    await new Promise<void>(resolve => setTimeout(resolve, 50));
    const moreSolids: Solid[] = [];
    root.add(ordinary.group);cameraSolids.push(...ordinary.cameraSolids);
    const landmarkAssets=await Promise.all(['east','west','auditorium'].map(name=>loader.loadAsync(`${import.meta.env.BASE_URL}assets/buildings/${name}.glb`)));
    for(const asset of landmarkAssets){
      asset.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;const mat=o.material as T.MeshStandardMaterial;
        if(mat.name==='historic-brick')o.material=mats.brick;
        if(mat.name==='limestone'){mat.map=mats.textures.get('stone-grain.webp')!;mat.color.set(0xb7b5a6);}
        if(mat.name.startsWith('window-glass'))mat.envMapIntensity=1.7;
        o.castShadow=o.receiveShadow=true;cameraSolids.push(o);
      });root.add(asset.scene);asset.scene.updateMatrixWorld(true);asset.scene.traverse(o=>{if(o instanceof T.Mesh&&(o.material as T.Material).name==='roof')fixedMeshes.push(collisionMesh(o,true));});
    }
    for(const place of [{name:'东大楼',x:40.92,y:2.1,z:45.4,a:-Math.PI/2,w:.65,h:.38},{name:'西大楼',x:-40.57,y:2.1,z:43.2,a:Math.PI/2,w:.65,h:.38},{name:'大礼堂',x:-33.76,y:7.46,z:98.9,a:Math.PI/2,w:1.8,h:.48}]){
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#86784f';ctx.fillRect(0,0,512,160);ctx.strokeStyle='#b3a374';ctx.lineWidth=6;ctx.strokeRect(8,8,496,144);ctx.fillStyle='#2a2419';ctx.font='72px "Songti SC", "SimSun", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(place.name,256,85);
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const plaque=new T.Mesh(new T.PlaneGeometry(place.w,place.h),new T.MeshStandardMaterial({map:texture,roughness:.65,metalness:.22}));plaque.position.set(place.x,place.y,place.z);plaque.rotation.y=place.a;plaque.receiveShadow=true;root.add(plaque);
    }
    afterSector();
    sectors++;
    await new Promise<void>(resolve => setTimeout(resolve, 50));
    const rand = rng(88), farTrees: TreeSpot[] = [];
    const clear = (x: number, z: number) => !map.features.some(f => f.tags.building && insidePolygon(x, z, f)) && !map.roads.some(r => insidePolygon(x, z, r));
    // Avenue planting uses the traced road edge; other trees stay within plan lawns.
    for (let z = 156; z < 342; z += 15) for (const side of [-1, 1]) {
      const x = -85 - (z - 182) * .035 + side * 8;
      if (clear(x, z)) farTrees.push({ x, z, height: 15 + rand() * 5 });
    }
    for (let attempt = 0; attempt < 6500 && farTrees.length < 190; attempt++) {
      const x = -575 + rand() * 705, z = -240 + rand() * 960;
      if (Math.abs(x) < 42 && z > -30 && z < 90) continue;
      if (x > -103 && x < -69 && z > 136 && z < 348) continue;
      if (!clear(x, z) || !map.lawns.some(l => insidePolygon(x, z, l))) continue;
      if (farTrees.some(t => Math.hypot(t.x - x, t.z - z) < 11)) continue;
      farTrees.push({ x, z, height: 12 + rand() * 8 });
    }
    const far = await createModelTrees(farTrees, 'far', mats.leaves); root.add(far.group); moreSolids.push(...far.solids); vegetationUpdates.push(far.updateVisibility);
    const props = new Builder();
    for (const p of benchLocations) {
      for (let k = 0; k < 5; k++) props.box(2.25, .075, .105, p.x, .52, p.z + k * .12, mats.wood);
      for (let k = 0; k < 4; k++) props.box(2.25, .12, .09, p.x, .78 + k * .16, p.z + .54, mats.wood);
      for (const side of [-1, 1]) props.box(.1, .5, .52, p.x + side * .83, .25, p.z + .25, mats.metal);
      props.solids.push({ x: p.x, y: .5, z: p.z + .25, w: 2.25, h: 1, d: .68 });
    }
    const lightGlass = new T.MeshStandardMaterial({ name:'lamp-glass',color: 0xf7ebc5, emissive: 0xc2a165, emissiveIntensity: .18, roughness: .35 });
    const lampSpots=[...[-1,1].flatMap(side=>[23,43,64,-20].map(z=>[side*32.3,z])),[-20,89],[-20,112],...Array.from({length:8},(_,i)=>[-77-i*.9,165+i*24]),[-82,389],[-74,445],[-39,519],[-22,600],[-28,686]];
    for (const [x,z] of lampSpots) {
      lampPositions.push(new T.Vector3(x,3.85,z));
      props.cylinder(new T.Vector3(x, 0, z), new T.Vector3(x, 3.9, z), .09, .045, mats.metal, 8);
      props.box(.38, .55, .38, x, 3.85, z, lightGlass);
      props.box(.52, .1, .52, x, 4.15, z, mats.metal);
      for (const a of [-1, 1]) for (const c of [-1, 1]) props.box(.035, .6, .035, x + a * .2, 3.85, z + c * .2, mats.metal);
      props.solids.push({ x, y: 1.8, z, w: .18, h: 3.6, d: .18 });
    }
    const propGroup = props.finish('benches lamps and boundary'); root.add(propGroup); moreSolids.push(...props.solids); cameraSolids.push(...propGroup.children);
    afterSector();
    sectors++;
    return moreSolids;
  }
  const updateVegetation = (position: T.Vector3, quality: string, flying: boolean) => vegetationUpdates.forEach(update => update(position, quality, flying));
  return { root, map, updateVegetation, solids, fixedMeshes,lampPositions,cameraSolids, expand, get sectors() { return sectors; } };
}
