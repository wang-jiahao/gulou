import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Original simple clothed figure; shares the student's contact and movement rig. */
export function addExplorer(root: T.Group, bones: Record<string, T.Bone>) {
  root.updateMatrixWorld(true);
  const material = (name: string, color: number) => new T.MeshStandardMaterial({ name, color, roughness: .88 });
  const shirt = material('explorer-shirt', 0x24272c), shorts = material('explorer-shorts', 0xb6ad96);
  const skin = material('explorer-skin', 0xe2baa7);
  const shoes = material('explorer-shoes', 0x22242a), sole = material('explorer-sole', 0xdedcd2);
  const hair = material('explorer-hair', 0x24221f), features = material('explorer-features', 0x39302b), lip = material('explorer-lip', 0x9b6f61);
  const geometries = new Set<T.BufferGeometry>();
  const headCenter = new T.Vector3(0, 1.635, -.006);
  const headBase = headCenter.clone().add(new T.Vector3(0, -.118, 0));
  const headScale = new T.Vector3(1.25, 1.12, 1.18);
  const point = (name: string) => root.worldToLocal(bones[name].getWorldPosition(new T.Vector3()));
  const attach = (parent: T.Bone, geometry: T.BufferGeometry, mat: T.Material, center: T.Vector3) => {
    const position = center.clone();
    if (parent === bones.Head) {
      // Enlarge the face, hair and features together, keeping the chin on the neck.
      geometry.scale(headScale.x, headScale.y, headScale.z);
      position.sub(headBase).multiply(headScale).add(headBase);
    }
    geometries.add(geometry);
    const mesh = new T.Mesh(geometry, mat);
    mesh.name = `${mat.name}-${parent.name}`;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    mesh.position.copy(parent.worldToLocal(root.localToWorld(position)));
    mesh.quaternion.copy(parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(root.getWorldQuaternion(new T.Quaternion())));
    mesh.scale.setScalar(1 / parent.getWorldScale(new T.Vector3()).x);
    return mesh;
  };
  const ball = (parent: T.Bone, center: T.Vector3, radius: number, mat: T.Material, scale = new T.Vector3(1, 1, 1)) => {
    const geometry = new T.SphereGeometry(radius, 16, 12).scale(scale.x, scale.y, scale.z);
    return attach(parent, geometry, mat, center);
  };
  const rod = (parent: T.Bone, from: T.Vector3, to: T.Vector3, radius: number, mat: T.Material, tip = radius) => {
    const length = from.distanceTo(to);
    let geometry: T.BufferGeometry;
    if (tip === radius) geometry = new T.CapsuleGeometry(radius, length, 4, 10);
    else {
      const parts = [new T.CylinderGeometry(tip, radius, length, 12, 1, true),
        new T.SphereGeometry(radius, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -length / 2, 0),
        new T.SphereGeometry(tip, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, length / 2, 0)];
      geometry = mergeGeometries(parts)!; parts.forEach(part => part.dispose());
    }
    geometry.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), to.clone().sub(from).normalize()));
    return attach(parent, geometry, mat, from.clone().add(to).multiplyScalar(.5));
  };
  const box = (parent: T.Bone, center: T.Vector3, size: T.Vector3, radius: number, mat: T.Material) =>
    attach(parent, new RoundedBoxGeometry(size.x, size.y, size.z, 3, radius), mat, center);

  // Ring surfaces give the jaw and shirt a shaped silhouette without an oversized sphere.
  const surface = (rings: number[][], exponent = 1, hairline = false) => {
    const vertices: number[] = [], indices: number[] = [], segments = 24;
    rings.forEach(([y, width, depth, z = 0], ring) => {
      for (let j = 0; j < segments; j++) {
        const angle = j / segments * Math.PI * 2, sx = Math.sin(angle), cz = Math.cos(angle);
        const lift = hairline && ring === 0 ? Math.max(0, -cz) * .057 : 0;
        vertices.push(Math.sign(sx) * Math.pow(Math.abs(sx), exponent) * width,
          y + lift, z + Math.sign(cz) * Math.pow(Math.abs(cz), exponent) * depth);
        if (ring) {
          const a = (ring - 1) * segments + j, b = (ring - 1) * segments + (j + 1) % segments;
          const c = ring * segments + j, d = ring * segments + (j + 1) % segments;
          indices.push(a, b, c, b, d, c);
        }
      }
    });
    for (const ring of [0, rings.length - 1]) {
      const center = vertices.length / 3; vertices.push(0, rings[ring][0], rings[ring][3] ?? 0);
      for (let j = 0; j < segments; j++) {
        const a = ring * segments + j, b = ring * segments + (j + 1) % segments;
        indices.push(...(ring === 0 ? [center, b, a] : [center, a, b]));
      }
    }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
  };
  const hips = point('Hips'), neck = point('Neck');
  const hem = hips.y - .065, collar = neck.y - .025;
  const shirtRings = [[hem, .179, .108], [hem + .09, .174, .105],
    [collar - .13, .192, .116], [collar - .06, .198, .111], [collar, .142, .086]];
  attach(bones.Spine, surface(shirtRings, .62), shirt, new T.Vector3(0, 0, -.005));
  attach(bones.Hips, surface([[hips.y - .125, .165, .095], [hips.y - .09, .166, .096], [hips.y + .035, .158, .091]], .62), shorts, new T.Vector3());
  rod(bones.Neck, new T.Vector3(0, collar - .015, 0), new T.Vector3(0, 1.539, -.006), .037, skin, .033);
  attach(bones.Head, surface([
    [-.118, .024, .032, -.015], [-.10, .044, .048, -.014], [-.055, .066, .069, -.004],
    [.012, .074, .080, .003], [.066, .073, .084, .008], [.10, .060, .068, .01], [.116, .026, .037, .009]
  ]), skin, headCenter);
  attach(bones.Head, surface([[.002, .077, .083, .009], [.076, .078, .085, .01],
    [.111, .061, .071, .012], [.132, .026, .035, .004]], 1, true), hair, headCenter);
  for (const side of [-1, 1]) {
    ball(bones.Head, headCenter.clone().add(new T.Vector3(side * .076, -.007, .004)), .017, skin, new T.Vector3(.55, 1.35, .7));
    ball(bones.Head, headCenter.clone().add(new T.Vector3(side * .028, .019, -.081)), .009, features, new T.Vector3(1, .32, .24));
    box(bones.Head, headCenter.clone().add(new T.Vector3(side * .028, .035, -.082)), new T.Vector3(.024, .003, .004), .001, hair);
  }
  ball(bones.Head, headCenter.clone().add(new T.Vector3(0, -.006, -.082)), .012, skin, new T.Vector3(.55, 1.2, 1));
  box(bones.Head, headCenter.clone().add(new T.Vector3(0, -.048, -.079)), new T.Vector3(.026, .0025, .0025), .001, lip);

  for (const side of ['Left', 'Right']) {
    const shoulder = point(side + 'Arm'), elbow = point(side + 'ForeArm'), hand = point(side + 'Hand');
    const hip = point(side + 'UpLeg'), knee = point(side + 'Leg'), ankle = point(side + 'Foot');
    const sleeveEnd = shoulder.clone().lerp(elbow, .5);
    rod(bones[side + 'Arm'], shoulder, elbow, .052, skin, .044);
    rod(bones[side + 'Arm'], shoulder, sleeveEnd, .073, shirt);
    rod(bones[side + 'ForeArm'], elbow, hand, .044, skin, .035);
    const palm = hand.clone().lerp(elbow, -.075);
    box(bones[side + 'Hand'], palm, new T.Vector3(.060, .092, .037), .014, skin);
    ball(bones[side + 'Hand'], palm.clone().add(new T.Vector3(side === 'Left' ? -.027 : .027, .018, -.015)), .016, skin, new T.Vector3(.7, 1.4, .8));
    rod(bones[side + 'UpLeg'], hip.clone().lerp(knee, .4), knee, .068, skin, .059);
    rod(bones[side + 'UpLeg'], hip.clone().lerp(knee, .4), hip.clone().lerp(knee, .55), .096, shorts);
    rod(bones[side + 'Leg'], knee, ankle, .059, skin, .043);
    // Build the shoe in the same flat world orientation used by the foot IK.
    const foot = bones[side + 'Foot'];
    const center = new T.Vector3(ankle.x, .069, ankle.z - .055);
    box(foot, center, new T.Vector3(.123, .103, .26), .034, shoes);
    box(foot, center.clone().setY(.025), new T.Vector3(.126, .033, .266), .011, sole);
  }

  return { geometries, materials: new Set<T.Material>([shirt, shorts, skin, shoes, sole, hair, features, lip]) };
}
