import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/** CC0 MakeHuman base, original clothing and rig; meter-scale articulated student. */
export async function createAvatar() {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${import.meta.env.BASE_URL}assets/characters/student-natural.glb`);
  const cloth=await new T.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}assets/textures/fabric-bump.webp`);cloth.wrapS=cloth.wrapT=T.RepeatWrapping;cloth.repeat.set(16,16);
  const root = new T.Group(); root.name = 'student'; const model = gltf.scene; root.add(model);
  model.updateMatrixWorld(true);
  const bones: Record<string, T.Bone> = {};
  model.traverse(node => {
    if (node instanceof T.Bone) bones[node.name.replace(/^mixamorig:?/, '')] = node;
    if (node instanceof T.Mesh) { node.castShadow = node.receiveShadow = true; node.frustumCulled = false;const m=node.material as T.MeshStandardMaterial;if(['student-cotton','student-denim','student-backpack','student-shoes'].includes(m.name)){m.bumpMap=cloth;m.bumpScale=.0016;m.roughness=.94;} }
  });
  // Bring T-pose arms down using the skeleton's actual world-space directions.
  for (const side of ['Left', 'Right']) {
    const upper = bones[`${side}Arm`], fore = bones[`${side}ForeArm`];
    const a = upper.getWorldPosition(new T.Vector3()), b = fore.getWorldPosition(new T.Vector3());
    const delta = new T.Quaternion().setFromUnitVectors(b.sub(a).normalize(), new T.Vector3(side === 'Left' ? .09 : -.09, -1, 0).normalize());
    const parent = upper.parent!.getWorldQuaternion(new T.Quaternion());
    upper.quaternion.premultiply(parent.clone().invert().multiply(delta).multiply(parent)); model.updateMatrixWorld(true);
    const thigh=bones[`${side}UpLeg`],knee=bones[`${side}Leg`];
    const legDelta=new T.Quaternion().setFromUnitVectors(knee.getWorldPosition(new T.Vector3()).sub(thigh.getWorldPosition(new T.Vector3())).normalize(),new T.Vector3(side==='Left'?.018:-.018,-1,.012).normalize());
    const legParent=thigh.parent!.getWorldQuaternion(new T.Quaternion());thigh.quaternion.premultiply(legParent.clone().invert().multiply(legDelta).multiply(legParent));model.updateMatrixWorld(true);
  }
  const extent = new T.Box3().setFromObject(model), scale = 1.72 / extent.getSize(new T.Vector3()).y;
  model.scale.multiplyScalar(scale); model.position.y = -extent.min.y * scale; const baseY = model.position.y;
  const rest = new Map<T.Bone, T.Quaternion>(), axes = new Map<T.Bone, T.Vector3>();
  for (const bone of Object.values(bones)) {
    rest.set(bone, bone.quaternion.clone());
    axes.set(bone, new T.Vector3(1, 0, 0).applyQuaternion(bone.parent!.getWorldQuaternion(new T.Quaternion()).invert()));
  }
  function rotation(name: string, angle: number) { const bone = bones[name]; return new T.Quaternion().setFromAxisAngle(axes.get(bone)!, angle).multiply(rest.get(bone)!); }
  const times = Array.from({ length: 31 }, (_, i) => i / 30);
  function clip(name: string, amplitude: number) {
    const tracks: T.KeyframeTrack[] = [];
    for (const side of ['Left', 'Right']) for (const part of ['UpLeg', 'Leg', 'Arm', 'ForeArm']) {
      const key = side + part, values: number[] = [], sign = side === 'Left' ? 1 : -1;
      for (const time of times) {
        const phase = time * Math.PI * 2, wave = Math.sin(phase) * sign;
        const angle = part === 'UpLeg' ? wave * amplitude : part === 'Leg' ? Math.max(0, -wave) * amplitude * 1.35 : part === 'Arm' ? -wave * amplitude * .75 : -.14 - amplitude * .3;
        rotation(key, angle).toArray(values, values.length);
      }
      tracks.push(new T.QuaternionKeyframeTrack(`${bones[key].name}.quaternion`, times, values));
    }
    return new T.AnimationClip(name, 1, tracks);
  }
  const mixer = new T.AnimationMixer(model), idle = mixer.clipAction(clip('Idle', .008)), walk = mixer.clipAction(clip('Walk', .46)), run = mixer.clipAction(clip('Run', .8));
  idle.play(); walk.play(); run.play(); walk.weight = run.weight = 0;
  model.rotation.y = Math.PI;
  root.updateMatrixWorld(true);
  const footRest:Record<string,T.Vector3>={},legLengths:Record<string,[number,number]>={};
  for(const side of ['Left','Right']){
    footRest[side]=root.worldToLocal(bones[side+'Foot'].getWorldPosition(new T.Vector3()));
    legLengths[side]=[bones[side+'UpLeg'].getWorldPosition(new T.Vector3()).distanceTo(bones[side+'Leg'].getWorldPosition(new T.Vector3())),bones[side+'Leg'].getWorldPosition(new T.Vector3()).distanceTo(bones[side+'Foot'].getWorldPosition(new T.Vector3()))];
  }
  const hipsRest=bones.Hips.position.clone();
  let moving = 0,phase=0,groundSampler:((x:number,z:number)=>number)|undefined;
  const align=(bone:T.Bone,child:T.Bone,target:T.Vector3)=>{
    const origin=bone.getWorldPosition(new T.Vector3()),from=child.getWorldPosition(new T.Vector3()).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
    const world=new T.Quaternion().setFromUnitVectors(from,to).multiply(bone.getWorldQuaternion(new T.Quaternion()));
    bone.quaternion.copy(bone.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));bone.updateWorldMatrix(false,true);
  };
  return {
    root, head: bones.Head,
    setGroundSampler(sampler:(x:number,z:number)=>number){groundSampler=sampler;},
    get gaitPhase(){return phase;},
    update(dt: number, speed: number, seated: boolean, flying=false) {
      moving = T.MathUtils.damp(moving, Math.min(1, speed / .5), 12, dt);
      const running = T.MathUtils.clamp((speed - 2) / 2.2, 0, 1);
      idle.weight = 1 - moving; walk.weight = moving * (1 - running); run.weight = moving * running;
      walk.timeScale = Math.max(.25, speed / 1.3); run.timeScale = Math.max(.3, speed / 2.05); mixer.update(dt);
      model.position.y = baseY;
      model.rotation.x=0;
      bones.Hips.position.copy(hipsRest);
      if(flying){model.rotation.x=-.16;for(const side of ['Left','Right']){bones[side+'Arm'].quaternion.copy(rotation(side+'Arm',-1.1));bones[side+'ForeArm'].quaternion.copy(rotation(side+'ForeArm',-.5));bones[side+'UpLeg'].quaternion.copy(rotation(side+'UpLeg',.17));bones[side+'Leg'].quaternion.copy(rotation(side+'Leg',.35));}return;}
      if (seated) { model.position.y -= .42; for (const side of ['Left', 'Right']) { bones[side + 'UpLeg'].quaternion.copy(rotation(side + 'UpLeg', -1.45)); bones[side + 'Leg'].quaternion.copy(rotation(side + 'Leg', 1.45)); }return; }
      const stride=1.3+running*.8,stance=.5;phase=(phase+dt*speed/stride)%1;
      bones.Hips.position.y-=moving*(.055+running*.045);
      root.updateMatrixWorld(true);
      const facing=new T.Vector3(0,0,-1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
      const flatFoot=root.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));
      for(const side of ['Left','Right']){
        const f=(phase+(side==='Right'?.5:0))%1,travel=stride*stance;let z:number,lift=0;
        if(f<stance)z=-travel/2+travel*f/stance;
        else{const t=(f-stance)/(1-stance);z=travel/2-travel*(t*t*(3-2*t));lift=Math.sin(t*Math.PI)*(.11+running*.09);}
        const local=footRest[side].clone();local.z+=z*moving;const target=root.localToWorld(local);
        target.y=(groundSampler?.(target.x,target.z)??root.position.y)+footRest[side].y+lift*moving;
        const hip=bones[side+'UpLeg'],knee=bones[side+'Leg'],foot=bones[side+'Foot'],origin=hip.getWorldPosition(new T.Vector3()),[upper,lower]=legLengths[side];
        const direction=target.clone().sub(origin),distance=T.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.005,upper+lower-.001);direction.normalize();
        const bend=facing.clone().addScaledVector(direction,-facing.dot(direction)).normalize();
        const along=(upper*upper+distance*distance-lower*lower)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
        const desiredKnee=origin.clone().addScaledVector(direction,along).addScaledVector(bend,height);
        align(hip,knee,desiredKnee);align(knee,foot,target);
        foot.quaternion.copy(foot.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(flatFoot));foot.updateWorldMatrix(false,true);
      }
    },
  };
}
