import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Builder, rng, type Solid } from './geometry.ts';
import { createGroundPlants, createIvy, createJunipers, createWestWingIvy, type TreeSpot } from './vegetation.ts';
import type { Materials } from './materials.ts';
import { createModelTrees } from './model-trees.ts';
import { collisionMesh, type CollisionMesh } from './collision-mesh.ts';
import { buildOrdinaryBuildings } from './ordinary-buildings.ts';
import {memorialPlantingClearance} from './pearl-memorial.ts';
import {zhongshanPlantingClearance} from './zhongshan.ts';
import {rabePlantingClearance} from './rabe-house.ts';
import { planShape, insidePolygon, insideRing, type CampusMap } from './campus-map.ts';
import { createPriorityDetails, createSkyline, createFireTower } from './priority-details.ts';
import { createFootballPitch } from './football-pitch.ts';
import { createRunningTrack } from './running-track.ts';
import { createSportsGround, sportsClearance } from './sports-ground.ts';
import { createCampusSign, photoSpot } from './campus-sign.ts';
import { fireTowerFootprint } from './surroundings.ts';
import { createAccessControls, campusEntrances } from './access-controls.ts';
import { createDormitoryAmenities } from './dormitory-amenities.ts';
import { createTeachingBicycleParking, teachingParkingClearance } from './teaching-bicycle-parking.ts';
import { createSouthRoadDetails } from './south-road-details.ts';
import { createSouthTreeDetails } from './south-tree-details.ts';
import { createCampusDirectory } from './campus-directory.ts';
import {createPublicStreets} from './public-streets.ts';
import {createCampusBoundaries} from './campus-boundaries.ts';
import {createGuangzhouGate} from './guangzhou-gate.ts';
import {createLampBanners} from './lamp-banners.ts';
import {createSportsHallForecourts} from './sports-hall-forecourts.ts';
import {createSportsHallPaving, sportsHallPavingLayout} from './sports-hall-paving.ts';
import {createZhongdaAvenue, zhongdaAvenueLayout, trimAvenueCurb, avenueTreePosition} from './zhongda-avenue.ts';
import {createLibraryWestGardens, libraryWestGardenLayout} from './library-west-gardens.ts';
import {createRabeCourtyard, rabeCourtyardLayout} from './rabe-courtyard.ts';
import {createTianCourtyard, tianCourtyardLayout} from './tian-courtyard.ts';
import {createTangCourtyard,tangCourtyardLayout} from './tang-courtyard.ts';
import {createTangCourtyardAccess} from './tang-courtyard-access.ts';
import {createTangCourtyardGround} from './tang-courtyard-ground.ts';
import {createJinyinStreetTrees} from './jinyin-street-trees.ts';
import {createPlanarCutout} from './planar-cutout.ts';
import {splitTeachingFeature} from './specific-buildings.ts';
import type {CampusBicycle} from './bicycle.ts';
import {extraPlaces} from './place-index.ts';
import {createDadaoping} from './dadaoping.ts';
import { terrainHeight, terrainSurface, terraceHeight, eastTerraceHeight, createCourtyardSteps, createEastTeachingSteps } from './courtyard-terrain.ts';
import { createSonglinGarden, songlinPathOpening } from './songlin-garden.ts';
import {createNanyuanFountain} from './nanyuan-fountain.ts';
export { bounds } from './campus-map.ts';

export const maxFlightAltitude = 180;
export const spawn = new T.Vector3(0, terraceHeight + .06, 68);
export const benchLocations = [new T.Vector3(-30, 0, 39), new T.Vector3(30, 0, 52),new T.Vector3(-12,0,115),new T.Vector3(75,0,47)];
export const campusPlaces=[
  ...extraPlaces,
  {name:'苏浙运动场',x:-193,z:-9,description:'到草坪上踢一会儿球。靠近足球按 E，或点击踢球；快走时踢球会更有力量。'},
  {name:'I ❤️ NJU',x:-24,z:46,description:'在草坪前留一张合影。沿西侧稍稍后退，可以把北大楼与紫峰大厦一同收入画面。'},
  {name:'北大楼',x:0,z:18,description:'中央塔楼、十字脊与爬藤，是许多南大学生和校友记忆中的校园风景。'},
  {name:'东大楼',x:37,z:48,description:'抬高的中央屋顶、灰砖与深色木窗，共同构成庭院东侧的建筑轮廓。'},
  {name:'西大楼',x:-37,z:46,description:'沿着庭院西侧慢慢走，可以看到起伏的瓦顶、分层的窗带和掩映其间的树木。'},
  {name:'教学楼／郑钢楼',x:-85,z:141,description:'沿两江路展开的教学楼，中部入口面向中大路。外轮廓来自校园平面图，立面按官方 VR 近似重建。'},
  {name:'中大路',x:-86,z:256,description:'从教学楼一带通向汉口路校门的校园道路，与北大楼前的金大路有横向错位。'},
  {name:'汉口路校门',x:-91,z:350,description:'连接北园、中大路与汉口路的校门。穿过汉口路后，可继续步入南园。'},
  {name:'广州路校门',x:-35,z:715,description:'南园南端的校园出入口，沿校园道路可以回到宿舍区与汉口路。'},
  {name:'大礼堂',x:-27,z:99,description:'大礼堂于 1920 年投入使用，是金陵大学旧址的组成部分。中式屋顶、三樘入口和两侧耳房，记录着校园公共生活的记忆。'},
  {name:'松林楼',x:-65.8,z:411.8,description:'松林楼邻近南园的林下休憩空间。沿楼侧可以看到蓝灰色立面、浅色窗框和底层玻璃窗。'},
  {name:'松林休憩点',x:-70,z:420,description:'松林楼旁的石桌和矮凳，可走近坐一会儿，再沿小径回到校园道路。'},
];
export type TravelPlace = { name: string; x: number; z: number; yaw: number; pitch?: number; firstPerson?: boolean; photoFov?: number };
export const travelPlaces: TravelPlace[] = [
  { name: '北大楼', x: 0, z: 60, yaw: 0 },
  { name: '东大楼', x: 35, z: 48, yaw: -Math.PI / 2 },
  { name: '西大楼', x: -35, z: 46, yaw: Math.PI / 2 },
  { name: '大礼堂', x: -24, z: 99, yaw: Math.PI / 2 },
  { name: '教学楼／郑钢楼', x: -85, z: 153, yaw: 0 },
  { name: '中大路', x: -86, z: 255, yaw: 0 },
  { name: '汉口路校门', x: -91, z: 365, yaw: 0 },
  { name: '苏浙运动场', x: -193, z: -2, yaw: 0 },
  { name: '南园北门', x: -89, z: 392, yaw: Math.PI },
  { name: '南园喷泉', x: -65.8, z: 456.743, yaw: Math.PI / 2 },
  { name: '南园宿舍区', x: -41, z: 526, yaw: 0 },
  { name: '广州路校门', x: -35, z: 715, yaw: 0 },
  photoSpot,
];
export type CampusWorld = Awaited<ReturnType<typeof createWorld>>;

export async function createWorld(scene: T.Scene, mats: Materials, quality = 'medium') {
  const bicycles:CampusBicycle[]=[];
  const root = new T.Group(); root.name = 'core-campus'; scene.add(root);
  const solids: Solid[] = [], cameraSolids: T.Object3D[] = [], fixedMeshes: CollisionMesh[] = [], lampPositions:T.Vector3[]=[], vegetationUpdates: ((position: T.Vector3, quality: string, flying: boolean, camera?:T.Vector3) => void)[] = [];
  const mapResponse = await fetch(`${import.meta.env.BASE_URL}data/campus-layout.json`);
  if (!mapResponse.ok) throw new Error('校园地图加载失败');
  const groundCameraProxy = new T.Mesh(new T.PlaneGeometry(1800, 1900).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ side: T.DoubleSide })); groundCameraProxy.position.set(-130, .005, 160); groundCameraProxy.updateMatrixWorld(); cameraSolids.push(groundCameraProxy);
  const map: CampusMap = await mapResponse.json();
  const memorial=map.features.find(f=>f.id==='plan-50');if(memorial){memorial.tags={...memorial.tags,name:'赛珍珠纪念馆','building:levels':'2',source:'NJU Archives 2023-12-24 + user campus plan labelled 赛珍珠楼 + gl-2-05'};}
  const parcel=map.features.find(f=>f.id==='plan-100');if(parcel){
    parcel.tags={...parcel.tags,old_name:parcel.tags.name,name:'南园快递取件点',source:'User correction and matching screenshot; descriptive label, official service name unverified'};
  }
  const oldLabs=map.features.findIndex(f=>f.id==='plan-36');if(oldLabs>=0)map.features.splice(oldLabs,1,...splitTeachingFeature(map.features[oldLabs]));
  const southTeaching=map.features.find(f=>f.id==='plan-73');if(southTeaching){
    // Re-traced from the 2024 official plan, registered to the existing map.
    // The old outline extended farther onto the public-street side.
    southTeaching.points=[[-37.238,349.617],[27.155,345.846],[26.451,354.003],[-36.879,358.441]];
    southTeaching.tags={...southTeaching.tags,name:'南教学楼',source:'NJU asset office 2024 campus plan + official VR scene_gl-2-53',labelConfidence:'official location diagram; distinct from South Garden teaching building'};
  }
  map.features.push(fireTowerFootprint);
  const sportsPaving = sportsHallPavingLayout(map), sportsPavingCutout = createPlanarCutout(sportsPaving.outline);
  const avenue = zhongdaAvenueLayout(), libraryGardens=libraryWestGardenLayout(), rabeCourtyard=rabeCourtyardLayout(), tianCourtyard=tianCourtyardLayout(), tangCourtyard=tangCourtyardLayout(map);
  const surfaceCutouts = [sportsPavingCutout,...avenue.outlines.map(createPlanarCutout),...libraryGardens.outlines.map(createPlanarCutout),createPlanarCutout(rabeCourtyard.outline),...tianCourtyard.outlines.map(createPlanarCutout),createPlanarCutout(tangCourtyard.outline)];
  const raisedLawns = new Set(map.lawns.filter(lawn => lawn.points.every(([x, z]) => x > -40 && x < 40 && z > 14 && z < 84)));
  const lawnHeight = .20;
  const courtyardHeight = (x: number, z: number) => terrainHeight(x,z) + ([...raisedLawns].some(lawn => insidePolygon(x, z, lawn)) ? lawnHeight : .022);
  benchLocations.forEach(p => { p.y = courtyardHeight(p.x,p.z); });
  const b = new Builder();
  // Surfaces and courtyards share the supplied plan, including polygon holes.
  // Lawns, paths and the running track sit only centimetres above this slab.
  // Bias the foundation away from the camera so its pale surface cannot win
  // the depth test intermittently when looking down from flight altitude.
  const base = new T.MeshStandardMaterial({ name: 'campus-foundation', color: 0xa5aa96, roughness: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 8 });
  b.box(1800, .4, 1900, -130, -.2, 160, base);
  // Modest collider tiles avoid the contact tolerance of a kilometre-wide convex box.
  for (let x = -640; x < 192; x += 64) for (let z = -320; z < 768; z += 64) solids.push({ x: x + 32, y: -.2, z: z + 32, w: 64, h: .4, d: 64 });
  const asphalt = new T.MeshStandardMaterial({ name: 'paving', color: 0x93988f, map: mats.textures.get('courtyard-asphalt.webp'), roughness: .95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  // The white strokes in the schematic map are drawing outlines, not metre-wide
  // strips of pale paving. Fill only the courtyard substrate beneath its paths.
  b.add(terrainSurface({points:[[-39,13],[39,13],[39,85],[-39,85]]},.018),asphalt);
  // One continuous mesh avoids coplanar overlap where the east terrace meets
  // the north garden. Roads and building foundations sample the same surface.
  const terrace = new T.Mesh(terrainSurface({points:[[-43,-30],[72,-30],[72,85.85],[-43,85.85]]},.009),mats.grass);
  terrace.receiveShadow=true; root.add(terrace); fixedMeshes.push(collisionMesh(terrace,true));cameraSolids.push(terrace);
  const steps=createCourtyardSteps(mats);root.add(steps.group);solids.push(...steps.solids);cameraSolids.push(...steps.group.children);
  const eastSteps=createEastTeachingSteps(mats);root.add(eastSteps.group);solids.push(...eastSteps.solids);cameraSolids.push(...eastSteps.group.children);
  // Official VR shows asphalt garden paths, rather than a continuous stone plaza.
  const addSurface = (polygon: Parameters<typeof planShape>[0], material: T.Material, y: number) => {
    let geometry = terrainSurface(polygon,y);
    if (material === asphalt) { const proxy = new T.Mesh(geometry); proxy.updateMatrixWorld(); fixedMeshes.push(collisionMesh(proxy, false)); }
    const cuts = surfaceCutouts.filter(c=>c.intersects(polygon.points));
    if (cuts.length) {
      geometry.dispose(); geometry = terrainSurface(polygon,y,{
        intersects: ring=>cuts.some(c=>c.intersects(ring)),
        subtract: ring=>cuts.reduce((fragments,c)=>fragments.flatMap(p=>c.subtract(p)),[ring]),
      });
    }
    b.add(geometry, material);
  };
  for (const road of map.roads) {
    addSurface(road, asphalt, .035);
    for (const ring of [road.points, ...(road.holes ?? [])]) for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], x = (ax + bx) / 2, z = (az + bz) / 2, length = Math.hypot(bx - ax, bz - az);
      if (length < 1 || x < -163 || x > 85 || z < -27 || z > 350) continue;
      if (Math.abs(x) < 39 && z > 14 && z < 84) continue;
      for(const [[cx,cz],[dx,dz]] of trimAvenueCurb([ax,az],[bx,bz],avenue.outlines)) {
        b.box(.16,.12,Math.hypot(dx-cx,dz-cz),(cx+dx)/2,.07+terrainHeight((cx+dx)/2,(cz+dz)/2),(cz+dz)/2,mats.stone,false,Math.atan2(dx-cx,dz-cz));
      }
    }
  }
  // The lower approach in scene_gl-3-16 is asphalt right up to the stone stair.
  addSurface({points:[[33.7,85.4],[38.3,85.4],[38.3,103],[33.7,103]]},asphalt,.041);
  for (const lawn of map.lawns) {
    const raised = raisedLawns.has(lawn);
    addSurface(lawn, mats.grass, raised ? lawnHeight : .022);
    if (!raised) continue;
    // The lawn is one shallow step above the asphalt walks. Use the same
    // traced outline for the visible edge and the solid support underneath it.
    const soil = new T.ExtrudeGeometry(planShape(lawn), { depth: lawnHeight, bevelEnabled: false, steps: 1 }).rotateX(-Math.PI / 2);
    const soilPositions=soil.getAttribute('position');for(let i=0;i<soilPositions.count;i++)soilPositions.setY(i,soilPositions.getY(i)+terrainHeight(soilPositions.getX(i),soilPositions.getZ(i)));
    const proxy = new T.Mesh(soil, new T.MeshBasicMaterial({ side: T.DoubleSide })); fixedMeshes.push(collisionMesh(proxy)); cameraSolids.push(proxy);
    for (const ring of [lawn.points, ...(lawn.holes ?? [])]) for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], length = Math.hypot(bx - ax, bz - az);
      if (length < .15) continue;
      b.box(.16, .21, length, (ax + bx) / 2, .115 + terrainHeight((ax+bx)/2,(az+bz)/2), (az + bz) / 2, mats.stone, true, Math.atan2(bx - ax, bz - az));
    }
  }
  // Entrance aprons attach the detailed models to the traced road network.
  b.box(12, .06, 5, 0, .025 + terraceHeight, 16.4, mats.path);
  b.box(8.5, .06, 6.5, -31, .025, 99, mats.path);
  const ground = b.finish('registered campus roads lawns and playing fields'); root.add(ground); solids.push(...b.solids);
  root.add(createSportsHallPaving(sportsPaving,mats));
  root.add(createZhongdaAvenue(avenue,mats,asphalt));
  root.add(createPublicStreets(mats));
  const southRoads = createSouthRoadDetails(map, mats,[songlinPathOpening]); root.add(southRoads.group); solids.push(...southRoads.solids);
  const garden = createSonglinGarden(mats); root.add(garden.group); solids.push(...garden.solids); fixedMeshes.push(...garden.fixedMeshes);cameraSolids.push(...garden.group.children);
  const dadaoping=createDadaoping(mats);root.add(dadaoping.group);solids.push(...dadaoping.solids);cameraSolids.push(...dadaoping.group.children);
  const directory = createCampusDirectory(map, mats); root.add(directory.group); solids.push(...directory.solids); cameraSolids.push(...directory.group.children);
  const fountain=createNanyuanFountain(mats);root.add(fountain.group);solids.push(...fountain.solids);cameraSolids.push(...fountain.group.children);
  const gateFont = await new FontLoader().loadAsync(`${import.meta.env.BASE_URL}assets/fonts/gate-lettering.typeface.json`);
  const priority = createPriorityDetails(map, mats, gateFont); root.add(priority.group); solids.push(...priority.solids);
  const guangzhou=createGuangzhouGate(mats);root.add(guangzhou.group);solids.push(...guangzhou.solids);cameraSolids.push(...guangzhou.group.children);
  const access=createAccessControls(mats);root.add(access.group);solids.push(...access.solids);
  const boundary=createCampusBoundaries(mats);root.add(boundary.group);solids.push(...boundary.solids);cameraSolids.push(...boundary.cameraSolids);
  cameraSolids.push(...priority.group.children);
  root.add(createSkyline());
  const sports=createSportsGround(mats);root.add(sports.group);solids.push(...sports.solids);cameraSolids.push(...sports.group.children);
  const field = createFootballPitch(map.features, mats); root.add(field.group); solids.push(...field.solids); cameraSolids.push(...field.group.children);
  const track=map.features.find(f=>f.tags.leisure==='track');if(track)root.add(createRunningTrack(track,field.pitch));
  const tower = createFireTower(), sign = createCampusSign(); root.add(tower.group, sign.group); solids.push(...tower.solids, ...sign.solids); cameraSolids.push(...tower.group.children, ...sign.group.children);
  const signElevation = courtyardHeight(-24,46);
  sign.group.position.y += signElevation; sign.solids.forEach(s => { s.y += signElevation; });

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
  gltf.scene.position.y += terraceHeight; root.add(gltf.scene);
  gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o instanceof T.Mesh&&(o.material as T.Material).name==='roof')fixedMeshes.push(collisionMesh(o,true));});
  const collisionResponse = await fetch(`${import.meta.env.BASE_URL}data/beidalou-collision.json`);
  if (!collisionResponse.ok) throw new Error('建筑碰撞数据加载失败');
  const heroSolids: Solid[] = await collisionResponse.json(); heroSolids.forEach(s=>{s.y+=terraceHeight;});solids.push(...heroSolids);
  // Keep all building collision ready before play, even on a slow connection while
  // optional facade models are still streaming.
  const landmarkCollision=await fetch(`${import.meta.env.BASE_URL}data/landmarks-collision.json`);if(!landmarkCollision.ok)throw new Error('扩展区域碰撞数据未加载');
  const landmarkSolids=await landmarkCollision.json() as Solid[];landmarkSolids.forEach(s=>{if(s.x>0)s.y+=eastTerraceHeight;});solids.push(...landmarkSolids);
  const ordinary=buildOrdinaryBuildings(map.features,mats,map.roads);fixedMeshes.push(...ordinary.fixedMeshes);vegetationUpdates.push(ordinary.updateVisibility);
  // Keep the original 13 travel entries stable, then append named entrances and
  // dormitory doors so each residence can be inspected without guessing its roof.
  travelPlaces.splice(13);
  for(const e of campusEntrances)if(!travelPlaces.some(p=>p.name===e.name))travelPlaces.push({name:e.name,x:e.x-Math.sin(e.angle)*5,z:e.z-Math.cos(e.angle)*5,yaw:e.angle+Math.PI});
  for(const record of ordinary.records)if(record.dormitory&&record.frontage){
    const [x,z,nx,nz]=record.frontage;
    travelPlaces.push({name:record.name,x:x+nx*4,z:z+nz*4,yaw:Math.atan2(nx,nz)});
  }
  travelPlaces.push(directory.arrival);
  travelPlaces.push({name:'松林楼',x:-65.8,z:411.8,yaw:-Math.PI/2,firstPerson:true});
  travelPlaces.push(garden.arrival);
  for(const record of ordinary.records)if(record.frontage&&!record.dormitory&&!['松林楼','教学楼／郑钢楼'].includes(record.name)){const[x,z,nx,nz]=record.frontage;const name=travelPlaces.some(p=>p.name===record.name)?`${record.name}（图号 ${record.id.replace('plan-','')}）`:record.name;const approach=record.id==='plan-77'?5.5:4;travelPlaces.push({name,x:x+nx*approach,z:z+nz*approach,yaw:Math.atan2(nx,nz)});}
  travelPlaces.push(...extraPlaces);
  const ivy=createIvy(mats,quality);ivy.position.y=terraceHeight;root.add(ivy);

  const nearTrees: TreeSpot[] = [
    { x: -6.7, z: 20, height: 13.8, kind: 'cedar' }, { x: 7.4, z: 21.2, height: 15.8, kind: 'cedar' },
    { x: -28, z: 30, height: 15 }, { x: 29, z: 31, height: 17 },
    { x: -32, z: 46, height: 17 }, { x: 31, z: 57, height: 16 },
    { x: -31, z: 68, height: 18 }, { x: 27, z: 76, height: 16 },
    { x: -13, z: 63, height: 19 }, { x: 15, z: 83, height: 18 },
    { x: -24, z: 14, height: 8 },  { x: 25, z: 13, height: 9 },
    { x: -35, z: 6, height: 17 }, { x: 38, z: 3, height: 15 },
    { x: -19, z: -22, height: 17 }, { x: 23, z: -24, height: 18 },
  ];
  nearTrees.forEach(t=>{t.baseY=courtyardHeight(t.x,t.z);});
  const trees = createJunipers(nearTrees.filter(t => t.kind === 'cedar'), mats, quality); trees.group.position.y=terraceHeight+.20;trees.solids.forEach(s=>{s.y+=terraceHeight+.20;});root.add(trees.group); solids.push(...trees.solids);
  const broadleaf = await createModelTrees(nearTrees.filter(t => t.kind !== 'cedar'), quality === 'low' ? 'far' : 'near', mats.leaves); root.add(broadleaf.group); solids.push(...broadleaf.solids); vegetationUpdates.push(broadleaf.updateVisibility);
  // The gateway photograph is framed by mature avenue trees, not an empty lot.
  const gateTrees = await createModelTrees([
    { x: -102, z: 333, height: 21 }, { x: -80, z: 329, height: 22 },
    { x: -104, z: 311, height: 19 }, { x: -77, z: 306, height: 21 },
  ], quality === 'low' ? 'far' : 'near', mats.leaves);
  root.add(gateTrees.group); solids.push(...gateTrees.solids); vegetationUpdates.push(gateTrees.updateVisibility);
  const plants = createGroundPlants(mats, courtyardHeight,(x,z)=>[...raisedLawns].some(l=>insidePolygon(x,z,l))); root.add(plants.group);
  let sectors = 1;

  async function expand(afterSector: () => void = () => {}) {
    // Yield between optional sectors so input and the first rendered frame can run.
    await new Promise<void>(resolve => setTimeout(resolve, 50));
    const moreSolids: Solid[] = [];
    root.add(ordinary.group);cameraSolids.push(...ordinary.cameraSolids);
    const landmarkAssets=await Promise.all(['east','west','auditorium'].map(name=>loader.loadAsync(`${import.meta.env.BASE_URL}assets/buildings/${name}.glb`)));
    for(const[index,asset]of landmarkAssets.entries()){
      if(index===0)asset.scene.position.y+=eastTerraceHeight;
      asset.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;const mat=o.material as T.MeshStandardMaterial;
        if(mat.name==='historic-brick')o.material=mats.brick;
        if(mat.name==='limestone'){mat.map=mats.textures.get('stone-grain.webp')!;mat.color.set(0xb7b5a6);}
        if(mat.name.startsWith('window-glass'))mat.envMapIntensity=1.7;
        o.castShadow=o.receiveShadow=true;cameraSolids.push(o);
      });root.add(asset.scene);asset.scene.updateMatrixWorld(true);asset.scene.traverse(o=>{if(o instanceof T.Mesh&&(o.material as T.Material).name==='roof')fixedMeshes.push(collisionMesh(o,true));});
    }
    for(const place of [{name:'东大楼',x:40.92,y:2.1,z:45.4,a:-Math.PI/2,w:.65,h:.38},{name:'西大楼',x:-40.57,y:2.1,z:43.2,a:Math.PI/2,w:.65,h:.38},{name:'大礼堂',x:-33.76,y:7.46,z:98.9,a:Math.PI/2,w:1.8,h:.48}]){
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#86784f';ctx.fillRect(0,0,512,160);ctx.strokeStyle='#b3a374';ctx.lineWidth=6;ctx.strokeRect(8,8,496,144);ctx.fillStyle='#2a2419';ctx.font='72px "Songti SC", "SimSun", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(place.name,256,85);
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const plaque=new T.Mesh(new T.PlaneGeometry(place.w,place.h),new T.MeshStandardMaterial({map:texture,roughness:.65,metalness:.22}));plaque.position.set(place.x,place.y+(place.name==='东大楼'?eastTerraceHeight:0),place.z);plaque.rotation.y=place.a;plaque.receiveShadow=true;root.add(plaque);
    }
    root.add(createWestWingIvy(mats,quality));
    afterSector();
    sectors++;
    await new Promise<void>(resolve => setTimeout(resolve, 50));
    const rand = rng(88), farTrees: TreeSpot[] = [], avenueTrees: TreeSpot[] = [];
    const plantingDoors=ordinary.doors.map(d=>d.name==='赛珍珠纪念馆'?memorialPlantingClearance:d.name==='中山楼'?zhongshanPlantingClearance:d.name==='拉贝纪念馆'?rabePlantingClearance:d);
    const clear = (x: number, z: number) => !sportsClearance(x,z)&&!teachingParkingClearance(x,z)&&!plantingDoors.some(d=>Math.hypot(d.x-x,d.z-z)<5)&&!map.features.some(f => f.tags.building && insidePolygon(x, z, f)) && !map.roads.some(r => insidePolygon(x, z, r));
    // Avenue planting uses the traced road edge; other trees stay within plan lawns.
    for (let z = 156; z < 342; z += 15) for (const side of [-1, 1]) {
      const x = -85 - (z - 182) * .035 + side * 8;
      if (clear(x, z)) { const tree={x,z,height:15+rand()*5};farTrees.push(tree);avenueTrees.push(tree); }
    }
    for (let attempt = 0; attempt < 6500 && farTrees.length < 190; attempt++) {
      const x = -575 + rand() * 705, z = -240 + rand() * 960;
      if (Math.abs(x) < 42 && z > -30 && z < 90) continue;
      if (x > -103 && x < -69 && z > 136 && z < 348) continue;
      if (!clear(x, z) || !map.lawns.some(l => insidePolygon(x, z, l))) continue;
      if (farTrees.some(t => Math.hypot(t.x - x, t.z - z) < 11)) continue;
      farTrees.push({ x, z, height: 12 + rand() * 8 });
    }
    // Adjust only the avenue trees after all sampling, preserving the random
    // sequence and positions of every unrelated tree across campus.
    const avenueTreeMoves = avenueTrees.flatMap(tree=>{
      const next=avenueTreePosition(tree.x,tree.z,avenue);
      if(Math.abs(next.z-tree.z)<.001)return [];
      const before=[tree.x,tree.z];Object.assign(tree,next);return [{before,after:[tree.x,tree.z]}];
    });
    root.getObjectByName('zhongda avenue walks and planted strips')!.userData.treeMoves=avenueTreeMoves;
    // Filter after sampling so correcting this forecourt never reshuffles
    // the seeded avenue/woodland planting elsewhere on campus.
    for (let i=farTrees.length-1;i>=0;i--) if (insidePolygon(farTrees[i].x,farTrees[i].z,sportsPaving.surface)) farTrees.splice(i,1);
    farTrees.forEach(tree=>{tree.baseY=courtyardHeight(tree.x,tree.z);});
    root.add(createSouthTreeDetails(farTrees, map, mats));
    const far = await createModelTrees(farTrees.filter(t => !map.features.some(f => f.tags.leisure === 'track' && insideRing(t.x, t.z, f.points))), 'far', mats.leaves); root.add(far.group); moreSolids.push(...far.solids); vegetationUpdates.push(far.updateVisibility);
    const libraryPlanting=await createLibraryWestGardens(libraryGardens,mats);root.add(libraryPlanting.group);moreSolids.push(...libraryPlanting.solids);vegetationUpdates.push(libraryPlanting.updateVisibility);
    const rabePlanting=await createRabeCourtyard(rabeCourtyard,mats);root.add(rabePlanting.group);moreSolids.push(...rabePlanting.solids);vegetationUpdates.push(rabePlanting.updateVisibility);
    root.add(createTangCourtyard(tangCourtyard,mats));
    const tangAccess=createTangCourtyardAccess(mats);root.add(tangAccess.group);moreSolids.push(...tangAccess.solids);cameraSolids.push(...tangAccess.cameraSolids);
    const tangGround=createTangCourtyardGround();root.add(tangGround.group);moreSolids.push(...tangGround.solids);cameraSolids.push(...tangGround.cameraSolids);
    const tianPlanting=await createTianCourtyard(tianCourtyard,mats);root.add(tianPlanting.group);moreSolids.push(...tianPlanting.solids);vegetationUpdates.push(tianPlanting.updateVisibility);
    const jinyinPlanting=await createJinyinStreetTrees(mats);root.add(jinyinPlanting.group);moreSolids.push(...jinyinPlanting.solids);vegetationUpdates.push(jinyinPlanting.updateVisibility);
    const props = new Builder();
    for (const p of benchLocations) {
      for (let k = 0; k < 5; k++) props.box(2.25, .075, .105, p.x, .52 + p.y, p.z + k * .12, mats.wood);
      for (let k = 0; k < 4; k++) props.box(2.25, .12, .09, p.x, .78 + k * .16 + p.y, p.z + .54, mats.wood);
      for (const side of [-1, 1]) props.box(.1, .5, .52, p.x + side * .83, .25 + p.y, p.z + .25, mats.metal);
      props.solids.push({ x: p.x, y: .5 + p.y, z: p.z + .25, w: 2.25, h: 1, d: .68 });
    }
    const lightGlass = new T.MeshStandardMaterial({ name:'lamp-glass',color: 0xf7ebc5, emissive: 0xc2a165, emissiveIntensity: .18, roughness: .35 });
    const lampSpots=[...[-1,1].flatMap(side=>[23,43,64,-20].map(z=>[side*(z===23?5.2:32.3),z])),[-20,89],[-20,112],...Array.from({length:8},(_,i)=>[-77-i*.9,165+i*24]),[-82,389],[-74,445],[-39,519],[-22,600],[-28,686]];
    for (const [x,z] of lampSpots) {
      const floor = courtyardHeight(x,z);
      lampPositions.push(new T.Vector3(x,3.85+floor,z));
      props.cylinder(new T.Vector3(x, floor, z), new T.Vector3(x, 3.6+floor, z), .065, .042, mats.metal, 10);
      if (z < 85) {
        // White elongated globes on curved arms are visible in the courtyard VR views.
        for (const side of [-1,0,1]) {
          const height=side===0?3.93:3.68,dx=side*.30;
          props.line([new T.Vector3(x,2.85+floor,z),new T.Vector3(x+dx,3.1+floor,z),new T.Vector3(x+dx,height-.25+floor,z)],.025,mats.metal,5);
          props.add(new T.SphereGeometry(1,12,16).scale(.105,.36,.105),lightGlass,x+dx,height+floor,z);
          props.add(new T.SphereGeometry(.055,8,6),mats.metal,x+dx,height+.36+floor,z);
        }
      } else {
        props.box(.38, .55, .38, x, 3.85+floor, z, lightGlass);
        props.box(.52, .1, .52, x, 4.15+floor, z, mats.metal);
        for (const a of [-1, 1]) for (const c of [-1, 1]) props.box(.035, .6, .035, x + a * .2, 3.85+floor, z + c * .2, mats.metal);
      }
      props.solids.push({ x, y: 1.8+floor, z, w: .18, h: 3.6, d: .18 });
    }
    root.add(createLampBanners(lampSpots.filter(([,z])=>z>=165&&z<=389),mats.metal));
    const propGroup = props.finish('benches and lamps'); root.add(propGroup); moreSolids.push(...props.solids); cameraSolids.push(...propGroup.children);
    const amenities=createDormitoryAmenities(map,ordinary.records,mats,[...solids,...moreSolids]);root.add(amenities.group);bicycles.push(...amenities.bicycles);moreSolids.push(...amenities.solids);lampPositions.push(...amenities.lamps);cameraSolids.push(...amenities.group.children);
    const parking=createTeachingBicycleParking(mats);root.add(parking.group);bicycles.push(...parking.bicycles);moreSolids.push(...parking.solids);cameraSolids.push(...parking.group.children);
    const forecourt=await createSportsHallForecourts(map,mats);root.add(forecourt.group);moreSolids.push(...forecourt.solids);cameraSolids.push(...forecourt.cameraSolids);vegetationUpdates.push(forecourt.updateVisibility);
    afterSector();
    sectors++;
    return moreSolids;
  }
  const updateVegetation = (position: T.Vector3, quality: string, flying: boolean, camera=position) => vegetationUpdates.forEach(update => update(position, quality, flying,camera));
  return { root, map, doors:ordinary.doors, bicycles, dadaoping, access, directory, garden, sports, pitch: field.pitch, updateVegetation, solids, fixedMeshes,lampPositions,cameraSolids, expand, get sectors() { return sectors; } };
}
