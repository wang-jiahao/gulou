import * as T from 'three';

export async function loadMaterials(onProgress: (n: number) => void) {
  const loader = new T.TextureLoader(), textures = new Map<string, T.Texture>(); let loaded = 0;
  const windTime={value:0}, foliageLight={value:1};
  const names = ['historic-brick.webp', 'stone-grain.webp', 'castle_brick_01_nor_gl.jpg', 'lawn.webp', 'grass_ground_nor_gl.jpg', 'pavers.webp', 'pavers-height.webp', 'bark_platanus_diff.jpg', 'leaf-spray.png', 'ivy-leaf-natural.png', 'grass-tuft.png', 'pine-spray.png','pine-bark.webp'];
  await Promise.all(names.map(async name => {
    const t = await loader.loadAsync(`${import.meta.env.BASE_URL}assets/textures/${name}`);
    t.colorSpace = name.includes('nor_') || name.includes('height') ? T.NoColorSpace : T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; textures.set(name, t); onProgress(++loaded / names.length);
  }));
  const grass = new T.MeshStandardMaterial({ color: 0xc7ceae, map: textures.get('lawn.webp'), normalMap: textures.get('grass_ground_nor_gl.jpg'), normalScale: new T.Vector2(0.3, 0.3), roughness: 1 });
  grass.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 vLawnWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLawnWorld=(modelMatrix*vec4(transformed,1.)).xz;');
    shader.fragmentShader=`varying vec2 vLawnWorld;float lawnHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float lawnNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(lawnHash(i),lawnHash(i+vec2(1,0)),f.x),mix(lawnHash(i+vec2(0,1)),lawnHash(i+vec2(1,1)),f.x),f.y);}\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat lawnVariation=lawnNoise(vLawnWorld*.14)*.7+lawnNoise(vLawnWorld*.7)*.3;diffuseColor.rgb*=mix(vec3(.78,.85,.73),vec3(1.05,1.04,.96),lawnVariation);');
  };
  const path = new T.MeshStandardMaterial({ name:'paving',color: 0xefeadc, map: textures.get('pavers.webp'), bumpMap: textures.get('pavers-height.webp'), bumpScale: .026, roughness: 0.94 });
  const brick = new T.MeshStandardMaterial({ color: 0xd7d3c2, map: textures.get('historic-brick.webp'), normalMap: textures.get('castle_brick_01_nor_gl.jpg'), normalScale: new T.Vector2(.7,.7), roughness: 0.95 }); brick.name = 'historic-brick';
  const bark = new T.MeshStandardMaterial({ color: 0x9e9989, map: textures.get('bark_platanus_diff.jpg'), roughness: 1 }); bark.name = 'bark';
  const coniferBark=new T.MeshStandardMaterial({name:'pine-bark',map:textures.get('pine-bark.webp'),roughness:1});
  const stone = new T.MeshStandardMaterial({ color: 0xbab8a8,map:textures.get('stone-grain.webp'), roughness: 0.9 }); stone.name = 'stone';
  const wood = new T.MeshStandardMaterial({ color: 0x655039, roughness: 0.86 });
  const metal = new T.MeshStandardMaterial({ color: 0x343f3a, roughness: 0.55, metalness: 0.4 });
  const foliage = (name: string, color: number) => {
    const m = new T.MeshStandardMaterial({ name, map: textures.get(name === 'ivy' ? 'ivy-leaf-natural.png' : name === 'conifer' ? 'pine-spray.png' : name === 'grass-tuft' ? 'grass-tuft.png' : 'leaf-spray.png'), color, alphaTest: name === 'ivy' ? .3 : .4, alphaToCoverage: true, side: T.DoubleSide, roughness: name === 'ivy' ? .72 : .92 });
    // Front and back of leaves both receive light without an expensive transmission pass.
    m.userData.foliageLight = foliageLight;
    m.customProgramCacheKey = () => `gulou-foliage-${name}`;
    const wind:T.Material['onBeforeCompile']=(shader)=>{
      shader.uniforms.uWindTime=windTime;
      shader.vertexShader='uniform float uWindTime;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      vec3 windWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;
      transformed.x+=sin(uWindTime*1.4+windWorld.x*.33+windWorld.z*.27)*${name === 'ivy' ? '.006' : '.024'}*(.3+uv.y);
      transformed.z+=cos(uWindTime*.9+windWorld.x*.22)*${name === 'ivy' ? '.004' : '.016'}*uv.y;
      #endif`);
    };
    m.onBeforeCompile = (shader,renderer) => { wind(shader,renderer); shader.uniforms.uFoliageLight = foliageLight; shader.fragmentShader = 'uniform float uFoliageLight;\n' + shader.fragmentShader; shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', '#include <lights_fragment_begin>\n reflectedLight.indirectDiffuse += diffuseColor.rgb * .085 * uFoliageLight;'); };
    const depth=new T.MeshDepthMaterial({map:m.map,alphaTest:m.alphaTest,side:T.DoubleSide,depthPacking:T.RGBADepthPacking});depth.onBeforeCompile=wind;depth.customProgramCacheKey=()=>`gulou-foliage-depth-${name}`;m.userData.windDepth=depth;
    return m;
  };
  return { textures, windTime,foliageLight,grass, path, brick, bark,coniferBark, stone, wood, metal, leaves: foliage('leaves', 0xe5e2c9), conifer: foliage('conifer', 0xe0e0c7), ivy: foliage('ivy', 0xe8e4c2), grassTuft: foliage('grass-tuft', 0xccd4a7) };
}
export type Materials = Awaited<ReturnType<typeof loadMaterials>>;
