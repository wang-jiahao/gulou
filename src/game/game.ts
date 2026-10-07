import * as T from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { CSM } from 'three/addons/csm/CSM.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { loadMaterials } from '../world/materials.ts';
import { createWorld, spawn, type CampusWorld } from '../world/world.ts';
import { Player } from '../player/controller.ts';
import { createAvatar, type CharacterKind, type OutfitStyle } from '../player/avatar.ts';
import { WalkCamera } from '../player/camera.ts';
import {StreetTraffic} from './street-traffic.ts';
import { Football } from './football.ts';
import { Basketball } from './basketball.ts';
import { Music } from '../audio/music.ts';
import { Ambience } from '../audio/ambience.ts';
import { Atmosphere } from '../world/atmosphere.ts';

export type Quality = 'high' | 'medium' | 'low';
export type Mode = 'loading' | 'ready' | 'playing' | 'paused' | 'photo';
export class Game {
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, .07, 1200);
  readonly cameraRig = new WalkCamera(this.camera);
  readonly renderer: T.WebGLRenderer;
  readonly audio = new Ambience();
  readonly music = new Music();
  readonly sun = new T.DirectionalLight(0xfff1d3, 4.1);
  world!: CampusWorld;
  player!: Player;
  atmosphere!: Atmosphere;
  football!: Football;
  basketball!: Basketball;
  traffic!:StreetTraffic;
  mode: Mode = 'loading';
  quality: Quality = 'medium';
  character: CharacterKind = 'male';
  outfit: OutfitStyle = 'campus';
  private characterRequest = 0;
  photoFov = 58;
  photoHideAvatar = false;
  frameMs = 16.7;
  cpuMs = 0;
  gpuMs: number | null = null;
  readyMs = 0;
  elapsed = 0;
  onTick: () => void = () => {};
  onNotice: (s: string) => void = () => {};
  private last = 0;
  private photoSaving = false;
  private saveAt = 0;
  private gpuQueries: WebGLQuery[] = [];
  private gl: WebGL2RenderingContext;
  private timerExtension: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  private shadow = new T.Object3D();
  private sunOffset = new T.Vector3();
  private csm?: CSM;
  private shadowMaterials = new Set<T.Material>();
  private shadowFov = 0;
  private foliageLight?: { value: number };
  private windTime?: {value:number};
  private updateStatsAt = 0;

  constructor(element: HTMLElement) {
    this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.outputColorSpace = T.SRGBColorSpace; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', '可自由行走的鼓楼校园'); element.appendChild(this.renderer.domElement);
    this.gl = this.renderer.getContext() as WebGL2RenderingContext;
    this.timerExtension = this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.scene.fog = new T.Fog(0xc5d3d6, 140, 400);
    this.scene.background=new T.Color(0xa9c8df);
    this.csm=new CSM({camera:this.camera,parent:this.scene,cascades:2,maxFar:130,mode:'custom',shadowMapSize:2048,lightIntensity:4.1,lightMargin:65,customSplitsCallback:(_c,_n,_f,target)=>{target.push(.22,1);}});
    this.csm.fade=true;
    this.csm.lights.forEach(light=>{light.color.set(0xfff0d9);light.shadow.normalBias=.025;light.shadow.bias=-.00003;});
    this.setTime(15);
    this.setQuality(matchMedia('(pointer: coarse)').matches ? 'low' : 'medium'); window.addEventListener('resize', () => this.resize());
    this.renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); this.mode = 'paused'; this.onNotice('图形上下文已中断，请重新加载页面。'); });
  }
  async init(progress: (p: number, label: string) => void) {
    progress(.04, '准备行走与碰撞');
    void this.music.load();
    const [hdr,,materials]=await Promise.all([
      new RGBELoader().loadAsync(`${import.meta.env.BASE_URL}assets/environment/afternoon.hdr`),
      RAPIER.init(),
      loadMaterials(n => progress(.1 + n * .35, '加载石材、草地与树叶')),
    ]);
    hdr.mapping=T.EquirectangularReflectionMapping;
    const pmrem=new T.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromEquirectangular(hdr).texture;pmrem.dispose();this.scene.environmentIntensity=.28;
    this.atmosphere=new Atmosphere(this.scene,hdr);this.atmosphere.setQuality(this.quality);
    this.windTime=materials.windTime; this.foliageLight=materials.foliageLight;
    progress(.5, '搭建北大楼与树荫步道');
    this.world = await createWorld(this.scene, materials, this.quality);
    this.player = new Player(this.scene, this.world.solids, await createAvatar(this.character),this.world.fixedMeshes);
    this.player.avatar.setOutfit(this.outfit);
    this.football = new Football(this.scene, this.player, this.world.pitch); this.football.onGoal = () => this.onNotice('进球！足球即将回到中场。');
    this.basketball = new Basketball(this.scene, this.player);
    this.basketball.onScore = points => this.onNotice(`${points === 3 ? '三分' : '两分'}命中！`);
    this.traffic=new StreetTraffic(this.scene,this.player);
    const initialMeshes=this.world.fixedMeshes.length;
    this.shadow = this.createContactShadow(); this.scene.add(this.shadow);
    this.setupShadowMaterials();
    progress(.83, '准备日光与近景阴影');
    this.cameraRig.update(spawn, 1, this.world.cameraSolids, false);
    await this.renderer.compileAsync(this.scene, this.camera);
    this.mode = 'ready'; this.readyMs = performance.now(); progress(1, '校园已就绪 · 无需注册');
    this.last = performance.now(); this.renderer.setAnimationLoop(t => this.tick(t));
    void this.world.expand(()=>this.setupShadowMaterials()).then(async solids => {
      this.player.addSolids(solids);this.player.addMeshes(this.world.fixedMeshes.slice(initialMeshes));
      this.atmosphere.setLamps(this.world.lampPositions);this.atmosphere.register();
      // Expanded facades have materials that the core-only warm-up never saw.
      // Prepare their shader variants (including currently hidden detail cells)
      // before the first flight crosses into a new part of campus.
      await this.renderer.compileAsync(this.scene,this.camera);
      void this.atmosphere.buildRainHeights((x,z)=>this.player.groundHeightAt(x,z));
    }).catch(e => { console.error(e); this.onNotice('部分远景未加载，核心区域仍可游玩。'); });
  }
  private setupShadowMaterials() {
    this.atmosphere?.register();
    this.scene.traverse(object=>{
      if(!(object instanceof T.Mesh))return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      for(const mat of materials){
        if(mat.userData.windDepth)object.customDepthMaterial=mat.userData.windDepth;
        if(!(mat instanceof T.MeshStandardMaterial)||this.shadowMaterials.has(mat))continue;
        const originalKey=mat.customProgramCacheKey();const original=mat.onBeforeCompile.bind(mat);this.csm!.setupMaterial(mat);const shadow=mat.onBeforeCompile.bind(mat);
        mat.onBeforeCompile=(shader,renderer)=>{original(shader,renderer);shadow(shader,renderer);};mat.needsUpdate=true;this.shadowMaterials.add(mat);
        mat.customProgramCacheKey=()=>`gulou-csm:${originalKey}`;
      }
    });
  }
  setTime(hour: number) {
    if(this.atmosphere){this.atmosphere.state.setHour(hour);return;}
    const a = (hour - 12) / 12 * Math.PI; const v = new T.Vector3(-Math.sin(a), Math.max(.18, Math.cos(a) * .83), .68).normalize();
    this.sunOffset.copy(v).multiplyScalar(100); this.sun.position.copy(this.sunOffset);
    this.csm?.lightDirection.copy(v).negate();this.csm?.updateFrustums();
  }
  setQuality(quality: Quality) {
    this.quality = quality;
    const n = quality === 'high' ? 3072 : quality === 'medium' ? 2048 : 1024;
    if(this.csm){this.csm.shadowMapSize=n;this.csm.lights.forEach(light=>{if(light.shadow.mapSize.x!==n){light.shadow.mapSize.set(n,n);light.shadow.map?.dispose();light.shadow.map=null;}});}
    this.resize();
    this.atmosphere?.setQuality(quality);
  }
  async setCharacter(kind: CharacterKind) {
    const request = ++this.characterRequest;
    if (kind === this.character) return;
    const next = await createAvatar(kind);
    if (request !== this.characterRequest) { next.dispose(); return; }
    next.setOutfit(this.outfit);
    const previous = this.player.replaceAvatar(next);
    for (const material of previous.materials) { this.shadowMaterials.delete(material); this.csm?.shaders.delete(material); }
    previous.dispose(); this.character = kind; this.setupShadowMaterials();
  }
  toggleFlight(){
    if(this.player.riding){this.onNotice('先按 E 或点击提示下车，再起飞。');return;}
    if(this.player.flying){this.player.land();this.onNotice('正在降落，可用 WASD 微调位置。');return;}
    if(this.world.sectors<3){this.onNotice('正在准备空中视野，请稍候再起飞。');return;}
    if(!this.player.startFlight()){this.onNotice('上方有遮挡，先走到开阔处再起飞。');return;}
    this.basketball.cancel();
    this.onNotice('空格上升 · Ctrl 下降 · F 降落');
  }
  setOutfit(style: OutfitStyle) { this.outfit = style; this.player?.avatar.setOutfit(style); }
  private resize() {
    const maxHeight = this.quality === 'high' ? 1600 : this.quality === 'medium' ? 1200 : 720;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, maxHeight / innerHeight, this.quality === 'high' ? 2 : this.quality === 'medium' ? 1.5 : 1));
    this.renderer.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.csm?.updateFrustums();
  }
  private createContactShadow() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const ctx = canvas.getContext('2d')!; const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30); grad.addColorStop(0, 'rgba(15,24,14,0.4)'); grad.addColorStop(1, 'rgba(15,24,14,0)'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    const mesh = new T.Mesh(new T.PlaneGeometry(1.4, 1.4), new T.MeshBasicMaterial({ map: new T.CanvasTexture(canvas), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })); mesh.rotation.x = -Math.PI / 2; return mesh;
  }
  private tick(time: number) {
    if (this.photoSaving) { this.last = time; return; }
    const rawDt = Math.max(.001, (time - this.last) / 1000); this.last = time;
    const dt = Math.min(rawDt, .05), start = performance.now(); this.elapsed += dt;
    if(this.windTime)this.windTime.value+=dt*(1+(this.atmosphere?.state.rain??0)*1.5);
    this.frameMs = T.MathUtils.lerp(this.frameMs, Math.min(rawDt * 1000, 200), .03);
    this.football.prepare(this.mode === 'playing');
    this.basketball.prepare(this.mode === 'playing');
    this.traffic.prepare(dt,this.mode==='playing');
    this.player.update(dt, this.cameraRig.yaw, this.mode === 'playing');
    this.traffic.sync();
    if(this.player.riding)this.cameraRig.yaw+=this.player.rideCameraTurn;
    this.football.update(dt);
    this.basketball.update(dt);
    this.cameraRig.update(this.player.position, dt, this.world.cameraSolids, this.player.seated,this.player.flying,this.player.avatar.height,Boolean(this.player.riding));
    this.atmosphere.update(dt,this.mode==='playing',this.camera.position);
    if(this.foliageLight)this.foliageLight.value=this.atmosphere.daylight;
    this.world.updateVegetation(this.player.position, this.quality, this.player.flying,this.camera.position);
    this.world.access.update(dt,this.player.position,this.mode==='playing');
    this.world.dadaoping.update(dt,this.mode==='playing');
    this.csm!.lightDirection.copy(this.atmosphere.sunDirection).negate();this.csm!.lights.forEach(light=>{light.intensity=this.atmosphere.sunIntensity;light.color.copy(this.atmosphere.lightColor);});
    this.renderer.toneMappingExposure=1.05+this.atmosphere.night*.12;
    this.player.avatar.root.visible = !this.cameraRig.firstPerson && !(this.mode === 'photo' && this.photoHideAvatar);
    if (this.mode === 'photo') { this.camera.fov = this.photoFov; this.camera.updateProjectionMatrix(); }
    this.shadow.position.copy(this.player.position); this.shadow.position.y += .013; this.shadow.visible = this.player.avatar.root.visible&&!this.player.flying;
    if(this.shadowFov!==this.camera.fov){this.shadowFov=this.camera.fov;this.csm?.updateFrustums();}
    this.camera.updateMatrixWorld();this.csm?.update();
    this.audio.setEnvironment(this.atmosphere.state.rain,this.atmosphere.night,this.player.flying);
    this.audio.update(dt, this.player.riding?0:this.player.speed, this.mode === 'playing');
    const ext = this.timerExtension, gl = this.gl;
    if (ext && this.gpuQueries.length && gl.getQueryParameter(this.gpuQueries[0], gl.QUERY_RESULT_AVAILABLE)) {
      const q = this.gpuQueries.shift()!; if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) this.gpuMs = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6; gl.deleteQuery(q);
    }
    let query: WebGLQuery | null = null;
    if (ext && this.gpuQueries.length < 4 && this.elapsed > this.updateStatsAt) { query = gl.createQuery(); if (query) gl.beginQuery(ext.TIME_ELAPSED_EXT, query); this.updateStatsAt = this.elapsed + .5; }
    this.renderer.render(this.scene, this.camera);
    if (query && ext) { gl.endQuery(ext.TIME_ELAPSED_EXT); this.gpuQueries.push(query); }
    this.cpuMs = T.MathUtils.lerp(this.cpuMs, performance.now() - start, .04);
    if (this.elapsed > this.saveAt && this.mode === 'playing' && !this.player.noclip) { this.saveAt = this.elapsed + 5; try { localStorage.setItem('gulou-position-v1', JSON.stringify(this.player.position.toArray())); } catch { /* Storage may be disabled. */ } }
    this.onTick();
  }
  stats() {
    return { mode: this.mode, renderSize: [this.renderer.domElement.width, this.renderer.domElement.height], pixelRatio: this.renderer.getPixelRatio(), fps: Math.round(1000 / this.frameMs), frameMs: +this.frameMs.toFixed(2), cpuMs: +this.cpuMs.toFixed(2), gpuMs: this.gpuMs == null ? null : +this.gpuMs.toFixed(2), triangles: this.renderer.info.render.triangles, drawCalls: this.renderer.info.render.calls, textures: this.renderer.info.memory.textures, geometries: this.renderer.info.memory.geometries, position: this.player.position.toArray(), sectors: this.world.sectors, quality: this.quality, character: this.character, outfit: this.outfit, firstPerson: this.cameraRig.firstPerson, readyMs: Math.round(this.readyMs),flight:this.player.flightState,grounded:this.player.grounded,verticalSpeed:this.player.velocityY,bicycle:this.player.riding?.id??null,rideSpeed:this.player.rideSpeed,flag:this.world.dadaoping.snapshot(),traffic:this.traffic.snapshot(),environment:this.atmosphere.snapshot,music:this.music.snapshot,audio:this.audio.snapshot,football:this.football.snapshot,basketball:this.basketball.snapshot,map:{buildings:this.world.map.features.filter(f=>f.tags.building).length,roads:this.world.map.roads.length} };
  }
  async savePhoto() {
    if (this.photoSaving) throw new Error('照片正在生成，请稍候。');
    const size = this.renderer.getSize(new T.Vector2()), ratio = this.renderer.getPixelRatio();
    const maximum = Math.min(2048, this.renderer.capabilities.maxTextureSize);
    this.photoSaving = true;
    try {
      this.renderer.setPixelRatio(Math.min(4, maximum / Math.max(size.x, size.y)));
      if (this.mode === 'photo') { this.camera.fov = this.photoFov; this.camera.updateProjectionMatrix(); this.csm?.updateFrustums(); this.csm?.update(); }
      this.renderer.render(this.scene, this.camera);
      const blob = await new Promise<Blob | null>(resolve => this.renderer.domElement.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('照片生成失败');
      const now = new Date(), pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = `Gulou-${stamp}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      this.renderer.setPixelRatio(ratio); this.photoSaving = false;
    }
  }
}
