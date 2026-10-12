import * as T from 'three';

/** Rounded rods on the existing rig keep its ground, bicycle and ball contact poses. */
export function addStickman(root: T.Group, bones: Record<string, T.Bone>, height: number) {
  root.updateMatrixWorld(true);
  const ink = new T.MeshStandardMaterial({ color: 0x242b35, roughness: .82 });
  ink.name = 'stickman-ink';
  const eyes = new T.MeshStandardMaterial({ color: 0xfaf7ed, roughness: .85 });
  eyes.name = 'stickman-eyes';
  const geometries = new Set<T.BufferGeometry>();
  const point = (name: string) => bones[name].getWorldPosition(new T.Vector3());
  const attach = (parent: T.Bone, geometry: T.BufferGeometry, material = ink) => {
    geometries.add(geometry);
    const mesh = new T.Mesh(geometry, material);
    mesh.name = `stickman-${parent.name}`;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const ball = (parent: T.Bone, center: T.Vector3, radius: number, material = ink) => {
    const scale = parent.getWorldScale(new T.Vector3()).x;
    const mesh = attach(parent, new T.SphereGeometry(radius / scale, 20, 12), material);
    mesh.position.copy(parent.worldToLocal(center.clone()));
  };
  const rod = (parent: T.Bone, from: T.Vector3, to: T.Vector3, radius: number) => {
    const scale = parent.getWorldScale(new T.Vector3()).x;
    const a = parent.worldToLocal(from.clone()), b = parent.worldToLocal(to.clone());
    const mesh = attach(parent, new T.CapsuleGeometry(radius / scale, a.distanceTo(b), 4, 8));
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.sub(a).normalize());
  };
  for (const [a, b] of [['Hips', 'Spine'], ['Spine', 'Spine1'], ['Spine1', 'Spine2'], ['Spine2', 'Neck']] as const) {
    rod(bones[a], point(a), point(b), .041);
  }
  for (const side of ['Left', 'Right']) {
    rod(bones.Spine2, point('Spine2'), point(side + 'Arm'), .034);
    rod(bones.Hips, point('Hips'), point(side + 'UpLeg'), .038);
    for (const [a, b, radius] of [['Arm', 'ForeArm', .032], ['ForeArm', 'Hand', .029], ['UpLeg', 'Leg', .039], ['Leg', 'Foot', .034]] as const) {
      rod(bones[side + a], point(side + a), point(side + b), radius);
    }
    ball(bones[side + 'Hand'], point(side + 'Hand'), .041);
    const foot = bones[side + 'Foot'];
    const sole = root.worldToLocal(point(side + 'Foot'));
    sole.y = .041;
    const heel = root.localToWorld(sole.clone().add(new T.Vector3(0, 0, .035)));
    const toe = root.localToWorld(sole.clone().add(new T.Vector3(0, 0, -.115)));
    rod(foot, heel, toe, .04);
  }
  const head = bones.Head;
  const center = root.worldToLocal(point('Head'));
  center.y = height - .14;
  const headWorld = root.localToWorld(center.clone());
  rod(bones.Neck, point('Neck'), headWorld, .032);
  ball(head, headWorld, .14);
  for (const x of [-.043, .043]) {
    ball(head, root.localToWorld(center.clone().add(new T.Vector3(x, .014, -.131))), .018, eyes);
  }
  return { geometries, materials: new Set<T.Material>([ink, eyes]) };
}
