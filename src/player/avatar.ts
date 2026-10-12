import * as T from 'three';
import {bicycleFit} from '../world/bicycle.ts';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { addExplorer } from './explorer.ts';

export type CharacterKind = 'male' | 'female' | 'explorer';
export type OutfitStyle = 'campus' | 'forest' | 'warm';

/** CC0 MakeHuman base, original clothing and rig; meter-scale articulated student. */
export async function createAvatar(kind: CharacterKind = 'male') {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${import.meta.env.BASE_URL}assets/characters/student-${kind === 'explorer' ? 'male' : kind}.glb`);
  const cloth=await new T.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}assets/textures/fabric-bump.webp`);cloth.wrapS=cloth.wrapT=T.RepeatWrapping;cloth.repeat.set(16,16);
  const materials = new Set<T.Material>(), geometries = new Set<T.BufferGeometry>(), skeletons = new Set<T.Skeleton>();
  const root = new T.Group(); root.name = 'student'; const model = gltf.scene; root.add(model);
  model.updateMatrixWorld(true);
  const bones: Record<string, T.Bone> = {};
  model.traverse(node => {
    if (node instanceof T.Bone) bones[node.name.replace(/^mixamorig:?/, '')] = node;
    if (node instanceof T.SkinnedMesh) skeletons.add(node.skeleton);
    if (node instanceof T.Mesh) { geometries.add(node.geometry); for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.add(mat); node.castShadow = node.receiveShadow = true; node.frustumCulled = false;const m=node.material as T.MeshStandardMaterial;if(['student-cotton','student-denim','student-backpack','student-shoes','student-shoe-canvas','student-cotton-contrast'].includes(m.name)){m.bumpMap=cloth;m.bumpScale=.0016;m.roughness=.94;} }
  });
  // Bring T-pose arms down using the skeleton's actual world-space directions.
  for (const side of ['Left', 'Right']) {
    const upper = bones[`${side}Arm`], fore = bones[`${side}ForeArm`];
    const a = upper.getWorldPosition(new T.Vector3()), b = fore.getWorldPosition(new T.Vector3());
    const delta = new T.Quaternion().setFromUnitVectors(b.sub(a).normalize(), new T.Vector3(side === 'Left' ? .09 : -.09, -1, 0).normalize());
    const parent = upper.parent!.getWorldQuaternion(new T.Quaternion());
    upper.quaternion.premultiply(parent.clone().invert().multiply(delta).multiply(parent)); model.updateMatrixWorld(true);
    const hand = bones[`${side}Hand`];
    const lowerDirection = hand.getWorldPosition(new T.Vector3()).sub(fore.getWorldPosition(new T.Vector3())).normalize();
    const lowerDelta = new T.Quaternion().setFromUnitVectors(lowerDirection, new T.Vector3(side === 'Left' ? .055 : -.055, -1, .035).normalize());
    const lowerParent = fore.parent!.getWorldQuaternion(new T.Quaternion());
    fore.quaternion.premultiply(lowerParent.clone().invert().multiply(lowerDelta).multiply(lowerParent)); model.updateMatrixWorld(true);
    // Relax the wrist towards the thigh instead of presenting an open palm forwards.
    const wristAxis = hand.position.clone().normalize();
    hand.quaternion.setFromAxisAngle(wristAxis, side === 'Left' ? -.32 : .32);
    const thigh=bones[`${side}UpLeg`],knee=bones[`${side}Leg`];
    const legDelta=new T.Quaternion().setFromUnitVectors(knee.getWorldPosition(new T.Vector3()).sub(thigh.getWorldPosition(new T.Vector3())).normalize(),new T.Vector3(side==='Left'?.018:-.018,-1,.012).normalize());
    const legParent=thigh.parent!.getWorldQuaternion(new T.Quaternion());thigh.quaternion.premultiply(legParent.clone().invert().multiply(legDelta).multiply(legParent));model.updateMatrixWorld(true);
  }
  const height = kind === 'female' ? 1.67 : 1.77;
  const extent = new T.Box3().setFromObject(model), scale = height / extent.getSize(new T.Vector3()).y;
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
  const handBasis:Record<string,T.Quaternion>={};
  for(const side of['Left','Right']){
    const hand=bones[side+'Hand'],middle=bones[side+'Finger31'],index=bones[side+'Finger21'],little=bones[side+'Finger51'];
    if(!middle||!index||!little)continue;
    const inverse=hand.getWorldQuaternion(new T.Quaternion()).invert(),origin=hand.getWorldPosition(new T.Vector3());
    const forward=middle.getWorldPosition(new T.Vector3()).sub(origin).normalize(),across=index.getWorldPosition(new T.Vector3()).sub(little.getWorldPosition(new T.Vector3())).normalize();
    const normal=new T.Vector3().crossVectors(forward,across).normalize();if(normal.x*(side==='Left'?1:-1)<0)normal.negate();
    forward.addScaledVector(normal,-forward.dot(normal)).normalize();const x=new T.Vector3().crossVectors(normal,forward).normalize();
    handBasis[side]=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x.applyQuaternion(inverse),normal.applyQuaternion(inverse),forward.applyQuaternion(inverse)));
  }
  const hipsRest=bones.Hips.position.clone();
  if (kind === 'explorer') {
    const oldMeshes: T.Mesh[] = [];
    model.traverse(node => { if (node instanceof T.Mesh) oldMeshes.push(node); });
    // Replace all visible surfaces together; the original contact/animation rig stays.
    for (const mesh of oldMeshes) mesh.removeFromParent();
    geometries.forEach(geometry => geometry.dispose()); geometries.clear();
    const textures = new Set<T.Texture>();
    for (const material of materials) for (const value of Object.values(material)) {
      if (value instanceof T.Texture && value !== cloth) textures.add(value);
    }
    materials.forEach(material => material.dispose()); materials.clear();
    textures.forEach(texture => texture.dispose());
    const figure = addExplorer(root, bones);
    figure.geometries.forEach(g => geometries.add(g));
    figure.materials.forEach(m => materials.add(m));
  }
  const hipRestHeight=root.worldToLocal(bones.Hips.getWorldPosition(new T.Vector3())).y;
  let moving = 0,phase=0,kickTime=0,groundSampler:((x:number,z:number)=>number)|undefined;
  const align=(bone:T.Bone,child:T.Bone,target:T.Vector3)=>{
    const origin=bone.getWorldPosition(new T.Vector3()),from=child.getWorldPosition(new T.Vector3()).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
    const world=new T.Quaternion().setFromUnitVectors(from,to).multiply(bone.getWorldQuaternion(new T.Quaternion()));
    bone.quaternion.copy(bone.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));bone.updateWorldMatrix(false,true);
  };
  return {
    root, head: bones.Head, kind, height, materials,
    setOutfit(style: OutfitStyle) {
      const palette = style === 'forest' ? [0x627b69, 0xd9d4c6, 0x525f65, 0x887456] : style === 'warm' ? [0xa5856b, 0xe0d7c7, 0x626d77, 0x595e54] : kind === 'female' ? [0x899682, 0xf0eee6, 0x8b9fac, 0xd6d1c3] : [0x253549, 0xf0eee6, 0x545557, 0x292c2b];
      for (const material of materials) {
        if (!(material instanceof T.MeshStandardMaterial)) continue;
        if (material.name === 'explorer-shirt') material.color.setHex(style === 'forest' ? 0x385449 : style === 'warm' ? 0x715046 : 0x24272c);
        if (material.name === 'explorer-shorts') material.color.setHex(style === 'forest' ? 0xa7afa0 : style === 'warm' ? 0xc4af8e : 0xb6ad96);
        const index = ['student-cotton', 'student-tee', 'student-denim', 'student-backpack'].indexOf(material.name);
        if (index >= 0) material.color.setHex(palette[index]);
        if (material.name === 'jacket-trim') material.color.setHex(palette[0]).multiplyScalar(.82);
      }
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(model); geometries.forEach(g => g.dispose()); const textures=new Set<T.Texture>([cloth]);for(const material of materials)for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);materials.forEach(m => m.dispose());textures.forEach(t=>t.dispose()); skeletons.forEach(s => s.dispose()); },
    kick() { kickTime = .32; },
    poseBasketball(held: boolean, followThrough: number) {
      root.updateMatrixWorld(true);
      for (const side of ['Left', 'Right']) {
        const sign = side === 'Left' ? 1 : -1;
        const a = bones[side + 'Arm'], b = bones[side + 'ForeArm'], c = bones[side + 'Hand'];
        const release = held ? 0 : Math.sin(Math.min(1, followThrough * 2) * Math.PI / 2);
        const target = root.localToWorld(new T.Vector3(sign * (held ? .11 : .16), height + .01 + release * .13, -.36 - release * .10));
        const origin = a.getWorldPosition(new T.Vector3());
        const upper = origin.distanceTo(b.getWorldPosition(new T.Vector3()));
        const lower = b.getWorldPosition(new T.Vector3()).distanceTo(c.getWorldPosition(new T.Vector3()));
        const direction = target.clone().sub(origin);
        const d = T.MathUtils.clamp(direction.length(), Math.abs(upper - lower) + .002, upper + lower - .002);
        direction.normalize();
        const bend = new T.Vector3(sign * .65, -.55, -.3).applyQuaternion(root.quaternion);
        bend.addScaledVector(direction, -bend.dot(direction)).normalize();
        const along = (upper * upper + d * d - lower * lower) / (2 * d);
        const h = Math.sqrt(Math.max(0, upper * upper - along * along));
        align(a, b, origin.clone().addScaledVector(direction, along).addScaledVector(bend, h));
        align(b, c, target);
        if (handBasis[side]) {
          const normal = new T.Vector3(-sign, .25, 0).normalize().applyQuaternion(root.quaternion);
          const forward = new T.Vector3(0, 1, held ? -.12 : -.65).applyQuaternion(root.quaternion);
          forward.addScaledVector(normal, -forward.dot(normal)).normalize();
          const across = new T.Vector3().crossVectors(normal, forward).normalize();
          const rotation = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across, normal, forward));
          c.quaternion.copy(c.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation).multiply(handBasis[side].clone().invert()));
          c.updateWorldMatrix(false, true);
        }
      }
    },
    setGroundSampler(sampler:(x:number,z:number)=>number){groundSampler=sampler;},
    get gaitPhase(){return phase;},
    update(dt: number, speed: number, seated: boolean, flying=false, seatHeight=.55, cyclingPhase?:number, steering=0,airborne=false) {
      moving = T.MathUtils.damp(moving, Math.min(1, speed / .5), 12, dt);
      const running = T.MathUtils.clamp((speed - 2) / 2.2, 0, 1);
      idle.weight = 1 - moving; walk.weight = moving * (1 - running); run.weight = moving * running;
      walk.timeScale = Math.max(.25, speed / 1.3); run.timeScale = Math.max(.3, speed / 2.05); mixer.update(dt);
      model.position.y = baseY;
      model.position.z = 0;
      model.rotation.x=0;
      if(bones.Spine)bones.Spine.quaternion.copy(rest.get(bones.Spine)!);
      bones.Hips.position.copy(hipsRest);
      for(const [name,bone]of Object.entries(bones))if(name.includes('Finger')||name.endsWith('Hand'))bone.quaternion.copy(rest.get(bone)!);
      if(cyclingPhase!==undefined){
        kickTime=0;
        for(const side of['Left','Right'])for(const part of['UpLeg','Leg','Arm','ForeArm']){const bone=bones[side+part];bone.quaternion.copy(rest.get(bone)!);}
        model.position.y=baseY+bicycleFit.seat+.08-hipRestHeight;model.position.z=.25;root.updateMatrixWorld(true);
        // Lean the torso toward the bars, then solve hands and ankles to actual
        // contact points on the shared bicycle model for either avatar size.
        if(bones.Spine&&bones.Neck){const target=bones.Neck.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,-.025,-.14).applyQuaternion(root.quaternion));align(bones.Spine,bones.Neck,target);}
        const solve=(a:T.Bone,b:T.Bone,c:T.Bone,target:T.Vector3,bend:T.Vector3)=>{
          const origin=a.getWorldPosition(new T.Vector3()),mid=b.getWorldPosition(new T.Vector3()),end=c.getWorldPosition(new T.Vector3()),upper=origin.distanceTo(mid),lower=mid.distanceTo(end);
          const direction=target.clone().sub(origin),d=T.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.002,upper+lower-.002);direction.normalize();
          bend.addScaledVector(direction,-bend.dot(direction)).normalize();const along=(upper*upper+d*d-lower*lower)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
          align(a,b,origin.clone().addScaledVector(direction,along).addScaledVector(bend,height));align(b,c,target);
        };
        for(const side of['Left','Right']){
          const sign=side==='Left'?-1:1;
          const footTarget=root.localToWorld(new T.Vector3(sign*.22,bicycleFit.crankY-sign*bicycleFit.crankRadius*Math.sin(cyclingPhase)+footRest[side].y,bicycleFit.crankZ+sign*bicycleFit.crankRadius*Math.cos(cyclingPhase)));
          solve(bones[side+'UpLeg'],bones[side+'Leg'],bones[side+'Foot'],footTarget,new T.Vector3(sign*.15,0,-1).applyQuaternion(root.quaternion));
          const handle=new T.Vector3(sign*bicycleFit.barHalfWidth,bicycleFit.barY,.27).applyAxisAngle(new T.Vector3(0,1,0),steering);handle.z-=.39;
          handle.y+=.04;handle.z+=.06;const handTarget=root.localToWorld(handle);
          solve(bones[side+'Arm'],bones[side+'ForeArm'],bones[side+'Hand'],handTarget,new T.Vector3(sign*.25,-1,0).applyQuaternion(root.quaternion));
          if(handBasis[side]){
            const hand=bones[side+'Hand'],f=new T.Vector3(0,0,-1).applyAxisAngle(new T.Vector3(0,1,0),steering).applyQuaternion(root.quaternion),normal=new T.Vector3(0,-1,0),x=new T.Vector3().crossVectors(normal,f);
            const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,normal,f)).multiply(handBasis[side].clone().invert());
            hand.quaternion.copy(hand.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));hand.updateWorldMatrix(false,true);
          }
          const foot=bones[side+'Foot'];foot.quaternion.copy(foot.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(root.getWorldQuaternion(new T.Quaternion())).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI)));
        }
        // Curl the finger chains around each grip, rather than leaving the
        // source mesh's spread open hands in the riding pose.
        for(const side of['Left','Right'])for(let digit=1;digit<=5;digit++)for(let part=1;part<=3;part++){
          const bone=bones[`${side}Finger${digit}${part}`];if(!bone)continue;
          const axis=new T.Vector3(1,0,0).applyQuaternion(root.quaternion).applyQuaternion(bone.parent!.getWorldQuaternion(new T.Quaternion()).invert());
          bone.quaternion.copy(new T.Quaternion().setFromAxisAngle(axis,-(digit===1?.3:part===1?.55:.85))).multiply(rest.get(bone)!);bone.updateWorldMatrix(false,true);
        }
        root.updateMatrixWorld(true);return;
      }
      if(flying){kickTime=0;model.rotation.x=-.16;for(const side of ['Left','Right']){bones[side+'Arm'].quaternion.copy(rotation(side+'Arm',-1.1));bones[side+'ForeArm'].quaternion.copy(rotation(side+'ForeArm',-.5));bones[side+'UpLeg'].quaternion.copy(rotation(side+'UpLeg',.17));bones[side+'Leg'].quaternion.copy(rotation(side+'Leg',.35));}return;}
      if(airborne&&!seated){kickTime=0;for(const side of['Left','Right']){bones[side+'UpLeg'].quaternion.copy(rotation(side+'UpLeg',-.25));bones[side+'Leg'].quaternion.copy(rotation(side+'Leg',.5));bones[side+'Arm'].quaternion.copy(rotation(side+'Arm',-.35));bones[side+'ForeArm'].quaternion.copy(rotation(side+'ForeArm',-.55));}return;}
      if (seated) {
        kickTime=0;model.position.y=baseY+seatHeight+.08-hipRestHeight;root.updateMatrixWorld(true);
        const facing=new T.Vector3(0,0,-1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
        const flatFoot=root.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));
        for(const side of['Left','Right']){
          const local=footRest[side].clone();local.z-=Math.min(.43,legLengths[side][0]*.95);
          const target=root.localToWorld(local);target.y=(groundSampler?.(target.x,target.z)??root.position.y)+footRest[side].y;
          const hip=bones[side+'UpLeg'],knee=bones[side+'Leg'],foot=bones[side+'Foot'],origin=hip.getWorldPosition(new T.Vector3()),[upper,lower]=legLengths[side];
          const direction=target.clone().sub(origin),distance=T.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.005,upper+lower-.001);direction.normalize();
          const bend=facing.clone().addScaledVector(direction,-facing.dot(direction)).normalize();
          const along=(upper*upper+distance*distance-lower*lower)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
          align(hip,knee,origin.clone().addScaledVector(direction,along).addScaledVector(bend,height));align(knee,foot,target);
          foot.quaternion.copy(foot.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(flatFoot));foot.updateWorldMatrix(false,true);
        }
        return;
      }
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
      if (kickTime > 0) { kickTime = Math.max(0, kickTime - dt); const amount = Math.sin((1 - kickTime / .32) * Math.PI); bones.RightUpLeg.quaternion.slerp(rotation('RightUpLeg', -.9), amount); bones.RightLeg.quaternion.slerp(rotation('RightLeg', .18), amount); model.updateMatrixWorld(true); }
    },
  };
}
