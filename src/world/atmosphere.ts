import * as T from 'three';
import { EnvironmentState } from '../game/environment-state.ts';
import { bounds } from './campus-map.ts';
import { rng } from './geometry.ts';

export class Atmosphere {
  readonly state = new EnvironmentState();
  readonly sunDirection = new T.Vector3();
  readonly lightColor = new T.Color();
  readonly hemisphere = new T.HemisphereLight(0xc5d8eb, 0x716951, .48);
  readonly sky: T.Mesh<T.SphereGeometry, T.ShaderMaterial>;
  readonly rainMesh: T.LineSegments<T.BufferGeometry, T.ShaderMaterial>;
  readonly pools = new T.Group();
  daylight = 1;
  night = 0;
  sunIntensity = 4.1;
  heightReady = false;
  private clock = 0;
  private windows = new Set<T.MeshStandardMaterial>();
  private lamps = new Set<T.MeshStandardMaterial>();
  private surfaces = new Map<T.MeshStandardMaterial, { color: T.Color; roughness: number }>();
  private pointLights: T.PointLight[] = [];
  private lampPositions: T.Vector3[] = [];
  private pointUpdateAt = 0;
  private pointCount = 4;
  private quality = 'medium';
  private heightData = new Float32Array(128 * 128);
  private heightMap = new T.DataTexture(this.heightData, 128, 128, T.RedFormat, T.FloatType);
  private glowMaterial: T.MeshBasicMaterial;
  private moon = new T.Vector3();

  constructor(private scene: T.Scene, hdr: T.Texture) {
    this.heightMap.needsUpdate = true; this.heightMap.minFilter = this.heightMap.magFilter = T.NearestFilter;
    const uniforms = {
      uHDR: { value: hdr }, uDay: { value: 1 }, uTwilight: { value: 0 }, uRain: { value: 0 },
      uSun: { value: new T.Vector3() }, uMoon: { value: new T.Vector3() },
    };
    this.sky = new T.Mesh(new T.SphereGeometry(900, 24, 16), new T.ShaderMaterial({
      uniforms, side: T.BackSide, depthWrite: false,
      vertexShader: `varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `
      varying vec3 vDirection;uniform sampler2D uHDR;uniform float uDay,uTwilight,uRain;uniform vec3 uSun,uMoon;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec3 d=normalize(vDirection);vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);
        vec3 day=texture2D(uHDR,vec2(fract(uv.x-.11),uv.y)).rgb*.62;
        float horizon=pow(1.-abs(d.y),4.);vec3 dusk=mix(vec3(.14,.18,.31),vec3(1.4,.43,.12),horizon);
        day=mix(day,dusk,uTwilight*.72);
        vec3 night=mix(vec3(.004,.008,.022),vec3(.027,.043,.08),pow(1.-max(d.y,0.),3.));
        vec2 cell=uv*vec2(1100.,550.);float star=step(.9984,hash(floor(cell)))*pow(max(0.,1.-length(fract(cell)-.5)*3.8),3.);
        night+=vec3(.65,.76,1.)*star*smoothstep(.02,.2,d.y);
        float moonDot=dot(d,uMoon);night+=vec3(.67,.77,.94)*(smoothstep(.99991,.99997,moonDot)*2.+pow(max(0.,moonDot),600.)*.025);
        vec3 color=mix(night,day,uDay);float gray=dot(color,vec3(.2126,.7152,.0722));
        color=mix(color,vec3(gray*.57,gray*.63,gray*.72),uRain*.82);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }));
    this.sky.frustumCulled = false; this.sky.renderOrder = -100;
    scene.background = null; scene.add(this.sky, this.hemisphere, this.pools);
    const count = 5200, positions = new Float32Array(count * 6), seeds = new Float32Array(count * 6), random = rng(2419);
    for (let i = 0; i < count; i++) {
      const sx = random(), sy = random(), sz = random();
      for (let k = 0; k < 2; k++) { positions[i * 6 + k * 3 + 1] = k; seeds.set([sx, sy, sz], i * 6 + k * 3); }
    }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(positions, 3)); geometry.setAttribute('aSeed', new T.BufferAttribute(seeds, 3));
    this.rainMesh = new T.LineSegments(geometry, new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uRain: { value: 0 }, uCenter: { value: new T.Vector3() }, uHeights: { value: this.heightMap }, uNight: { value: 0 }, uMapBounds: { value: new T.Vector4(bounds.minX, bounds.minZ, bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) } },
      vertexShader: `attribute vec3 aSeed;uniform float uTime,uRain;uniform vec3 uCenter;uniform sampler2D uHeights;uniform vec4 uMapBounds;varying float vAlpha;
      void main(){vec3 p=vec3(uCenter.x+(aSeed.x-.5)*48.,uCenter.y+20.-fract(aSeed.y+uTime*.5)*40.,uCenter.z+(aSeed.z-.5)*48.);
      p.x+=position.y*.10;p.y+=position.y*(.35+uRain*.25);vec2 uv=(p.xz-uMapBounds.xy)/uMapBounds.zw;float roof=texture2D(uHeights,clamp(uv,0.,1.)).r;
      vAlpha=step(roof+.06,p.y)*(1.-smoothstep(8.,24.,length(p.xz-uCenter.xz)))*.34*uRain;
      gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
      fragmentShader: `uniform float uNight;varying float vAlpha;void main(){gl_FragColor=vec4(mix(vec3(.65,.76,.87),vec3(.42,.58,.78),uNight),vAlpha);#include <colorspace_fragment>}`.replace(';#include', ';\n#include'),
    }));
    this.rainMesh.frustumCulled = false; this.rainMesh.renderOrder = 5; scene.add(this.rainMesh);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 32); gradient.addColorStop(0, 'rgba(255,190,91,.32)'); gradient.addColorStop(1, 'rgba(255,190,91,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    this.glowMaterial = new T.MeshBasicMaterial({ map: new T.CanvasTexture(canvas), transparent: true, depthWrite: false, blending: T.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 });
    for (let i = 0; i < 6; i++) { const light = new T.PointLight(0xffcf8a, 0, 14, 2);light.visible=i<this.pointCount;this.pointLights.push(light); scene.add(light); }
  }
  register() {
    this.scene.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      for (const m of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(m instanceof T.MeshStandardMaterial)) continue;
        if (m.name.startsWith('window-glass') && m.name !== 'window-glass') { m.emissive.set(m.name.endsWith('cool') ? 0xb1c4ce : 0xffb95d); this.windows.add(m); }
        if (m.name === 'lamp-glass') { m.emissive.set(0xffc876); this.lamps.add(m); }
        if (m.name === 'paving' && !this.surfaces.has(m)) this.surfaces.set(m, { color: m.color.clone(), roughness: m.roughness });
      }
    });
  }
  setLamps(positions: T.Vector3[]) {
    this.lampPositions = positions; this.pools.clear();
    const geo = new T.PlaneGeometry(8, 8);
    positions.forEach(p => { const m = new T.Mesh(geo, this.glowMaterial); m.rotation.x = -Math.PI / 2; m.position.set(p.x, .074, p.z); this.pools.add(m); });
  }
  async buildRainHeights(sample: (x: number, z: number) => number) {
    for (let row = 0; row < 128; row++) {
      for (let col = 0; col < 128; col++) this.heightData[row * 128 + col] = sample(bounds.minX + (col + .5) / 128 * (bounds.maxX - bounds.minX), bounds.minZ + (row + .5) / 128 * (bounds.maxZ - bounds.minZ));
      if (row % 8 === 7) await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    this.heightMap.needsUpdate = true; this.heightReady = true;
  }
  setQuality(quality: string) { this.quality = quality; this.pointCount = quality === 'high' ? 6 : quality === 'low' ? 2 : 4;this.pointLights.forEach((l,i)=>l.visible=i<this.pointCount);this.rainMesh.geometry.setDrawRange(0, (quality === 'high' ? 5200 : quality === 'low' ? 1400 : 3000) * 2); }
  update(dt: number, active: boolean, cameraPosition: T.Vector3) {
    this.clock += dt; this.state.update(dt, active);
    const angle = (this.state.hour - 6) / 24 * Math.PI * 2, elevation = Math.sin(angle);
    this.daylight = T.MathUtils.smoothstep(elevation, -.09, .18); this.night = 1 - this.daylight;
    const sun = new T.Vector3(Math.cos(angle), elevation, .68).normalize();
    this.moon.set(-sun.x, Math.max(.25, -sun.y), -sun.z).normalize();
    const directSun = 4.1 * Math.pow(Math.max(0, elevation), .35);
    this.sunDirection.copy(directSun > .025 ? sun : this.moon);
    this.sunIntensity = (directSun + this.night * .32) * (1 - this.state.rain * .77);
    this.lightColor.set(directSun > .025 ? 0xfff0d9 : 0x98b9ef);
    if (directSun > .025) this.lightColor.lerp(new T.Color(0xff9957), (1 - T.MathUtils.smoothstep(elevation, 0, .3)) * .65);
    this.hemisphere.intensity = .17 + .31 * this.daylight * (1 - this.state.rain * .4);
    this.hemisphere.color.set(0x8ca1cd).lerp(new T.Color(0xc5d8eb), this.daylight);
    const fog = this.scene.fog as T.Fog;
    fog.color.set(0x101b30).lerp(new T.Color(0xc5d3d6), this.daylight).lerp(new T.Color(this.daylight > .5 ? 0x73818c : 0x101927), this.state.rain * .8);
    fog.near = T.MathUtils.lerp(140, 25, this.state.rain); fog.far = T.MathUtils.lerp(1100, 230, this.state.rain);
    this.scene.environmentIntensity = (.12 + .16 * this.daylight) * (1 - this.state.rain * .35);
    this.sky.position.copy(cameraPosition); const sky = this.sky.material.uniforms;
    sky.uDay.value = this.daylight; sky.uTwilight.value = Math.exp(-Math.pow((elevation - .035) / .16, 2)); sky.uRain.value = this.state.rain; sky.uSun.value.copy(sun); sky.uMoon.value.copy(this.moon);
    this.rainMesh.visible = this.state.rain > .008;
    const rain = this.rainMesh.material.uniforms; rain.uTime.value = this.clock; rain.uRain.value = this.state.rain; rain.uCenter.value.copy(cameraPosition); rain.uNight.value = this.night;
    for (const m of this.windows) m.emissiveIntensity = this.night * (m.name.endsWith('cool') ? .35 : .65);
    for (const m of this.lamps) m.emissiveIntensity = .08 + this.night * 3.5;
    for (const [m, original] of this.surfaces) { m.color.copy(original.color).lerp(new T.Color(0x89938f), this.state.wetness * .6); m.roughness = T.MathUtils.lerp(original.roughness, .24, this.state.wetness); m.envMapIntensity = .7 + this.state.wetness * 1.2; }
    this.pools.visible = this.night > .03; this.glowMaterial.opacity = this.night * (.7 + this.state.wetness * .3);
    if (this.clock > this.pointUpdateAt) {
      this.pointUpdateAt = this.clock + .5;
      const nearest = [...this.lampPositions].sort((a, b) => a.distanceToSquared(cameraPosition) - b.distanceToSquared(cameraPosition));
      this.pointLights.forEach((light, i) => { if (nearest[i]) light.position.copy(nearest[i]); });
    }
    for (const light of this.pointLights) light.intensity = this.lampPositions.length?this.night * 19:0;
  }
  get snapshot() { return { ...{ hour: this.state.hour, autoTime: this.state.autoTime, cycleMinutes: this.state.cycleMinutes, weatherMode: this.state.weatherMode, rain: this.state.rain, wetness: this.state.wetness, weatherTransitions: this.state.weatherTransitions, nextWeatherIn: this.state.nextWeatherIn }, daylight: this.daylight, night: this.night, rainParticles: this.quality === 'high' ? 5200 : this.quality === 'low' ? 1400 : 3000, heightReady: this.heightReady }; }
}
