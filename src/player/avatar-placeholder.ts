import * as T from 'three';

/** Original articulated student. Anatomical proportions are approximate; no licensed scan is embedded. */
export function createAvatar() {
  const root = new T.Group(); root.name = 'student';
  const skin = new T.MeshStandardMaterial({ color: 0xc89472, roughness: .78 });
  const jacket = new T.MeshStandardMaterial({ color: 0xd2cdbd, roughness: .96 });
  const trousers = new T.MeshStandardMaterial({ color: 0x344859, roughness: .95 });
  const shoe = new T.MeshStandardMaterial({ color: 0xd9d6c9, roughness: .92 });
  const hair = new T.MeshStandardMaterial({ color: 0x28221e, roughness: .95 });
  const bag = new T.MeshStandardMaterial({ color: 0x38433b, roughness: .9 });
  const dark = new T.MeshStandardMaterial({ color: 0x242821, roughness: .8 });
  const capsule = (parent: T.Object3D, radius: number, length: number, x: number, y: number, z: number, material: T.Material, scaleX = 1, scaleZ = 1) => {
    const mesh = new T.Mesh(new T.CapsuleGeometry(radius, length, 6, 12), material); mesh.position.set(x, y, z); mesh.scale.set(scaleX, 1, scaleZ); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const body = new T.Group(); body.name = 'body'; body.position.y = .92; root.add(body);
  capsule(body, .19, .25, 0, .22, 0, jacket, 1.1, .68);
  capsule(body, .155, .02, 0, -.01, 0, trousers, 1.15, .75);
  capsule(body, .055, .07, 0, .535, 0, skin);
  const head = new T.Group(); head.name = 'head'; head.position.set(0, .68, 0); body.add(head);
  capsule(head, .105, .07, 0, 0, 0, skin, .84, .92);
  const hairMesh = new T.Mesh(new T.SphereGeometry(.108, 20, 16, 0, Math.PI * 2, 0, Math.PI * .57), hair); hairMesh.scale.set(.88, 1.3, 1.03); hairMesh.position.set(0, .014, .007); hairMesh.castShadow = true; head.add(hairMesh);
  capsule(head, .035, .09, 0, -.008, .07, hair, 2.5, .55);
  capsule(head, .015, .025, -.091, -.015, 0, skin, .5); capsule(head, .015, .025, .091, -.015, 0, skin, .5);
  capsule(head, .014, .016, 0, -.022, -.098, skin, .7, .8);
  for (const sign of [-1, 1]) capsule(head, .006, .01, sign * .038, .007, -.092, dark, 1, .45);
  capsule(body, .15, .2, 0, .24, .145, bag, 1, .55);
  capsule(body, .12, .03, 0, .13, .228, bag, 1, .25);
  for (const side of [-1, 1]) {
    capsule(body, .018, .38, side * .123, .25, -.095, bag, 1, .45);
    const upper = new T.Group(); upper.name = side === -1 ? 'leftArm' : 'rightArm'; upper.position.set(side * .24, .43, 0); body.add(upper);
    capsule(upper, .058, .2, side * .014, -.14, 0, jacket, 1, .93);
    const elbow = new T.Group(); elbow.name = side === -1 ? 'leftElbow' : 'rightElbow'; elbow.position.set(side * .025, -.3, 0); upper.add(elbow);
    capsule(elbow, .046, .19, 0, -.12, -.012, jacket);
    capsule(elbow, .033, .063, 0, -.29, -.019, skin, .7, 1.13);
    const leg = new T.Group(); leg.name = side === -1 ? 'leftLeg' : 'rightLeg'; leg.position.set(side * .105, -.05, 0); body.add(leg);
    capsule(leg, .087, .29, 0, -.18, 0, trousers, .88, .91);
    const knee = new T.Group(); knee.name = side === -1 ? 'leftKnee' : 'rightKnee'; knee.position.set(0, -.42, 0); leg.add(knee);
    capsule(knee, .067, .28, 0, -.18, 0, trousers, .88, .9);
    const foot = capsule(knee, .067, .1, 0, -.365, -.07, shoe, .85, 1.8); foot.scale.y = .48;
  }
  const mixer = new T.AnimationMixer(root), times = [0, .25, .5, .75, 1];
  const makeClip = (name: string, strength: number) => {
    const tracks: T.KeyframeTrack[] = [];
    for (const [node, phase] of [['leftLeg', 1], ['rightLeg', -1], ['leftArm', -1], ['rightArm', 1]] as const) {
      tracks.push(new T.NumberKeyframeTrack(`${node}.rotation[x]`, times, [0, strength * phase, 0, -strength * phase, 0]));
    }
    for (const [node, phase] of [['leftKnee', 0], ['rightKnee', 2]] as const) tracks.push(new T.NumberKeyframeTrack(`${node}.rotation[x]`, times, times.map((_, i) => -.05 - Math.max(0, Math.sin((i + phase) * Math.PI / 2)) * strength * 1.05)));
    for (const name of ['leftElbow', 'rightElbow']) tracks.push(new T.NumberKeyframeTrack(`${name}.rotation[x]`, [0, 1], [-.1 - strength * .55, -.1 - strength * .55]));
    tracks.push(new T.NumberKeyframeTrack('body.position[y]', times, [.92, .93, .92, .93, .92]));
    return new T.AnimationClip(name, 1, tracks);
  };
  const idle = mixer.clipAction(makeClip('Idle', .012)), walk = mixer.clipAction(makeClip('Walk', .55)), run = mixer.clipAction(makeClip('Run', .85));
  idle.play(); walk.play(); run.play(); walk.weight = run.weight = 0;
  let moving = 0;
  return {
    root, head,
    update(dt: number, speed: number, seated: boolean) {
      moving = T.MathUtils.damp(moving, Math.min(1, speed / .7), 12, dt);
      const running = T.MathUtils.clamp((speed - 2) / 2.3, 0, 1);
      idle.weight = 1 - moving; walk.weight = moving * (1 - running); run.weight = moving * running;
      walk.timeScale = Math.max(.35, speed / 1.35); run.timeScale = Math.max(.4, speed / 2.1);
      mixer.update(dt);
      if (seated) {
        body.position.y = .56;
        for (const node of ['leftLeg', 'rightLeg']) root.getObjectByName(node)!.rotation.x = -Math.PI / 2;
        for (const node of ['leftKnee', 'rightKnee']) root.getObjectByName(node)!.rotation.x = Math.PI / 2;
      }
    },
  };
}
