import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Original simple clothed figure; shares the student's contact and movement rig. */
export function addExplorer(root: T.Group, bones: Record<string, T.Bone>, height: number) {
  root.updateMatrixWorld(true);
  const material = (name: string, color: number) => new T.MeshStandardMaterial({ name, color, roughness: .88 });
  const shirt = material('explorer-shirt', 0x24272c), shorts = material('explorer-shorts', 0xb6ad96);
  const skin = material('explorer-skin', 0xc98e66), hair = material('explorer-hair', 0x211b18);
  const shoes = material('explorer-shoes', 0x22242a), sole = material('explorer-sole', 0xdedcd2);
  const eyes = material('explorer-eyes', 0x292323);
  const geometries = new Set<T.BufferGeometry>();
  const point = (name: string) => root.worldToLocal(bones[name].getWorldPosition(new T.Vector3()));
  const attach = (parent: T.Bone, geometry: T.BufferGeometry, mat: T.Material, center: T.Vector3) => {
    geometries.add(geometry);
    const mesh = new T.Mesh(geometry, mat);
    mesh.name = `${mat.name}-${parent.name}`;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    mesh.position.copy(parent.worldToLocal(root.localToWorld(center.clone())));
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

  const hips = point('Hips'), neck = point('Neck');
  const hem = hips.y - .065, collar = neck.y - .025;
  box(bones.Spine, new T.Vector3(0, (hem + collar) / 2, -.005), new T.Vector3(.405, collar - hem, .245), .07, shirt);
  box(bones.Hips, new T.Vector3(0, hips.y + .015, 0), new T.Vector3(.29, .1, .20), .025, shorts);
  rod(bones.Neck, neck.clone().add(new T.Vector3(0, -.04, 0)), neck.clone().add(new T.Vector3(0, .12, 0)), .053, skin);

  for (const side of ['Left', 'Right']) {
    const shoulder = point(side + 'Arm'), elbow = point(side + 'ForeArm'), hand = point(side + 'Hand');
    const hip = point(side + 'UpLeg'), knee = point(side + 'Leg'), ankle = point(side + 'Foot');
    const sleeveEnd = shoulder.clone().lerp(elbow, .5);
    rod(bones[side + 'Arm'], shoulder, elbow, .052, skin, .044);
    rod(bones[side + 'Arm'], shoulder, sleeveEnd, .083, shirt);
    rod(bones[side + 'ForeArm'], elbow, hand, .044, skin, .035);
    ball(bones[side + 'Hand'], hand.clone().lerp(elbow, -.045), .047, skin, new T.Vector3(.82, 1.15, .9));
    rod(bones[side + 'UpLeg'], hip, knee, .074, skin, .059);
    rod(bones[side + 'UpLeg'], hip, hip.clone().lerp(knee, .55), .096, shorts);
    rod(bones[side + 'Leg'], knee, ankle, .059, skin, .043);
    // Build the shoe in the same flat world orientation used by the foot IK.
    const foot = bones[side + 'Foot'];
    const center = new T.Vector3(ankle.x, .069, ankle.z - .055);
    box(foot, center, new T.Vector3(.123, .103, .26), .034, shoes);
    box(foot, center.clone().setY(.025), new T.Vector3(.126, .033, .266), .011, sole);
  }

  const head = bones.Head, center = point('Head');
  center.y = height - .19;
  ball(head, center, .147, skin, new T.Vector3(.92, 1.04, .94));
  const cap = new T.SphereGeometry(.165, 18, 12, 0, Math.PI * 2, 0, Math.PI * .48).scale(.96, 1.02, 1);
  attach(head, cap, hair, center.clone().add(new T.Vector3(0, .012, .012)));
  // Close-cropped sides and back leave the small facial features unobstructed.
  const back = new T.SphereGeometry(.154, 16, 10, 0, Math.PI, Math.PI * .35, Math.PI * .36);
  attach(head, back, hair, center.clone().add(new T.Vector3(0, .005, .016)));
  for (const side of [-1, 1]) {
    ball(head, center.clone().add(new T.Vector3(side * .133, -.026, 0)), .026, skin, new T.Vector3(.65, 1, .8));
    ball(head, center.clone().add(new T.Vector3(side * .046, .002, -.129)), .009, eyes, new T.Vector3(.85, 1, .55));
  }
  ball(head, center.clone().add(new T.Vector3(0, -.028, -.139)), .017, skin, new T.Vector3(.72, .9, 1));
  return { geometries, materials: new Set<T.Material>([shirt, shorts, skin, hair, shoes, sole, eyes]) };
}
