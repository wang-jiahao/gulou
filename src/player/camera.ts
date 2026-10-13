import * as T from 'three';

export class WalkCamera {
  yaw = 0;
  pitch = -.015;
  distance = 6.7;
  firstPerson = false;
  sensitivity = .0021;
  private ray = new T.Raycaster();
  private target = new T.Vector3();
  private desired = new T.Vector3();
  private direction = new T.Vector3();
  private hits: T.Intersection[] = [];
  private obstacleList?: T.Object3D[];
  private obstacleCount = -1;
  private initialized = false;
  private flightBlend = 0;
  constructor(readonly camera: T.PerspectiveCamera) {}
  look(dx: number, dy: number) { this.yaw -= dx * this.sensitivity; this.pitch = T.MathUtils.clamp(this.pitch + dy * this.sensitivity, -.85, this.flightBlend>.3?1.35:.9); }
  toggle() { this.firstPerson = !this.firstPerson; this.initialized = false; }
  reset() { this.yaw = 0; this.pitch = -.015; this.initialized = false; }
  prepareObstacles(obstacles: T.Object3D[]) {
    // Static vertex bounds enable Three's native local-space rejection before
    // triangle tests. Object transforms still apply normally; skinning does not.
    for (const object of obstacles) {
      if (object instanceof T.Mesh && !(object instanceof T.SkinnedMesh) && !object.geometry.boundingBox) object.geometry.computeBoundingBox();
    }
    this.obstacleList = obstacles; this.obstacleCount = obstacles.length;
  }
  private setFov(fov: number) {
    if (this.camera.fov === fov) return;
    this.camera.fov = fov; this.camera.updateProjectionMatrix();
  }
  update(position: T.Vector3, dt: number, obstacles: T.Object3D[], seated: boolean, flying = false, height = 1.77, riding = false, driving = false) {
    if (obstacles !== this.obstacleList || obstacles.length !== this.obstacleCount) this.prepareObstacles(obstacles);
    this.flightBlend=T.MathUtils.damp(this.flightBlend,flying?1:0,4,dt);
    this.target.copy(position); this.target.y += driving ? (this.firstPerson ? 1.2 : 1.05) : riding ? (this.firstPerson ? height-.15 : 1.2) : seated ? 1.4 : this.firstPerson ? height - .11 : height + .28;
    this.direction.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    if (this.firstPerson) {
      this.camera.position.copy(this.target); this.camera.lookAt(this.desired.copy(this.target).addScaledVector(this.direction, -1));
      this.setFov(72); this.initialized = false; return;
    }
    const followDistance=this.distance+this.flightBlend*4.5+(driving?2.6:0);
    this.ray.set(this.target, this.direction); this.ray.far = followDistance + .4;
    this.hits.length = 0;
    const hit = this.ray.intersectObjects(obstacles, false, this.hits)[0];
    const distance = hit ? Math.max(.28, Math.min(followDistance, hit.distance - .3)) : followDistance;
    this.desired.copy(this.target).addScaledVector(this.direction, distance);
    if (!this.initialized || hit) { this.camera.position.copy(this.desired); this.initialized = true; }
    else this.camera.position.lerp(this.desired, 1 - Math.exp(-dt * 18));
    this.camera.lookAt(this.target); this.setFov(driving?76:64+this.flightBlend*8);
  }
}
