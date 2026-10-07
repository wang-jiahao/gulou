import * as T from 'three';
import type { Player } from '../player/controller.ts';
import { BALL_RADIUS, basketballCourts, basketballHoops, type BasketballHoop } from '../world/basketball-layout.ts';
import { BasketballPhysics } from './basketball-physics.ts';

function ballModel() {
  const root = new T.Group();
  root.name = 'practice basketball';
  const ball = new T.Mesh(new T.SphereGeometry(BALL_RADIUS, 32, 20), new T.MeshStandardMaterial({ color: 0xcb631c, roughness: .88 }));
  ball.castShadow = ball.receiveShadow = true; root.add(ball);
  const seam = new T.MeshStandardMaterial({ color: 0x302c26, roughness: .9 });
  const ring = new T.TorusGeometry(BALL_RADIUS, .0019, 4, 64);
  for (const [x, y] of [[0, 0], [Math.PI / 2, 0], [0, Math.PI / 2], [0, Math.PI / 4]]) {
    const mesh = new T.Mesh(ring, seam); mesh.rotation.set(x, y, 0); root.add(mesh);
  }
  return root;
}

/** One shared practice ball; E / touch uses the same two-tap shot timing. */
export class Basketball {
  readonly physics: BasketballPhysics;
  readonly mesh = ballModel();
  private shadow: T.Mesh<T.CircleGeometry, T.MeshBasicMaterial>;
  private chargeTime = 0;
  private followThrough = 0;
  private target: BasketballHoop | null = null;
  private lastCourt = basketballCourts.find(c => c.name === 'basket-north1')!;
  onScore: (points: number) => void = () => {};

  constructor(scene: T.Scene, private player: Player) {
    this.physics = new BasketballPhysics(player.physics);
    this.physics.onScore = points => this.onScore(points);
    this.shadow = new T.Mesh(new T.CircleGeometry(.16, 20), new T.MeshBasicMaterial({ color: 0x172519, transparent: true, opacity: .2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.mesh, this.shadow); this.syncVisual();
  }
  get court() {
    const p = this.player.position;
    if (this.player.flying || Math.abs(p.y) > 2.5) return undefined;
    return basketballCourts.find(c => {
      const dx = p.x - c.x, dz = p.z - c.z;
      const u = dx * Math.cos(c.angle) - dz * Math.sin(c.angle), v = dx * Math.sin(c.angle) + dz * Math.cos(c.angle);
      return Math.abs(u) < c.w / 2 + 2.5 && Math.abs(v) < (c.half ? c.l / 4 : c.l / 2) + 2.5;
    });
  }
  get nearby() { return Boolean(this.court); }
  get held() { return this.physics.held; }
  get power() { const t = this.chargeTime % 2.4; return t <= 1.2 ? t / 1.2 : (2.4 - t) / 1.2; }
  get canPlay() { return this.physics.active && !this.player.flying && !this.player.riding && !this.player.seated; }
  get inReach() {
    const p = this.physics.position, q = this.player.position;
    return this.canPlay && this.nearby && Math.hypot(p.x - q.x, p.z - q.z) < 1.35 && p.y - q.y < 2.25;
  }
  prepare(active: boolean) { this.physics.prepare(active); }
  private nearestHoop() {
    const candidates = (this.court ?? this.lastCourt).hoops;
    return candidates.reduce((a, b) => a.center.distanceToSquared(this.player.position) < b.center.distanceToSquared(this.player.position) ? a : b);
  }
  interact() {
    if (!this.canPlay) return false;
    if (this.held && this.target) {
      this.followBall();
      const shot = this.physics.shoot(this.target, this.power);
      if (shot) this.followThrough = .45;
      return shot;
    }
    if (!this.inReach) return false;
    this.target = this.nearestHoop(); this.chargeTime = 0;
    this.physics.hold(); this.followBall(); return true;
  }
  private followBall() {
    if (!this.target) return;
    const direction = this.target.center.clone().sub(this.player.position);
    this.player.avatar.root.rotation.y = Math.atan2(-direction.x, -direction.z);
    const p = new T.Vector3(0, this.player.avatar.height + .04, -.38).applyAxisAngle(new T.Vector3(0, 1, 0), this.player.avatar.root.rotation.y).add(this.player.position);
    this.physics.follow(p);
  }
  cancel() {
    this.followThrough = 0;
    if (this.held) this.physics.reset((this.target ?? this.nearestHoop()).start);
    this.target = null;
  }
  resetBall() {
    this.cancel(); this.chargeTime = 0;
    const hoop = this.nearestHoop(), p = hoop.start.clone();
    if (Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z) < .7) p.x += .9 * Math.cos(hoop.angle);
    this.physics.reset(p);
  }
  private syncVisual() {
    const p = this.physics.position, q = this.physics.body.rotation();
    this.mesh.position.copy(p); this.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    const altitude = Math.max(0, p.y - BALL_RADIUS);
    this.shadow.position.set(p.x, .025, p.z); this.shadow.scale.setScalar(1 + altitude * .23); this.shadow.material.opacity = .2 / (1 + altitude);
  }
  update(dt: number) {
    const court = this.court; if (court) this.lastCourt = court;
    if (this.held && (!court || this.player.riding || this.player.seated || this.player.flying)) this.cancel();
    this.physics.update();
    if (this.physics.active) {
      if (this.held) { this.chargeTime += dt; this.target = this.nearestHoop(); this.followBall(); }
      this.followThrough = Math.max(0, this.followThrough - dt);
      const p = this.physics.position;
      const distance = Math.hypot(p.x - this.lastCourt.x, p.z - this.lastCourt.z);
      if (p.y < -2 || !Number.isFinite(p.y) || distance > 42) this.physics.reset(this.lastCourt.hoops[0].start);
    }
    if (this.held || this.followThrough > 0) this.player.avatar.poseBasketball(this.held, this.followThrough / .45);
    this.syncVisual();
  }
  get snapshot() {
    return { score: this.physics.score, shots: this.physics.shots, held: this.held, power: this.power, nearby: this.nearby, inReach: this.inReach, paused: !this.physics.active, hoop: this.target?.id ?? null, ball: this.physics.position.toArray(), hoops: basketballHoops.length };
  }
}
