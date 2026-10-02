import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { Player } from '../player/controller.ts';
import { pitchPoint, pitchLocal, type Pitch } from '../world/football-pitch.ts';

function footballModel(radius: number) {
  const source = new T.IcosahedronGeometry(1, 0).getAttribute('position'), vertices: T.Vector3[] = [], ids = new Map<string, number>(), faces: number[][] = [];
  for (let i = 0; i < source.count; i += 3) {
    const face: number[] = [];
    for (let j = 0; j < 3; j++) { const v = new T.Vector3().fromBufferAttribute(source, i + j), key = v.toArray().map(n => n.toFixed(6)).join(','); if (!ids.has(key)) { ids.set(key, vertices.length); vertices.push(v); } face.push(ids.get(key)!); }
    faces.push(face);
  }
  const directed = new Map<string, T.Vector3>(), neighbours = new Map<number, Set<number>>();
  for (const face of faces) for (let i = 0; i < 3; i++) {
    const a = face[i], c = face[(i + 1) % 3];
    for (const [u, v] of [[a, c], [c, a]]) { directed.set(`${u}:${v}`, vertices[u].clone().multiplyScalar(2).add(vertices[v]).divideScalar(3)); const list = neighbours.get(u) ?? new Set<number>(); list.add(v); neighbours.set(u, list); }
  }
  const scale = radius / [...directed.values()][0].length(), white: number[] = [], black: number[] = [], seams: number[] = [];
  const polygon = (points: T.Vector3[], destination: number[]) => {
    const center = points.reduce((v, p) => v.add(p), new T.Vector3()).divideScalar(points.length), n = center.clone().normalize();
    if (points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[1])).dot(n) < 0) points.reverse();
    for (let i = 0; i < points.length; i++) {
      for (const p of [center, points[i], points[(i + 1) % points.length]]) destination.push(...p.clone().multiplyScalar(scale).toArray());
      seams.push(...points[i].clone().multiplyScalar(scale * 1.003).toArray(), ...points[(i + 1) % points.length].clone().multiplyScalar(scale * 1.003).toArray());
    }
  };
  for (const [a, list] of neighbours) {
    const n = vertices[a].clone().normalize(), u = new T.Vector3(0, 1, 0).cross(n).normalize(); if (u.lengthSq() < .01) u.set(1, 0, 0); const v = n.clone().cross(u);
    const points = [...list].map(c => directed.get(`${a}:${c}`)!.clone()); points.sort((p, q) => Math.atan2(p.dot(v), p.dot(u)) - Math.atan2(q.dot(v), q.dot(u))); polygon(points, black);
  }
  for (const [a, c, d] of faces) polygon([`${a}:${c}`, `${c}:${a}`, `${c}:${d}`, `${d}:${c}`, `${d}:${a}`, `${a}:${d}`].map(k => directed.get(k)!.clone()), white);
  const root = new T.Group();
  for (const [positions, color] of [[white, 0xe8e9df], [black, 0x252c2a]] as const) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.computeVertexNormals();
    const mesh = new T.Mesh(g, new T.MeshStandardMaterial({ color, roughness: .7 })); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
  }
  const lines = new T.BufferGeometry(); lines.setAttribute('position', new T.Float32BufferAttribute(seams, 3)); root.add(new T.LineSegments(lines, new T.LineBasicMaterial({ color: 0x777e78 })));
  root.name = 'practice football — 32 stitched panels'; return root;
}

export class Football {
  readonly radius = .115;
  readonly body: RAPIER.RigidBody;
  readonly mesh: T.Group;
  goals = 0;
  kicks = 0;
  private clock = 0;
  private nextKick = 0;
  private resetAt = Infinity;
  private playing = true;
  private pausedVelocity = new T.Vector3();
  private pausedSpin = new T.Vector3();
  private previous = new T.Vector3();
  private shadow: T.Mesh;
  onGoal: () => void = () => {};

  constructor(scene: T.Scene, private player: Player, readonly pitch: Pitch) {
    const start = pitchPoint(pitch, 0, this.radius + .06, 0), world = player.physics;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(start.x, start.y, start.z).setLinearDamping(.22).setAngularDamping(.14).setCcdEnabled(true));
    world.createCollider(RAPIER.ColliderDesc.ball(this.radius).setMass(.43).setFriction(.68).setRestitution(.52), this.body);
    this.mesh = footballModel(this.radius); this.mesh.position.copy(start); scene.add(this.mesh); this.previous.copy(pitchLocal(pitch, start));
    this.shadow = new T.Mesh(new T.CircleGeometry(.17, 24), new T.MeshBasicMaterial({ color: 0x142415, transparent: true, opacity: .17, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })); this.shadow.rotation.x = -Math.PI / 2; scene.add(this.shadow);
  }
  get position() { const p = this.body.translation(); return new T.Vector3(p.x, p.y, p.z); }
  get nearby() { const p = pitchLocal(this.pitch, this.player.position); return Math.abs(p.x) < this.pitch.width / 2 + 18 && Math.abs(p.z) < this.pitch.length / 2 + 18 && Math.abs(p.y) < 3 && !this.player.flying; }
  get inReach() { const p = this.position, player = this.player.position; return this.nearby && !this.player.seated && Math.hypot(p.x - player.x, p.z - player.z) < 1.25 && Math.abs(p.y - player.y) < .8; }
  get canKick() { return this.playing && this.inReach && this.clock >= this.nextKick && this.resetAt === Infinity; }
  prepare(active: boolean) {
    if (active === this.playing) return;
    this.playing = active;
    if (!active) {
      const v = this.body.linvel(), w = this.body.angvel(); this.pausedVelocity.set(v.x, v.y, v.z); this.pausedSpin.set(w.x, w.y, w.z);
      this.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true); this.body.setNextKinematicTranslation(this.body.translation()); this.body.setNextKinematicRotation(this.body.rotation());
    } else {
      this.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true); this.body.setLinvel(this.pausedVelocity, true); this.body.setAngvel(this.pausedSpin, true);
    }
  }
  kick(yaw: number, strong: boolean) {
    if (!this.canKick || !this.playing) return false;
    this.nextKick = this.clock + .32; this.kicks++;
    const force = strong ? 6.2 : 3.9;
    this.body.applyImpulse({ x: -Math.sin(yaw) * force, y: strong ? 1.4 : .65, z: -Math.cos(yaw) * force }, true);
    this.body.applyTorqueImpulse({ x: -.015 * Math.cos(yaw), y: 0, z: .015 * Math.sin(yaw) }, true);
    this.player.avatar.root.rotation.y = yaw; this.player.avatar.kick(); return true;
  }
  resetBall() {
    const nearCenter = this.player.position.distanceTo(pitchPoint(this.pitch, 0, 0, 0)) < 2;
    const p = pitchPoint(this.pitch, 0, this.radius + .05, nearCenter ? 3 : 0);
    this.body.setTranslation(p, true); this.body.setLinvel({ x: 0, y: 0, z: 0 }, true); this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setNextKinematicTranslation(p); this.pausedVelocity.set(0, 0, 0); this.pausedSpin.set(0, 0, 0); this.resetAt = Infinity; this.previous.copy(pitchLocal(this.pitch, p));
  }
  update(dt: number) {
    if (this.playing) this.clock += dt;
    const p = this.position, local = pitchLocal(this.pitch, p);
    this.mesh.position.copy(p); const q = this.body.rotation(); this.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    this.shadow.position.set(p.x, this.pitch.groundY + .012, p.z); const altitude = Math.max(0, local.y - this.radius); this.shadow.scale.setScalar(1 + altitude * .3); (this.shadow.material as T.MeshBasicMaterial).opacity = .17 / (1 + altitude);
    if (this.playing && this.resetAt === Infinity) for (const end of [-1, 1]) {
      const line = end * (this.pitch.length / 2 + this.radius);
      if (end * this.previous.z < end * line && end * local.z >= end * line) {
        const t = (line - this.previous.z) / (local.z - this.previous.z), x = T.MathUtils.lerp(this.previous.x, local.x, t), y = T.MathUtils.lerp(this.previous.y, local.y, t);
        if (Math.abs(x) < this.pitch.goalWidth / 2 - this.radius && y < this.pitch.goalHeight - this.radius && y > .02) { this.goals++; this.resetAt = this.clock + 1.3; this.onGoal(); break; }
      }
    }
    this.previous.copy(local);
    if (this.playing && (this.clock >= this.resetAt || Math.abs(local.x) > this.pitch.width / 2 + 15 || Math.abs(local.z) > this.pitch.length / 2 + 12 || p.y < -2 || !Number.isFinite(p.y))) this.resetBall();
  }
  get snapshot() { return { goals: this.goals, kicks: this.kicks, nearby: this.nearby, canKick: this.canKick, paused: !this.playing, ball: this.position.toArray() }; }
}
